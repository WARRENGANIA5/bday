"""
Build a Vercel-ready copy of the birthday site into  vercel_site/

    python build_vercel.py
    cd vercel_site
    vercel deploy --prod

- public/   -> everything the browser may see (page, photos, data.json)
- api/      -> serverless function that checks the secret-letter password
- private/  -> secret.json + secret photo; only the function can read these
"""

import hashlib
import json
import os
import shutil
from urllib.parse import quote

import app  # reuse the same file lists / helpers as the local server

BASE = app.BASE
OUT = os.path.join(BASE, "vercel_site")
PUB = os.path.join(OUT, "public")
PRIV = os.path.join(OUT, "private")
API = os.path.join(OUT, "api")


def main():
    if os.path.isdir(OUT):
        # keep .vercel (the link to the Vercel project) between builds
        for name in os.listdir(OUT):
            if name != ".vercel":
                path = os.path.join(OUT, name)
                shutil.rmtree(path) if os.path.isdir(path) else os.remove(path)
    os.makedirs(PUB, exist_ok=True)
    os.makedirs(PRIV, exist_ok=True)
    os.makedirs(API, exist_ok=True)

    # ---- public: web assets, photos, music ----
    shutil.copytree(os.path.join(BASE, "web"), os.path.join(PUB, "web"))
    shutil.copytree(app.PHOTOS_DIR, os.path.join(PUB, "photos"))
    if os.listdir(app.MUSIC_DIR):
        shutil.copytree(app.MUSIC_DIR, os.path.join(PUB, "music"))

    # index.html with cache-busting versions on the css/js
    html = open(os.path.join(BASE, "web", "index.html"), encoding="utf-8").read()
    for name in ("style.css", "script.js"):
        digest = hashlib.md5(open(os.path.join(BASE, "web", name), "rb").read()).hexdigest()[:10]
        html = html.replace(f'/web/{name}"', f'/web/{name}?v={digest}"')
    open(os.path.join(PUB, "index.html"), "w", encoding="utf-8").write(html)

    # the same JSON the local /api/data returns, baked into a static file
    config = app.read_json(app.CONFIG_FILE, {})
    photos = app.list_files(app.PHOTOS_DIR, app.PHOTO_EXT)
    for p in photos:
        p["caption"] = config.get("captions", {}).get(p["name"], "")
    secret = app.read_json(app.SECRET_FILE, {})
    data = {
        "config": config,
        "photos": photos,
        "music": app.list_files(app.MUSIC_DIR, app.MUSIC_EXT),
        "wishes": [],
        "secret_hint": secret.get("hint", ""),
    }
    json.dump(data, open(os.path.join(PUB, "data.json"), "w", encoding="utf-8"), ensure_ascii=False)

    # ---- private: only the serverless function can read these ----
    secret_out = dict(secret)
    if secret.get("photo"):
        src = os.path.join(BASE, secret["photo"])
        if os.path.isfile(src):
            shutil.copy(src, os.path.join(PRIV, "photo.jpg"))
            secret_out["photo"] = "photo.jpg"
    json.dump(secret_out, open(os.path.join(PRIV, "secret.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    # ---- api: password check ----
    open(os.path.join(API, "secret.py"), "w", encoding="utf-8").write(SECRET_FUNCTION)

    vercel = {
        "buildCommand": "",
        "outputDirectory": "public",
        "cleanUrls": False,
        "functions": {"api/secret.py": {"includeFiles": "private/**"}},
        "rewrites": [{"source": "/api/data", "destination": "/data.json"}],
        "headers": [
            {"source": "/", "headers": [{"key": "Cache-Control", "value": "no-store"}]},
            {"source": "/data.json", "headers": [{"key": "Cache-Control", "value": "no-store"}]},
        ],
    }
    json.dump(vercel, open(os.path.join(OUT, "vercel.json"), "w", encoding="utf-8"), indent=2)
    print("Built", OUT)


SECRET_FUNCTION = r'''import base64
import hmac
import json
import os
import time
from http.server import BaseHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
PRIVATE = os.path.join(HERE, "..", "private")
MAX_TRIES, LOCK_SECONDS = 5, 30
failed = {}  # per warm instance: ip -> [count, locked_until]


def load_secret():
    with open(os.path.join(PRIVATE, "secret.json"), encoding="utf-8") as fh:
        return json.load(fh)


class handler(BaseHTTPRequestHandler):
    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        ip = (self.headers.get("x-forwarded-for") or "?").split(",")[0].strip()
        now = time.time()
        count, until = failed.get(ip, [0, 0])
        if until > now:
            return self.send_json({"ok": False, "wait": int(until - now) + 1}, 429)
        try:
            length = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(min(length, 10000)).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return self.send_json({"error": "Invalid data"}, 400)

        secret = load_secret()
        guess = str(data.get("password", "")).strip()
        real = str(secret.get("password", ""))
        if real and hmac.compare_digest(guess.encode("utf-8"), real.encode("utf-8")):
            failed.pop(ip, None)
            photo = ""
            if secret.get("photo"):
                path = os.path.join(PRIVATE, secret["photo"])
                if os.path.isfile(path):
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
        count += 1
        if count >= MAX_TRIES:
            failed[ip] = [0, now + LOCK_SECONDS]
            return self.send_json({"ok": False, "wait": LOCK_SECONDS}, 429)
        failed[ip] = [count, 0]
        return self.send_json({"ok": False, "left": MAX_TRIES - count}, 401)
'''

if __name__ == "__main__":
    main()
