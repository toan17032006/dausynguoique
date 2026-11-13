(function () {
  const NG = window.NG;

  NG.Audio = {
    ctx: null,
    master: null,
    enabled: true,
    _noise: null,

    init() {
      if (this.ctx) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? 0.42 : 0;
        this.master.connect(this.ctx.destination);

        const len = Math.floor(this.ctx.sampleRate * 0.6);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        this._noise = buf;
      } catch (e) {
        this.ctx = null;
      }
    },

    resume() {
      try {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) {
        /* ignore */
      }
    },

    setEnabled(on) {
      this.enabled = on;
      if (this.master) this.master.gain.value = on ? 0.42 : 0;
    },

    _ok() {
      return !!(this.ctx && this.enabled);
    },

    tone(freq, dur, opt) {
      if (!this._ok()) return;
      const o = opt || {};
      try {
        const t0 = this.ctx.currentTime + (o.delay || 0);
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = o.type || 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t0 + dur);
        const vol = o.vol == null ? 0.2 : o.vol;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(g);
        g.connect(this.master);
        osc.start(t0);
        osc.stop(t0 + dur + 0.05);
      } catch (e) {
        /* ignore */
      }
    },

    noise(dur, opt) {
      if (!this._ok() || !this._noise) return;
      const o = opt || {};
      try {
        const t0 = this.ctx.currentTime + (o.delay || 0);
        const src = this.ctx.createBufferSource();
        src.buffer = this._noise;
        src.loop = true;
        const filter = this.ctx.createBiquadFilter();
        filter.type = o.filter || 'bandpass';
        filter.frequency.setValueAtTime(o.freq || 1200, t0);
        if (o.slide) filter.frequency.exponentialRampToValueAtTime(Math.max(40, o.slide), t0 + dur);
        filter.Q.value = o.q == null ? 0.9 : o.q;
        const g = this.ctx.createGain();
        const vol = o.vol == null ? 0.15 : o.vol;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(filter);
        filter.connect(g);
        g.connect(this.master);
        src.start(t0);
        src.stop(t0 + dur + 0.05);
      } catch (e) {
        /* ignore */
      }
    },

    ui() {
      this.tone(720, 0.07, { type: 'triangle', vol: 0.09, slide: 980 });
    },

    hover() {
      this.tone(480, 0.05, { type: 'sine', vol: 0.04 });
    },

    swing() {
      this.noise(0.11, { filter: 'highpass', freq: 1600, slide: 900, vol: 0.09, q: 0.6 });
    },

    jump() {
      this.tone(260, 0.12, { type: 'sine', vol: 0.08, slide: 520 });
    },

    dash() {
      this.noise(0.16, { filter: 'bandpass', freq: 900, slide: 260, vol: 0.1, q: 0.7 });
    },

    hit(power) {
      const p = power === 'heavy' ? 1.4 : 1;
      this.noise(0.13 * p, { filter: 'lowpass', freq: 900, slide: 140, vol: 0.24 * p, q: 0.8 });
      this.tone(130, 0.16 * p, { type: 'sine', vol: 0.22 * p, slide: 44 });
      this.noise(0.05, { filter: 'highpass', freq: 3200, vol: 0.08, q: 0.5 });
    },

    block() {
      this.tone(1250, 0.09, { type: 'square', vol: 0.06, slide: 780 });
      this.noise(0.08, { filter: 'highpass', freq: 2600, vol: 0.08, q: 0.8 });
    },

    ko() {
      this.tone(120, 0.75, { type: 'sine', vol: 0.3, slide: 34 });
      this.tone(58, 0.9, { type: 'triangle', vol: 0.16, slide: 24, delay: 0.06 });
      this.noise(0.4, { filter: 'lowpass', freq: 500, slide: 80, vol: 0.2 });
    },

    skill(id) {
      if (id === 'kim') {
        [1500, 1900, 2300].forEach((f, i) =>
          this.tone(f, 0.22, { type: 'triangle', vol: 0.11, slide: f * 1.4, delay: i * 0.06 })
        );
        this.noise(0.2, { filter: 'highpass', freq: 3000, vol: 0.1, q: 0.5 });
      } else if (id === 'moc') {
        this.tone(150, 0.5, { type: 'sawtooth', vol: 0.1, slide: 70 });
        this.noise(0.55, { filter: 'lowpass', freq: 700, slide: 240, vol: 0.14 });
        this.tone(420, 0.3, { type: 'sine', vol: 0.06, slide: 620, delay: 0.18 });
      } else if (id === 'thuy') {
        this.noise(0.55, { filter: 'bandpass', freq: 700, slide: 1600, vol: 0.16, q: 0.5 });
        this.tone(380, 0.5, { type: 'sine', vol: 0.12, slide: 140 });
        this.tone(760, 0.3, { type: 'sine', vol: 0.05, slide: 1100, delay: 0.1 });
      } else if (id === 'hoa') {
        this.noise(0.6, { filter: 'lowpass', freq: 1400, slide: 300, vol: 0.2 });
        this.tone(90, 0.6, { type: 'sine', vol: 0.24, slide: 36, delay: 0.08 });
        this.tone(620, 0.25, { type: 'sawtooth', vol: 0.05, slide: 220, delay: 0.1 });
      } else if (id === 'tho') {
        this.tone(74, 0.7, { type: 'sine', vol: 0.32, slide: 28 });
        this.tone(120, 0.4, { type: 'triangle', vol: 0.14, slide: 40, delay: 0.04 });
        this.noise(0.45, { filter: 'lowpass', freq: 600, slide: 100, vol: 0.2 });
      } else if (id === 'phong') {
        this.noise(0.6, { filter: 'bandpass', freq: 900, slide: 2600, vol: 0.14, q: 0.8 });
        this.tone(520, 0.5, { type: 'sine', vol: 0.1, slide: 1040 });
        this.tone(780, 0.4, { type: 'triangle', vol: 0.05, slide: 1560, delay: 0.09 });
      }
    },

    round() {
      this.tone(196, 0.7, { type: 'triangle', vol: 0.14 });
      this.tone(294, 0.6, { type: 'sine', vol: 0.1, delay: 0.05 });
    },

    fight() {
      this.tone(392, 0.18, { type: 'square', vol: 0.08 });
      this.tone(587, 0.3, { type: 'square', vol: 0.08, delay: 0.1 });
      this.tone(784, 0.4, { type: 'triangle', vol: 0.09, delay: 0.2 });
    },

    victory() {
      [392, 523, 659, 784, 1046].forEach((f, i) =>
        this.tone(f, 0.4, { type: 'triangle', vol: 0.11, delay: i * 0.11 })
      );
    },

    defeat() {
      [330, 294, 247, 196].forEach((f, i) =>
        this.tone(f, 0.45, { type: 'sine', vol: 0.1, delay: i * 0.13 })
      );
    },
  };
})();
