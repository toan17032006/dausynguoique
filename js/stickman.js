(function () {
  const NG = window.NG;

  const D = Math.PI / 180;
  function limb(o, angDeg, len) {
    const a = angDeg * D;
    return { x: o.x + Math.sin(a) * len, y: o.y + Math.cos(a) * len };
  }
  function poly(ctx, pts, fill, stroke, lw) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw || 2;
      ctx.stroke();
    }
  }

  /**
   * Draws a stickman fighter. The local origin is at the fighter's feet.
   * opts.preview -> scale down slightly and skip heavy effects.
   */
  NG.drawFighter = function (ctx, f, opts) {
    const def = f.def;
    const pal = def.palette;
    const t = f.animT || 0;
    const state = f.state || 'idle';
    const preview = !!(opts && opts.preview);

    let bob = 0;
    let lean = 0;
    let headTilt = 0;
    let armF = { a: 24, e: 52 };
    let armB = { a: -14, e: 42 };
    let legF = { h: 8, k: 6 };
    let legB = { h: -8, k: 8 };
    let crouch = 0;
    let swirl = 0;
    let swirlKick = false;

    const moving =
      f.onGround && Math.abs(f.vx || 0) > 60 && !f.attack && !f.casting && !(f.hitstun > 0) && state !== 'ko';

    if (state === 'ko') {
      bob = 0;
      lean = 0;
      headTilt = 0.15;
      armF = { a: 78, e: -18 };
      armB = { a: 40, e: -30 };
      legF = { h: 34, k: -12 };
      legB = { h: 2, k: -20 };
    } else if (f.hitstun > 0) {
      lean = -0.24;
      headTilt = -0.22;
      armF = { a: 66, e: 16 };
      armB = { a: -62, e: 22 };
      legF = { h: 28, k: 32 };
      legB = { h: -24, k: 26 };
    } else if (f.casting) {
      const c = f.casting;
      const cp = Math.min(1, c.t / Math.max(0.001, c.dur));
      const id = def.id;
      if (id === 'kim') {
        lean = 0.1;
        armF = { a: 92, e: 4 };
        armB = { a: -48, e: 46 };
        legF = { h: 28, k: 26 };
        legB = { h: -20, k: 22 };
      } else if (id === 'moc') {
        lean = -0.06;
        armF = { a: 148, e: 20 };
        armB = { a: 132, e: 28 };
        legF = { h: 18, k: 22 };
        legB = { h: -18, k: 24 };
      } else if (id === 'thuy') {
        lean = 0.2;
        armF = { a: 72, e: 28 };
        armB = { a: 34, e: 54 };
        legF = { h: 34, k: 34 };
        legB = { h: -24, k: 26 };
      } else if (id === 'hoa') {
        lean = -0.1;
        armF = { a: 152, e: 16 };
        armB = { a: 142, e: 22 };
        legF = { h: 22, k: 26 };
        legB = { h: -22, k: 26 };
      } else if (id === 'phong') {
        lean = -0.12;
        armF = { a: 128, e: 34 };
        armB = { a: 104, e: 42 };
        legF = { h: 26, k: 22 };
        legB = { h: -18, k: 24 };
      } else {
        if (cp < 0.45) {
          lean = -0.12;
          armF = { a: 168, e: 10 };
          armB = { a: 158, e: 16 };
          legF = { h: 22, k: 30 };
          legB = { h: -20, k: 30 };
        } else {
          lean = 0.3;
          crouch = 12;
          armF = { a: 62, e: 4 };
          armB = { a: 50, e: 6 };
          legF = { h: 30, k: 40 };
          legB = { h: -26, k: 38 };
        }
      }
    } else if (f.attack) {
      const a = f.attack;
      const total = a.startup + a.active + a.recover;
      const tt = Math.min(1, a.t / total);
      const ext = tt < 0.45 ? NG.easeOutCubic(Math.min(1, tt / 0.45)) : 1 - NG.easeInCubic(Math.min(1, (tt - 0.45) / 0.55));
      if (a.type === 'heavy') {
        lean = 0.18;
        legF = { h: 18 + 74 * ext, k: 30 * (1 - ext) };
        legB = { h: -14, k: 16 };
        armF = { a: 28, e: 62 };
        armB = { a: -44, e: 34 };
        swirl = ext;
        swirlKick = true;
      } else {
        lean = 0.12;
        armF = { a: 42 + 52 * ext, e: 58 * (1 - ext) };
        armB = { a: -42, e: 74 };
        legF = { h: 22, k: 22 };
        legB = { h: -14, k: 16 };
        swirl = ext;
      }
    } else if (f.blocking) {
      crouch = 7;
      lean = -0.05;
      armF = { a: 60, e: 98 };
      armB = { a: 48, e: 110 };
      legF = { h: 22, k: 36 };
      legB = { h: -20, k: 34 };
    } else if (!f.onGround) {
      lean = 0.05;
      legF = { h: 54, k: 58 };
      legB = { h: -26, k: 46 };
      armF = { a: 86, e: 24 };
      armB = { a: -58, e: 42 };
    } else if (state === 'victory') {
      bob = Math.sin(t * 3) * 2;
      armF = { a: 166 + Math.sin(t * 3) * 6, e: 8 };
      armB = { a: 156 + Math.cos(t * 3) * 6, e: 14 };
      legF = { h: 8, k: 4 };
      legB = { h: -8, k: 6 };
    } else if (moving) {
      const ph = f.walkPhase || 0;
      const s = Math.sin(ph);
      lean = 0.08;
      legF = { h: s * 38, k: 18 + Math.max(0, -s) * 38 };
      legB = { h: -s * 38, k: 18 + Math.max(0, s) * 38 };
      armF = { a: 24 - s * 30, e: 48 + Math.max(0, s) * 12 };
      armB = { a: -16 + s * 30, e: 42 + Math.max(0, -s) * 12 };
    } else {
      bob = Math.sin(t * 2.3) * 2.4;
      lean = Math.sin(t * 2.3) * 0.012;
      armF = { a: 22 + Math.sin(t * 2.3) * 4, e: 55 };
      armB = { a: -14 + Math.cos(t * 2.3) * 4, e: 42 };
      legF = { h: 7, k: 5 };
      legB = { h: -7, k: 7 };
    }

    ctx.save();
    ctx.translate(f.x, f.y);
    if (opts && opts.scale) ctx.scale(opts.scale, opts.scale);
    ctx.scale(f.facing || 1, 1);

    if (state === 'ko') {
      ctx.translate(0, -2);
      ctx.rotate(-1.45);
    }

    const pelvis = { x: 0, y: -80 - crouch + bob };
    const chest = { x: pelvis.x + Math.sin(lean) * 44, y: pelvis.y - Math.cos(lean) * 44 };
    const neck = { x: chest.x + Math.sin(lean) * 12, y: chest.y - Math.cos(lean) * 12 };
    const head = { x: neck.x + Math.sin(lean + headTilt) * 16, y: neck.y - Math.cos(lean + headTilt) * 16 };

    const hipF = { x: pelvis.x + 5, y: pelvis.y };
    const hipB = { x: pelvis.x - 5, y: pelvis.y };
    const kneeF = limb(hipF, legF.h, 40);
    const ankleF = limb(kneeF, legF.h - legF.k, 40);
    const kneeB = limb(hipB, legB.h, 40);
    const ankleB = limb(kneeB, legB.h - legB.k, 40);
    const shF = { x: chest.x + 2, y: chest.y + 3 };
    const shB = { x: chest.x - 2, y: chest.y + 3 };
    const elbowF = limb(shF, armF.a, 30);
    const handF = limb(elbowF, armF.a + armF.e, 30);
    const elbowB = limb(shB, armB.a, 30);
    const handB = limb(elbowB, armB.a + armB.e, 30);

    if (f.onGround && state !== 'ko') {
      const dy = -Math.max(ankleF.y, ankleB.y);
      const pts = [pelvis, chest, neck, head, hipF, hipB, kneeF, kneeB, ankleF, ankleB, shF, shB, elbowF, elbowB, handF, handB];
      for (let i = 0; i < pts.length; i++) pts[i].y += dy;
    }

    const glowPulse = 0.55 + Math.sin(t * 4) * 0.25;

    // ---- attack swoosh (behind body) ----
    if (swirl > 0.04 && !preview) {
      ctx.save();
      ctx.globalAlpha = 0.62 * swirl;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = pal.accent;
      ctx.shadowColor = pal.glow;
      ctx.shadowBlur = 16;
      ctx.lineWidth = 7 * swirl + 1;
      ctx.lineCap = 'round';
      const cx = swirlKick ? pelvis.x + 12 : chest.x + 10;
      const cy = swirlKick ? pelvis.y + 16 : chest.y + 10;
      ctx.beginPath();
      if (swirlKick) {
        ctx.arc(cx, cy, 66, -0.55, 0.95);
        ctx.arc(cx, cy, 48, 0.9, -0.5, true);
      } else {
        ctx.arc(cx, cy, 62, -0.95, 0.9);
        ctx.arc(cx, cy, 44, 0.85, -0.9, true);
      }
      ctx.stroke();
      ctx.restore();
    }

    const segDark = [];
    const segSkin = [];
    const segTorsoDark = [];
    const segTorso = [];

    segDark.push([hipB, kneeB], [kneeB, ankleB], [shB, elbowB], [elbowB, handB]);
    segSkin.push([hipB, kneeB], [kneeB, ankleB], [shB, elbowB], [elbowB, handB]);
    segTorsoDark.push([pelvis, chest], [chest, neck]);
    segTorso.push([pelvis, chest], [chest, neck]);

    const backAlpha = 0.68;

    // back limbs
    ctx.globalAlpha = backAlpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(4,7,11,0.9)';
    ctx.lineWidth = 12;
    for (const s of segDark) {
      ctx.beginPath();
      ctx.moveTo(s[0].x, s[0].y);
      ctx.lineTo(s[1].x, s[1].y);
      ctx.stroke();
    }
    ctx.strokeStyle = pal.skin;
    ctx.lineWidth = 7.5;
    for (const s of segSkin) {
      ctx.beginPath();
      ctx.moveTo(s[0].x, s[0].y);
      ctx.lineTo(s[1].x, s[1].y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // torso
    if (!preview) {
      ctx.shadowColor = pal.glow;
      ctx.shadowBlur = f.energy >= 100 ? 12 * glowPulse : 0;
    }
    ctx.strokeStyle = 'rgba(4,7,11,0.95)';
    ctx.lineWidth = 17;
    for (const s of segTorsoDark) {
      ctx.beginPath();
      ctx.moveTo(s[0].x, s[0].y);
      ctx.lineTo(s[1].x, s[1].y);
      ctx.stroke();
    }
    ctx.strokeStyle = pal.skin;
    ctx.lineWidth = 10.5;
    for (const s of segTorso) {
      ctx.beginPath();
      ctx.moveTo(s[0].x, s[0].y);
      ctx.lineTo(s[1].x, s[1].y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // front leg
    ctx.strokeStyle = 'rgba(4,7,11,0.95)';
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(hipF.x, hipF.y);
    ctx.lineTo(kneeF.x, kneeF.y);
    ctx.lineTo(ankleF.x, ankleF.y);
    ctx.stroke();
    ctx.strokeStyle = pal.skin;
    ctx.lineWidth = 8.5;
    ctx.beginPath();
    ctx.moveTo(hipF.x, hipF.y);
    ctx.lineTo(kneeF.x, kneeF.y);
    ctx.lineTo(ankleF.x, ankleF.y);
    ctx.stroke();

    // feet
    ctx.strokeStyle = pal.skin;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(ankleF.x, ankleF.y);
    ctx.lineTo(ankleF.x + 12, ankleF.y + 1);
    ctx.stroke();
    ctx.globalAlpha = backAlpha;
    ctx.beginPath();
    ctx.moveTo(ankleB.x, ankleB.y);
    ctx.lineTo(ankleB.x + 11, ankleB.y + 1);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // front arm
    ctx.strokeStyle = 'rgba(4,7,11,0.95)';
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(shF.x, shF.y);
    ctx.lineTo(elbowF.x, elbowF.y);
    ctx.lineTo(handF.x, handF.y);
    ctx.stroke();
    ctx.strokeStyle = pal.skin;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(shF.x, shF.y);
    ctx.lineTo(elbowF.x, elbowF.y);
    ctx.lineTo(handF.x, handF.y);
    ctx.stroke();

    // hands
    ctx.fillStyle = pal.accent;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(handF.x, handF.y, 5, 0, NG.TAU);
    ctx.fill();
    ctx.globalAlpha = backAlpha;
    ctx.beginPath();
    ctx.arc(handB.x, handB.y, 4.4, 0, NG.TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    // ---- head ----
    const rHead = 19;
    ctx.save();
    if (!preview && f.energy >= 100) {
      ctx.shadowColor = pal.glow;
      ctx.shadowBlur = 18 * glowPulse;
    }
    ctx.beginPath();
    ctx.arc(head.x, head.y, rHead, 0, NG.TAU);
    ctx.fillStyle = 'rgba(9,13,20,0.72)';
    ctx.fill();
    ctx.strokeStyle = pal.skin;
    ctx.lineWidth = 5.4;
    ctx.stroke();
    ctx.restore();

    // neck joint
    ctx.strokeStyle = pal.skin;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(neck.x, neck.y);
    ctx.lineTo(head.x, head.y + rHead * 0.55);
    ctx.stroke();

    // eyes / ko marks
    ctx.save();
    ctx.strokeStyle = pal.eye;
    ctx.fillStyle = pal.eye;
    ctx.shadowColor = pal.glow;
    ctx.shadowBlur = 8;
    if (state === 'ko') {
      ctx.lineWidth = 2.2;
      for (let i = 0; i < 2; i++) {
        const ex = head.x + 2 + i * 9;
        const ey = head.y - 3;
        ctx.beginPath();
        ctx.moveTo(ex - 2.6, ey - 2.6);
        ctx.lineTo(ex + 2.6, ey + 2.6);
        ctx.moveTo(ex + 2.6, ey - 2.6);
        ctx.lineTo(ex - 2.6, ey + 2.6);
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.arc(head.x + 6.5, head.y - 2.5, 2.1, 0, NG.TAU);
      ctx.arc(head.x + 12.5, head.y - 2.5, 2.1, 0, NG.TAU);
      ctx.fill();
    }
    ctx.restore();

    // ---- element accessories ----
    ctx.save();
    ctx.lineCap = 'round';
    if (def.id === 'kim') {
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 5;
      ctx.shadowColor = pal.glow;
      ctx.shadowBlur = preview ? 0 : 10;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 21.5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      // crest
      ctx.fillStyle = pal.accent;
      poly(
        ctx,
        [
          { x: head.x + 1, y: head.y - 23 },
          { x: head.x + 9, y: head.y - 40 },
          { x: head.x - 2, y: head.y - 33 },
        ],
        pal.accent
      );
      // shoulder plates
      ctx.globalAlpha = 0.85;
      poly(
        ctx,
        [
          { x: shF.x - 9, y: shF.y - 4 },
          { x: shF.x + 10, y: shF.y - 7 },
          { x: shF.x + 7, y: shF.y + 8 },
          { x: shF.x - 8, y: shF.y + 6 },
        ],
        pal.accent
      );
      ctx.globalAlpha = 1;
    } else if (def.id === 'moc') {
      ctx.strokeStyle = pal.glow;
      ctx.lineWidth = 3;
      const sway = Math.sin(t * 2.4) * 0.12;
      for (let i = 0; i < 3; i++) {
        const bx = head.x - 2 + i * 4;
        const by = head.y - 20;
        const ang = (-0.9 + i * 0.6 + sway) * 1;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(ang);
        ctx.fillStyle = i % 2 ? '#8ff07e' : '#4fbf62';
        ctx.beginPath();
        ctx.ellipse(0, -7, 4.5, 9, 0, 0, NG.TAU);
        ctx.fill();
        ctx.restore();
      }
      // forearm vine
      ctx.strokeStyle = '#59c96a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(elbowF.x - 3, elbowF.y + 8);
      ctx.quadraticCurveTo(elbowF.x + 8, elbowF.y + 2, handF.x + 2, handF.y - 3);
      ctx.stroke();
    } else if (def.id === 'thuy') {
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 4;
      ctx.shadowColor = pal.glow;
      ctx.shadowBlur = preview ? 0 : 12;
      for (let i = 0; i < 3; i++) {
        const w = Math.sin(t * 2.2 + i * 1.3) * 7;
        ctx.beginPath();
        ctx.moveTo(head.x - 4, head.y - 12 + i * 4);
        ctx.quadraticCurveTo(head.x - 22 + w, head.y + 2 + i * 9, head.x - 16 + w * 1.4, head.y + 30 + i * 7);
        ctx.stroke();
      }
      ctx.fillStyle = pal.eye;
      ctx.beginPath();
      ctx.arc(head.x + 4, head.y - 11, 2.6, 0, NG.TAU);
      ctx.fill();
    } else if (def.id === 'hoa') {
      ctx.shadowColor = pal.glow;
      ctx.shadowBlur = preview ? 0 : 14;
      for (let i = 0; i < 3; i++) {
        const fx = head.x - 8 + i * 8;
        const flick = Math.sin(t * 9 + i * 2.1) * 2.4;
        const hgt = 15 + (i === 1 ? 7 : 0) + flick;
        const grd = ctx.createLinearGradient(0, head.y - 20 - hgt, 0, head.y - 12);
        grd.addColorStop(0, '#ffe27a');
        grd.addColorStop(0.55, '#ff8a2a');
        grd.addColorStop(1, '#e2340f');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(fx - 4.5, head.y - 16);
        ctx.quadraticCurveTo(fx - 5, head.y - 20 - hgt * 0.6, fx + flick * 0.4, head.y - 18 - hgt);
        ctx.quadraticCurveTo(fx + 5.5, head.y - 20 - hgt * 0.4, fx + 4.5, head.y - 16);
        ctx.closePath();
        ctx.fill();
      }
    } else if (def.id === 'tho') {
      ctx.strokeStyle = '#a9743a';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#8c5f2c';
      // gauntlets
      for (const hnd of [handF, handB]) {
        poly(
          ctx,
          [
            { x: hnd.x - 7, y: hnd.y - 7 },
            { x: hnd.x + 6, y: hnd.y - 9 },
            { x: hnd.x + 9, y: hnd.y + 2 },
            { x: hnd.x + 2, y: hnd.y + 9 },
            { x: hnd.x - 8, y: hnd.y + 5 },
          ],
          'rgba(140,95,44,0.95)',
          '#c99a5b',
          1.6
        );
      }
      // shoulder boulder
      poly(
        ctx,
        [
          { x: shB.x - 12, y: shB.y - 8 },
          { x: shB.x + 4, y: shB.y - 13 },
          { x: shB.x + 11, y: shB.y + 2 },
          { x: shB.x - 2, y: shB.y + 9 },
          { x: shB.x - 13, y: shB.y + 2 },
        ],
        'rgba(140,95,44,0.85)',
        '#c99a5b',
        1.6
      );
      // headband
      ctx.strokeStyle = '#d9a25a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(head.x - 18, head.y - 4);
      ctx.lineTo(head.x + 18, head.y - 6);
      ctx.stroke();
      const tw = Math.sin(t * 5) * 3;
      ctx.beginPath();
      ctx.moveTo(head.x - 17, head.y - 4);
      ctx.quadraticCurveTo(head.x - 30, head.y + tw, head.x - 34, head.y + 10 - tw);
      ctx.stroke();
    } else if (def.id === 'phong') {
      ctx.shadowColor = pal.glow;
      ctx.shadowBlur = preview ? 0 : 12;
      ctx.strokeStyle = pal.accent;
      // wind rings spiralling around the torso
      for (let i = 0; i < 3; i++) {
        const ph = t * 3.2 + i * 2.1;
        ctx.globalAlpha = 0.75 - i * 0.2;
        ctx.lineWidth = 3.4 - i * 0.8;
        ctx.beginPath();
        ctx.ellipse(chest.x, chest.y + 24 + i * 14, 30 + i * 9, 9 + i * 3, Math.sin(ph) * 0.3, 0, NG.TAU);
        ctx.stroke();
      }
      // trailing scarf ribbons
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 2.6;
      const sway = Math.sin(t * 4.2);
      ctx.beginPath();
      ctx.moveTo(head.x - 6, head.y - 10);
      ctx.quadraticCurveTo(head.x - 34, head.y - 6 + sway * 6, head.x - 52, head.y + 14 + sway * 9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(head.x - 8, head.y - 2);
      ctx.quadraticCurveTo(head.x - 30, head.y + 8 - sway * 5, head.x - 46, head.y + 30 - sway * 7);
      ctx.stroke();
      // little vortex on the lead hand
      ctx.globalAlpha = 1;
      ctx.fillStyle = pal.accent;
      ctx.beginPath();
      ctx.arc(handF.x, handF.y, 4.5, 0, NG.TAU);
      ctx.fill();
    }

    // chest emblem
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = pal.accent;
    ctx.font = `700 10px ${NG.FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.char, chest.x + 1, chest.y + 13);
    ctx.globalAlpha = 1;
    ctx.restore();

    // ---- block shield ----
    if (f.blocking && !preview) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(t * 6) * 0.1;
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 4;
      ctx.shadowColor = pal.glow;
      ctx.shadowBlur = 16;
      const bx = chest.x + 20;
      const by = chest.y + 6;
      ctx.beginPath();
      ctx.arc(bx, by, 48, -1.15, 1.15);
      ctx.stroke();
      ctx.globalAlpha = 0.12;
      ctx.beginPath();
      ctx.arc(bx, by, 48, -1.15, 1.15);
      ctx.lineTo(bx, by);
      ctx.closePath();
      ctx.fillStyle = pal.accent;
      ctx.fill();
      ctx.restore();
    }

    // ---- skill cast glow ----
    if (f.casting && !preview) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const c = f.casting;
      const k = Math.min(1, c.t / 0.25);
      for (const hnd of [handF, handB]) {
        const g = ctx.createRadialGradient(hnd.x, hnd.y, 0, hnd.x, hnd.y, 26);
        g.addColorStop(0, NG.hexA(pal.accent, 0.8 * k));
        g.addColorStop(1, NG.hexA(pal.glow, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(hnd.x, hnd.y, 26, 0, NG.TAU);
        ctx.fill();
      }
      ctx.strokeStyle = NG.hexA(pal.accent, 0.5 * k);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(chest.x, chest.y + 20, 58 + Math.sin(t * 8) * 4, 0, NG.TAU);
      ctx.stroke();
      ctx.restore();
    }

    // ---- full energy aura ----
    if (f.energy >= 100 && !preview && state !== 'ko') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.1 + Math.sin(t * 5) * 0.05;
      ctx.fillStyle = pal.glow;
      ctx.beginPath();
      ctx.ellipse(0, -90, 52, 100, 0, 0, NG.TAU);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  };

  // Subtle animated shadow under a fighter.
  NG.drawShadow = function (ctx, f) {
    const lift = NG.clamp((NG.GROUND - f.y) / 220, 0, 1);
    const w = 64 * (1 - lift * 0.45);
    const a = 0.34 * (1 - lift * 0.55);
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.beginPath();
    ctx.ellipse(f.x, NG.GROUND + 5, w, 12, 0, 0, NG.TAU);
    ctx.fill();
    ctx.restore();
  };
})();
