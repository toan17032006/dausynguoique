(function () {
  const NG = (window.NG = window.NG || {});

  NG.W = 1280;
  NG.H = 720;
  NG.GROUND = 596;
  NG.TAU = Math.PI * 2;

  NG.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  NG.lerp = (a, b, t) => a + (b - a) * t;
  NG.rand = (a, b) => a + Math.random() * (b - a);
  NG.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  NG.chance = (p) => Math.random() < p;
  NG.approach = (v, target, step) => {
    if (v < target) return Math.min(v + step, target);
    if (v > target) return Math.max(v - step, target);
    return v;
  };
  NG.easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  NG.easeInCubic = (t) => t * t * t;
  NG.easeOutBack = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
  NG.hexA = (hex, a) => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  NG.roundRect = (ctx, x, y, w, h, r) => {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  };

  /* ------------------------------ Input ------------------------------ */
  const PREVENT = new Set(['a', 'd', 'w', 's', 'j', 'k', 'l', 'shift', ' ', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', '1', '2', '3', '4']);
  // Numpad attacks double as P2 buttons on full-size keyboards.
  const NUMPAD = { Numpad1: '1', Numpad2: '2', Numpad3: '3', Numpad0: '4' };
  const keyOf = (e) => (e.code && NUMPAD[e.code]) || (e.key || '').toLowerCase();

  NG.Input = {
    keys: Object.create(null),
    pressed: Object.create(null),
    init() {
      window.addEventListener(
        'keydown',
        (e) => {
          const k = keyOf(e);
          if (PREVENT.has(k)) e.preventDefault();
          if (!e.repeat) this.pressed[k] = true;
          this.keys[k] = true;
        },
        { passive: false }
      );
      window.addEventListener('keyup', (e) => {
        const k = keyOf(e);
        this.keys[k] = false;
      });
      window.addEventListener('blur', () => {
        this.keys = Object.create(null);
      });
    },
    down(k) {
      return !!this.keys[k];
    },
    hit(k) {
      return !!this.pressed[k];
    },
    press(k) {
      this.keys[k] = true;
      this.pressed[k] = true;
    },
    release(k) {
      this.keys[k] = false;
    },
    clearFrame() {
      this.pressed = Object.create(null);
    },
    clearAll() {
      this.keys = Object.create(null);
      this.pressed = Object.create(null);
    },
  };

  NG.loadSettings = function () {
    const out = { difficulty: 'normal', sound: true, mode: 'ai' };
    try {
      const raw = localStorage.getItem('nguhanh-settings');
      if (raw) {
        const s = JSON.parse(raw);
        if (s.difficulty) out.difficulty = s.difficulty;
        if (typeof s.sound === 'boolean') out.sound = s.sound;
        if (s.mode === 'ai' || s.mode === 'pvp' || s.mode === 'survival') out.mode = s.mode;
      }
    } catch (e) {
      /* storage may be unavailable on file:// */
    }
    return out;
  };

  NG.saveSettings = function (s) {
    try {
      localStorage.setItem('nguhanh-settings', JSON.stringify(s));
    } catch (e) {
      /* ignore */
    }
  };

  NG.FONT = '"Segoe UI","Trebuchet MS",system-ui,sans-serif';
})();
