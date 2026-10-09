"""
Birthday Greeting Server
------------------------
Run:  python app.py
Then open the link printed in the terminal (works on phones on the same Wi-Fi too).

- Put pictures in   photos/   (jpg, png, gif, webp)
- Put songs in      music/    (mp3, m4a, ogg, wav) - they play in alphabetical order
- Edit name/message in   config.json
- Greetings people type on the page are saved in   wishes.json
- The password-locked secret letter lives in   secret.json  (never sent to the
  browser unless the right password is entered)
"""

import base64
import hmac
import json
import os
import socket
import threading
import time
import webbrowser
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import quote

BASE = os.path.dirname(os.path.abspath(__file__))
PHOTOS_DIR = os.path.join(BASE, "photos")
MUSIC_DIR = os.path.join(BASE, "music")
CONFIG_FILE = os.path.join(BASE, "config.json")
WISHES_FILE = os.path.join(BASE, "wishes.json")
SECRET_FILE = os.path.join(BASE, "secret.json")
PORT = 8000

# wrong-password throttling: after MAX_TRIES misses, that device waits LOCK_SECONDS
MAX_TRIES, LOCK_SECONDS = 5, 30
failed = {}  # ip -> [count, locked_until]
failed_lock = threading.Lock()

PHOTO_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".jfif"}
MUSIC_EXT = {".mp3", ".m4a", ".ogg", ".wav", ".aac"}

wishes_lock = threading.Lock()


def list_files(folder, exts):
    os.makedirs(folder, exist_ok=True)
    names = sorted(
        f for f in os.listdir(folder) if os.path.splitext(f)[1].lower() in exts
    )
    url_root = os.path.basename(folder)
    return [{"name": f, "url": f"/{url_root}/{quote(f)}"} for f in names]


def read_json(path, default):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)


class Handler(SimpleHTTPRequestHandler):
    # Keep-alive: with HTTP/1.0 the server closes each connection itself, and on
    # Windows that sometimes cut off the end of a photo (image stalled ~20s).
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE, **kwargs)

    def end_headers(self):
        # Always re-check files, so edits show up on a normal refresh
        # instead of the browser reusing an old cached copy.
        if "Cache-Control" not in "".join(h.decode("latin-1") for h in getattr(self, "_headers_buffer", [])):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def send_index(self):
        # Stamp style.css / script.js with their last-change time, so a browser
        # can never mix a new page with an old cached script (or vice versa).
        web = os.path.join(BASE, "web")
        html = open(os.path.join(web, "index.html"), encoding="utf-8").read()
        for name in ("style.css", "script.js"):
            v = int(os.path.getmtime(os.path.join(web, name)))
            html = html.replace(f"/web/{name}\"", f"/web/{name}?v={v}\"")
        body = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/":
            return self.send_index()
        elif path == "/api/data":
            config = read_json(CONFIG_FILE, {})
            photos = list_files(PHOTOS_DIR, PHOTO_EXT)
            captions = config.get("captions", {})
            for p in photos:
                p["caption"] = captions.get(p["name"], "")
            return self.send_json(
                {
                    "config": config,
                    "photos": photos,
                    "music": list_files(MUSIC_DIR, MUSIC_EXT),
                    "wishes": read_json(WISHES_FILE, []),
                    # only the hint - the password and letter stay on the server
                    "secret_hint": read_json(SECRET_FILE, {}).get("hint", ""),
                }
            )
        elif not path.startswith(("/web/", "/photos/", "/music/")):
            # Only serve the page, photos and music - nothing else in the folder.
            return self.send_error(404)
        return super().do_GET()

    def do_POST(self):
        if self.path not in ("/api/wishes", "/api/secret"):
            return self.send_error(404)
        try:
            length = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(min(length, 10_000)).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return self.send_json({"error": "Invalid data"}, 400)

        if self.path == "/api/secret":
            return self.check_secret(data)

        name = str(data.get("name", "")).strip()[:40] or "Anonymous"
        message = str(data.get("message", "")).strip()[:500]
        if not message:
            return self.send_json({"error": "Message is empty"}, 400)

        wish = {
            "name": name,
            "message": message,
            "time": datetime.now().strftime("%b %d, %Y %I:%M %p"),
        }
        with wishes_lock:
            wishes = read_json(WISHES_FILE, [])
            wishes.append(wish)
            write_json(WISHES_FILE, wishes)
        self.send_json(wish, 201)

    def check_secret(self, data):
        ip = self.client_address[0]
        now = time.time()
        with failed_lock:
            count, until = failed.get(ip, [0, 0])
            if until > now:
                return self.send_json({"ok": False, "wait": int(until - now) + 1}, 429)
        secret = read_json(SECRET_FILE, {})
        guess = str(data.get("password", "")).strip()
        real = str(secret.get("password", ""))
        if real and hmac.compare_digest(guess.encode("utf-8"), real.encode("utf-8")):  # exact match only
            with failed_lock:
                failed.pop(ip, None)
            # the photo lives in a folder the server never serves directly,
            # so it is only sent (inline) together with the unlocked letter
            photo = ""
            rel = secret.get("photo", "")
            path = os.path.normpath(os.path.join(BASE, rel)) if rel else ""
            if path.startswith(BASE) and os.path.isfile(path):
                with open(path, "rb") as fh:
                    photo = "data:image/jpeg;base64," + base64.b64encode(fh.read()).decode("ascii")
            return self.send_json({
                "ok": True,
                "title": secret.get("title", ""),
                "letter": secret.get("letter", ""),
                "from": secret.get("from", ""),
                "photo": photo,
                "photo_caption": secret.get("photo_caption", ""),
                "song": secret.get("song", {}),
            })
        with failed_lock:
            count += 1
            if count >= MAX_TRIES:
                failed[ip] = [0, now + LOCK_SECONDS]
                return self.send_json({"ok": False, "wait": LOCK_SECONDS}, 429)
            failed[ip] = [count, 0]
        self.send_json({"ok": False, "left": MAX_TRIES - count}, 401)

    def log_message(self, fmt, *args):
        pass  # keep the terminal clean


def local_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"


if __name__ == "__main__":
    os.makedirs(PHOTOS_DIR, exist_ok=True)
    os.makedirs(MUSIC_DIR, exist_ok=True)
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    url = f"http://localhost:{PORT}"
    print("\n  Happy Birthday server is running!")
    print(f"  On this computer : {url}")
    print(f"  On phone (same Wi-Fi): http://{local_ip()}:{PORT}")
    print("  Press Ctrl+C to stop.\n")
    threading.Timer(1, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Bye!")
