/* Zajednički alati za dječje igre: zvuk, govor, konfete, crteži, razine. */
(function () {
  const K = (window.K = {});

  /* ---------- pomoćne ---------- */
  K.shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  K.pick = (a) => a[Math.floor(Math.random() * a.length)];
  K.rnd = (a, b) => a + Math.random() * (b - a);
  K.wait = (ms) => new Promise((r) => setTimeout(r, ms));
  K.store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  /* ---------- jezik ---------- */
  // Novi jezik: dodaj ga ovdje (voice = regex za glasove) i dodaj prijevod kao sljedeći argument u K.t(...)
  K.LANGS = [
    { code: 'hr', label: 'Hrvatski', short: 'HR', voice: [/^hr/i, /^(bs|sr-Latn|sh)/i] },
    { code: 'en', label: 'English', short: 'EN', voice: [/^en-GB/i, /^en/i] },
  ];
  K.lang = K.store.get('kids-lang', 'hr');
  if (!K.LANGS.some((l) => l.code === K.lang)) K.lang = 'hr';
  const LI = K.LANGS.findIndex((l) => l.code === K.lang);
  K.t = (...v) => (v[LI] != null ? v[LI] : v[0]);
  K.setLang = (c) => { K.store.set('kids-lang', c); location.reload(); };
  if (typeof document !== 'undefined') document.documentElement.lang = K.lang;

  /* ---------- zvuk ---------- */
  let ctx = null;
  K.muted = K.store.get('kids-muted', false);
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, vol, when, slide) {
    const c = ac(); if (!c || K.muted) return;
    const t = c.currentTime + (when || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, when, freq) {
    const c = ac(); if (!c || K.muted) return;
    const t = c.currentTime + (when || 0);
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1000; f.Q.value = 0.8;
    const g = c.createGain(); g.gain.value = vol || 0.3;
    s.connect(f).connect(g).connect(c.destination); s.start(t);
  }
  K.sfx = function (n) {
    switch (n) {
      case 'tap': tone(660, 0.08, 'triangle', 0.15); break;
      case 'flip': tone(520, 0.07, 'triangle', 0.12); tone(780, 0.07, 'triangle', 0.1, 0.05); break;
      case 'pop': noise(0.12, 0.5, 0, 1500); tone(900, 0.08, 'square', 0.05, 0, 0.4); break;
      case 'good': [523, 659, 784].forEach((f, i) => tone(f, 0.18, 'triangle', 0.18, i * 0.09)); break;
      case 'bad': tone(320, 0.18, 'sine', 0.15, 0, 0.75); tone(250, 0.22, 'sine', 0.13, 0.15, 0.75); break;
      case 'win': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.2, i * 0.12)); break;
      case 'crack': noise(0.07, 0.6, 0, 2500); tone(1800, 0.04, 'square', 0.04); break;
      case 'munch': [0, 0.13, 0.26].forEach((w) => noise(0.08, 0.4, w, 600)); break;
      case 'boing': tone(180, 0.35, 'sine', 0.25, 0, 3); break;
      case 'squeak': tone(1200, 0.12, 'sine', 0.15, 0, 1.6); tone(1500, 0.1, 'sine', 0.12, 0.12, 1.4); break;
      case 'roar': tone(150, 0.5, 'sawtooth', 0.1, 0, 0.6); noise(0.5, 0.2, 0, 400); break;
      case 'peek': tone(600, 0.12, 'sine', 0.18, 0, 1.6); break;
      case 'paint': noise(0.1, 0.25, 0, 3000); tone(400, 0.1, 'sine', 0.08, 0, 1.5); break;
      case 'snap': tone(880, 0.06, 'square', 0.07); tone(1320, 0.09, 'triangle', 0.13, 0.05); break;
      case 'whoosh': noise(0.3, 0.25, 0, 800); break;
    }
  };

  /* ---------- govor (samo ako uređaj ima glas za odabrani jezik) ---------- */
  function hrVoice() {
    if (!('speechSynthesis' in window)) return null;
    const vs = speechSynthesis.getVoices();
    for (const re of K.LANGS[LI].voice) {
      const m = vs.filter((v) => re.test(v.lang.replace('_', '-')));
      if (m.length) return m.find((v) => /natural|google|siri|premium|enhanced/i.test(v.name)) || m[0];
    }
    return null;
  }
  K.hasVoice = () => !!hrVoice();
  if ('speechSynthesis' in window) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); }
  K.say = function (text) {
    if (K.muted) return;
    const v = hrVoice(); if (!v) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = v; u.lang = v.lang; u.rate = 0.9; u.pitch = 1.15;
      speechSynthesis.speak(u);
    } catch (e) {}
  };

  /* ---------- konfete ---------- */
  K.confetti = function () {
    const c = document.createElement('canvas');
    c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:60';
    document.body.appendChild(c);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const cols = ['#ff5a4e', '#ffd23f', '#4aa3df', '#6cc04a', '#a77bdb', '#ff7eb6', '#ff9a3c'];
    const P = Array.from({ length: 160 }, () => ({
      x: innerWidth / 2 + K.rnd(-60, 60), y: innerHeight * 0.35, vx: K.rnd(-9, 9), vy: K.rnd(-15, -4),
      r: K.rnd(0, 6.3), vr: K.rnd(-0.3, 0.3), w: K.rnd(7, 13), h: K.rnd(4, 8), c: K.pick(cols),
    }));
    const t0 = performance.now();
    (function f(now) {
      const el = (now - t0) / 1000;
      g.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of P) {
        p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, 1 - el / 3);
        g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
      }
      if (el < 3) requestAnimationFrame(f); else c.remove();
    })(t0);
  };

  /* ---------- povlačenje ---------- */
  // opts.drop(x, y, el) -> true ako je prihvaćeno; opts.tap(el) za kratki dodir
  K.draggable = function (el, opts) {
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', (e) => {
      if (el.dataset.locked) return;
      e.preventDefault();
      ac();
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      const sx = e.clientX, sy = e.clientY;
      let moved = false;
      el._dx = 0; el._dy = 0;
      el.style.transition = 'none';
      el.style.zIndex = 30;
      opts.start && opts.start(el);
      const mv = (ev) => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (Math.abs(dx) + Math.abs(dy) > 8) moved = true;
        el._dx = dx; el._dy = dy;
        el.style.transform = `translate(${dx}px,${dy}px) scale(1.12)`;
      };
      const up = (ev) => {
        el.removeEventListener('pointermove', mv);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('pointercancel', up);
        let ok = false;
        if (!moved && opts.tap) ok = opts.tap(el);
        else if (moved && opts.drop) ok = opts.drop(ev.clientX, ev.clientY, el);
        if (!ok) { el.style.transition = 'transform .3s cubic-bezier(.3,1.5,.6,1)'; el.style.transform = ''; el.style.zIndex = ''; }
      };
      el.addEventListener('pointermove', mv);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    });
  };

  // pomakni (već povučeni) element tako da mu središte dođe na (x, y)
  K.flyTo = function (el, x, y, scale, ms) {
    const r = el.getBoundingClientRect();
    const tx = x - (r.left + r.width / 2) + (el._dx || 0), ty = y - (r.top + r.height / 2) + (el._dy || 0);
    el.style.transition = `transform ${ms || 450}ms ease-in, opacity ${ms || 450}ms ease-in`;
    el.style.transform = `translate(${tx}px,${ty}px) scale(${scale == null ? 1 : scale})`;
  };

  /* ---------- crteži ---------- */
  function hex(c) { c = c.replace('#', ''); return [0, 2, 4].map((i) => parseInt(c.substr(i, 2), 16)); }
  function mix(c, t, a) { const A = hex(c), B = hex(t); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * a).toString(16).padStart(2, '0')).join(''); }
  K.dark = (c, a) => mix(c, '#000000', a == null ? 0.25 : a);
  K.light = (c, a) => mix(c, '#ffffff', a == null ? 0.45 : a);

  const INK = '#2a2a33', IVORY = '#fff3d6';
  const eye = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x + r * 0.25}" cy="${y}" r="${r * 0.55}" fill="${INK}"/><circle cx="${x + r * 0.45}" cy="${y - r * 0.3}" r="${r * 0.18}" fill="#fff"/>`;
  const smile = (d) => `<path d="${d}" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  const legs = (xs, y, h, c) => xs.map((x) => `<rect x="${x}" y="${y}" width="9" height="${h}" rx="4" fill="${c}"/>`).join('');

  const DINO = {
    rex(c) {
      const d = K.dark(c), l = K.light(c);
      return `<path d="M8 66 Q28 52 44 56 L46 72 Q26 76 8 66Z" fill="${c}"/>${legs([38, 54], 70, 18, d)}
        <ellipse cx="50" cy="62" rx="22" ry="17" fill="${c}"/><ellipse cx="54" cy="67" rx="13" ry="8" fill="${l}"/>
        <ellipse cx="68" cy="36" rx="21" ry="15" fill="${c}"/>
        <path d="M66 62 L74 66" stroke="${d}" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M50 22 l4 -8 l4 8 M58 21 l4 -8 l4 8" fill="${d}"/>
        ${eye(73, 31, 5)}${smile('M76 43 Q82 46 87 41')}<circle cx="80" cy="39" r="3" fill="#ff8fa3" opacity=".6"/>`;
    },
    longneck(c) {
      const d = K.dark(c), l = K.light(c);
      return `<path d="M22 62 Q6 68 3 80 Q14 72 27 72Z" fill="${c}"/>${legs([27, 37], 70, 20, d)}${legs([53, 63], 70, 20, d)}
        <ellipse cx="46" cy="64" rx="27" ry="16" fill="${c}"/>
        <path d="M60 58 Q70 40 72 20 L83 20 Q81 46 71 66Z" fill="${c}"/>
        <ellipse cx="80" cy="18" rx="12" ry="8.5" fill="${c}"/>
        <circle cx="36" cy="56" r="3.5" fill="${l}"/><circle cx="47" cy="53" r="4.5" fill="${l}"/><circle cx="56" cy="58" r="3" fill="${l}"/>
        ${eye(83, 15, 3.8)}${smile('M84 23 Q88 25 91 22')}`;
    },
    trike(c) {
      const d = K.dark(c), l = K.light(c);
      return `<path d="M22 60 Q8 64 5 72 Q16 68 24 70Z" fill="${c}"/>${legs([25, 35], 70, 18, d)}${legs([52, 61], 70, 18, d)}
        <ellipse cx="45" cy="62" rx="26" ry="17" fill="${c}"/>
        <circle cx="68" cy="45" r="18" fill="${l}"/><circle cx="68" cy="45" r="18" fill="none" stroke="${d}" stroke-width="3" stroke-dasharray="4 5"/>
        <ellipse cx="76" cy="54" rx="15" ry="12" fill="${c}"/>
        <path d="M76 44 L88 28 L83 46Z M83 47 L98 40 L88 51Z M89 56 L97 52 L92 60Z" fill="${IVORY}"/>
        ${eye(80, 51, 4)}${smile('M84 61 Q88 63 91 60')}`;
    },
    stego(c) {
      const d = K.dark(c), l = K.light(c);
      return `<path d="M24 50 L30 36 L36 50Z M34 46 L42 30 L50 46Z M46 45 L55 29 L62 46Z M58 48 L66 35 L72 50Z" fill="${d}"/>
        <path d="M22 62 Q8 60 2 54 L6 66 Q14 70 24 70Z" fill="${c}"/><path d="M3 55 l-2 -8 l6 6Z M7 58 l0 -9 l5 7Z" fill="${IVORY}"/>
        ${legs([27, 37], 70, 18, d)}${legs([55, 64], 70, 18, d)}
        <ellipse cx="47" cy="62" rx="27" ry="16" fill="${c}"/><ellipse cx="50" cy="67" rx="15" ry="7" fill="${l}"/>
        <ellipse cx="80" cy="64" rx="12" ry="9" fill="${c}"/>
        ${eye(83, 61, 3.6)}${smile('M86 69 Q89 71 92 68')}`;
    },
    ptero(c) {
      const d = K.dark(c), l = K.light(c);
      return `<path d="M46 46 L6 30 Q14 52 44 62Z" fill="${d}"/><path d="M54 46 L94 30 Q86 52 56 62Z" fill="${d}"/>
        <path d="M46 48 L14 36 Q22 50 44 58Z M54 48 L86 36 Q78 50 56 58Z" fill="${l}" opacity=".5"/>
        <ellipse cx="50" cy="56" rx="10" ry="15" fill="${c}"/>
        <path d="M45 70 l-3 8 M55 70 l3 8" stroke="${d}" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="50" cy="36" r="11" fill="${c}"/><path d="M42 30 L30 20 L46 27Z" fill="${d}"/>
        <path d="M58 35 L78 40 L58 43Z" fill="${IVORY}"/>${eye(53, 33, 3.8)}`;
    },
    ankylo(c) {
      const d = K.dark(c), l = K.light(c);
      return `<path d="M22 64 L8 58" stroke="${c}" stroke-width="7" stroke-linecap="round"/><circle cx="7" cy="57" r="7" fill="${d}"/>
        ${legs([26, 36], 70, 14, d)}${legs([58, 67], 70, 14, d)}
        <ellipse cx="48" cy="64" rx="30" ry="14" fill="${c}"/>
        ${[26, 36, 46, 56, 66].map((x, i) => `<circle cx="${x}" cy="${53 + (i % 2) * 2}" r="4.5" fill="${l}"/>`).join('')}
        <ellipse cx="82" cy="66" rx="11" ry="8.5" fill="${c}"/>
        ${eye(85, 63, 3.5)}${smile('M87 71 Q90 73 93 70')}`;
    },
  };
  K.DINO_KINDS = ['rex', 'longneck', 'trike', 'stego', 'ptero', 'ankylo'];
  K.DINO_NAMES = { rex: 'T-rex', longneck: K.t('Brontosaur', 'Brontosaurus'), trike: 'Triceratops', stego: K.t('Stegosaur', 'Stegosaurus'), ptero: K.t('Pterodaktil', 'Pterodactyl'), ankylo: K.t('Ankilosaur', 'Ankylosaurus') };
  K.COLORS = { green: '#6cc04a', blue: '#4aa3df', orange: '#ff9a3c', purple: '#a77bdb', pink: '#ff7eb6', yellow: '#ffd23f', red: '#ff5a4e', teal: '#2ec4b6' };
  K.dinoInner = (kind, color) => DINO[kind](color);
  K.dino = (kind, color) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${DINO[kind](color)}</svg>`;

  /* psići s različitim zanimanjima */
  const HATS = {
    fire: `<path d="M24 36 Q50 4 76 36Z" fill="#e63946"/><rect x="20" y="33" width="60" height="7" rx="3.5" fill="#b8202c"/><circle cx="50" cy="24" r="6" fill="#ffd23f"/>`,
    police: `<path d="M27 32 Q50 12 73 32Z" fill="#2457a6"/><rect x="22" y="30" width="56" height="7" rx="3.5" fill="#17386d"/><path d="M50 18 l3 6 6 .5 -4.5 4 1.5 6 -6 -3.5 -6 3.5 1.5 -6 -4.5 -4 6 -.5z" fill="#ffd23f"/>`,
    doctor: `<path d="M28 32 Q50 14 72 32Z" fill="#fff" stroke="#ddd"/><rect x="45" y="17" width="10" height="14" fill="#e63946"/><rect x="43" y="19" width="14" height="10" fill="#e63946"/><rect x="45" y="19" width="10" height="10" fill="#e63946"/>`,
    pilot: `<path d="M27 36 Q50 12 73 36Z" fill="#8a5a33"/><circle cx="38" cy="32" r="7" fill="#9ad8ff" stroke="#555" stroke-width="2.5"/><circle cx="62" cy="32" r="7" fill="#9ad8ff" stroke="#555" stroke-width="2.5"/><rect x="44" y="30" width="12" height="3" fill="#555"/>`,
    chef: `<circle cx="38" cy="18" r="10" fill="#fff"/><circle cx="50" cy="13" r="11" fill="#fff"/><circle cx="62" cy="18" r="10" fill="#fff"/><rect x="31" y="20" width="38" height="14" rx="3" fill="#fff" stroke="#ddd"/>`,
    sailor: `<path d="M29 32 Q50 16 71 32Z" fill="#fff" stroke="#ddd"/><rect x="28" y="28" width="44" height="6" rx="3" fill="#2457a6"/>`,
    builder: `<path d="M26 35 Q50 8 74 35Z" fill="#ffd23f"/><rect x="20" y="32" width="60" height="6" rx="3" fill="#e0b000"/><rect x="47" y="12" width="6" height="21" fill="#e0b000"/>`,
    farmer: `<ellipse cx="50" cy="32" rx="34" ry="6" fill="#e9c46a"/><path d="M33 31 Q35 14 50 14 Q65 14 67 31Z" fill="#e9c46a"/><rect x="34" y="25" width="32" height="5" fill="#e63946"/>`,
    painter: `<ellipse cx="46" cy="27" rx="22" ry="9" fill="#a33ea1"/><circle cx="50" cy="18" r="3" fill="#a33ea1"/>`,
    king: `<path d="M30 34 L32 14 L41 24 L50 10 L59 24 L68 14 L70 34Z" fill="#ffd23f" stroke="#e0b000" stroke-width="2"/><circle cx="50" cy="26" r="3" fill="#e63946"/>`,
    magic: `<rect x="36" y="8" width="28" height="24" rx="2" fill="#333"/><ellipse cx="50" cy="32" rx="24" ry="5" fill="#333"/><rect x="36" y="24" width="28" height="5" fill="#a77bdb"/>`,
    party: `<path d="M38 32 L50 4 L62 32Z" fill="#ff7eb6"/><path d="M42 24 L58 24 M46 15 L55 15" stroke="#ffd23f" stroke-width="3"/><circle cx="50" cy="5" r="4" fill="#4aa3df"/>`,
  };
  K.PUPS = [
    { role: 'fire', fur: '#d9a066', vest: '#e63946', name: K.t('Vatrogasac', 'Firefighter') },
    { role: 'police', fur: '#6b4a2f', vest: '#2457a6', name: K.t('Policajac', 'Police officer') },
    { role: 'doctor', fur: '#f1e3c8', vest: '#ffffff', name: K.t('Doktor', 'Doctor') },
    { role: 'pilot', fur: '#a8a8a8', vest: '#8a5a33', name: K.t('Pilot', 'Pilot') },
    { role: 'chef', fur: '#f5c26b', vest: '#ffffff', name: K.t('Kuhar', 'Chef') },
    { role: 'sailor', fur: '#e0c9a6', vest: '#2457a6', name: K.t('Mornar', 'Sailor') },
    { role: 'builder', fur: '#c47a3a', vest: '#ff9a3c', name: K.t('Graditelj', 'Builder') },
    { role: 'farmer', fur: '#8d6e63', vest: '#6cc04a', name: K.t('Farmer', 'Farmer') },
    { role: 'painter', fur: '#f7f2e8', vest: '#a33ea1', name: K.t('Slikar', 'Painter') },
    { role: 'king', fur: '#e8b04a', vest: '#e63946', name: K.t('Kralj', 'King') },
    { role: 'magic', fur: '#555555', vest: '#a77bdb', name: K.t('Čarobnjak', 'Magician') },
    { role: 'party', fur: '#ffb38a', vest: '#2ec4b6', name: K.t('Slavljenik', 'Party pup') },
  ];
  K.pup = function (p) {
    const d = K.dark(p.fur, 0.3), l = K.light(p.fur, 0.55);
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="86" rx="23" ry="15" fill="${p.fur}"/><path d="M30 80 Q50 92 70 80 L68 92 Q50 100 32 92Z" fill="${p.vest}" stroke="${K.dark(p.vest, 0.2)}" stroke-width="1.5"/>
      <ellipse cx="27" cy="46" rx="9" ry="17" transform="rotate(22 27 46)" fill="${d}"/><ellipse cx="73" cy="46" rx="9" ry="17" transform="rotate(-22 73 46)" fill="${d}"/>
      <circle cx="50" cy="50" r="24" fill="${p.fur}"/>
      <ellipse cx="50" cy="61" rx="13" ry="9.5" fill="${l}"/>
      <ellipse cx="50" cy="55.5" rx="5.5" ry="4" fill="${INK}"/>
      <path d="M50 59 V63 M44 63 Q50 68 56 63" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <circle cx="41" cy="47" r="4.6" fill="${INK}"/><circle cx="42.4" cy="45.6" r="1.5" fill="#fff"/>
      <circle cx="59" cy="47" r="4.6" fill="${INK}"/><circle cx="60.4" cy="45.6" r="1.5" fill="#fff"/>
      <circle cx="35" cy="57" r="3.5" fill="#ff8fa3" opacity=".55"/><circle cx="65" cy="57" r="3.5" fill="#ff8fa3" opacity=".55"/>
      ${HATS[p.role]}</svg>`;
  };

  /* emoji životinje s hrvatskim imenima */
  K.ANIMALS = [
    { e: '🐘', n: K.t('slon', 'elephant') }, { e: '🦒', n: K.t('žirafa', 'giraffe') }, { e: '🐄', n: K.t('krava', 'cow') }, { e: '🐖', n: K.t('svinja', 'pig') },
    { e: '🐑', n: K.t('ovca', 'sheep') }, { e: '🐔', n: K.t('kokoš', 'chicken') }, { e: '🐴', n: K.t('konj', 'horse') }, { e: '🦆', n: K.t('patka', 'duck') },
    { e: '🐇', n: K.t('zec', 'rabbit') }, { e: '🐢', n: K.t('kornjača', 'turtle') }, { e: '🐬', n: K.t('dupin', 'dolphin') }, { e: '🐙', n: K.t('hobotnica', 'octopus') },
    { e: '🦀', n: K.t('rak', 'crab') }, { e: '🐌', n: K.t('puž', 'snail') }, { e: '🦋', n: K.t('leptir', 'butterfly') }, { e: '🐝', n: K.t('pčela', 'bee') },
    { e: '🐈', n: K.t('mačka', 'cat') }, { e: '🐕', n: K.t('pas', 'dog') }, { e: '🦁', n: K.t('lav', 'lion') }, { e: '🐻', n: K.t('medvjed', 'bear') },
    { e: '🐸', n: K.t('žaba', 'frog') }, { e: '🐧', n: K.t('pingvin', 'penguin') }, { e: '🦉', n: K.t('sova', 'owl') }, { e: '🐿️', n: K.t('vjeverica', 'squirrel') },
  ];

  /* ---------- gornja traka: natrag + zvuk ---------- */
  const css = `
  .k-bar{position:fixed;z-index:40;top:calc(env(safe-area-inset-top,0px) + 10px);left:max(12px,env(safe-area-inset-left,0px));right:max(12px,env(safe-area-inset-right,0px));display:flex;gap:8px;justify-content:space-between;pointer-events:none}
  .k-btn{pointer-events:auto;display:inline-flex;align-items:center;gap:6px;min-height:46px;padding:0 18px;border:0;border-radius:999px;background:rgba(255,255,255,.94);color:#173b52;font:800 18px/1 'Nunito',system-ui,sans-serif;text-decoration:none;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.15)}
  .k-btn:active{transform:scale(.95)}
  .k-ov{position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:76px 16px 16px;overflow:auto;background:rgba(10,30,50,.45)}
  .k-card{background:#fff;border-radius:28px;padding:24px;width:100%;max-width:560px;box-shadow:0 20px 60px rgba(0,0,0,.35);text-align:center;font-family:'Nunito',system-ui,sans-serif;color:#173b52}
  .k-card h2{font:800 clamp(32px,7vw,46px)/1 'Baloo 2','Trebuchet MS',system-ui,sans-serif;margin:0 0 6px}
  .k-card p{margin:0 0 16px;font-size:17px;color:#4d6b7c}
  .k-levels{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:12px}
  .k-lv{border:0;border-radius:22px;padding:12px 6px 10px;background:#eef7fb;color:#173b52;cursor:pointer;font:800 34px/1 'Baloo 2',system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;gap:4px;box-shadow:inset 0 -5px 0 rgba(0,0,0,.08)}
  .k-lv small{font:800 13px/1.2 'Nunito',system-ui,sans-serif;color:#4d6b7c}
  .k-lv .st{font-size:18px;line-height:1;min-height:18px}
  .k-lv.done{background:#fff3c4}
  .k-lv:active{transform:scale(.95)}
  .k-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:6px}
  .k-big{border:0;border-radius:999px;padding:14px 26px;font:800 20px/1 'Nunito',system-ui,sans-serif;cursor:pointer;background:#ff6b4a;color:#fff;box-shadow:inset 0 -5px 0 rgba(0,0,0,.15)}
  .k-big.alt{background:#e6f0f5;color:#173b52}
  .k-big:active{transform:scale(.95)}
  .k-stars{font-size:44px;margin:4px 0 14px;letter-spacing:4px}
  `;
  let cssDone = false;
  K.css = function () { if (cssDone) return; cssDone = true; const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); };
  K.bar = function (opts) {
    opts = opts || {};
    K.css();
    const bar = document.createElement('div'); bar.className = 'k-bar';
    bar.innerHTML = `<div style="display:flex;gap:8px"><a class="k-btn" href="../../" aria-label="${K.t('Natrag na igre', 'Back to games')}">← ${K.t('Igre', 'Games')}</a>${opts.levels ? `<button class="k-btn" id="k-lvbtn">${K.t('Razine', 'Levels')}</button>` : ''}</div><div style="display:flex;gap:8px"><button class="k-btn" id="k-lang" aria-label="${K.t('Jezik', 'Language')}">🗣️ ${K.LANGS[LI].short}</button><button class="k-btn" id="k-mute" aria-label="${K.t('Zvuk', 'Sound')}"></button></div>`;
    document.body.appendChild(bar);
    const mb = bar.querySelector('#k-mute');
    const upd = () => (mb.textContent = K.muted ? '🔇' : '🔊');
    upd();
    mb.onclick = () => { K.muted = !K.muted; K.store.set('kids-muted', K.muted); upd(); if (!K.muted) K.sfx('tap'); else if ('speechSynthesis' in window) speechSynthesis.cancel(); };
    if (opts.levels) bar.querySelector('#k-lvbtn').onclick = opts.levels;
    bar.querySelector('#k-lang').onclick = K.langMenu;
    document.addEventListener('pointerdown', ac, { once: true });
  };

  K.langMenu = function () {
    K.css(); K.sfx('tap');
    const ov = document.createElement('div'); ov.className = 'k-ov k-langov';
    const warn = K.hasVoice() ? '' : `<p style="font-size:14px">${K.t('Ovaj uređaj nema glas za odabrani jezik pa se riječi samo prikazuju.', 'This device has no voice for the chosen language, so words are only shown.')}</p>`;
    ov.innerHTML = `<div class="k-card"><h2>🗣️ ${K.t('Jezik', 'Language')}</h2><p>${K.t('Na kojem jeziku da igra govori?', 'Which language should the game speak?')}</p>${warn}<div class="k-row">${K.LANGS.map((l) =>
      `<button class="k-big ${l.code === K.lang ? '' : 'alt'}" data-c="${l.code}">${l.label}</button>`).join('')}</div></div>`;
    ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
    ov.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { if (b.dataset.c === K.lang) ov.remove(); else K.setLang(b.dataset.c); }));
    document.body.appendChild(ov);
  };

  /* ---------- razine ---------- */
  // id: ključ igre; levels: [{name}] ; onPick(index)
  K.levelDone = (id, i) => { const d = K.store.get('lv-' + id, []); if (!d.includes(i)) { d.push(i); K.store.set('lv-' + id, d); } };
  K.closeOverlay = () => document.querySelectorAll('.k-ov').forEach((o) => o.remove());
  K.levelMenu = function (id, title, levels, onPick, extraHTML) {
    K.closeOverlay();
    const done = K.store.get('lv-' + id, []);
    const ov = document.createElement('div'); ov.className = 'k-ov';
    ov.innerHTML = `<div class="k-card"><h2>${title}</h2><p>${K.t('Odaberi razinu', 'Choose a level')}</p>${extraHTML || ''}<div class="k-levels">${levels.map((l, i) =>
      `<button class="k-lv ${done.includes(i) ? 'done' : ''}" data-i="${i}">${i + 1}<small>${l.name}</small><span class="st">${done.includes(i) ? '⭐' : ''}</span></button>`).join('')}</div></div>`;
    document.body.appendChild(ov);
    ov.querySelectorAll('.k-lv').forEach((b) => (b.onclick = () => { K.sfx('tap'); ov.remove(); onPick(+b.dataset.i); }));
    return ov;
  };
  K.levelComplete = function (id, i, count, onNext, onMenu, msg) {
    K.levelDone(id, i);
    K.sfx('win'); K.confetti(); K.say(K.t('Bravo!', 'Well done!'));
    K.closeOverlay();
    const last = i >= count - 1;
    const ov = document.createElement('div'); ov.className = 'k-ov';
    ov.innerHTML = `<div class="k-card"><h2>${K.t('Bravo!', 'Well done!')}</h2><div class="k-stars">⭐⭐⭐</div><p>${msg || (last ? K.t('Prošao si sve razine!', 'You finished all the levels!') : K.t('Razina ' + (i + 1) + ' je gotova.', 'Level ' + (i + 1) + ' complete!'))}</p>
      <div class="k-row">${last ? '' : `<button class="k-big" data-a="next">${K.t('Sljedeća razina', 'Next level')} →</button>`}<button class="k-big ${last ? '' : 'alt'}" data-a="again">${K.t('Opet', 'Again')}</button><button class="k-big alt" data-a="menu">${K.t('Razine', 'Levels')}</button></div></div>`;
    document.body.appendChild(ov);
    ov.querySelectorAll('button').forEach((b) => (b.onclick = () => {
      K.sfx('tap'); ov.remove();
      if (b.dataset.a === 'next') onNext(i + 1); else if (b.dataset.a === 'again') onNext(i); else onMenu();
    }));
  };
})();
