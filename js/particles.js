(function () {
  const NG = window.NG;

  NG.FX = {
    list: [],

    clear() {
      this.list.length = 0;
    },

    add(p) {
      if (this.list.length > 600) this.list.shift();
      const def = {
        kind: 'dot',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        t: 0,
        life: 0.6,
        size: 3,
        color: '#ffffff',
        grav: 0,
        drag: 1,
        add: true,
        rot: 0,
        vr: 0,
        alpha: 1,
        text: '',
        grow: 0,
        weight: 0,
      };
      const p2 = Object.assign(def, p);
      p2.max = p2.life;
      this.list.push(p2);
      return p2;
    },

    burst(x, y, o) {
      const opt = o || {};
      const count = opt.count == null ? 8 : opt.count;
      const speed = opt.speed == null ? 300 : opt.speed;
      const spread = opt.spread == null ? Math.PI * 2 : opt.spread;
      const dir = opt.dir == null ? 0 : opt.dir;
      for (let i = 0; i < count; i++) {
        const a = dir + (Math.random() - 0.5) * spread;
        const sp = speed * (0.35 + Math.random() * 0.85);
        this.add({
          kind: opt.kind || 'spark',
          x: x + (Math.random() - 0.5) * (opt.jitter || 6),
          y: y + (Math.random() - 0.5) * (opt.jitter || 6),
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: (opt.life || 0.45) * (0.6 + Math.random() * 0.7),
          size: (opt.size || 3) * (0.6 + Math.random() * 0.8),
          color: Array.isArray(opt.color) ? opt.color[(Math.random() * opt.color.length) | 0] : opt.color || '#fff',
          grav: opt.grav == null ? 300 : opt.grav,
          drag: opt.drag == null ? 2.2 : opt.drag,
          add: opt.add !== false,
          kind: opt.kind || 'spark',
          weight: opt.weight == null ? 1 : opt.weight,
        });
      }
    },

    text(x, y, text, color, size) {
      this.add({
        kind: 'text',
        x,
        y,
        vx: (Math.random() - 0.5) * 40,
        vy: -90,
        life: 0.9,
        size: size || 24,
        color: color || '#fff',
        drag: 0.6,
        add: false,
        text,
      });
    },

    ring(x, y, color, radius, life, width) {
      this.add({
        kind: 'ring',
        x,
        y,
        life: life || 0.4,
        size: radius || 10,
        grow: (radius || 10) * 3.2,
        color: color || '#fff',
        add: true,
        weight: width || 3,
      });
    },

    dust(x, y, dir, color) {
      for (let i = 0; i < 6; i++) {
        this.add({
          kind: 'smoke',
          x: x + (Math.random() - 0.5) * 20,
          y: y - Math.random() * 6,
          vx: (dir || 0) * -60 + (Math.random() - 0.5) * 130,
          vy: -Math.random() * 90,
          life: 0.4 + Math.random() * 0.35,
          size: 4 + Math.random() * 7,
          color: color || 'rgba(220,220,220,0.5)',
          grav: -30,
          drag: 2.5,
          add: false,
        });
      }
    },

    update(dt) {
      const list = this.list;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.t += dt;
        if (p.t >= p.life) {
          list.splice(i, 1);
          continue;
        }
        p.vy += p.grav * dt;
        const d = Math.max(0, 1 - p.drag * dt);
        p.vx *= d;
        p.vy *= d;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
      }
    },

    draw(ctx) {
      const list = this.list;
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        const k = 1 - p.t / p.life;
        const a = p.alpha * Math.min(1, k * 2.2);
        ctx.save();
        ctx.globalAlpha = a;
        if (p.add) ctx.globalCompositeOperation = 'lighter';

        if (p.kind === 'text') {
          ctx.font = `900 ${p.size}px ${NG.FONT}`;
          ctx.textAlign = 'center';
          ctx.lineWidth = 5;
          ctx.strokeStyle = 'rgba(0,0,0,0.65)';
          ctx.strokeText(p.text, p.x, p.y);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, p.x, p.y);
        } else if (p.kind === 'ring') {
          const r = p.size + p.grow * (1 - k);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.weight * k + 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.5, r), 0, NG.TAU);
          ctx.stroke();
        } else if (p.kind === 'spark') {
          const len = Math.min(26, Math.hypot(p.vx, p.vy) * 0.045);
          const ang = Math.atan2(p.vy, p.vx);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(0.8, p.size * 0.8);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - Math.cos(ang) * len, p.y - Math.sin(ang) * len);
          ctx.stroke();
        } else if (p.kind === 'smoke') {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 + (1 - k) * 1.6), 0, NG.TAU);
          ctx.fill();
        } else if (p.kind === 'shard') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(-p.size, -p.size * 0.5);
          ctx.lineTo(p.size, 0);
          ctx.lineTo(-p.size * 0.6, p.size * 0.7);
          ctx.closePath();
          ctx.fill();
        } else if (p.kind === 'leaf') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, NG.TAU);
          ctx.fill();
        } else if (p.kind === 'bubble') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, NG.TAU);
          ctx.stroke();
          ctx.globalAlpha = a * 0.3;
          ctx.fillStyle = p.color;
          ctx.fill();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.5, p.size * (0.4 + k * 0.6)), 0, NG.TAU);
          ctx.fill();
        }
        ctx.restore();
      }
    },
  };
})();
