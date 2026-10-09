// scale the 430px design to fit narrow phones exactly
function fitLayout() {
  const fit = Math.min(1, document.documentElement.clientWidth / 430);
  document.documentElement.style.setProperty("--fit", fit.toFixed(4));
}
fitLayout();
addEventListener("resize", fitLayout);
addEventListener("orientationchange", fitLayout);

const $ = (s) => document.querySelector(s);
let data = { config: {}, photos: [], music: [], wishes: [] };

/* ---------- Load data from Python server ---------- */
async function load() {
  try {
    const res = await fetch("/api/data");
    data = await res.json();
  } catch (e) {
    console.error("Could not reach the Python server. Run: python app.py", e);
  }
  const c = data.config;
  const name = c.name || "Birthday Girl";
  const age = c.age || 22;
  const sfx = age % 100 >= 11 && age % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[age % 10] || "th");
  document.title = "Happy Birthday";

  if (c.gate_title) {
    const [small, ...rest] = c.gate_title.split("\n");
    $("#gtSmall").textContent = small;
    if (rest.length) $("#gtName").textContent = rest.join(" ");
  }
  // "Happy Birthday" letters bounce one after another
  $("#gtSmall").innerHTML = [...$("#gtSmall").textContent]
    .map((ch, i) => `<span style="--i:${i}">${ch === " " ? "&nbsp;" : ch}</span>`).join("");
  if (c.today_title) $("#todayTitle").textContent = c.today_title;
  (c.today_message || "").split(/\s+/).filter(Boolean).forEach((w, i) => {
    const sp = document.createElement("span");
    sp.className = "tw-word";
    sp.style.setProperty("--i", i);
    sp.textContent = w + " ";
    $("#todayMsg").appendChild(sp);
  });
  {
    const [, bm, bd] = (c.birthday || "").split("-");
    if (bm && bd) $("#todayStamp").textContent = `♡ ${+bm}.${+bd} ♡`;
  }
  $("#letterHead").textContent = c.letter_title || `Happy Birthday, ${name}!`;
  // one <p> per paragraph so they can appear one after another
  (c.just_for_you || "").split(/\n\s*\n/).forEach((t, i) => {
    const para = document.createElement("p");
    para.textContent = t.trim();
    para.style.setProperty("--i", i);
    $("#justMsg").appendChild(para);
  });
  $("#justFrom").textContent = c.from ? `— ${c.from}` : "";
  // closing message appears word by word
  (c.closing || "").split(/\s+/).filter(Boolean).forEach((w, i) => {
    const sp = document.createElement("span");
    sp.className = "cw";
    sp.style.setProperty("--i", i);
    sp.textContent = w + " ";
    $("#closingMsg").appendChild(sp);
  });
  $("#signature").textContent = c.from ? `— ${c.from}` : "";
  $("#closingFrom").textContent = c.from ? `— ${c.from}` : "";
  $("#footerFrom").textContent = c.from || "me";
  {
    const [y, m, d] = (c.birthday || "").split("-");
    $("#footerSub").textContent = `Happy ${age}${sfx} Birthday, ${c.full_name || name} ✦ ${m && d ? `${+m}.${+d}.${y}` : ""}`;
  }

  buildCalendar(c.birthday);
  buildPhotos();
  setupBouquet();
  setupCake();
  setupMusic();
}

/* ---------- Gate ---------- */
(() => {
  ["b1", "b2"].forEach((k, i) => {
    const src = document.querySelector(`.mirror-wrap .bfly.${k}`);
    if (!src) return;
    const b = src.cloneNode(true);
    b.classList.add("gift-fly", i ? "g2" : "g1");
    $("#giftFlies").appendChild(b);
  });
})();
let opened = false;
function openGift() {
  if (opened) return;
  opened = true;
  const gift = $("#gift");
  playMusic(); // must start inside the tap so the browser allows sound
  $("#gate").classList.add("opening");
  $("#giftStage").classList.add("opening");
  gift.classList.add("shaking"); // 1. box rumbles, the tag flies off
  $("#giftFlies").classList.add("away"); // butterflies flutter off

  setTimeout(() => { // 2. lid pops off, light rays + hearts burst out
    gift.classList.replace("shaking", "open");
    burstParticles(34);
    burstConfetti(140);
    riseOutOfBox();
    const r = gift.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * .4;
    fxRing(cx, cy, "#fff");
    setTimeout(() => fxRing(cx, cy, "#f48fb1"), 150);
    heartRing(cx, cy);
    $("#gate").classList.add("quake");
  }, 1150);

  setTimeout(() => { // fireworks on both sides
    firework(innerWidth * .18, innerHeight * .25);
    setTimeout(() => firework(innerWidth * .82, innerHeight * .2), 250);
    setTimeout(() => firework(innerWidth * .5, innerHeight * .12), 500);
  }, 1600);

  setTimeout(() => { // 3. a pink circle grows out of the box and fills the screen
    const r = gift.getBoundingClientRect();
    const iris = $("#gateIris");
    iris.style.setProperty("--ix", r.left + r.width / 2 + "px");
    iris.style.setProperty("--iy", r.top + r.height / 2 + "px");
    iris.classList.add("on");
    gift.classList.add("gone");
  }, 2950);

  setTimeout(() => { // 4. show the page
    document.body.classList.add("opened");
    $("#gate").classList.add("hide");
    $("#main").hidden = false;
    window.scrollTo(0, 0);
    burstConfetti(160);
    observeReveals();
    setTimeout(() => $("#gate").remove(), 900);
  }, 3700);
}

// balloons, butterflies and a message float up out of the open box
function riseOutOfBox() {
  const box = $("#riseOut");
  const add = (html, cls, x, delay) => {
    const el = document.createElement("div");
    el.className = "ro-item " + cls;
    el.innerHTML = html;
    el.style.setProperty("--x", x + "px");
    el.style.animationDelay = delay + "s";
    box.appendChild(el);
  };
  add(balloonSVG("heart", 901), "ro-22", 0, .1);
  add(balloonSVG("heart", 902), "ro-b", -78, .25);
  add(balloonSVG("heart", 903), "ro-b", 78, .35);
  add(balloonSVG("latex", 904), "ro-b small", -120, .45);
  add(balloonSVG("star", 905), "ro-b small", 120, .5);
  ["b1", "b2"].forEach((k, i) => {
    const src = document.querySelector(`.mirror-wrap .bfly.${k}`);
    if (src) add(src.outerHTML, "ro-fly " + (i ? "right" : "left"), i ? 40 : -40, .3 + i * .2);
  });
  add("<span>Let's celebrate! 🎉</span>", "ro-msg", 0, .6);
}

function burstParticles(n) {
  const box = $("#burst");
  const icons = ["💖", "💗", "💕", "✨", "🌸", "🎀", "✦", "♡"];
  for (let i = 0; i < n; i++) {
    const p = document.createElement("span");
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5; // mostly upward
    const dist = 110 + Math.random() * 190;
    p.textContent = icons[Math.floor(Math.random() * icons.length)];
    p.style.setProperty("--x", Math.cos(angle) * dist + "px");
    p.style.setProperty("--y", Math.sin(angle) * dist + "px");
    p.style.setProperty("--r", (Math.random() - 0.5) * 360 + "deg");
    p.style.setProperty("--s", (0.8 + Math.random() * 0.8).toFixed(2));
    p.style.setProperty("--d", (0.9 + Math.random() * 0.7).toFixed(2) + "s");
    p.style.fontSize = 14 + Math.random() * 18 + "px";
    p.style.color = ["#fff", "#f48fb1", "#ffd36e"][i % 3];
    p.style.animationDelay = Math.random() * 0.15 + "s";
    box.appendChild(p);
  }
}
$("#openBtn").addEventListener("click", openGift);
$("#gift").addEventListener("click", openGift);

/* ---------- Floating hearts ---------- */
const floatIcons = ["💖", "💕", "🤍", "🌸", "💗", "🎀"];
setInterval(() => {
  const f = document.createElement("span");
  f.className = "floater";
  f.textContent = floatIcons[Math.floor(Math.random() * floatIcons.length)];
  f.style.left = Math.random() * 100 + "vw";
  f.style.fontSize = 12 + Math.random() * 18 + "px";
  f.style.animationDuration = 7 + Math.random() * 6 + "s";
  $("#floaters").appendChild(f);
  setTimeout(() => f.remove(), 13000);
}, 900);

/* ---------- Reveal on scroll ---------- */
let letterStarted = false, closingParty = false;
function observeReveals() {
  document.querySelectorAll(".reveal.write").forEach((h) => {
    if (!h.querySelector(".ink")) h.innerHTML = `<span class="ink">${h.innerHTML}</span>`;
  });
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add("show");
        io.unobserve(en.target);
        if (en.target.classList.contains("doily") && !closingParty) {
          closingParty = true;
          setTimeout(() => burstConfetti(220), 1400);
        }
        if (en.target.id === "envScene" && !letterStarted) {
          letterStarted = true;
          setTimeout(typeLetter, 2200); // after the paper slides out
        }
      });
    },
    { threshold: 0.15 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

/* ---------- Calendar ---------- */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
function buildCalendar(iso) {
  const parts = (iso || "").split("-").map(Number);
  const d = parts.length === 3 && parts.every((n) => !isNaN(n))
    ? new Date(parts[0], parts[1] - 1, parts[2])
    : new Date();
  const year = d.getFullYear(), month = d.getMonth(), day = d.getDate();
  $("#calMonth").textContent = MONTHS[month];
  $("#calYear").textContent = year;

  const grid = $("#calGrid");
  grid.innerHTML = "";
  ["S", "M", "T", "W", "T", "F", "S"].forEach((w) => {
    const el = document.createElement("span");
    el.className = "wd";
    el.textContent = w;
    grid.appendChild(el);
  });
  const firstDow = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < firstDow; i++) grid.appendChild(document.createElement("span"));
  for (let n = 1; n <= days; n++) {
    const el = document.createElement("span");
    el.className = "day" + (n === day ? " bday" : "");
    el.style.setProperty("--i", n);
    el.textContent = n;
    if (n === day) el.insertAdjacentHTML("beforeend", '<span class="bday-tag">🎂 bday!</span>');
    if (n === day) {
      // the same butterflies as the Photos section, circling the birthday
      ["b1", "b2"].forEach((k) => {
        const src = document.querySelector(`.mirror-wrap .bfly.${k}`);
        if (!src) return;
        const b = src.cloneNode(true);
        b.classList.add("cal-bfly");
        el.appendChild(b);
      });
    }
    grid.appendChild(el);
  }
}

/* ---------- Photos ---------- */
const photoUrl = (i) => (data.photos[i] ? data.photos[i].url : "");
function setImg(el, url) {
  if (url) el.src = url;
  else el.replaceWith(placeholder());
}
function placeholder() {
  const p = document.createElement("div");
  p.className = "ph";
  p.textContent = "📷 Photo here";
  return p;
}
function buildPhotos() {
  // A photo whose file name starts with "closing" is only used in the Closing section.
  const closing = data.photos.find((p) => /^closing/i.test(p.name));
  if (closing) data.photos = data.photos.filter((p) => p !== closing);
  const n = data.photos.length;
  // Heart frame (SVG <image>)
  if (n) {
    $("#heartImg").setAttribute("href", photoUrl(0));
    $("#heartBg").setAttribute("href", photoUrl(0));
  }
  // Mirror frame
  setImg($("#mirrorImg"), photoUrl(n > 1 ? 1 : 0));
  $("#mirrorImg") && ($("#mirrorImg").onclick = () => openLightbox(n > 1 ? 1 : 0));
  // Closing oval
  setImg($("#closingImg"), closing ? closing.url : photoUrl(n - 1));

  // Stamp grid: photos 3, 4, 5, 6... (always at least 4 slots, empty ones show a placeholder)
  const stamps = $("#stamps");
  stamps.innerHTML = "";
  const start = 2;
  const list = data.photos.slice(start);
  while (list.length < 4) list.push(null);
  const caps = ["pretty ♡", "cutie ♡", "my fave ♡", "22 & lovely ♡", "sunshine ♡", "gorgeous ♡"];
  list.forEach((p, k) => {
    const cell = document.createElement("div");
    cell.className = "stamp-cell reveal r-drop";
    cell.style.setProperty("--d", (k % 6) * 0.15 + "s");
    cell.style.setProperty("--rot", [-3, 2.5, 2, -2.5][k % 4] + "deg");
    const stamp = document.createElement("div");
    stamp.className = "stamp";
    const inner = document.createElement("div");
    inner.className = "stamp-inner";
    if (p) {
      const img = document.createElement("img");
      img.src = p.url;
      img.loading = "lazy";
      // landscape photos: show the whole picture instead of cropping it square
      img.onload = () => img.classList.toggle("wide", img.naturalWidth > img.naturalHeight);
      img.alt = p.caption || "Photo";
      inner.appendChild(img);
      cell.addEventListener("click", () => openLightbox(start + k));
    } else {
      inner.appendChild(placeholder());
    }
    const cap = document.createElement("span");
    cap.className = "stamp-cap";
    cap.textContent = (p && p.caption) || caps[k % caps.length];
    stamp.append(inner, cap);
    const tape = document.createElement("i");
    tape.className = "stamp-tape";
    const mark = document.createElement("span");
    mark.className = "postmark";
    mark.innerHTML = "<b>22</b>♡";
    cell.append(stamp, tape, mark);
    stamps.appendChild(cell);
  });
}

/* ---------- Flower bouquet ----------
   One drawing is used twice: small (static) next to the heart, and big
   (animated: wrap rises, stems grow, flowers bloom one by one) in the popup. */
/* Bouquet designs. Each one is drawn by bouquetSVG(animated, spec): small and
   still on the page, big and animated (wrap, stems, blooms, bow, tag) in the popup. */
const BQ_TWINKLES = [[26, 70, 1], [276, 52, .8], [282, 214, 1.1], [16, 232, .8], [150, 8, .9], [60, 320, .7], [244, 330, .9]];
const BQ_SPECS = {
  pink: {
    id: "P",
    colors: [["#ffd0e0", "#f48fb1", "#d9577f"], ["#ffe6ef", "#f7aac6", "#de6f98"], ["#ffffff", "#fbd3e2", "#e48aab"]],
    flowers: [
      ["tulip", 62, 118, 0.9, 2], ["tulip", 238, 112, 0.9, 2], ["tulip", 110, 82, 1, 0], ["tulip", 192, 78, 1, 1],
      ["daisy", 150, 66, 0.72], ["daisy", 76, 168, 0.8], ["daisy", 228, 166, 0.8],
      ["rose", 98, 146, 1.05, 1], ["rose", 204, 144, 1.05, 0], ["rose", 150, 112, 1.32, 0],
      ["rose", 122, 192, 0.72, 1], ["rose", 180, 194, 0.72, 1], ["rose", 150, 176, 0.95, 2],
    ],
    dots: [[52, 84], [250, 72], [150, 34], [86, 52], [214, 46], [268, 136], [34, 146], [126, 50], [176, 44]],
    wrap: { back: "#f7bfd2", line: "#e7a3bb", tissue: "#ffe3ee", tissueLine: "#f3b3c9", L: ["#fffdfb", "#fde4ed"], R: ["#fde0ea", "#f6bcd0"], stitch: "#f3b7cb", dotR: "#fbd3e2" },
    tag: "For you ♡",
    title: (n) => `For you, ${n} 💐`, note: "Happy 22nd Birthday! 🌸",
    petals: ["#f7a8c4", "#fbd0df", "#fff1f6", "#e5719b"], rise: ["💗", "💕", "🤍", "✨"],
  },
  roses: {
    id: "R",
    colors: [["#ff9aae", "#ef5f7d", "#b8213f"], ["#ffc2cf", "#e04866", "#a3173a"], ["#ffe1ea", "#f7a8c4", "#d9577f"]],
    flowers: [
      ["rose", 70, 120, .95, 2], ["rose", 230, 116, .95, 2],
      ["rose", 108, 84, 1.05, 0], ["rose", 192, 82, 1.05, 1], ["rose", 150, 62, 1, 2],
      ["rose", 92, 150, 1.1, 1], ["rose", 208, 148, 1.1, 0],
      ["rose", 150, 112, 1.38, 0],
      ["rose", 124, 186, .85, 2], ["rose", 178, 188, .85, 2], ["rose", 150, 168, 1, 1],
    ],
    dots: [[44, 92], [258, 84], [150, 26], [92, 48], [210, 44], [272, 150], [30, 156]],
    wrap: { back: "#ecc6d1", line: "#d79aae", tissue: "#fff3f6", tissueLine: "#f3c6d2", L: ["#ffffff", "#f6eef0"], R: ["#f3e8eb", "#e2d2d7"], stitch: "#e8c9d2", dotR: "#f7a8c4" },
    tag: "For you ♡",
    title: () => "Roses for you 🌹", note: "Happy 22nd Birthday, beautiful! 💖",
    petals: ["#ef5f7d", "#e04866", "#ff9aae", "#ffc2cf"], rise: ["❤️", "💖", "🌹", "✨"],
  },
  lavender: {
    id: "L",
    colors: [["#e9dcff", "#b99ae8", "#7d5bc2"], ["#f4edff", "#d4c0f5", "#9a7bcf"], ["#ffffff", "#f1e9fd", "#b9a2e0"]],
    flowers: [
      ["lav", 64, 120, 1, 0], ["lav", 236, 116, 1, 0], ["lav", 104, 80, 1.1, 1], ["lav", 196, 78, 1.1, 0], ["lav", 150, 58, 1.05, 1],
      ["daisy", 92, 150, .95], ["daisy", 208, 148, .95], ["daisy", 150, 116, 1.15],
      ["rose", 124, 182, .8, 1], ["rose", 178, 184, .8, 1], ["daisy", 150, 172, .8],
    ],
    dots: [[46, 88], [256, 78], [150, 22], [80, 54], [222, 48], [270, 150], [30, 152], [128, 40], [172, 38]],
    wrap: { back: "#cbb6ef", line: "#a98fda", tissue: "#f6f0ff", tissueLine: "#d7c6f4", L: ["#fdfbff", "#efe6fd"], R: ["#e9defb", "#cbb6ef"], stitch: "#c9b4ee", dotR: "#e3d6fa" },
    tag: "For you ♡",
    title: (n) => `Stay lovely, ${n} 💜`, note: "Wishing you calm, happy days 🌼",
    petals: ["#d4c0f5", "#b99ae8", "#ffffff", "#f1e9fd"], rise: ["💜", "🤍", "🌼", "✨"],
  },
};
const BQ_LEAVES = [[92, 216, -38], [210, 214, 38], [62, 196, -62], [240, 190, 62], [120, 228, -15], [182, 228, 15]];

const twinkle = (x, y, s, i, a) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><path${a("tw", i)} d="M0 -12 C2 -3 3 -2 12 0 C3 2 2 3 0 12 C-2 3 -3 2 -12 0 C-3 -2 -2 -3 0 -12 Z" fill="#fff" stroke="#f4a8c3" stroke-width="1.2"/></g>`;

function bqRose(c, gid) {
  const g = `url(#${gid})`;
  const outer = [0, 60, 120, 180, 240, 300].map((r) =>
    `<ellipse cx="0" cy="-17" rx="14" ry="17" transform="rotate(${r})" fill="${g}" stroke="${c[2]}" stroke-width="1.2"/>`).join("");
  const inner = [30, 102, 174, 246, 318].map((r) =>
    `<ellipse cx="0" cy="-9" rx="9" ry="11" transform="rotate(${r})" fill="${c[1]}" stroke="${c[2]}" stroke-width="1"/>`).join("");
  return `${outer}<circle r="16" fill="${c[1]}"/>${inner}<circle r="7" fill="${c[0]}" stroke="${c[2]}" stroke-width="1.2"/>
    <path d="M-3 1 a4 4 0 1 1 5 3 a2.4 2.4 0 1 1 -2.5 -3" fill="none" stroke="${c[2]}" stroke-width="1.4" stroke-linecap="round"/>
    <ellipse cx="-9" cy="-12" rx="4" ry="2.4" transform="rotate(-35 -9 -12)" fill="#fff" opacity=".55"/>`;
}
function bqTulip(c, gid) {
  return `<path d="M-18 -8 C-20 15 -8 25 0 25 C8 25 20 15 18 -8 L9 2 L0 -18 L-9 2 Z" fill="url(#${gid})" stroke="${c[2]}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M-7 5 C-5 -11 5 -11 7 5 C5 19 -5 19 -7 5 Z" fill="${c[1]}" opacity=".7"/>
    <path d="M-12 -2 C-12 8 -8 14 -4 17" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/>`;
}
function bqDaisy() {
  const p = [0, 45, 90, 135, 180, 225, 270, 315].map((r) =>
    `<ellipse cx="0" cy="-13" rx="6" ry="12" transform="rotate(${r})" fill="#fff" stroke="#e7dcef" stroke-width="1.2"/>`).join("");
  return `${p}<circle r="7" fill="#ffd877" stroke="#f0b94a" stroke-width="1.2"/><circle cx="-2" cy="-2" r="2" fill="#fff3c4"/>`;
}
function bqLavender(c) {
  let buds = "";
  for (let k = 0; k < 9; k++) {
    const y = 18 - k * 6, x = (k % 2 ? 4 : -4) * (1 - k / 12);
    buds += `<ellipse cx="${x}" cy="${y}" rx="4.6" ry="6" transform="rotate(${k % 2 ? 25 : -25} ${x} ${y})" fill="${k % 3 ? c[1] : c[0]}" stroke="${c[2]}" stroke-width="1"/>`;
  }
  return `<path d="M0 26 V-36" stroke="#7fb57a" stroke-width="2.4" stroke-linecap="round"/>${buds}<ellipse cx="0" cy="-38" rx="3.2" ry="4.4" fill="${c[1]}" stroke="${c[2]}" stroke-width="1"/>`;
}

function bouquetSVG(animated, spec = BQ_SPECS.pink) {
  const uid = (animated ? "B" : "S") + spec.id;
  const a = (cls, i) => (animated ? ` class="${cls}" style="--i:${i}"` : "");
  const w = spec.wrap;
  const grads = spec.colors.map((c, i) => `
    <radialGradient id="bqR${uid}${i}" cx=".5" cy=".85" r=".9"><stop offset="0" stop-color="${c[1]}"/><stop offset=".7" stop-color="${c[0]}"/><stop offset="1" stop-color="#fff"/></radialGradient>
    <linearGradient id="bqT${uid}${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient>`).join("");
  // ruffled tissue paper behind the flowers
  let tissue = "M24 168";
  for (let x = 24; x < 276; x += 24) tissue += ` Q${x + 12} ${150 + (x % 48 ? 6 : -10)} ${x + 24} 168`;
  tissue += " L150 330 Z";
  const stems = spec.flowers.map(([, x, y], i) =>
    `<path${a("bq-stem", i)} d="M${x} ${y + 14} Q${(x + 150) / 2} ${y + 96} 150 312" fill="none" stroke="#7fb57a" stroke-width="4" stroke-linecap="round" pathLength="1"/>`).join("");
  const leaves = BQ_LEAVES.map(([x, y, r], i) =>
    `<g transform="translate(${x} ${y}) rotate(${r})"><g${a("bq-pop", i + 2)}><path d="M0 -28 C14 -14 14 14 0 28 C-14 14 -14 -14 0 -28 Z" fill="url(#bqLeaf${uid})" stroke="#5f9a59" stroke-width="1.4"/><path d="M0 -24 V24 M0 -8 L6 -14 M0 4 L-6 -2 M0 14 L6 8" stroke="#5f9a59" stroke-width="1.1" fill="none"/></g></g>`).join("");
  const dots = spec.dots.map(([x, y], i) =>
    `<g transform="translate(${x} ${y})"><g${a("bq-pop", i + 6)}><circle r="4.5" fill="#fff" stroke="#efe3ea"/><circle cx="7" cy="5" r="3.8" fill="#fff" stroke="#efe3ea"/><circle cx="-6" cy="6" r="3.4" fill="#fff" stroke="#efe3ea"/><circle cx="1" cy="10" r="3" fill="#fff"/><path d="M1 13 V26" stroke="#9cc796" stroke-width="1.2"/></g></g>`).join("");
  const draw = (t, ci, i) => {
    const c = spec.colors[ci || 0];
    if (t === "rose") return bqRose(c, `bqR${uid}${ci || 0}`);
    if (t === "tulip") return bqTulip(c, `bqT${uid}${ci || 0}`);
    if (t === "lav") return bqLavender(c);
    return bqDaisy();
  };
  const flowers = spec.flowers.map(([t, x, y, s, ci], i) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><g${a("bq-bloom", i)}>${draw(t, ci, i)}</g>${animated ? `<circle class="bq-ring" style="--i:${i}" r="22"/>` : ""}</g>`).join("");
  const twinkles = animated ? BQ_TWINKLES.map(([x, y, s], i) => twinkle(x, y, s, i, a)).join("") : "";
  return `<svg viewBox="0 0 300 400" aria-hidden="true">
    <defs>${grads}
      <linearGradient id="bqLeaf${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c3e4b6"/><stop offset="1" stop-color="#86c07d"/></linearGradient>
      <linearGradient id="bqWrapL${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${w.L[0]}"/><stop offset="1" stop-color="${w.L[1]}"/></linearGradient>
      <linearGradient id="bqWrapR${uid}" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${w.R[0]}"/><stop offset="1" stop-color="${w.R[1]}"/></linearGradient>
    </defs>
    <g${a("bq-wrap", 0)}><path d="M34 156 L266 156 L170 360 L130 360 Z" fill="${w.back}" stroke="${w.line}" stroke-width="2" stroke-linejoin="round"/>
      <path d="${tissue}" fill="${w.tissue}" stroke="${w.tissueLine}" stroke-width="1.6" stroke-linejoin="round"/></g>
    ${stems}${leaves}${dots}${flowers}
    <g${a("bq-wrap", 1)}>
      <path${animated ? ' class="bq-flapL"' : ""} d="M22 196 L150 252 L150 378 L124 378 Z" fill="url(#bqWrapL${uid})" stroke="${w.line}" stroke-width="2" stroke-linejoin="round"/>
      <path${animated ? ' class="bq-flapR"' : ""} d="M278 196 L150 252 L150 378 L176 378 Z" fill="url(#bqWrapR${uid})" stroke="${w.line}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M38 210 L150 260 L262 210" fill="none" stroke="${w.stitch}" stroke-width="2" stroke-dasharray="5 5"/>
      <path d="M150 262 V372" stroke="${w.line}" stroke-width="1.5" opacity=".5"/>
      ${[0, 1, 2, 3, 4, 5].map((k) => `<circle cx="${34 + k * 9}" cy="${202 + k * 4}" r="2" fill="#fff"/><circle cx="${266 - k * 9}" cy="${202 + k * 4}" r="2" fill="${w.dotR}"/>`).join("")}
    </g>
    ${animated ? `<g class="bq-tag">
      <path d="M176 290 L196 312" stroke="${w.line}" stroke-width="1.6"/>
      <g transform="translate(196 312) rotate(-8)">
        <rect x="-4" y="0" width="76" height="40" rx="6" fill="#fffaf6" stroke="${w.line}" stroke-width="1.8"/>
        <rect x="1" y="5" width="66" height="30" rx="4" fill="none" stroke="${w.stitch}" stroke-dasharray="3 3"/>
        <circle cx="4" cy="6" r="2.6" fill="${w.stitch}"/>
        <text x="34" y="27" font-family="Great Vibes, cursive" font-size="16" fill="#7a3a64" text-anchor="middle">${spec.tag}</text>
      </g></g>` : ""}
    <g transform="translate(150 276)"><g${a("bq-bow", 0)}><use href="#sym-bow" x="-70" y="-44" width="140" height="94"/></g></g>
    ${twinkles}
  </svg>`;
}

function setupBouquet() {
  $("#bqSmall").innerHTML = bouquetSVG(false);
  const first = (data.config.name || "").split(" ")[0] || "you";
  document.querySelectorAll(".js-first").forEach((el) => (el.textContent = first));
}
/* shared popup effects */
const fxLayer = (() => { const d = document.createElement("div"); d.className = "fx-layer"; document.body.appendChild(d); return d; })();
function fxBurst(x, y, icons, n, dist = 140) {
  for (let i = 0; i < n; i++) {
    const p = document.createElement("span");
    const ang = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const d = dist * (0.6 + Math.random() * 0.6);
    p.className = "fx-p";
    p.textContent = icons[i % icons.length];
    p.style.left = x + "px";
    p.style.top = y + "px";
    p.style.setProperty("--x", Math.cos(ang) * d + "px");
    p.style.setProperty("--y", Math.sin(ang) * d + "px");
    p.style.setProperty("--r", (Math.random() - 0.5) * 300 + "deg");
    p.style.setProperty("--s", (0.8 + Math.random() * 0.7).toFixed(2));
    p.style.setProperty("--d", (0.8 + Math.random() * 0.5).toFixed(2) + "s");
    p.style.fontSize = 12 + Math.random() * 14 + "px";
    fxLayer.appendChild(p);
    setTimeout(() => p.remove(), 1500);
  }
}
function fxRing(x, y, color = "#f48fb1") {
  const r = document.createElement("i");
  r.className = "fx-ring";
  r.style.left = x + "px";
  r.style.top = y + "px";
  r.style.borderColor = color;
  fxLayer.appendChild(r);
  setTimeout(() => r.remove(), 900);
}
function firework(x, y) {
  const colors = ["#ff6fa5", "#ffd36e", "#9fd3f0", "#c9a6f2", "#ffffff", "#7fe0b0"];
  const c = colors[Math.floor(Math.random() * colors.length)];
  fxRing(x, y, c);
  for (let i = 0; i < 18; i++) {
    const p = document.createElement("span");
    const ang = (i / 18) * Math.PI * 2;
    p.className = "fx-p fx-dot";
    p.style.left = x + "px";
    p.style.top = y + "px";
    p.style.background = c;
    p.style.boxShadow = `0 0 8px ${c}`;
    p.style.setProperty("--x", Math.cos(ang) * 90 + "px");
    p.style.setProperty("--y", Math.sin(ang) * 90 + "px");
    p.style.setProperty("--r", "0deg");
    p.style.setProperty("--s", ".4");
    p.style.setProperty("--d", "1.1s");
    fxLayer.appendChild(p);
    setTimeout(() => p.remove(), 1300);
  }
}
function riseItem(container, icons, cls = "rise") {
  const h = document.createElement("i");
  h.className = cls;
  h.textContent = icons[Math.floor(Math.random() * icons.length)];
  h.style.left = 30 + Math.random() * 40 + "%";
  h.style.setProperty("--dur", 3 + Math.random() * 2.5 + "s");
  h.style.setProperty("--sway", (Math.random() * 120 - 60).toFixed(0) + "px");
  h.style.fontSize = 14 + Math.random() * 16 + "px";
  container.appendChild(h);
  setTimeout(() => h.remove(), 6000);
}
// Pink balloons in several styles: latex, foil heart/star, confetti, polka-dot,
// "22" foil numbers and little bunches. Each has a knot, tiny bow and curly string.
const BALLOON_PINKS = [
  ["#ffd3e2", "#f48fb1", "#d9577f"], ["#ffe4ee", "#f7aac6", "#de6f98"],
  ["#ffb3cd", "#ec6f9c", "#c2457a"], ["#fff3f7", "#f9c6d7", "#e48aab"],
];
const BALLOON_KINDS = ["latex", "heart", "confetti", "latex", "polka", "star", "bunch", "latex", "heart", "num22"];
let balloonN = 0;

const blString = (x, y, len = 70) =>
  `<path class="bl-string" style="transform-origin:${x}px ${y}px" d="M${x} ${y} C${x - 9} ${y + len * .18} ${x + 9} ${y + len * .34} ${x} ${y + len * .5} C${x - 9} ${y + len * .66} ${x + 9} ${y + len * .82} ${x} ${y + len}" fill="none" stroke="#e8a8bf" stroke-width="1.5"/>`;
const blKnot = (x, y, c) =>
  `<path d="M${x - 4} ${y} L${x + 4} ${y} L${x + 1.5} ${y + 6} L${x - 1.5} ${y + 6} Z" fill="${c}"/>
   <use href="#sym-bow" x="${x - 9}" y="${y + 1}" width="18" height="12"/>`;
const shine = (x, y) =>
  `<ellipse cx="${x}" cy="${y}" rx="6" ry="11" transform="rotate(-28 ${x} ${y})" fill="#fff" opacity=".7"/>
   <circle cx="${x - 2}" cy="${y + 16}" r="2.4" fill="#fff" opacity=".55"/>`;

function latexBalloon(id, [hi, mid, dark], cx = 40, cy = 40, rx = 28, ry = 34, extra = "") {
  return `<defs><radialGradient id="${id}" cx=".35" cy=".28" r=".85"><stop offset="0" stop-color="#fff"/><stop offset=".18" stop-color="${hi}"/><stop offset=".65" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></radialGradient></defs>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id})" stroke="${dark}" stroke-width="1.2"/>
    ${extra}
    <path d="M${cx + rx * .62} ${cy + ry * .25} A${rx} ${ry} 0 0 1 ${cx + rx * .1} ${cy + ry * .95}" fill="none" stroke="#fff" stroke-width="2" opacity=".35" stroke-linecap="round"/>
    ${shine(cx - rx * .38, cy - ry * .42)}`;
}

function balloonSVG(kind, n) {
  const c = BALLOON_PINKS[n % BALLOON_PINKS.length], id = "bl" + n;
  if (kind === "heart" || kind === "star") {
    const shape = kind === "heart"
      ? "M40 74 C16 58 4 42 4 27 C4 12 15 3 27 3 C34 3 38 8 40 13 C42 8 46 3 53 3 C65 3 76 12 76 27 C76 42 64 58 40 74 Z"
      : "M40 2 L50 26 L76 28 L56 45 L63 72 L40 57 L17 72 L24 45 L4 28 L30 26 Z";
    return `<svg viewBox="0 0 80 160"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c[0]}"/><stop offset=".35" stop-color="#fff"/><stop offset=".5" stop-color="${c[1]}"/><stop offset=".8" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient></defs>
      ${blString(40, 80)}
      <path d="${shape}" fill="url(#${id})" stroke="${c[2]}" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M18 20 L28 12 M22 32 L40 18" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>
      ${blKnot(40, kind === "heart" ? 74 : 66, c[2])}</svg>`;
  }
  if (kind === "confetti") {
    const dots = Array.from({ length: 14 }, (_, k) => {
      const a = k * 2.4, r = 6 + (k * 7) % 20;
      return `<circle cx="${40 + Math.cos(a) * r}" cy="${44 + Math.sin(a) * r * 1.1}" r="${1.6 + (k % 3)}" fill="${["#f48fb1", "#ffd36e", "#ffffff", "#ec6f9c"][k % 4]}"/>`;
    }).join("");
    return `<svg viewBox="0 0 80 160">${blString(40, 80)}
      <ellipse cx="40" cy="40" rx="30" ry="36" fill="rgba(255,240,246,.45)" stroke="#f3a9c2" stroke-width="1.4"/>
      ${dots}${shine(28, 24)}${blKnot(40, 76, "#f3a9c2")}</svg>`;
  }
  if (kind === "polka") {
    const dots = [[30, 28], [50, 24], [24, 46], [44, 44], [58, 52], [34, 62], [52, 66]].map(([x, y]) =>
      `<circle cx="${x}" cy="${y}" r="3.6" fill="#fff" opacity=".85"/>`).join("");
    return `<svg viewBox="0 0 80 160">${blString(40, 80)}${latexBalloon(id, c, 40, 42, 28, 34, dots)}${blKnot(40, 76, c[2])}</svg>`;
  }
  if (kind === "num22") {
    const digit = (x) => `<text x="${x}" y="64" font-family="Fredoka, Poppins, sans-serif" font-weight="700" font-size="70" text-anchor="middle"
      fill="url(#${id})" stroke="${c[2]}" stroke-width="2" paint-order="stroke">2</text>`;
    return `<svg viewBox="0 0 110 170"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c[0]}"/><stop offset=".4" stop-color="#fff"/><stop offset=".55" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient></defs>
      ${blString(32, 70, 90)}${blString(78, 70, 90)}
      ${digit(32)}${digit(78)}
      <use href="#sym-bow" x="40" y="142" width="30" height="20"/></svg>`;
  }
  if (kind === "bunch") {
    const cs = [BALLOON_PINKS[0], BALLOON_PINKS[2], BALLOON_PINKS[3]];
    return `<svg viewBox="0 0 120 190">
      <path d="M30 70 Q48 120 60 140 M90 70 Q72 120 60 140 M60 76 V140" fill="none" stroke="#e8a8bf" stroke-width="1.4"/>
      ${blString(60, 140, 46)}
      <g>${latexBalloon(id + "a", cs[0], 30, 40, 24, 30)}</g>
      <g>${latexBalloon(id + "b", cs[1], 90, 40, 24, 30)}</g>
      <g>${latexBalloon(id + "c", cs[2], 60, 50, 26, 32)}</g>
      <use href="#sym-bow" x="44" y="132" width="32" height="22"/></svg>`;
  }
  return `<svg viewBox="0 0 80 160">${blString(40, 80)}${latexBalloon(id, c)}${blKnot(40, 74, c[2])}</svg>`;
}

function riseBalloon() {
  const n = balloonN++;
  const kind = BALLOON_KINDS[n % BALLOON_KINDS.length];
  const el = document.createElement("i");
  el.className = "rise balloon";
  el.innerHTML = balloonSVG(kind, n);
  const base = kind === "bunch" ? 88 : kind === "num22" ? 84 : 52;
  el.querySelector("svg").setAttribute("width", Math.round(base + Math.random() * 18));
  el.style.left = 2 + Math.random() * 82 + "%";
  el.style.setProperty("--dur", 5.5 + Math.random() * 3 + "s");
  el.style.setProperty("--sway", (Math.random() * 120 - 60).toFixed(0) + "px");
  el.style.setProperty("--bob", (1.6 + Math.random()).toFixed(2) + "s");
  fxLayer.appendChild(el);
  setTimeout(() => el.remove(), 9000);
}

// start the popup from the tapped sticker, so it looks like it flies to the centre
function flyFrom(btn, modal) {
  const r = btn.getBoundingClientRect();
  const stage = modal.querySelector(".bm-stage");
  const w = Math.min(480, innerWidth * 0.96);
  stage.style.setProperty("--fx", r.left + r.width / 2 - innerWidth / 2 + "px");
  stage.style.setProperty("--fy", r.top + r.height / 2 - innerHeight / 2 + "px");
  stage.style.setProperty("--fs", Math.max(0.15, r.width / w).toFixed(3));
  fxRing(r.left + r.width / 2, r.top + r.height / 2);
  fxBurst(r.left + r.width / 2, r.top + r.height / 2, ["💗", "✨", "💕", "🌸"], 14, 110);
}

let petalTimer = null, riseTimer = null, bqSpec = BQ_SPECS.pink;
function openBouquet(kind = "pink", btn = $("#bouquetBtn")) {
  const m = $("#bouquetModal");
  bqSpec = BQ_SPECS[kind];
  const first = $(".js-first").textContent;
  m.querySelector(".bm-title").textContent = bqSpec.title(first);
  m.querySelector(".bm-note").textContent = bqSpec.note;
  $("#bqBig").innerHTML = bouquetSVG(true, bqSpec); // fresh copy so the animation replays
  flyFrom(btn, m);
  m.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => m.classList.add("on")));
  setTimeout(() => burstConfetti(90), 500);
  for (let i = 0; i < 18; i++) setTimeout(dropPetal, i * 60);
  petalTimer = setInterval(dropPetal, 260);
  setTimeout(() => { riseTimer = setInterval(() => riseItem($("#bmPetals"), bqSpec.rise), 420); }, 2600);
}
function closeBouquet() {
  const m = $("#bouquetModal");
  m.classList.remove("on");
  clearInterval(petalTimer);
  clearInterval(riseTimer);
  setTimeout(() => { m.hidden = true; $("#bmPetals").innerHTML = ""; }, 650);
}
function dropPetal() {
  const p = document.createElement("i");
  p.className = "petal";
  p.style.left = Math.random() * 100 + "%";
  p.style.setProperty("--dur", 4 + Math.random() * 3 + "s");
  p.style.setProperty("--sway", (Math.random() * 80 - 40).toFixed(0) + "px");
  p.style.setProperty("--sz", 10 + Math.random() * 10 + "px");
  p.style.background = bqSpec.petals[Math.floor(Math.random() * bqSpec.petals.length)];
  $("#bmPetals").appendChild(p);
  setTimeout(() => p.remove(), 7500);
}
$("#bouquetBtn").addEventListener("click", () => openBouquet("pink", $("#bouquetBtn")));
$("#bouquetModal").addEventListener("click", closeBouquet);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#bouquetModal").hidden) closeBouquet();
});

/* ---------- Birthday cake ----------
   Small static cake next to the heart; the popup builds it tier by tier,
   lights the "22" candles and lets her blow them out. */
const CK_TIERS = [ // x, y, w, h, body colours, drip colour
  [36, 232, 228, 90, ["#fcc9da", "#f198b8"], "#fff"],
  [64, 162, 172, 74, ["#fff8fb", "#fde0ea"], "#f7a8c4"],
  [96, 106, 108, 60, ["#fcc9da", "#f198b8"], "#fff"],
];
const CK_TWINKLES = [[20, 120, 1], [282, 100, .9], [286, 250, 1.1], [12, 290, .8], [60, 50, .7], [240, 40, .8]];
function ckDrip(x, y, w, color) {
  let d = `M${x + 6} ${y} H${x + w - 6} Q${x + w} ${y} ${x + w} ${y + 8} V${y + 12}`;
  const n = Math.round(w / 20), step = w / n;
  for (let k = 0; k < n; k++) {
    const px = x + w - k * step, len = [16, 8, 22, 10, 14][k % 5];
    d += ` C${px - 2} ${y + 12 + len} ${px - step + 2} ${y + 12 + len} ${px - step} ${y + 12}`;
  }
  return `<path d="${d} V${y + 8} Q${x} ${y} ${x + 6} ${y} Z" fill="${color}"/>
    <path d="M${x + 10} ${y + 4} H${x + w - 10}" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/>`;
}
const dollop = (x, y, c = "#fff", s = "#f0c3d3") =>
  `<g transform="translate(${x} ${y})"><circle r="7.5" fill="${c}" stroke="${s}" stroke-width="1.2"/><circle cy="-6" r="5" fill="${c}" stroke="${s}" stroke-width="1.2"/><circle cy="-10.5" r="2.6" fill="${c}" stroke="${s}" stroke-width="1"/></g>`;

function cakeSVG(animated) {
  const uid = animated ? "B" : "S";
  const a = (cls, i) => (animated ? ` class="${cls}" style="--i:${i}"` : "");
  const tiers = CK_TIERS.map(([x, y, w, h, c, drip], i) => {
    let deco = "";
    if (i === 0) {
      deco += `<rect x="${x}" y="${y + 50}" width="${w}" height="14" fill="#f48fb1" stroke="#e5719b" stroke-width="1.2"/>
        <rect x="${x}" y="${y + 55}" width="${w}" height="2" fill="#fff" opacity=".5"/>
        <use href="#sym-bow" x="${150 - 30}" y="${y + 40}" width="60" height="40"/>`;
      deco += Array.from({ length: 11 }, (_, k) => `<circle cx="${x + 12 + k * 20.4}" cy="${y + h - 9}" r="4.5" fill="#fff" stroke="#f0bfd0"/>`).join("");
    }
    if (i === 1) {
      deco += Array.from({ length: 12 }, (_, k) => `<path d="M${x + k * (w / 12)} ${y + h} a${w / 24} ${w / 24} 0 0 1 ${w / 12} 0" fill="#fff" stroke="#f3c4d4" stroke-width="1"/>`).join("");
      deco += [0, 1, 2, 3].map((k) => `<text x="${x + 26 + k * 40}" y="${y + 48}" font-size="17" fill="#f08bab" text-anchor="middle">♥</text>`).join("");
    }
    if (i === 2) deco += [0, 1, 2, 3, 4].map((k) => `<circle cx="${x + 14 + k * 20}" cy="${y + 44}" r="3" fill="#fff" opacity=".85"/>`).join("");
    return `<g${a("ck-drop", i)}>
      <defs><linearGradient id="ckG${uid}${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="url(#ckG${uid}${i})" stroke="#e48aab" stroke-width="2"/>
      <rect x="${x + 8}" y="${y + 18}" width="9" height="${h - 30}" rx="4.5" fill="#fff" opacity=".35"/>
      ${deco}
      <g${a("ck-drip", i)}>${ckDrip(x, y, w, drip)}</g>
      ${animated ? `<g class="ck-dust" style="--i:${i}">${[[x + 4, -1], [x + w - 4, 1]].map(([dx, dir]) =>
        [0, 1, 2].map((k) => `<circle cx="${dx}" cy="${y + h - 4 - k * 6}" r="${6 - k}" style="--dx:${dir * (14 + k * 8)}px;--dy:${-6 - k * 6}px"/>`).join("")).join("")}</g>` : ""}
    </g>`;
  }).join("");
  const dollops = [[44, 236], [260, 236], [74, 166], [226, 166]].map(([x, y], i) =>
    `<g${a("ck-pop", i)}>${dollop(x, y)}</g>`).join("");
  const berries = [[106, 106], [132, 100], [168, 100], [194, 106]].map(([x, y], i) =>
    `<g transform="translate(${x} ${y})"><g${a("ck-pop", i + 4)}><path d="M0 -8 C9 -8 10 4 0 10 C-10 4 -9 -8 0 -8 Z" fill="#ef5f8a" stroke="#d64473" stroke-width="1"/><circle cx="-3" cy="-1" r=".9" fill="#ffe08a"/><circle cx="3" cy="2" r=".9" fill="#ffe08a"/><circle cx="0" cy="-4" r=".9" fill="#ffe08a"/><path d="M-5 -8 L0 -12 L5 -8 L0 -6 Z" fill="#7fbf76"/></g></g>`).join("");
  const sprinkles = [[60, 290], [236, 282], [90, 200], [210, 196], [120, 146], [182, 150], [150, 300], [110, 296], [196, 300]].map(([x, y], i) =>
    `<g transform="translate(${x} ${y}) rotate(${i * 47})"><rect${a("ck-pop", i + 8)} x="-5" y="-1.5" width="10" height="3" rx="1.5" fill="${["#f7d36b", "#9fd3f0", "#c9a6f2", "#fff"][i % 4]}"/></g>`).join("");
  const candles = [[124, "2"], [176, "2"]].map(([x, ch], i) => `
    <g${a("ck-candle", i)}>
      <text x="${x}" y="102" font-family="Fredoka, Poppins, sans-serif" font-weight="700" font-size="58" text-anchor="middle"
        fill="url(#ckCandle${uid})" stroke="#e5719b" stroke-width="3" paint-order="stroke">${ch}</text>
      <rect x="${x - 1.5}" y="42" width="3" height="10" fill="#7a3a64"/>
      <g transform="translate(${x} 42)"><g class="ck-flame${animated ? " lit" : ""}" style="--i:${i}">
        <path d="M0 -28 C11 -15 11 -2 0 0 C-11 -2 -11 -15 0 -28 Z" fill="url(#ckFlame${uid})"/>
        <ellipse cy="-7" rx="3.2" ry="5.5" fill="#fff8d6"/>
      </g>${animated ? `<g class="ck-spark" style="--i:${i}"><path d="M0 -12 L3 -3 L12 0 L3 3 L0 12 L-3 3 L-12 0 L-3 -3 Z" fill="#fff3b0" stroke="#ffc35a" stroke-width="1"/></g>` : ""}<g class="ck-smoke"><circle cy="-10" r="5"/><circle cx="4" cy="-22" r="6"/><circle cx="-3" cy="-36" r="7"/></g></g>
    </g>`).join("");
  const twinkles = animated ? CK_TWINKLES.map(([x, y, s], i) => twinkle(x, y, s, i, a)).join("") : "";
  return `<svg viewBox="0 0 300 384" aria-hidden="true">
    <defs>
      <radialGradient id="ckFlame${uid}" cx=".5" cy=".75" r=".7"><stop offset="0" stop-color="#fff6c2"/><stop offset=".5" stop-color="#ffc35a"/><stop offset="1" stop-color="#ff7b3a"/></radialGradient>
      <linearGradient id="ckCandle${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#ffe3ee"/><stop offset="1" stop-color="#fff"/></linearGradient>
      <linearGradient id="ckStand${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f6e3ea"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#ead1da"/></linearGradient>
    </defs>
    <g${a("ck-plate", 0)}>
      <ellipse cx="150" cy="376" rx="62" ry="7" fill="url(#ckStand${uid})" stroke="#e7c4d1" stroke-width="1.5"/>
      <path d="M136 334 L132 374 H168 L164 334 Z" fill="url(#ckStand${uid})" stroke="#e7c4d1" stroke-width="1.5"/>
      ${Array.from({ length: 16 }, (_, k) => `<circle cx="${22 + k * 17}" cy="${334 + Math.sin((k / 15) * Math.PI) * 6}" r="7" fill="#fff" stroke="#efc6d6" stroke-width="1.2"/>`).join("")}
      <ellipse cx="150" cy="326" rx="136" ry="16" fill="url(#ckStand${uid})" stroke="#efc6d6" stroke-width="2"/>
      <ellipse cx="150" cy="322" rx="120" ry="9" fill="#fdeef4"/>
    </g>
    ${tiers}${dollops}${berries}${sprinkles}${candles}${twinkles}
    ${animated ? `<g class="ck-wind" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round">
      <path pathLength="1" d="M300 30 C240 22 200 40 150 34 S70 20 20 30"/>
      <path pathLength="1" d="M300 52 C250 46 210 60 160 54 S90 44 40 52"/>
      <path pathLength="1" d="M300 14 C260 10 220 20 180 16"/></g>` : ""}
  </svg>`;
}

function setupCake() {
  $("#ckSmall").innerHTML = cakeSVG(false);
}
let cakeBlown = false, balloonTimer = null;
function openCake() {
  const m = $("#cakeModal");
  cakeBlown = false;
  $("#ckBig").classList.remove("blown", "happy");
  $("#ckBig").innerHTML = cakeSVG(true);
  $("#ckTitle").innerHTML = `Make a wish, <span class="js-first">${$(".js-first").textContent}</span>!`;
  $("#ckNote").textContent = "Tap the candles to blow them out 🕯️";
  $("#ckTitle").classList.remove("pop");
  flyFrom($("#cakeBtn"), m);
  m.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => m.classList.add("on")));
}
function blowCandles() {
  if (cakeBlown) return;
  cakeBlown = true;
  const big = $("#ckBig");
  big.classList.add("blown"); // wind sweeps, flames lean and go out, smoke
  setTimeout(() => {
    big.classList.add("happy");
    const t = $("#ckTitle");
    t.textContent = "Happy 22nd Birthday! 🎉";
    t.classList.remove("pop");
    void t.offsetWidth; // restart the pop animation
    t.classList.add("pop");
    $("#ckNote").textContent = "Your wish will come true 💖";
    burstConfetti(300);
    for (let i = 0; i < 6; i++)
      setTimeout(() => firework(innerWidth * (0.15 + Math.random() * 0.7), innerHeight * (0.12 + Math.random() * 0.35)), i * 280);
    for (let i = 0; i < 10; i++) setTimeout(riseBalloon, i * 200);
    clearInterval(balloonTimer);
    balloonTimer = setInterval(riseBalloon, 650);
  }, 900);
}
function closeCake() {
  const m = $("#cakeModal");
  m.classList.remove("on");
  clearInterval(balloonTimer);
  setTimeout(() => { m.hidden = true; $("#ckBig").classList.remove("blown", "happy"); }, 650);
}
$("#cakeBtn").addEventListener("click", openCake);
$("#cakeModal").addEventListener("click", (e) => {
  // tapping the cake blows the candles; tapping anywhere else closes
  if (e.target.closest("#ckBig") && !cakeBlown) blowCandles();
  else closeCake();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#cakeModal").hidden) closeCake();
});

/* ---------- Cody the dog: tap for zoomies, paw prints and a message ---------- */
const CODY_LINES = [
  () => "Woof! Happy birthday, Bebe Shane! 🐶💕",
  () => "I'm Cody! 🐾 Happy 22nd!",
  () => "Arf arf! Is it cake time? 🎂",
  () => "Sending puppy kisses 💋🐶",
  () => "Bebe Shane is my favorite human 💖",
  () => "Bark if you're 22! 🎉",
];
let codyLine = 0, codyTimer = null;
$("#codyBtn").addEventListener("click", () => {
  const d = $("#codyBtn"), b = $("#codyBubble");
  d.classList.remove("happy");
  void d.offsetWidth; // restart the hop if tapped again quickly
  d.classList.add("happy");
  b.textContent = CODY_LINES[codyLine++ % CODY_LINES.length]();
  b.classList.add("on");
  const r = d.getBoundingClientRect();
  fxBurst(r.left + r.width / 2, r.top + r.height * 0.35, ["🐾", "🦴", "💕", "✨", "🐾", "💖"], 16, 95);
  clearTimeout(codyTimer);
  codyTimer = setTimeout(() => { d.classList.remove("happy"); b.classList.remove("on"); }, 2800);
});

/* ---------- Closing: rose + lavender bouquets and the teddy, each opens a popup ---------- */
$("#clRoses").insertAdjacentHTML("afterbegin", bouquetSVG(false, BQ_SPECS.roses));
$("#closingTulips").insertAdjacentHTML("afterbegin", bouquetSVG(false, BQ_SPECS.lavender));
$("#clRoses").addEventListener("click", () => { $("#clRoses").classList.add("tapped"); openBouquet("roses", $("#clRoses")); });
$("#closingTulips").addEventListener("click", () => { $("#closingTulips").classList.add("tapped"); openBouquet("lavender", $("#closingTulips")); });

const TEDDY_LINES = ["Beary happy birthday! 🧸💕", "Sending you a big bear hug 🤗", "You're unbearably cute 💖", "22 hugs for you! 🧸✨"];
let teddyLine = 0, teddyTimer = null, teddyRise = null;
function openTeddy() {
  const m = $("#teddyModal");
  $("#clTeddy").classList.add("tapped");
  $("#tdBig").innerHTML = `<div class="cl-teddy td-in"><span class="k-bubble" id="tdBubble"></span>${$("#clTeddy svg").outerHTML}</div>`;
  $("#tdNote").textContent = "Tap the teddy for a hug 💕";
  flyFrom($("#clTeddy"), m);
  m.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => m.classList.add("on")));
  setTimeout(() => burstConfetti(100), 600);
  teddyRise = setInterval(() => riseItem($("#tdFloat"), ["💕", "💗", "🧸", "🤍", "✨"]), 380);
}
function closeTeddy() {
  const m = $("#teddyModal");
  m.classList.remove("on");
  clearInterval(teddyRise);
  setTimeout(() => { m.hidden = true; $("#tdFloat").innerHTML = ""; }, 650);
}
// heart-shaped burst and an expanding heart outline
function heartBurst(cx, cy, n, size, icons) {
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3, y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    const p = document.createElement("span");
    p.className = "fx-p";
    p.textContent = icons[i % icons.length];
    p.style.left = cx + "px";
    p.style.top = cy + "px";
    p.style.setProperty("--x", x * size + "px");
    p.style.setProperty("--y", y * size + "px");
    p.style.setProperty("--r", "0deg");
    p.style.setProperty("--s", "1");
    p.style.setProperty("--d", "1.2s");
    p.style.fontSize = "16px";
    fxLayer.appendChild(p);
    setTimeout(() => p.remove(), 1400);
  }
}
function heartRing(cx, cy) {
  const r = document.createElement("i");
  r.className = "fx-heartring";
  r.style.left = cx + "px";
  r.style.top = cy + "px";
  r.innerHTML = '<svg viewBox="0 0 40 36"><path d="M20 34 C6 24 1 17 1 10 C1 4 6 1 11 1 C15 1 18 3 20 7 C22 3 25 1 29 1 C34 1 39 4 39 10 C39 17 34 24 20 34 Z" fill="none" stroke="#f48fb1" stroke-width="2.4"/></svg>';
  fxLayer.appendChild(r);
  setTimeout(() => r.remove(), 1100);
}
const TEDDY_ACTS = [
  { cls: "r-hug", line: "Big bear hug for you! 🤗💕" },
  { cls: "r-twirl", line: "Wheee! Happy birthday! 💫" },
  { cls: "r-kiss", line: "Mwah! Sending kisses 💋" },
  { cls: "r-dance", line: "Let's dance, it's your day! 🎶" },
];
let teddyAct = 0;
function hugTeddy() {
  const t = $(".td-in"), b = $("#tdBubble");
  const act = TEDDY_ACTS[teddyAct++ % TEDDY_ACTS.length];
  t.classList.remove("hug", ...TEDDY_ACTS.map((x) => x.cls));
  void t.offsetWidth; // restart the animation on every tap
  t.classList.add("hug", act.cls);
  b.textContent = act.line;
  b.classList.add("on");
  $("#tdNote").textContent = "Tap again for another surprise! 🥰";
  const r = t.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height * 0.55;
  if (act.cls === "r-hug") {
    setTimeout(() => { heartRing(cx, cy); heartBurst(cx, cy - 20, 24, 7, ["💗", "💕", "💖"]); }, 450);
  } else if (act.cls === "r-twirl") {
    setTimeout(() => fxBurst(cx, cy, ["✨", "💫", "⭐", "✦"], 20, 150), 500);
  } else if (act.cls === "r-kiss") {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        const k = document.createElement("i");
        k.className = "fx-kiss";
        k.textContent = i % 2 ? "💋" : "💗";
        k.style.left = cx + "px";
        k.style.top = r.top + r.height * 0.45 + "px";
        k.style.setProperty("--kx", (Math.random() * 160 - 80).toFixed(0) + "px");
        fxLayer.appendChild(k);
        setTimeout(() => k.remove(), 1600);
      }, 350 + i * 120);
    }
  } else {
    for (let i = 0; i < 8; i++) setTimeout(() => riseItem($("#tdFloat"), ["🎵", "🎶", "♪", "💕"]), i * 150);
  }
  clearTimeout(teddyTimer);
  teddyTimer = setTimeout(() => { t.classList.remove("hug", act.cls); b.classList.remove("on"); }, 2600);
}
$("#clTeddy").addEventListener("click", openTeddy);
$("#teddyModal").addEventListener("click", (e) => (e.target.closest(".td-in") ? hugTeddy(e) : closeTeddy()));

/* ---------- Just for you shortcake: tap to take a bite ---------- */
$("#jfCake").addEventListener("click", () => {
  const c = $("#jfCake");
  if (c.classList.contains("bite")) return;
  c.classList.add("bite", "tapped");
  setTimeout(() => {
    const r = c.getBoundingClientRect();
    fxBurst(r.left + r.width * 0.2, r.top + r.height * 0.55, ["·", "•", "🍓", "✨", "💕"], 12, 60);
  }, 450);
  setTimeout(() => c.classList.remove("bite"), 2800);
});

/* ---------- Pretty Girl heart: pearl marquee + tap for compliments ---------- */
(() => {
  const path = $("#heartPath"), g = $("#hPearls");
  const len = path.getTotalLength(), n = 38;
  let html = "";
  for (let i = 0; i < n; i++) {
    const pt = path.getPointAtLength((i / n) * len);
    html += `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="${i % 2 ? 3 : 4}" style="--i:${i}"/>`;
  }
  g.innerHTML = html;
})();
const HEART_LINES = ["Pretty! 💕", "Gorgeous ✨", "So lovely 💖", "Stunning 🌸", "Cutie ♡", "22 & glowing ✨"];
let heartLine = 0;
$("#heartSvg").addEventListener("click", (e) => {
  const w = $(".heart-wrap");
  w.classList.remove("tapped");
  void w.offsetWidth;
  w.classList.add("tapped");
  const b = $("#heartBubble");
  b.textContent = HEART_LINES[heartLine++ % HEART_LINES.length];
  b.parentElement.classList.add("talk");
  fxBurst(e.clientX, e.clientY, ["💕", "💖", "💗", "✨", "♡"], 18, 120);
  fxRing(e.clientX, e.clientY);
  clearTimeout(w._t);
  w._t = setTimeout(() => { w.classList.remove("tapped"); b.textContent = "♥"; b.parentElement.classList.remove("talk"); }, 2600);
});

/* ---------- Balloon bunches in the Photos section (tap one to pop it) ---------- */
function photoBunch(id, shift) {
  const P = BALLOON_PINKS;
  const heart = "M40 74 C16 58 4 42 4 27 C4 12 15 3 27 3 C34 3 38 8 40 13 C42 8 46 3 53 3 C65 3 76 12 76 27 C76 42 64 58 40 74 Z";
  const star = "M40 2 L50 26 L76 28 L56 45 L63 72 L40 57 L17 72 L24 45 L4 28 L30 26 Z";
  const foil = (shape, x, y, sc, c, k) => `
    <defs><linearGradient id="${id}f${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset=".35" stop-color="#fff"/><stop offset=".55" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient></defs>
    <g transform="translate(${x - 40 * sc} ${y - 40 * sc}) scale(${sc})">
      <path d="${shape}" fill="url(#${id}f${k})" stroke="${c[2]}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M18 20 L28 12 M22 32 L40 18" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".75"/></g>`;
  const items = [ // [kind, x, y, size, colour]
    ["round", 36, 64, 1, P[(0 + shift) % 4]],
    ["heart", 104, 60, .62, P[(2 + shift) % 4]],
    ["round", 70, 40, 1.08, P[(1 + shift) % 4]],
    ["star", 46, 104, .46, P[(3 + shift) % 4]],
    ["round", 94, 100, .8, P[(3 + shift) % 4]],
  ];
  const strings = items.map(([, x, y, sz]) =>
    `<path class="pb-str" d="M${x} ${y + 30 * sz} C${x + 6} ${y + 60} ${70 - 6} ${150} 70 168" fill="none" stroke="#e8a8bf" stroke-width="1.3"/>`).join("");
  const balloons = items.map(([kind, x, y, sz, c], k) => {
    let body;
    if (kind === "round") body = latexBalloon(`${id}r${k}`, c, x, y, 22 * sz, 27 * sz) +
      `<path d="M${x - 3} ${y + 27 * sz} h6 l-2 5 h-2 Z" fill="${c[2]}"/>`;
    else body = foil(kind === "heart" ? heart : star, x, y, sz, c, k);
    return `<g class="pb-b" style="--k:${k}">${body}</g>`;
  }).join("");
  return `<svg viewBox="0 0 140 190" aria-hidden="true">${strings}${balloons}
    <use href="#sym-bow" x="52" y="160" width="36" height="24"/></svg>`;
}
$("#pb1").insertAdjacentHTML("beforeend", photoBunch("pbA", 0));
$("#pb2").innerHTML = photoBunch("pbB", 2);
document.querySelectorAll(".ph-balloons").forEach((bunch) => {
  bunch.addEventListener("click", (e) => {
    const b = e.target.closest(".pb-b");
    if (!b || b.classList.contains("popped")) return;
    b.classList.add("popped");
    bunch.classList.add("tapped");
    fxBurst(e.clientX, e.clientY, ["✨", "💖", "🎉", "💕", "✦"], 14, 80);
    fxRing(e.clientX, e.clientY);
    setTimeout(() => {
      b.classList.remove("popped");
      b.classList.add("regrow");
      setTimeout(() => b.classList.remove("regrow"), 700);
    }, 2400);
  });
});

/* ---------- Butterflies leave a little sparkle trail ---------- */
setInterval(() => {
  if (document.hidden || !document.body.classList.contains("opened")) return;
  document.querySelectorAll(".bfly").forEach((b) => {
    const r = b.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return; // only while on screen
    const t = document.createElement("i");
    t.className = "bf-trail";
    t.textContent = Math.random() < .5 ? "✦" : "·";
    t.style.left = r.left + r.width / 2 + (Math.random() * 10 - 5) + "px";
    t.style.top = r.top + r.height / 2 + "px";
    t.style.color = b.classList.contains("b2") ? "#c9b2f2" : "#f7a8c4";
    fxLayer.appendChild(t);
    setTimeout(() => t.remove(), 1200);
  });
}, 180);

$("#toTop").addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));

/* ---------- Secret letter (password is checked by the Python server) ---------- */
let secretOpen = false, scHeartTimer = null;
function openSecret() {
  const m = $("#secretModal");
  $("#secretBtn").classList.add("tapped");
  $("#scHint").textContent = data.secret_hint ? `Hint: ${data.secret_hint}` : "";
  if (!secretOpen) { $("#scLockView").hidden = false; $("#scLetterView").hidden = true; }
  $("#scMsg").textContent = "";
  flyFrom($("#secretBtn"), m);
  m.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => m.classList.add("on")));
  if (!secretOpen) setTimeout(() => $("#scPass").focus(), 500);
}
function closeSecret() {
  const m = $("#secretModal");
  m.classList.remove("on");
  stopSecretSong();
  setTimeout(() => {
    m.hidden = true;
    // lock it again: the password is needed every time it is opened
    secretOpen = false;
    $("#scLockView").hidden = false;
    $("#scLetterView").hidden = true;
    $("#scText").textContent = "";
    // forget the photo again until the password is entered next time
    $("#secretModal").classList.remove("has-photo");
    $("#scPhotoBg").style.backgroundImage = "";
    $("#scPhoto").removeAttribute("src");
    $("#scPolaroid").hidden = true;
    $("#scFlies").innerHTML = "";
    $("#scPass").value = "";
    $("#scPass").type = "password";
    $("#scEye").classList.remove("shown");
    $("#scEye").hidden = true;
    clearInterval(scHeartTimer);
    $("#scHearts").innerHTML = "";
    $(".sc-env").classList.remove("go", "reading");
    $("#scBigLock").classList.remove("open", "nope");
    $("#secretBtn").classList.remove("unlocked");
  }, 650);
}
// the show-password eye only appears once something is typed
$("#scPass").addEventListener("input", () => ($("#scEye").hidden = !$("#scPass").value));
$("#secretBtn").addEventListener("click", openSecret);
$("#secretModal").addEventListener("click", (e) => {
  if (!e.target.closest(".sc-lockview, .sc-env")) closeSecret();
});
$("#scEye").addEventListener("click", () => {
  const i = $("#scPass");
  i.type = i.type === "password" ? "text" : "password";
  $("#scEye").classList.toggle("shown", i.type === "text");
  $("#scEye").setAttribute("aria-label", i.type === "text" ? "Hide password" : "Show password");
});
$("#scForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const pass = $("#scPass").value.trim();
  if (!pass) return;
  const msg = $("#scMsg"), lock = $("#scBigLock");
  msg.textContent = "Checking… 🔐";
  let res;
  try {
    const r = await fetch("/api/secret", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pass }) });
    res = await r.json();
  } catch {
    msg.textContent = "Can't reach the server 😢";
    return;
  }
  if (!res.ok) {
    lock.classList.remove("nope");
    void lock.offsetWidth;
    lock.classList.add("nope");
    $("#scPass").value = "";
    msg.textContent = res.wait ? `Too many tries 😅 wait ${res.wait}s and try again` : `Wrong password 💔 (${res.left} tries left)`;
    return;
  }
  // correct: unlock, then show the letter coming out of the envelope
  secretOpen = true;
  msg.textContent = "Unlocked! 💖";
  lock.classList.add("open");
  const r = lock.getBoundingClientRect();
  heartRing(r.left + r.width / 2, r.top + r.height / 2);
  fxBurst(r.left + r.width / 2, r.top + r.height / 2, ["💖", "✨", "💌", "💕"], 18, 120);
  burstConfetti(160);
  $("#secretBtn").classList.add("unlocked");
  setTimeout(() => {
    $("#scLockView").hidden = true;
    $("#scLetterView").hidden = false;
    $("#scTitle").textContent = res.title;
    if (res.song && res.song.id) playSecretSong(res.song);
    if (res.photo) {
      $("#scPhotoBg").style.backgroundImage = `url(${res.photo})`;
      $("#secretModal").classList.add("has-photo");
      $("#scPhoto").src = res.photo;
      $("#scPhotoCap").textContent = res.photo_caption || "";
      $("#scPolaroid").hidden = false;
    }
    $("#scFrom").textContent = res.from ? `— ${res.from}` : "";
    const env = $(".sc-env");
    env.classList.remove("go");
    void env.offsetWidth;
    env.classList.add("go");
    // seal cracks open with a sparkle
    setTimeout(() => {
      const r = env.querySelector(".sc-env-front").getBoundingClientRect();
      fxBurst(r.left + r.width / 2, r.top + r.height * .32, ["✨", "💖", "✦", "💕"], 16, 90);
    }, 650);
    setTimeout(() => env.classList.add("reading"), 2900); // envelope slides away so the whole letter shows
    // butterflies (same as the Photos section) flutter around and land on the letter
    $("#scFlies").innerHTML = "";
    [["b1", "f1"], ["b2", "f2"], ["b1", "f3"]].forEach(([k, cls]) => {
      const src = document.querySelector(`.mirror-wrap .bfly.${k}`);
      if (!src) return;
      const b = src.cloneNode(true);
      b.classList.add("sc-fly", cls);
      $("#scFlies").appendChild(b);
    });
    setTimeout(() => typeInto($("#scText"), $("#scPaper"), res.letter), 3300);
    clearInterval(scHeartTimer);
    setTimeout(() => { scHeartTimer = setInterval(() => riseItem($("#scHearts"), ["💗", "💕", "🤍", "✨"]), 520); }, 2600);
  }, 1100);
});
function typeInto(el, box, text) {
  const chars = Array.from(text);
  let i = 0;
  el.classList.remove("done");
  const tick = () => {
    el.textContent = chars.slice(0, ++i).join("");
    // only scroll once the text actually reaches the bottom of the paper
    const need = el.offsetTop + el.offsetHeight + 40 - box.clientHeight;
    if (need > box.scrollTop) box.scrollTop = need;
    if (i < chars.length) setTimeout(tick, /[.,!?\n]/.test(chars[i - 1]) ? 160 : 28);
    else el.classList.add("done");
  };
  tick();
}

/* ---------- Secret letter song: only plays while the secret letter is open ---------- */
let secretSong = null; // { index, time, wasPlaying } of the playlist song we paused
function playSecretSong(song) {
  if (!ytReady || secretSong) return;
  const cur = current();
  secretSong = {
    index: songIndex,
    time: cur && cur.type === "file" ? audio.currentTime : (yt.getCurrentTime ? yt.getCurrentTime() : 0),
    wasPlaying: isPlaying(),
  };
  audio.pause();
  wantPlay = true;
  yt.loadVideoById(song.id);
  $("#mcTitle").textContent = song.title;
  $("#mcArtist").textContent = song.artist || "";
  $("#mcArt").src = `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`;
  $("#mcCount").textContent = "💌 secret";
}
function stopSecretSong() {
  if (!secretSong) return;
  const back = secretSong;
  secretSong = null;
  wantPlay = back.wasPlaying;
  loadSong(back.index); // reloads the playlist song (plays it if it was playing)
  const s = current();
  if (s && s.type === "file") {
    audio.currentTime = back.time;
    if (back.wasPlaying) audio.play().catch(() => {});
  } else if (ytReady) {
    // jump back to where the playlist song was
    setTimeout(() => { try { yt.seekTo(back.time, true); if (!back.wasPlaying) yt.pauseVideo(); } catch {} }, 600);
  }
}

/* ---------- Lightbox ---------- */
let lbIndex = 0;
function openLightbox(i) {
  if (!data.photos.length) return;
  lbIndex = (i + data.photos.length) % data.photos.length;
  const p = data.photos[lbIndex];
  $("#lbImg").src = p.url;
  $("#lbCap").textContent = p.caption || "";
  $("#lightbox").hidden = false;
}
$(".lb-close").addEventListener("click", () => ($("#lightbox").hidden = true));
$(".lb-prev").addEventListener("click", () => openLightbox(lbIndex - 1));
$(".lb-next").addEventListener("click", () => openLightbox(lbIndex + 1));
$("#lightbox").addEventListener("click", (e) => {
  if (e.target.id === "lightbox") $("#lightbox").hidden = true;
});
document.addEventListener("keydown", (e) => {
  if ($("#lightbox").hidden) return;
  if (e.key === "Escape") $("#lightbox").hidden = true;
  if (e.key === "ArrowLeft") openLightbox(lbIndex - 1);
  if (e.key === "ArrowRight") openLightbox(lbIndex + 1);
});

/* ---------- Typewriter letter ---------- */
function typeLetter() {
  const el = $("#letterText");
  const paper = $("#paper");
  const chars = Array.from(data.config.message || "Happy birthday! 💖");
  let i = 0;
  const tick = () => {
    el.textContent = chars.slice(0, ++i).join("");
    paper.scrollTop = paper.scrollHeight;
    if (i < chars.length) setTimeout(tick, /[.,!?]/.test(chars[i - 1]) ? 200 : 32);
    else el.classList.add("done");
  };
  tick();
}

/* ---------- Music ----------
   Songs in the music/ folder play first, then the YouTube songs from config.json. */
const audio = $("#audio");
let playlist = [];
let songIndex = 0;
let wantPlay = false;
let yt = null;
let ytReady = false;
let ytErrors = 0;

function setupMusic() {
  playlist = [
    ...data.music.map((m) => ({ type: "file", title: m.name.replace(/\.[^.]+$/, ""), artist: "", url: m.url })),
    ...(data.config.youtube || []).map((y) => ({ type: "yt", title: y.title, artist: y.artist || "", id: y.id })),
  ];
  if (!playlist.length) {
    $("#mcTitle").textContent = "Add a song to the music folder 🎵";
    return;
  }
  if (playlist.some((s) => s.type === "yt")) loadYouTubeApi();
  loadSong(0);
}

function loadYouTubeApi() {
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}
window.onYouTubeIframeAPIReady = () => {
  const firstYt = playlist.find((s) => s.type === "yt");
  yt = new YT.Player("yt", {
    videoId: current().type === "yt" ? current().id : firstYt.id,
    width: "104",
    height: "58",
    playerVars: { playsinline: 1, controls: 0, rel: 0, modestbranding: 1, disablekb: 1 },
    events: {
      onReady: () => {
        ytReady = true;
        if (current().type === "yt" && wantPlay) yt.playVideo();
      },
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.PLAYING) {
          ytErrors = 0;
          setPlaying(true);
        }
        if (e.data === YT.PlayerState.PAUSED) setPlaying(false);
        if (e.data === YT.PlayerState.ENDED) {
          if (secretSong) { yt.seekTo(0, true); yt.playVideo(); }
          else nextSong();
        }
      },
      onError: (e) => {
        if (secretSong) return; // never skip the playlist because of the secret song
        console.warn("YouTube error", e.data, "on", current().title, "- skipping");
        // video not available -> skip, but stop if every song fails
        if (++ytErrors < playlist.length) nextSong();
      },
    },
  });
};

const current = () => playlist[songIndex];

function loadSong(i) {
  songIndex = (i + playlist.length) % playlist.length;
  const s = current();
  $("#mcTitle").textContent = s.title;
  $("#mcArtist").textContent = s.artist;
  $("#mcCount").textContent = `${songIndex + 1} / ${playlist.length}`;
  $("#mcTime").textContent = "0:00";
  $("#mcDur").textContent = "0:00";
  $("#mcLike").classList.remove("liked");
  $("#mcLike").textContent = "♡";
  // scroll long titles
  requestAnimationFrame(() => {
    const t = $("#mcTitle"), box = t.parentElement;
    const over = t.scrollWidth - box.clientWidth;
    t.classList.toggle("scroll", over > 4);
    t.style.setProperty("--over", -over - 8 + "px");
  });
  $("#mcProg").style.width = "0";
  const art = s.type === "yt" ? `https://i.ytimg.com/vi/${s.id}/hqdefault.jpg` : "";
  $("#mcArt").src = art;
  $("#vinylArt").src = art;
  $("#mcArt").style.visibility = art ? "visible" : "hidden";
  $("#ytWrap").hidden = s.type !== "yt";
  if (s.type === "file") {
    if (ytReady) yt.stopVideo();
    audio.src = s.url;
  } else {
    audio.pause();
    audio.removeAttribute("src");
    // load = load + play; cue = just prepare (when paused)
    if (ytReady) wantPlay ? yt.loadVideoById(s.id) : yt.cueVideoById(s.id);
  }
}

function playMusic() {
  wantPlay = true;
  const s = current();
  if (!s) return;
  if (s.type === "file") audio.play().catch(() => {});
  else if (ytReady) yt.playVideo();
}
function pauseMusic() {
  wantPlay = false;
  audio.pause();
  if (ytReady) yt.pauseVideo();
}
function isPlaying() {
  if (!current()) return false;
  if (current().type === "file") return !audio.paused;
  return ytReady && yt.getPlayerState() === YT.PlayerState.PLAYING;
}
function nextSong() {
  if (!playlist.length) return;
  loadSong(songIndex + 1);
  playMusic();
}
let noteTimer = null;
function setPlaying(on) {
  $("#playBtn").textContent = on ? "⏸" : "▶";
  document.body.classList.toggle("music-on", on);
  clearInterval(noteTimer);
  // little music notes float up from the player while a song plays
  if (on) noteTimer = setInterval(() => riseItem($("#mcNotes"), ["♪", "♫", "♬", "💗"], "rise mc-note"), 700);
}
const togglePlay = () => (isPlaying() ? pauseMusic() : playMusic());

audio.addEventListener("play", () => setPlaying(true));
audio.addEventListener("pause", () => setPlaying(false));
audio.addEventListener("ended", nextSong);
$("#playBtn").addEventListener("click", togglePlay);
$("#nextBtn").addEventListener("click", nextSong);
const fmtTime = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}`;
$("#prevBtn").addEventListener("click", () => {
  if (!playlist.length) return;
  loadSong(songIndex - 1);
  playMusic();
});
// tap the progress bar to jump to that part of the song
$("#mcBar").addEventListener("click", (e) => {
  const r = $("#mcBar").getBoundingClientRect(), frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  const s = current();
  if (!s) return;
  if (s.type === "file" && audio.duration) audio.currentTime = frac * audio.duration;
  else if (ytReady && yt.getDuration) yt.seekTo(frac * yt.getDuration(), true);
  $("#mcProg").style.width = frac * 100 + "%";
});
$("#mcLike").addEventListener("click", (e) => {
  const b = $("#mcLike");
  b.classList.toggle("liked");
  b.textContent = b.classList.contains("liked") ? "♥" : "♡";
  if (b.classList.contains("liked")) fxBurst(e.clientX, e.clientY, ["💖", "💕", "♥", "✨"], 12, 70);
});

// progress bar
setInterval(() => {
  const s = current();
  if (!s) return;
  let t = 0, d = 0;
  if (s.type === "file") { t = audio.currentTime; d = audio.duration; }
  else if (ytReady && yt.getDuration) { t = yt.getCurrentTime(); d = yt.getDuration(); }
  if (d > 0) {
    $("#mcProg").style.width = (t / d) * 100 + "%";
    $("#mcTime").textContent = fmtTime(t);
    $("#mcDur").textContent = fmtTime(d);
  }
}, 500);

// watchdog: the first YouTube play can be missed if the player wasn't fully
// ready at the moment of the tap, so keep nudging it until it actually starts
let stuckTicks = 0;
setInterval(() => {
  const s = current();
  if (!wantPlay || !s || s.type !== "yt" || !ytReady) return (stuckTicks = 0);
  const st = yt.getPlayerState();
  if (st === YT.PlayerState.UNSTARTED || st === YT.PlayerState.CUED) {
    if (++stuckTicks >= 2) {
      stuckTicks = 0;
      yt.playVideo();
    }
  } else stuckTicks = 0;
}, 1000);

/* ---------- Confetti ---------- */
const cv = $("#confetti");
const ctx = cv.getContext("2d");
let pieces = [];
let running = false;
const colors = ["#f48fb1", "#fbd3e2", "#ffffff", "#e5719b", "#ffc1d6", "#f7a8c4"];
function resize() {
  cv.width = innerWidth;
  cv.height = innerHeight;
}
addEventListener("resize", resize);
resize();
function burstConfetti(n) {
  for (let i = 0; i < n; i++) {
    pieces.push({
      x: innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: innerHeight * 0.4,
      vx: (Math.random() - 0.5) * 16,
      vy: Math.random() * -14 - 4,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)],
    });
  }
  if (!running) {
    running = true;
    requestAnimationFrame(step);
  }
}
function step() {
  ctx.clearRect(0, 0, cv.width, cv.height);
  pieces.forEach((p) => {
    p.vy += 0.35;
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.r += p.vr;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.r);
    ctx.fillStyle = p.c;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  });
  pieces = pieces.filter((p) => p.y < cv.height + 30);
  if (pieces.length) requestAnimationFrame(step);
  else {
    running = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
  }
}

load();
