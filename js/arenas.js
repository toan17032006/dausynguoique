(function () {
  const NG = window.NG;
  const W = NG.W;
  const H = NG.H;
  const G = NG.GROUND;

  const R = (a, b) => a + Math.random() * (b - a);

  function waveLine(ctx, baseY, amp, freq, phase, closeTo) {
    ctx.moveTo(0, closeTo);
    for (let x = 0; x <= W + 20; x += 16) {
      const y = baseY + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.37 + phase * 1.7) * amp * 0.32;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W + 20, closeTo);
    ctx.closePath();
  }

  function stars(n, maxY, tint) {
    const a = [];
    for (let i = 0; i < n; i++) {
      a.push({
        x: R(0, W),
        y: R(10, maxY),
        r: R(0.5, 1.9),
        ph: R(0, 7),
        sp: R(0.6, 2.2),
        c: tint || '#eaf4ff',
      });
    }
    return a;
  }

  function drawStars(ctx, arr, t, alpha) {
    ctx.save();
    for (const s of arr) {
      const a = (0.25 + 0.55 * Math.abs(Math.sin(t * s.sp + s.ph))) * alpha;
      ctx.globalAlpha = a;
      ctx.fillStyle = s.c;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, NG.TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function jagged(ctx, points, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function vignette(ctx, color) {
    const g = ctx.createRadialGradient(W / 2, H / 2, 240, W / 2, H / 2, 780);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, color || 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  const ARENAS = {
    /* ============================== VOLCANO ============================== */
    volcano: {
      id: 'volcano',
      name: 'NÚI LỬA',
      short: 'Núi Lửa',
      accent: '#ff7a2f',
      desc: 'Dung nham sôi sục, tro tàn và than hồng bay khắp trời.',
      effect: 'Dung nham phun trào — trúng là bốc cháy',
      mods: { gravity: 1, speed: 1, jump: 1, grip: 1 },
      init() {
        this.embers = [];
        for (let i = 0; i < 54; i++) {
          this.embers.push({ x: R(0, W), sp: R(16, 58), drift: R(-22, 22), size: R(1, 2.8), ph: R(0, 7), a: R(0.3, 1) });
        }
        this.ash = [];
        for (let i = 0; i < 40; i++) this.ash.push({ x: R(0, W), y: R(0, 620), sp: R(4, 16), size: R(0.6, 1.6), ph: R(0, 7) });
        this.smoke = [];
        for (let i = 0; i < 8; i++) this.smoke.push({ x: R(0, W), y: R(90, 240), r: R(70, 150), sp: R(5, 14), a: R(0.05, 0.13) });
        this.cracks = [];
        for (let i = 0; i < 7; i++) {
          const x = R(40, W - 40);
          const pts = [[x, G + 2]];
          let cx = x;
          let cy = G + 2;
          for (let j = 0; j < 4; j++) {
            cx += R(-26, 26);
            cy += R(12, 26);
            pts.push([cx, cy]);
          }
          this.cracks.push(pts);
        }
        this.bombs = [];
        this.eruptT = 4.5;
        this.lavaPulse = 0;
        const sky = this.sky || (this.sky = {});
        sky.g = null;
      },
      update(dt, game) {
        this.lavaPulse = Math.max(0, this.lavaPulse - dt * 2.2);
        this.eruptT -= dt;
        if (this.eruptT <= 0) {
          this.eruptT = R(7.5, 10);
          const n = 2 + (Math.random() < 0.55 ? 1 : 0);
          for (let i = 0; i < n; i++) {
            this.bombs.push({ x: R(150, W - 150), t: -i * R(0.35, 0.6), done: false });
          }
        }
        for (let i = this.bombs.length - 1; i >= 0; i--) {
          const b = this.bombs[i];
          b.t += dt;
          if (!b.done && b.t >= 0.95) {
            b.done = true;
            this.lavaPulse = 1;
            if (game) {
              for (const f of game.fighters) {
                if (f.ko) continue;
                if (Math.abs(f.x - b.x) < 88 && f.y > G - 175) {
                  game.envHit(f, 42, {
                    color: '#ff9a3c',
                    hitstun: 0.34,
                    knock: (f.x < b.x ? -1 : 1) * 300,
                    launch: 320,
                    burn: 2.2,
                    shake: 10,
                  });
                }
              }
            }
            NG.FX.burst(b.x, G - 24, {
              count: 26,
              color: ['#ffd27a', '#ff8a3a', '#c33a12'],
              speed: 520,
              life: 0.7,
              size: 3.6,
              grav: 900,
            });
            NG.FX.ring(b.x, G, '#ff8a3c', 20, 0.55, 6);
          }
          if (b.t > 1.6) this.bombs.splice(i, 1);
        }
      },
      drawBack(ctx, t) {
        const g = ctx.createLinearGradient(0, 0, 0, G + 40);
        g.addColorStop(0, '#10060d');
        g.addColorStop(0.42, '#35101a');
        g.addColorStop(0.72, '#7a2014');
        g.addColorStop(1, '#c4511c');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, G + 40);

        // horizon glow
        const hg = ctx.createRadialGradient(W * 0.5, G - 10, 40, W * 0.5, G - 10, 620);
        hg.addColorStop(0, 'rgba(255,140,50,0.5)');
        hg.addColorStop(0.5, 'rgba(190,60,20,0.18)');
        hg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = hg;
        ctx.fillRect(0, 250, W, G - 250);

        // smoke moon
        ctx.save();
        ctx.globalAlpha = 0.6;
        const mg = ctx.createRadialGradient(1030, 130, 5, 1030, 130, 90);
        mg.addColorStop(0, 'rgba(255,210,160,0.7)');
        mg.addColorStop(0.25, 'rgba(255,130,60,0.25)');
        mg.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(1030, 130, 90, 0, NG.TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,205,160,0.5)';
        ctx.beginPath();
        ctx.arc(1030, 130, 28, 0, NG.TAU);
        ctx.fill();
        ctx.restore();

        // volcano silhouettes
        jagged(ctx, [[-40, G + 20], [140, 620], [230, 430], [285, 470], [340, 610], [420, G + 20]], '#1b090e');
        jagged(ctx, [[860, G + 20], [980, 560], [1075, 372], [1130, 440], [1175, 380], [1240, 540], [1320, G + 20]], '#200a0c');
        // lava crater glows
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const cg = ctx.createRadialGradient(1075, 380, 4, 1075, 380, 120);
        cg.addColorStop(0, 'rgba(255,180,80,0.85)');
        cg.addColorStop(0.3, 'rgba(255,90,20,0.35)');
        cg.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(1075, 380, 120, 0, NG.TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,170,70,0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(1050, 392);
        ctx.lineTo(1075, 372);
        ctx.lineTo(1100, 398);
        ctx.stroke();
        ctx.restore();

        // mid ridge
        ctx.fillStyle = '#2a0d10';
        ctx.beginPath();
        waveLine(ctx, 540, 18, 0.006, 1.2, G + 20);
        ctx.fill();

        // lava river band
        const lg = ctx.createLinearGradient(0, 540, 0, G);
        lg.addColorStop(0, 'rgba(255,150,50,0.5)');
        lg.addColorStop(0.45, '#ff7a1f');
        lg.addColorStop(1, '#8c2508');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(0, 560);
        for (let x = 0; x <= W; x += 24) {
          ctx.lineTo(x, 560 + Math.sin(x * 0.013 + t * 0.9) * 6);
        }
        ctx.lineTo(W, G + 4);
        ctx.lineTo(0, G + 4);
        ctx.closePath();
        ctx.fill();
        for (let i = 0; i < 16; i++) {
          const bx = (i * 97 + Math.sin(t * 0.8 + i) * 20) % W;
          const by = 572 + Math.sin(i * 1.7 + t) * 9;
          const r = 2 + ((i * 7) % 5);
          ctx.fillStyle = 'rgba(255,220,150,0.7)';
          ctx.beginPath();
          ctx.arc(bx, by, r, 0, NG.TAU);
          ctx.fill();
        }
        ctx.restore();

        // smoke
        for (const s of this.smoke) {
          const x = (s.x + t * s.sp) % (W + 300) - 150;
          ctx.globalAlpha = s.a;
          ctx.fillStyle = '#1a0d12';
          ctx.beginPath();
          ctx.ellipse(x, s.y + Math.sin(t * 0.3 + s.x) * 8, s.r, s.r * 0.42, 0, 0, NG.TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
      drawGround(ctx, t) {
        const g = ctx.createLinearGradient(0, G, 0, H);
        g.addColorStop(0, '#33191a');
        g.addColorStop(0.25, '#221012');
        g.addColorStop(1, '#0a0507');
        ctx.fillStyle = g;
        ctx.fillRect(0, G, W, H - G);

        ctx.strokeStyle = 'rgba(255,130,50,0.7)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ff6a1a';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(0, G + 1);
        ctx.lineTo(W, G + 1);
        ctx.stroke();
        ctx.shadowBlur = 0;

        for (let i = 0; i < this.cracks.length; i++) {
          const c = this.cracks[i];
          const pulse = 0.45 + 0.35 * Math.sin(t * 2 + i * 1.7);
          ctx.strokeStyle = `rgba(255,110,30,${pulse})`;
          ctx.lineWidth = 2.4;
          ctx.shadowColor = '#ff5a0a';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(c[0][0], c[0][1]);
          for (let j = 1; j < c.length; j++) ctx.lineTo(c[j][0], c[j][1]);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        for (let i = 0; i < 22; i++) {
          const x = (i * 137) % W;
          const y = G + 24 + ((i * 53) % 90);
          ctx.beginPath();
          ctx.ellipse(x, y, 14 + (i % 5) * 5, 5 + (i % 3) * 2, 0, 0, NG.TAU);
          ctx.fill();
        }
      },
      drawFront(ctx, t) {
        for (const b of this.bombs) {
          if (b.t < 0) continue;
          if (b.t < 0.95) {
            const k = b.t / 0.95;
            const a = 0.3 + 0.5 * Math.abs(Math.sin(b.t * 9));
            ctx.save();
            const gr = ctx.createRadialGradient(b.x, G, 4, b.x, G, 70 + k * 30);
            gr.addColorStop(0, `rgba(255,150,50,${0.55 * (0.35 + k * 0.65)})`);
            gr.addColorStop(1, 'rgba(255,80,20,0)');
            ctx.fillStyle = gr;
            ctx.beginPath();
            ctx.ellipse(b.x, G, 64 + k * 22, 17 + k * 7, 0, 0, NG.TAU);
            ctx.fill();
            ctx.strokeStyle = `rgba(255,176,86,${a})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(b.x, G, 46 + k * 26, 12 + k * 7, 0, 0, NG.TAU);
            ctx.stroke();
            ctx.restore();
          } else {
            const k = Math.min(1, (b.t - 0.95) / 0.65);
            const h = 300 * (1 - Math.pow(1 - k, 2));
            const w = 46 * (1 - k * 0.55);
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const grd = ctx.createLinearGradient(b.x, G, b.x, G - h);
            grd.addColorStop(0, 'rgba(255,224,130,0.95)');
            grd.addColorStop(0.4, 'rgba(255,122,40,0.72)');
            grd.addColorStop(1, 'rgba(150,20,10,0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.moveTo(b.x - w, G);
            ctx.quadraticCurveTo(b.x - w * 0.3, G - h * 0.6, b.x, G - h);
            ctx.quadraticCurveTo(b.x + w * 0.3, G - h * 0.6, b.x + w, G);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = `rgba(255,250,220,${0.8 * (1 - k)})`;
            ctx.beginPath();
            ctx.ellipse(b.x, G - h * 0.34, w * 0.3, h * 0.28, 0, 0, NG.TAU);
            ctx.fill();
            ctx.restore();
          }
        }
        if (this.lavaPulse > 0.01) {
          const p = this.lavaPulse;
          const vg = ctx.createRadialGradient(W / 2, G - 40, 60, W / 2, G - 40, 760);
          vg.addColorStop(0, `rgba(255,120,40,${0.16 * p})`);
          vg.addColorStop(1, 'rgba(255,60,10,0)');
          ctx.fillStyle = vg;
          ctx.fillRect(0, 0, W, H);
        }
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const e of this.embers) {
          const y = G + 30 - ((t * e.sp + e.ph * 120) % 660);
          const x = e.x + Math.sin(t * 0.8 + e.ph) * 26 + e.drift * Math.sin(t * 0.3 + e.ph);
          const fade = NG.clamp((G - y) / 120, 0, 1) * e.a;
          ctx.globalAlpha = fade * 0.9;
          ctx.fillStyle = '#ff9a3a';
          ctx.beginPath();
          ctx.arc(x, y, e.size, 0, NG.TAU);
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        for (const a of this.ash) {
          const y = (a.y + t * a.sp * 1.6) % 640;
          const x = a.x + Math.sin(t * 0.6 + a.ph) * 30;
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = '#cbb6a8';
          ctx.fillRect(x, y, a.size, a.size);
        }
        ctx.restore();
        vignette(ctx, 'rgba(20,2,0,0.55)');
      },
    },

    /* ============================== DESERT ============================== */
    desert: {
      id: 'desert',
      name: 'HOANG MẠC',
      short: 'Hoang Mạc',
      accent: '#e0a53f',
      desc: 'Nắng cháy và những cồn cát trải dài tới chân trời.',
      effect: 'Bão cát — chậm chân, sát thương, đẩy lùi',
      mods: { gravity: 1, speed: 1, jump: 1, grip: 1 },
      init() {
        this.dunes = [];
        for (let i = 0; i < 3; i++) {
          this.dunes.push({ base: 500 + i * 34, amp: 14 + i * 8, freq: 0.004 + i * 0.0015, ph: R(0, 7), col: ['#b9772f', '#9c5f26', '#7d4a1e'][i] });
        }
        this.sand = [];
        for (let i = 0; i < 60; i++) this.sand.push({ x: R(0, W), y: R(60, 580), sp: R(40, 160), size: R(0.7, 2), ph: R(0, 7), a: R(0.1, 0.5) });
        this.stars = [];
        this.cacti = [
          { x: 120, h: 150 },
          { x: 1150, h: 190 },
          { x: 1010, h: 120 },
        ];
        this.stormT = 2.5;
        this.storm = 0;
        this.stormDir = 1;
        this.stormTick = 0.6;
      },
      update(dt, game) {
        this.stormT += dt;
        const cycle = this.stormT % 13;
        this.stormDir = Math.floor(this.stormT / 13) % 2 === 0 ? 1 : -1;
        let s = 0;
        if (cycle >= 8.4 && cycle < 9.4) s = (cycle - 8.4) / 1;
        else if (cycle >= 9.4 && cycle < 12.4) s = 1;
        else if (cycle >= 12.4) s = Math.max(0, (13 - cycle) / 0.6);
        this.storm = Math.min(1, s);
        this.mods.speed = 1 - 0.18 * this.storm;
        this.mods.jump = 1 - 0.06 * this.storm;
        if (!game || this.storm < 0.35) {
          this.stormTick = 0.5;
          return;
        }
        for (const f of game.fighters) {
          if (f.ko) continue;
          f.vx += this.stormDir * this.storm * 34 * dt;
          f.x += this.stormDir * this.storm * 16 * dt;
        }
        this.stormTick -= dt;
        if (this.stormTick <= 0) {
          this.stormTick = 0.9;
          for (const f of game.fighters) {
            if (!f.ko) game.envHit(f, 6, { color: '#ffd28a', shake: 1.5 });
          }
        }
      },
      drawBack(ctx, t) {
        const g = ctx.createLinearGradient(0, 0, 0, G);
        g.addColorStop(0, '#2a1638');
        g.addColorStop(0.34, '#7c3a34');
        g.addColorStop(0.62, '#c97434');
        g.addColorStop(1, '#f0b264');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, G + 10);

        // sun
        ctx.save();
        const sg = ctx.createRadialGradient(980, 220, 10, 980, 220, 160);
        sg.addColorStop(0, 'rgba(255,244,205,0.95)');
        sg.addColorStop(0.28, 'rgba(255,205,120,0.5)');
        sg.addColorStop(1, 'rgba(255,160,60,0)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(980, 220, 160, 0, NG.TAU);
        ctx.fill();
        ctx.fillStyle = '#fff2c8';
        ctx.beginPath();
        ctx.arc(980, 220, 56, 0, NG.TAU);
        ctx.fill();
        ctx.restore();

        // distant mesas
        ctx.fillStyle = 'rgba(100,46,40,0.65)';
        jagged(ctx, [[0, 520], [120, 470], [230, 488], [330, 452], [440, 500], [560, 468], [700, 505], [820, 462], [950, 495], [1080, 455], [1200, 500], [1280, 480], [1280, 620], [0, 620]], 'rgba(96,46,40,0.55)');

        // dunes
        for (const d of this.dunes) {
          ctx.fillStyle = d.col;
          ctx.beginPath();
          waveLine(ctx, d.base, d.amp, d.freq, d.ph + t * 0.01, G + 12);
          ctx.fill();
        }

        // heat shimmer
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = '#ffe6b0';
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          for (let x = 0; x <= W; x += 26) {
            const y = 430 + i * 16 + Math.sin(x * 0.02 + t * 1.6 + i) * 4;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.restore();

        // pyramids
        ctx.fillStyle = 'rgba(78,40,30,0.75)';
        jagged(ctx, [[200, 560], [330, 400], [470, 560]], 'rgba(84,42,30,0.78)');
        ctx.fillStyle = 'rgba(255,220,160,0.12)';
        jagged(ctx, [[330, 400], [470, 560], [330, 560]], 'rgba(255,220,160,0.1)');

        // cacti
        for (const c of this.cacti) {
          ctx.strokeStyle = '#3a2414';
          ctx.lineWidth = 13;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(c.x, G);
          ctx.lineTo(c.x, G - c.h);
          ctx.moveTo(c.x, G - c.h * 0.55);
          ctx.lineTo(c.x - 26, G - c.h * 0.55);
          ctx.lineTo(c.x - 26, G - c.h * 0.78);
          ctx.moveTo(c.x, G - c.h * 0.42);
          ctx.lineTo(c.x + 22, G - c.h * 0.42);
          ctx.lineTo(c.x + 22, G - c.h * 0.62);
          ctx.stroke();
        }
      },
      drawGround(ctx, t) {
        const g = ctx.createLinearGradient(0, G, 0, H);
        g.addColorStop(0, '#d5a05d');
        g.addColorStop(0.3, '#b37b3c');
        g.addColorStop(1, '#6b431c');
        ctx.fillStyle = g;
        ctx.fillRect(0, G, W, H - G);
        ctx.strokeStyle = 'rgba(255,230,170,0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, G + 1);
        ctx.lineTo(W, G + 1);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(120,76,32,0.4)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 9; i++) {
          ctx.beginPath();
          for (let x = -40; x <= W + 40; x += 30) {
            const y = G + 26 + i * 15 + Math.sin(x * 0.011 + i * 1.4 + t * 0.25) * 4;
            if (x === -40) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(90,58,24,0.35)';
        for (let i = 0; i < 20; i++) {
          const x = (i * 173) % W;
          const y = G + 20 + ((i * 61) % 80);
          ctx.beginPath();
          ctx.ellipse(x, y, 10 + (i % 4) * 6, 3.5, 0, 0, NG.TAU);
          ctx.fill();
        }
      },
      drawFront(ctx, t) {
        ctx.save();
        for (const s of this.sand) {
          const x = (s.x + t * s.sp) % (W + 60) - 30;
          const y = s.y + Math.sin(t * 0.7 + s.ph) * 12;
          ctx.globalAlpha = s.a * 0.5;
          ctx.fillStyle = '#ffe0a0';
          ctx.fillRect(x, y, s.size * 2.2, s.size);
        }
        ctx.restore();
        if (this.storm > 0.01) {
          const s = this.storm;
          ctx.save();
          ctx.globalAlpha = 0.14 * s;
          ctx.fillStyle = '#e8b96a';
          ctx.fillRect(0, 0, W, H);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = `rgba(255,228,168,${0.45 * s})`;
          ctx.lineWidth = 2;
          for (let i = 0; i < 46; i++) {
            const sp = 900 + (i % 7) * 130;
            const raw = i * 137 + t * sp * this.stormDir;
            const x = ((raw % (W + 240)) + W + 240) % (W + 240) - 120;
            const y = 70 + ((i * 53) % 520) + Math.sin(t * 3 + i) * 8;
            const len = 26 + (i % 5) * 16;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - this.stormDir * len, y + 3);
            ctx.stroke();
          }
          ctx.restore();
        }
        // warm haze
        const vg = ctx.createLinearGradient(0, 260, 0, 620);
        vg.addColorStop(0, 'rgba(255,200,120,0)');
        vg.addColorStop(1, 'rgba(255,180,90,0.09)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 260, W, 360);
        vignette(ctx, 'rgba(40,16,0,0.45)');
      },
    },

    /* ============================== ICE ============================== */
    ice: {
      id: 'ice',
      name: 'BĂNG GIÁ',
      short: 'Băng',
      accent: '#7fd6ff',
      desc: 'Cực quang uốn lượn trên vùng băng vĩnh cửu trơn trượt.',
      effect: 'Mặt băng trơn — đà trượt dài hơn',
      mods: { gravity: 1, speed: 1, jump: 1, grip: 0.38 },
      init() {
        this.stars = stars(90, 380, '#e6f6ff');
        this.snow = [];
        for (let i = 0; i < 90; i++) this.snow.push({ x: R(0, W), y: R(0, 640), sp: R(14, 46), size: R(1, 2.8), ph: R(0, 7), sway: R(10, 34) });
        this.mountains = [];
        for (let layer = 0; layer < 2; layer++) {
          const pts = [[-40, 620]];
          let x = -40;
          while (x < W + 60) {
            x += R(90, 160);
            pts.push([x, R(300, 420) + layer * 55]);
          }
          pts.push([W + 60, 620]);
          this.mountains.push(pts);
        }
      },
      update() {},
      drawBack(ctx, t) {
        const g = ctx.createLinearGradient(0, 0, 0, G);
        g.addColorStop(0, '#040d1a');
        g.addColorStop(0.45, '#0b2740');
        g.addColorStop(0.78, '#1f5d7d');
        g.addColorStop(1, '#57a9c4');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, G + 10);

        drawStars(ctx, this.stars, t, 1);

        // aurora ribbons
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const cols = ['rgba(90,255,190,0.14)', 'rgba(110,180,255,0.13)', 'rgba(180,120,255,0.1)'];
        for (let i = 0; i < 3; i++) {
          const yy = 150 + i * 44;
          const grd = ctx.createLinearGradient(0, yy - 60, 0, yy + 90);
          grd.addColorStop(0, 'rgba(0,0,0,0)');
          grd.addColorStop(0.5, cols[i]);
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grd;
          ctx.beginPath();
          for (let x = 0; x <= W; x += 24) {
            const y = yy + Math.sin(x * 0.004 + t * 0.25 + i * 1.3) * 34 + Math.sin(x * 0.011 + t * 0.6) * 9;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          for (let x = W; x >= 0; x -= 24) {
            const y = yy + 90 + Math.sin(x * 0.003 + t * 0.2 + i) * 26;
            ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // moon
        ctx.save();
        const mg = ctx.createRadialGradient(1040, 140, 6, 1040, 140, 110);
        mg.addColorStop(0, 'rgba(235,250,255,0.95)');
        mg.addColorStop(0.22, 'rgba(170,225,255,0.4)');
        mg.addColorStop(1, 'rgba(120,200,255,0)');
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(1040, 140, 110, 0, NG.TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(235,250,255,0.9)';
        ctx.beginPath();
        ctx.arc(1040, 140, 30, 0, NG.TAU);
        ctx.fill();
        ctx.restore();

        // mountains
        this.mountains.forEach((pts, i) => {
          jagged(ctx, pts, i === 0 ? 'rgba(24,63,88,0.85)' : 'rgba(13,40,58,0.98)');
          ctx.save();
          ctx.globalAlpha = 0.25;
          ctx.strokeStyle = '#bfeaff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let j = 1; j < pts.length - 1; j++) {
            ctx.moveTo(pts[j][0], pts[j][1]);
            ctx.lineTo(pts[j][0] + 24, pts[j][1] + 40);
          }
          ctx.stroke();
          ctx.restore();
        });

        // fog bank
        const fg = ctx.createLinearGradient(0, 470, 0, G);
        fg.addColorStop(0, 'rgba(140,200,225,0)');
        fg.addColorStop(0.7, 'rgba(160,215,240,0.16)');
        fg.addColorStop(1, 'rgba(190,235,255,0.28)');
        ctx.fillStyle = fg;
        ctx.fillRect(0, 470, W, G - 470);

        // ice pillars at edges
        ctx.fillStyle = 'rgba(160,225,245,0.16)';
        jagged(ctx, [[0, 620], [50, 470], [96, 560], [140, 500], [150, 620]], 'rgba(150,220,245,0.14)');
        jagged(ctx, [[W, 620], [W - 60, 450], [W - 110, 555], [W - 160, 490], [W - 175, 620]], 'rgba(150,220,245,0.12)');
      },
      drawGround(ctx, t) {
        const g = ctx.createLinearGradient(0, G, 0, H);
        g.addColorStop(0, '#b9e6f2');
        g.addColorStop(0.16, '#6fb8d4');
        g.addColorStop(0.55, '#1e5674');
        g.addColorStop(1, '#08222f');
        ctx.fillStyle = g;
        ctx.fillRect(0, G, W, H - G);

        ctx.save();
        ctx.strokeStyle = 'rgba(235,255,255,0.9)';
        ctx.lineWidth = 2.4;
        ctx.shadowColor = '#bff0ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(0, G + 1);
        ctx.lineTo(W, G + 1);
        ctx.stroke();
        ctx.restore();

        // reflections
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#e4fbff';
        for (let i = 0; i < 8; i++) {
          const x = 70 + i * 160;
          ctx.beginPath();
          ctx.ellipse(x + Math.sin(t * 0.5 + i) * 12, G + 34 + (i % 3) * 22, 60, 6, 0, 0, NG.TAU);
          ctx.fill();
        }
        ctx.restore();

        // cracks
        ctx.strokeStyle = 'rgba(210,245,255,0.35)';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 6; i++) {
          const x = 120 + i * 190;
          ctx.beginPath();
          ctx.moveTo(x, G + 8);
          ctx.lineTo(x + 18, G + 30);
          ctx.lineTo(x + 6, G + 52);
          ctx.lineTo(x + 26, G + 76);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < 16; i++) {
          const x = (i * 151 + Math.sin(t + i) * 10) % W;
          const y = G + 16 + ((i * 37) % 90);
          const a = 0.25 + 0.35 * Math.abs(Math.sin(t * 2 + i));
          ctx.globalAlpha = a;
          ctx.fillRect(x, y, 3, 3);
        }
        ctx.globalAlpha = 1;
      },
      drawFront(ctx, t) {
        ctx.save();
        for (const s of this.snow) {
          const y = (s.y + t * s.sp * 1.4) % 660;
          const x = s.x + Math.sin(t * 0.8 + s.ph) * s.sway;
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = '#eafaff';
          ctx.beginPath();
          ctx.arc(x, y, s.size, 0, NG.TAU);
          ctx.fill();
        }
        ctx.restore();
        vignette(ctx, 'rgba(2,12,24,0.5)');
      },
    },

    /* ============================== WIND ============================== */
    wind: {
      id: 'wind',
      name: 'PHONG ĐỊA',
      short: 'Gió',
      accent: '#8fe6c8',
      desc: 'Cao nguyên lộng gió, những cơn cuồng phong đẩy cả đấu sĩ.',
      effect: 'Gió giật định kỳ đẩy cả hai đấu sĩ',
      mods: { gravity: 1, speed: 1, jump: 1, grip: 1 },
      init() {
        this.clouds = [];
        for (let i = 0; i < 7; i++) this.clouds.push({ x: R(0, W), y: R(70, 320), w: R(120, 260), sp: R(6, 18), a: R(0.05, 0.16) });
        this.isles = [
          { x: 180, y: 350, w: 150, bob: 0.6 },
          { x: 1090, y: 300, w: 120, bob: 0.9 },
        ];
        this.birds = [];
        for (let i = 0; i < 5; i++) this.birds.push({ x: R(0, W), y: R(120, 300), sp: R(16, 34), ph: R(0, 7), s: R(0.6, 1.1) });
        this.gustT = 0;
        this.gust = 0;
        this.windDir = 1;
        this.streaks = [];
        for (let i = 0; i < 34; i++) this.streaks.push({ x: R(0, W), y: R(80, 600), len: R(20, 70), sp: R(120, 320), ph: R(0, 7) });
      },
      update(dt, game) {
        this.gustT += dt;
        const cycle = this.gustT % 10;
        let gust = 0;
        if (cycle > 5.6 && cycle < 8.6) gust = Math.sin(((cycle - 5.6) / 3) * Math.PI);
        if (gust < 0.001) gust = 0;
        this.gust = gust;
        this.windDir = Math.floor(this.gustT / 10) % 2 === 0 ? 1 : -1;
        if (gust > 0 && game && game.fighters) {
          for (const f of game.fighters) {
            if (f.ko) continue;
            f.vx += this.windDir * gust * 70 * dt;
            f.x += this.windDir * gust * 26 * dt;
            f.x = NG.clamp(f.x, 70, W - 70);
          }
        }
      },
      drawBack(ctx, t) {
        const g = ctx.createLinearGradient(0, 0, 0, G);
        g.addColorStop(0, '#0a2a30');
        g.addColorStop(0.4, '#25686b');
        g.addColorStop(0.72, '#79b8a7');
        g.addColorStop(1, '#cfe7cf');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, G + 10);

        // pale sun
        ctx.save();
        const sg = ctx.createRadialGradient(760, 170, 8, 760, 170, 130);
        sg.addColorStop(0, 'rgba(255,250,220,0.65)');
        sg.addColorStop(0.3, 'rgba(255,240,180,0.2)');
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(760, 170, 130, 0, NG.TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,252,232,0.55)';
        ctx.beginPath();
        ctx.arc(760, 170, 40, 0, NG.TAU);
        ctx.fill();
        ctx.restore();

        // clouds
        for (const c of this.clouds) {
          const x = (c.x + t * c.sp) % (W + 400) - 200;
          ctx.globalAlpha = c.a;
          ctx.fillStyle = '#eaf7f2';
          ctx.beginPath();
          ctx.ellipse(x, c.y, c.w * 0.5, c.w * 0.13, 0, 0, NG.TAU);
          ctx.ellipse(x + c.w * 0.22, c.y - 8, c.w * 0.3, c.w * 0.1, 0, 0, NG.TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // distant cliffs
        jagged(ctx, [[0, 540], [140, 430], [250, 500], [400, 450], [560, 520], [740, 470], [900, 525], [1080, 460], [1280, 520], [1280, 640], [0, 640]], 'rgba(27,68,63,0.7)');

        // floating isles
        for (const isle of this.isles) {
          const by = isle.y + Math.sin(t * isle.bob + isle.x) * 8;
          ctx.fillStyle = 'rgba(40,92,72,0.85)';
          ctx.beginPath();
          ctx.ellipse(isle.x, by, isle.w * 0.5, 16, 0, 0, NG.TAU);
          ctx.fill();
          ctx.fillStyle = 'rgba(96,150,104,0.8)';
          ctx.beginPath();
          ctx.ellipse(isle.x, by - 10, isle.w * 0.46, 12, 0, 0, NG.TAU);
          ctx.fill();
          ctx.fillStyle = 'rgba(26,54,48,0.85)';
          jagged(
            ctx,
            [
              [isle.x - isle.w * 0.38, by + 6],
              [isle.x + isle.w * 0.36, by + 6],
              [isle.x + isle.w * 0.1, by + 54],
              [isle.x - isle.w * 0.18, by + 40],
            ],
            'rgba(24,52,46,0.85)'
          );
          // tiny tree
          ctx.strokeStyle = 'rgba(18,44,34,0.9)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(isle.x + 10, by - 12);
          ctx.lineTo(isle.x + 10, by - 40);
          ctx.stroke();
          ctx.fillStyle = 'rgba(44,92,62,0.9)';
          ctx.beginPath();
          ctx.arc(isle.x + 10, by - 46, 13, 0, NG.TAU);
          ctx.fill();
        }

        // birds
        ctx.strokeStyle = 'rgba(20,40,38,0.6)';
        ctx.lineWidth = 2;
        for (const b of this.birds) {
          const x = (b.x + t * b.sp) % (W + 80) - 40;
          const y = b.y + Math.sin(t * 0.8 + b.ph) * 10;
          ctx.beginPath();
          ctx.moveTo(x - 8 * b.s, y);
          ctx.quadraticCurveTo(x - 4 * b.s, y - 5 * b.s, x, y);
          ctx.quadraticCurveTo(x + 4 * b.s, y - 5 * b.s, x + 8 * b.s, y);
          ctx.stroke();
        }
      },
      drawGround(ctx, t) {
        const g = ctx.createLinearGradient(0, G, 0, H);
        g.addColorStop(0, '#2e5c45');
        g.addColorStop(0.2, '#1f4433');
        g.addColorStop(1, '#0a1a12');
        ctx.fillStyle = g;
        ctx.fillRect(0, G, W, H - G);
        ctx.strokeStyle = 'rgba(180,230,190,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, G + 1);
        ctx.lineTo(W, G + 1);
        ctx.stroke();

        // grass tufts
        ctx.strokeStyle = 'rgba(120,190,140,0.55)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 46; i++) {
          const x = (i * 59) % W;
          const sway = Math.sin(t * 1.6 + i) * 4 + (this.gust || 0) * this.windDir * 6;
          ctx.beginPath();
          ctx.moveTo(x, G + 4);
          ctx.quadraticCurveTo(x + sway, G - 8, x + sway * 2, G - 18);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let i = 0; i < 12; i++) {
          ctx.beginPath();
          ctx.ellipse((i * 197) % W, G + 30 + ((i * 43) % 70), 30, 8, 0, 0, NG.TAU);
          ctx.fill();
        }
      },
      drawFront(ctx, t) {
        const gust = this.gust || 0;
        ctx.save();
        ctx.strokeStyle = 'rgba(230,255,245,0.35)';
        ctx.lineWidth = 1.4;
        for (const s of this.streaks) {
          const sp = s.sp * (1 + gust * 2.6);
          const x = ((s.x + t * sp * this.windDir) % (W + 200) + W + 200) % (W + 200) - 100;
          const y = s.y + Math.sin(t + s.ph) * 10;
          ctx.globalAlpha = 0.1 + gust * 0.45;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + s.len * this.windDir * (1 + gust), y + 2);
          ctx.stroke();
        }
        ctx.restore();

        if (gust > 0.35) {
          ctx.save();
          ctx.globalAlpha = 0.5 * gust;
          ctx.fillStyle = '#dffbf0';
          ctx.font = `800 15px ${NG.FONT}`;
          ctx.textAlign = 'center';
          ctx.fillText(`CUỒNG PHONG ${this.windDir > 0 ? '→' : '←'}`, W / 2, 620);
          ctx.restore();
        }
        vignette(ctx, 'rgba(0,16,12,0.42)');
      },
    },

    /* ============================== FOREST ============================== */
    forest: {
      id: 'forest',
      name: 'RỪNG THIÊNG',
      short: 'Rừng',
      accent: '#7fe08a',
      desc: 'Rừng đêm tĩnh mịch, đom đóm lập lòe và lá vàng rơi.',
      effect: 'Linh khí hồi máu cho cả hai đấu sĩ',
      mods: { gravity: 1, speed: 1, jump: 1, grip: 1 },
      init() {
        this.stars = stars(60, 330, '#dfffe6');
        this.trees = [];
        for (let layer = 0; layer < 3; layer++) {
          const arr = [];
          const n = 7 - layer;
          for (let i = 0; i < n; i++) {
            arr.push({
              x: R(-40, W + 40),
              w: R(6, 16) - layer * 1.5,
              h: R(180, 340) + layer * 30,
              c: ['#0a2016', '#071a10', '#040f09'][layer],
            });
          }
          this.trees.push(arr);
        }
        this.fireflies = [];
        for (let i = 0; i < 26; i++) this.fireflies.push({ x: R(0, W), y: R(200, 580), ph: R(0, 7), sp: R(0.4, 1.2), r: R(1.4, 3.2), amp: R(10, 40) });
        this.leaves = [];
        for (let i = 0; i < 30; i++) this.leaves.push({ x: R(0, W), y: R(-100, 600), sp: R(16, 40), ph: R(0, 7), size: R(3, 6), sway: R(16, 40), rot: R(0, 7), vr: R(-2, 2) });
        this.fog = [];
        for (let i = 0; i < 5; i++) this.fog.push({ x: R(0, W), y: R(430, 540), w: R(220, 420), sp: R(3, 8), a: R(0.04, 0.09) });
        this.spiritT = 4.5;
        this.blessPulse = 0;
        this.spirits = [];
      },
      update(dt, game) {
        this.blessPulse = Math.max(0, this.blessPulse - dt * 0.9);
        this.spiritT -= dt;
        if (this.spiritT <= 0) {
          this.spiritT = 11;
          this.blessPulse = 1;
          if (game) {
            for (const f of game.fighters) {
              if (f.ko) continue;
              const before = f.hp;
              f.hp = Math.min(f.maxHp, f.hp + Math.round(f.maxHp * 0.04));
              const gained = Math.round(f.hp - before);
              if (gained > 0) {
                f.ghostDelay = 0;
                NG.FX.text(f.x + NG.rand(-10, 10), f.y - 195, `+${gained}`, '#9dffb0', 19);
                NG.FX.burst(f.x, f.y - 100, {
                  count: 12,
                  color: ['#a8ffbc', '#e7ffd0'],
                  speed: 190,
                  life: 0.8,
                  grav: -150,
                });
                NG.FX.ring(f.x, f.y - 55, '#8dffa8', 12, 0.6, 3);
              }
              this.spirits.push({ x: f.x + NG.rand(-24, 24), y: f.y - 130, t: 0, ph: NG.rand(0, 7) });
            }
            NG.Audio.tone(660, 0.5, { type: 'sine', vol: 0.07, slide: 990 });
            NG.Audio.tone(990, 0.7, { type: 'sine', vol: 0.045, delay: 0.08 });
          }
        }
        for (let i = this.spirits.length - 1; i >= 0; i--) {
          const s = this.spirits[i];
          s.t += dt;
          s.y -= 44 * dt;
          s.x += Math.sin(s.t * 2 + s.ph) * 16 * dt;
          if (s.t > 1.8) this.spirits.splice(i, 1);
        }
      },
      drawBack(ctx, t) {
        const g = ctx.createLinearGradient(0, 0, 0, G);
        g.addColorStop(0, '#020d08');
        g.addColorStop(0.4, '#082316');
        g.addColorStop(0.75, '#123a22');
        g.addColorStop(1, '#1b4a2b');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, G + 10);
        drawStars(ctx, this.stars, t * 0.6, 0.8);

        // moon
        ctx.save();
        const mg = ctx.createRadialGradient(1000, 150, 6, 1000, 150, 120);
        mg.addColorStop(0, 'rgba(225,255,220,0.9)');
        mg.addColorStop(0.25, 'rgba(180,240,190,0.25)');
        mg.addColorStop(1, 'rgba(120,220,150,0)');
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(1000, 150, 120, 0, NG.TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(228,255,224,0.82)';
        ctx.beginPath();
        ctx.arc(1000, 150, 34, 0, NG.TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(180,220,185,0.25)';
        ctx.beginPath();
        ctx.arc(992, 144, 7, 0, NG.TAU);
        ctx.arc(1008, 158, 5, 0, NG.TAU);
        ctx.fill();
        ctx.restore();

        // tree layers
        this.trees.forEach((layer, li) => {
          for (const tr of layer) {
            ctx.fillStyle = tr.c;
            ctx.fillRect(tr.x - tr.w / 2, G - tr.h, tr.w, tr.h);
            // branches
            ctx.strokeStyle = tr.c;
            ctx.lineWidth = Math.max(2, tr.w * 0.45);
            ctx.beginPath();
            ctx.moveTo(tr.x, G - tr.h * 0.55);
            ctx.lineTo(tr.x - tr.w * 3.2, G - tr.h * 0.78);
            ctx.moveTo(tr.x, G - tr.h * 0.68);
            ctx.lineTo(tr.x + tr.w * 3.4, G - tr.h * 0.9);
            ctx.stroke();
            // canopy
            ctx.fillStyle = tr.c;
            const cy = G - tr.h - 20;
            ctx.beginPath();
            ctx.arc(tr.x - tr.w * 2.4, cy + 30, 40 + li * 6, 0, NG.TAU);
            ctx.arc(tr.x + tr.w * 2.2, cy + 20, 46 + li * 5, 0, NG.TAU);
            ctx.arc(tr.x, cy, 54 + li * 8, 0, NG.TAU);
            ctx.fill();
          }
        });

        // fog
        for (const f of this.fog) {
          const x = (f.x + t * f.sp) % (W + 500) - 250;
          ctx.globalAlpha = f.a;
          ctx.fillStyle = '#b7e6c4';
          ctx.beginPath();
          ctx.ellipse(x, f.y, f.w * 0.5, 30, 0, 0, NG.TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // fireflies behind
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const ff of this.fireflies) {
          const x = ff.x + Math.sin(t * ff.sp + ff.ph) * ff.amp;
          const y = ff.y + Math.cos(t * ff.sp * 0.7 + ff.ph) * ff.amp * 0.6;
          const a = 0.25 + 0.6 * Math.abs(Math.sin(t * 2 + ff.ph));
          const grd = ctx.createRadialGradient(x, y, 0, x, y, ff.r * 6);
          grd.addColorStop(0, `rgba(210,255,150,${a})`);
          grd.addColorStop(1, 'rgba(150,255,120,0)');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(x, y, ff.r * 6, 0, NG.TAU);
          ctx.fill();
        }
        ctx.restore();
      },
      drawGround(ctx, t) {
        const g = ctx.createLinearGradient(0, G, 0, H);
        g.addColorStop(0, '#274a2b');
        g.addColorStop(0.22, '#18341d');
        g.addColorStop(1, '#06110a');
        ctx.fillStyle = g;
        ctx.fillRect(0, G, W, H - G);
        ctx.strokeStyle = 'rgba(150,220,160,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, G + 1);
        ctx.lineTo(W, G + 1);
        ctx.stroke();

        // roots
        ctx.strokeStyle = 'rgba(90,70,45,0.45)';
        ctx.lineWidth = 5;
        for (let i = 0; i < 7; i++) {
          const x = 90 + i * 175;
          ctx.beginPath();
          ctx.moveTo(x, G + 2);
          ctx.quadraticCurveTo(x + 30, G + 26, x - 16, G + 50);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(120,200,130,0.25)';
        for (let i = 0; i < 24; i++) {
          const x = (i * 103) % W;
          ctx.beginPath();
          ctx.ellipse(x, G + 8, 8, 3, 0, 0, NG.TAU);
          ctx.fill();
        }
      },
      drawFront(ctx, t) {
        if (this.blessPulse > 0.01) {
          const p = this.blessPulse;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const gr = ctx.createRadialGradient(W / 2, G - 20, 30, W / 2, G - 20, 620);
          gr.addColorStop(0, `rgba(130,255,160,${0.13 * p})`);
          gr.addColorStop(1, 'rgba(120,255,150,0)');
          ctx.fillStyle = gr;
          ctx.fillRect(0, 0, W, G + 20);
          ctx.restore();
        }
        for (const s of this.spirits) {
          const k = Math.max(0, 1 - s.t / 1.8);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const gr = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 26);
          gr.addColorStop(0, `rgba(214,255,196,${0.85 * k})`);
          gr.addColorStop(0.42, `rgba(150,255,140,${0.38 * k})`);
          gr.addColorStop(1, 'rgba(120,255,120,0)');
          ctx.fillStyle = gr;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 26, 0, NG.TAU);
          ctx.fill();
          ctx.fillStyle = `rgba(242,255,222,${0.9 * k})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 3.5, 0, NG.TAU);
          ctx.fill();
          ctx.restore();
        }
        for (const lf of this.leaves) {
          const y = ((lf.y + t * lf.sp) % 700) - 40;
          const x = lf.x + Math.sin(t * 0.9 + lf.ph) * lf.sway;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(lf.rot + t * lf.vr);
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = Math.sin(lf.ph) > 0 ? '#c9a24a' : '#8fb85a';
          ctx.beginPath();
          ctx.ellipse(0, 0, lf.size, lf.size * 0.42, 0, 0, NG.TAU);
          ctx.fill();
          ctx.restore();
        }
        // foreground fireflies
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 8; i++) {
          const ff = this.fireflies[i];
          const x = ff.x + Math.sin(t * ff.sp + ff.ph) * ff.amp;
          const y = ff.y + Math.cos(t * ff.sp * 0.7 + ff.ph) * ff.amp * 0.6;
          const a = 0.2 + 0.5 * Math.abs(Math.sin(t * 2.4 + ff.ph));
          ctx.fillStyle = `rgba(220,255,160,${a})`;
          ctx.beginPath();
          ctx.arc(x, y, ff.r, 0, NG.TAU);
          ctx.fill();
        }
        ctx.restore();
        vignette(ctx, 'rgba(0,10,4,0.55)');
      },
    },

    /* ============================== OCEAN ============================== */
    ocean: {
      id: 'ocean',
      name: 'ĐẠI DƯƠNG',
      short: 'Đại Dương',
      accent: '#4fd2ff',
      desc: 'Chiến đấu dưới đáy biển sâu, ánh sáng xuyên qua làn nước.',
      effect: 'Trọng lực giảm — di chuyển bồng bềnh dưới nước',
      mods: { gravity: 0.55, speed: 0.92, jump: 0.82, grip: 0.7 },
      init() {
        this.rays = [];
        for (let i = 0; i < 6; i++) this.rays.push({ x: R(80, W - 80), w: R(60, 150), ph: R(0, 7), a: R(0.04, 0.1) });
        this.fish = [];
        for (let i = 0; i < 10; i++) this.fish.push({ x: R(0, W), y: R(160, 430), sp: R(18, 52), s: R(0.5, 1.2), ph: R(0, 7), dir: Math.random() < 0.5 ? 1 : -1 });
        this.bubbles = [];
        for (let i = 0; i < 46; i++) this.bubbles.push({ x: R(0, W), y: R(0, 640), sp: R(12, 50), size: R(1.5, 5), ph: R(0, 7), sway: R(4, 16) });
        this.kelp = [];
        for (let i = 0; i < 10; i++) this.kelp.push({ x: 60 + i * 135 + R(-30, 30), h: R(90, 210), ph: R(0, 7), c: i % 2 ? '#0c3b2e' : '#124d38' });
        this.corals = [];
        for (let i = 0; i < 7; i++) this.corals.push({ x: R(40, W - 40), h: R(30, 80), ph: R(0, 7), c: i % 2 ? '#a8477c' : '#c86a4a' });
        this.spores = [];
        for (let i = 0; i < 40; i++) this.spores.push({ x: R(0, W), y: R(0, 620), sp: R(4, 14), size: R(0.6, 1.6), ph: R(0, 7) });
      },
      update() {},
      drawBack(ctx, t) {
        const g = ctx.createLinearGradient(0, 0, 0, G);
        g.addColorStop(0, '#02182c');
        g.addColorStop(0.42, '#053a54');
        g.addColorStop(0.8, '#0a5570');
        g.addColorStop(1, '#0d3d52');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, G + 10);

        // god rays
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const r of this.rays) {
          const sway = Math.sin(t * 0.4 + r.ph) * 30;
          const grd = ctx.createLinearGradient(0, 0, 0, 560);
          grd.addColorStop(0, `rgba(150,240,255,${r.a * 1.6})`);
          grd.addColorStop(0.6, `rgba(90,200,255,${r.a * 0.5})`);
          grd.addColorStop(1, 'rgba(60,160,220,0)');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.moveTo(r.x - r.w * 0.3 + sway, 0);
          ctx.lineTo(r.x + r.w * 0.3 + sway, 0);
          ctx.lineTo(r.x + r.w * 0.7 + sway * 2, 560);
          ctx.lineTo(r.x - r.w * 0.5 + sway * 2, 560);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // distant rock arch
        jagged(ctx, [[0, 560], [90, 360], [180, 420], [240, 330], [330, 450], [420, 560]], 'rgba(4,28,42,0.9)');
        jagged(ctx, [[860, 560], [960, 380], [1040, 430], [1120, 350], [1210, 440], [1280, 560]], 'rgba(4,26,40,0.9)');

        // fish
        for (const fsh of this.fish) {
          const span = W + 200;
          const x = (((fsh.x + t * fsh.sp * fsh.dir) % span) + span) % span - 100;
          const y = fsh.y + Math.sin(t * 1.4 + fsh.ph) * 12;
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(fsh.dir * fsh.s, fsh.s);
          ctx.fillStyle = 'rgba(10,62,80,0.85)';
          ctx.beginPath();
          ctx.ellipse(0, 0, 15, 6, 0, 0, NG.TAU);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(-13, 0);
          ctx.lineTo(-24, -6);
          ctx.lineTo(-24, 6);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // kelp
        for (const k of this.kelp) {
          ctx.strokeStyle = k.c;
          ctx.lineWidth = 7;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(k.x, G + 4);
          for (let j = 1; j <= 5; j++) {
            const yy = G + 4 - (k.h / 5) * j;
            const xx = k.x + Math.sin(t * 0.8 + k.ph + j * 0.7) * j * 5;
            ctx.lineTo(xx, yy);
          }
          ctx.stroke();
        }

        // corals (silhouettes)
        for (const c of this.corals) {
          ctx.strokeStyle = c.c;
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(c.x, G + 4);
          ctx.lineTo(c.x, G - c.h * 0.4);
          ctx.moveTo(c.x, G - c.h * 0.3);
          ctx.lineTo(c.x - c.h * 0.28, G - c.h * 0.7);
          ctx.moveTo(c.x, G - c.h * 0.45);
          ctx.lineTo(c.x + c.h * 0.26, G - c.h * 0.85);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // caustics
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.strokeStyle = '#bfefff';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          for (let x = 0; x <= W; x += 30) {
            const y = 470 + i * 26 + Math.sin(x * 0.014 + t * 1.1 + i) * 7;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.restore();
      },
      drawGround(ctx, t) {
        const g = ctx.createLinearGradient(0, G, 0, H);
        g.addColorStop(0, '#1b4454');
        g.addColorStop(0.25, '#102c3a');
        g.addColorStop(1, '#041018');
        ctx.fillStyle = g;
        ctx.fillRect(0, G, W, H - G);
        ctx.strokeStyle = 'rgba(120,220,255,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, G + 1);
        ctx.lineTo(W, G + 1);
        ctx.stroke();

        // shells and rocks
        ctx.fillStyle = 'rgba(6,24,32,0.8)';
        for (let i = 0; i < 14; i++) {
          const x = (i * 173) % W;
          const y = G + 30 + ((i * 57) % 80);
          ctx.beginPath();
          ctx.ellipse(x, y, 18 + (i % 4) * 5, 6, 0, 0, NG.TAU);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(210,240,255,0.25)';
        for (let i = 0; i < 6; i++) {
          const x = 100 + i * 200;
          ctx.beginPath();
          ctx.arc(x, G + 22, 6, Math.PI, NG.TAU);
          ctx.fill();
        }
      },
      drawFront(ctx, t) {
        ctx.save();
        for (const b of this.bubbles) {
          const y = (b.y - t * b.sp * 1.5) % 680;
          const yy = y < 0 ? y + 680 : y;
          const x = b.x + Math.sin(t * 1.2 + b.ph) * b.sway;
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = '#bfeaff';
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.arc(x, yy, b.size, 0, NG.TAU);
          ctx.stroke();
        }
        // floating spores
        ctx.globalCompositeOperation = 'lighter';
        for (const s of this.spores) {
          const x = s.x + Math.sin(t * 0.5 + s.ph) * 18;
          const y = (s.y + Math.sin(t * 0.7 + s.ph) * 30 + 620) % 620;
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = '#9fe8ff';
          ctx.beginPath();
          ctx.arc(x, y, s.size, 0, NG.TAU);
          ctx.fill();
        }
        ctx.restore();
        // deep water tint
        ctx.fillStyle = 'rgba(0,70,110,0.12)';
        ctx.fillRect(0, 0, W, H);
        vignette(ctx, 'rgba(0,10,24,0.55)');
      },
    },
  };

  NG.ARENAS = ARENAS;
  NG.ARENA_ORDER = ['volcano', 'desert', 'ice', 'wind', 'forest', 'ocean'];
})();
