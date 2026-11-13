(function () {
  const NG = window.NG;
  const W = NG.W;
  const H = NG.H;
  const GROUND = NG.GROUND;
  const $ = (id) => document.getElementById(id);
  const TAU = NG.TAU;

  const DIFFICULTY = {
    easy: { aggro: 0.5, react: 0.55, block: 0.22, skill: 0.55, name: 'DỄ' },
    normal: { aggro: 0.74, react: 0.32, block: 0.43, skill: 0.78, name: 'THƯỜNG' },
    hard: { aggro: 0.92, react: 0.17, block: 0.66, skill: 0.95, name: 'KHÓ' },
  };

  const game = {
    state: 'boot',
    canvas: null,
    ctx: null,
    time: 0,
    fighters: [],
    arena: null,
    arenaId: 'volcano',
    backdropFighters: [],
    picks: { p1: 'kim', p2: 'hoa', arena: 'volcano' },
    settings: { difficulty: 'normal', sound: true, mode: 'ai' },
    mode: 'ai',
    survival: null,
    boutStartHp: null,
    resultAction: null,
    round: 1,
    wins: [0, 0],
    phase: 'intro',
    phaseT: 0,
    timer: 75,
    roundTime: 75,
    hitstop: 0,
    slowmo: 1,
    shake: 0,
    banner: null,
    projectiles: [],
    hazards: [],
    endInfo: null,
    matchWinner: null,
    matchCfg: null,
    hintT: 0,
    isTouch: false,
    cardPreviews: [],
    cardTimer: 0,
    paused: false,
    guideOpen: false,

    /* ================================ INIT ================================ */
    init() {
      this.canvas = $('game');
      this.ctx = this.canvas.getContext('2d');
      this.settings = NG.loadSettings();
      this.mode = this.settings.mode || 'ai';
      NG.Audio.enabled = this.settings.sound;
      NG.Input.init();
      this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      this.fitStage();
      window.addEventListener('resize', () => this.fitStage());

      this.buildSelect();
      this.buildGuide();
      this.wireUI();
      this.updateModeUI();

      const wake = () => {
        NG.Audio.init();
        NG.Audio.resume();
      };
      window.addEventListener('pointerdown', wake, true);
      window.addEventListener('keydown', wake, true);

      this.updateSettingsUI();
      this.showMenu();
      this.startLoop();
    },

    fitStage() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.min(vw / W, vh / H);
      const stage = $('stage');
      const x = (vw - W * s) / 2;
      const y = (vh - H * s) / 2;
      stage.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    },

    startLoop() {
      let last = performance.now();
      const loop = (now) => {
        let dt = (now - last) / 1000;
        last = now;
        if (!isFinite(dt) || dt <= 0) dt = 0.016;
        dt = Math.min(dt, 0.045);
        this.tick(dt);
        this.draw();
        NG.Input.clearFrame();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },

    /* ============================ SCREEN / UI ============================ */
    setScreen(name) {
      this.state = name;
      ['menu-screen', 'select-screen', 'pause-screen', 'result-screen', 'guide-screen'].forEach((id) => {
        const el = $(id);
        if (el) el.classList.add('hidden');
      });
      if (name === 'menu') $('menu-screen').classList.remove('hidden');
      else if (name === 'select') $('select-screen').classList.remove('hidden');
      else if (name === 'paused') $('pause-screen').classList.remove('hidden');
      else if (name === 'result') $('result-screen').classList.remove('hidden');
      this.updateTouchVisibility();
    },

    updateTouchVisibility() {
      const el = $('touch-controls');
      if (!el) return;
      if (this.isTouch && this.state === 'battle') el.classList.remove('hidden');
      else el.classList.add('hidden');
    },

    showMenu() {
      this.guideOpen = false;
      this.setScreen('menu');
      this.updateBackdrop();
      NG.Input.clearAll();
    },

    showSelect() {
      this.guideOpen = false;
      this.setScreen('select');
      this.updateModeUI();
      this.updateSelectUI();
      NG.Input.clearAll();
    },

    updateBackdrop() {
      const a = NG.ARENAS[this.picks.arena];
      if (!this.arena || this.arena.id !== a.id) {
        this.arena = a;
        this.arena.init();
      }
      const f1 = NG.createFighter(NG.FIGHTERS[this.picks.p1], 430, 1, false);
      const f2 = NG.createFighter(NG.FIGHTERS[this.picks.p2], 850, -1, true);
      f1.animT = 1.2;
      f2.animT = 3.4;
      this.backdropFighters = [f1, f2];
    },

    buildSelect() {
      const p1row = $('p1-cards');
      const p2row = $('p2-cards');
      const arenaRow = $('arena-cards');
      p1row.innerHTML = '';
      p2row.innerHTML = '';
      arenaRow.innerHTML = '';

      const makeCard = (id, side) => {
        const d = NG.FIGHTERS[id];
        const card = document.createElement('div');
        card.className = 'fcard';
        card.dataset.id = id;
        card.dataset.side = side;
        card.innerHTML = `
          <canvas width="104" height="196"></canvas>
          <div class="fc-body">
            <div class="fc-name" style="color:${d.accent}">${d.name}</div>
            <div class="fc-title">${d.title}</div>
            <div class="fc-skill"><b>Kỹ:</b> ${d.skill.name}</div>
          </div>
          <div class="badge">${side === 'p1' ? 'P1' : 'P2'}</div>`;
        const canvas = card.querySelector('canvas');
        this.cardPreviews.push({ canvas, ctx: canvas.getContext('2d'), def: d, off: Math.random() * 6 });
        card.addEventListener('click', () => {
          this.picks[side] = id;
          NG.Audio.ui();
          this.updateSelectUI();
        });
        card.addEventListener('mouseenter', () => {
          this.showFootDetail(d);
          NG.Audio.hover();
        });
        card.addEventListener('mouseleave', () => this.showFootSummary());
        return card;
      };

      NG.FIGHTER_ORDER.forEach((id) => p1row.appendChild(makeCard(id, 'p1')));
      NG.FIGHTER_ORDER.forEach((id) => p2row.appendChild(makeCard(id, 'p2')));

      NG.ARENA_ORDER.forEach((id) => {
        const a = NG.ARENAS[id];
        const el = document.createElement('div');
        el.className = 'arena';
        el.dataset.arena = id;
        el.innerHTML = `<div class="an">${a.name}</div><div class="am">${a.effect}</div>`;
        el.addEventListener('click', () => {
          this.picks.arena = id;
          NG.Audio.ui();
          this.updateSelectUI();
        });
        el.addEventListener('mouseenter', () => {
          $('foot-info').innerHTML = `<b style="color:${a.accent}">${a.name}</b> · ${a.desc}<br>${a.effect}`;
        });
        el.addEventListener('mouseleave', () => this.showFootSummary());
        arenaRow.appendChild(el);
      });
    },

    buildGuide() {
      const wrap = $('guide-skills');
      wrap.innerHTML =
        '<h3>TUYỆT KỸ &amp; ĐẶC TRƯNG</h3>' +
        NG.FIGHTER_ORDER.map((id) => {
          const d = NG.FIGHTERS[id];
          return `<div class="guide-skill">
            <div class="gs-char" style="color:${d.accent};border-color:${d.accent}88">${d.char}</div>
            <div>
              <div class="gs-name" style="color:${d.accent}">${d.name} · ${d.title}</div>
              <div class="gs-desc"><b>${d.skill.name}</b> — ${d.skill.desc}<br>
              <span style="color:#a5dfb0">${d.passive.name}</span>: ${d.passive.desc}</div>
            </div>
          </div>`;
        }).join('');
    },

    updateSelectUI() {
      document.querySelectorAll('#p1-cards .fcard').forEach((c) => {
        c.classList.toggle('sel', c.dataset.id === this.picks.p1);
        c.classList.toggle('sel-p1', c.dataset.id === this.picks.p1);
        c.classList.toggle('sel-p2', false);
      });
      document.querySelectorAll('#p2-cards .fcard').forEach((c) => {
        c.classList.toggle('sel', c.dataset.id === this.picks.p2);
        c.classList.toggle('sel-p2', c.dataset.id === this.picks.p2);
        c.classList.toggle('sel-p1', false);
      });
      document.querySelectorAll('#arena-cards .arena').forEach((c) => {
        c.classList.toggle('sel', c.dataset.arena === this.picks.arena);
      });
      const a = NG.FIGHTERS[this.picks.p1];
      const b = NG.FIGHTERS[this.picks.p2];
      $('p1-pick').textContent = (this.mode === 'pvp' ? 'P1 · ' : '') + a.name;
      $('p2-pick').textContent = (this.mode === 'pvp' ? 'P2 · ' : '') + b.name;
      $('arena-pick').textContent = NG.ARENAS[this.picks.arena].short;
      this.showFootSummary();
      this.updateBackdrop();
    },

    showFootSummary() {
      const a = NG.FIGHTERS[this.picks.p1];
      const b = NG.FIGHTERS[this.picks.p2];
      const ar = NG.ARENAS[this.picks.arena];
      if (this.mode === 'survival') {
        $('foot-info').innerHTML =
          `<b style="color:${a.accent}">${a.name} ${a.title}</b> — SINH TỒN: lần lượt hạ ${NG.FIGHTER_ORDER.length - 1} đấu sĩ còn lại` +
          ` &nbsp;·&nbsp; <span class="fi-accent">chiến trường ngẫu nhiên, không lặp lại</span> · hồi 35% máu sau mỗi trận thắng`;
        return;
      }
      const tagA = this.mode === 'pvp' ? 'P1 ' : '';
      const tagB = this.mode === 'pvp' ? 'P2 ' : '';
      $('foot-info').innerHTML =
        `<b style="color:${a.accent}">${tagA}${a.name}</b> ${a.title} vs <b style="color:${b.accent}">${tagB}${b.name}</b> ${b.title}` +
        ` &nbsp;·&nbsp; <span class="fi-accent">${ar.short}</span> — ${ar.effect}`;
    },

    showFootDetail(d) {
      $('foot-info').innerHTML =
        `<b style="color:${d.accent}">${d.name} · ${d.title}</b> — Máu ${d.stats.hp} · Tốc độ ${d.stats.speed} · Sức mạnh ${d.stats.power}` +
        `<br><span class="fi-accent">${d.skill.name}</span>: ${d.skill.desc} &nbsp;|&nbsp; ${d.passive.name}: ${d.passive.desc}`;
    },

    updateSettingsUI() {
      const diff = DIFFICULTY[this.settings.difficulty];
      document.querySelectorAll('#difficulty-pills button').forEach((b) => {
        b.classList.toggle('active', b.dataset.diff === this.settings.difficulty);
      });
      const label = 'ĐỘ KHÓ: ' + diff.name;
      if ($('select-diff-label')) $('select-diff-label').textContent = label;
      const txt = 'ÂM THANH: ' + (this.settings.sound ? 'BẬT' : 'TẮT');
      if ($('btn-sound')) $('btn-sound').textContent = txt;
      if ($('btn-sound2')) $('btn-sound2').textContent = txt;
      NG.Audio.setEnabled(this.settings.sound);
      NG.saveSettings(this.settings);
    },

    setMode(mode) {
      if (mode !== 'ai' && mode !== 'pvp' && mode !== 'survival') return;
      this.mode = mode;
      this.settings.mode = mode;
      this.survival = null;
      NG.saveSettings(this.settings);
      this.updateModeUI();
      if (this.state === 'select') this.updateSelectUI();
    },

    updateModeUI() {
      const m = this.mode;
      document.querySelectorAll('#mode-pills button').forEach((b) => {
        b.classList.toggle('active', b.dataset.mode === m);
      });
      const title = $('select-title');
      if (title) {
        title.textContent =
          m === 'pvp' ? 'ĐẤU 2 NGƯỜI' : m === 'survival' ? 'CHẾ ĐỘ SINH TỒN' : 'CHỌN ĐẤU SĨ';
      }
      const showP2 = m !== 'survival';
      const p2Row = $('p2-row-label');
      const p2Cards = $('p2-cards');
      if (p2Row) p2Row.classList.toggle('hidden', !showP2);
      if (p2Cards) p2Cards.classList.toggle('hidden', !showP2);
      const arenaBlock = $('arena-block');
      if (arenaBlock) arenaBlock.classList.toggle('hidden', m === 'survival');
      const note = $('survival-note');
      if (note) note.classList.toggle('hidden', m !== 'survival');
      const p2Label = $('p2-label');
      if (p2Label) p2Label.textContent = m === 'pvp' ? 'P2 — NGƯỜI CHƠI 2' : 'ĐỐI THỦ';
      const diffWrap = document.querySelector('.select-diff');
      if (diffWrap) diffWrap.style.visibility = m === 'pvp' ? 'hidden' : '';
      const fightBtn = $('btn-fight');
      if (fightBtn) {
        fightBtn.textContent = m === 'survival' ? 'BẮT ĐẦU SINH TỒN' : 'VÀO TRẬN';
      }
    },

    wireUI() {
      $('btn-start').addEventListener('click', () => {
        NG.Audio.ui();
        this.showSelect();
      });
      $('btn-guide').addEventListener('click', () => {
        NG.Audio.ui();
        $('guide-screen').classList.remove('hidden');
        this.guideOpen = true;
      });
      $('btn-guide-close').addEventListener('click', () => {
        NG.Audio.ui();
        $('guide-screen').classList.add('hidden');
        this.guideOpen = false;
      });
      $('btn-back').addEventListener('click', () => {
        NG.Audio.ui();
        this.showMenu();
      });
      $('btn-fight').addEventListener('click', () => {
        NG.Audio.ui();
        if (this.mode === 'survival') this.startSurvival(this.picks.p1);
        else this.startMatch(this.picks.p1, this.picks.p2, this.picks.arena);
      });
      document.querySelectorAll('#mode-pills button').forEach((b) => {
        b.addEventListener('click', () => {
          NG.Audio.ui();
          this.setMode(b.dataset.mode);
        });
      });
      document.querySelectorAll('#difficulty-pills button').forEach((b) => {
        b.addEventListener('click', () => {
          this.settings.difficulty = b.dataset.diff;
          NG.Audio.ui();
          this.updateSettingsUI();
        });
      });
      const toggleSound = () => {
        this.settings.sound = !this.settings.sound;
        NG.Audio.init();
        this.updateSettingsUI();
        if (this.settings.sound) NG.Audio.ui();
      };
      $('btn-sound').addEventListener('click', toggleSound);
      $('btn-sound2').addEventListener('click', toggleSound);

      $('btn-resume').addEventListener('click', () => {
        NG.Audio.ui();
        this.togglePause();
      });
      $('btn-restart').addEventListener('click', () => {
        NG.Audio.ui();
        if (this.matchCfg) {
          this.startMatch(this.matchCfg.p1, this.matchCfg.p2, this.matchCfg.arena, {
            startHp: this.boutStartHp,
          });
        }
      });
      $('btn-quit').addEventListener('click', () => {
        NG.Audio.ui();
        this.showSelect();
      });
      $('btn-rematch').addEventListener('click', () => {
        NG.Audio.ui();
        if (this.resultAction) {
          const fn = this.resultAction;
          this.resultAction = null;
          fn();
          return;
        }
        if (this.matchCfg) this.startMatch(this.matchCfg.p1, this.matchCfg.p2, this.matchCfg.arena);
      });
      $('btn-change').addEventListener('click', () => {
        NG.Audio.ui();
        this.showSelect();
      });
      $('btn-home').addEventListener('click', () => {
        NG.Audio.ui();
        this.showMenu();
      });

      // touch controls
      document.querySelectorAll('#touch-controls [data-key]').forEach((btn) => {
        const key = btn.dataset.key;
        const on = (e) => {
          e.preventDefault();
          NG.Audio.init();
          NG.Input.press(key);
          btn.classList.add('active');
        };
        const off = (e) => {
          e.preventDefault();
          NG.Input.release(key);
          btn.classList.remove('active');
        };
        btn.addEventListener('pointerdown', on);
        btn.addEventListener('pointerup', off);
        btn.addEventListener('pointercancel', off);
        btn.addEventListener('pointerleave', off);
      });
      const tp = $('btn-touch-pause');
      if (tp) {
        tp.addEventListener('click', (e) => {
          e.preventDefault();
          if (this.state === 'battle' || this.state === 'paused') this.togglePause();
        });
      }

      window.addEventListener('blur', () => {
        if (this.state === 'battle') this.togglePause();
      });
    },

    /* ============================== MATCH ============================== */
    startMatch(p1, p2, arenaId, opt) {
      const o = opt || {};
      this.picks = { p1, p2, arena: arenaId };
      this.matchCfg = { p1, p2, arena: arenaId };
      this.boutStartHp = o.startHp == null ? null : o.startHp;
      this.resultAction = null;
      if ($('btn-rematch')) $('btn-rematch').textContent = 'TÁI ĐẤU';
      this.arena = NG.ARENAS[arenaId];
      this.arenaId = arenaId;
      this.arena.init();
      this.arena.time = 0;
      const cpu2 = this.mode !== 'pvp';
      this.fighters = [
        NG.createFighter(NG.FIGHTERS[p1], 430, 1, false),
        NG.createFighter(NG.FIGHTERS[p2], 850, -1, cpu2),
      ];
      this.wins = [0, 0];
      this.round = 1;
      this.time = 0;
      this.matchWinner = null;
      this.projectiles = [];
      this.hazards = [];
      NG.FX.clear();
      this.setScreen('battle');
      this.startRound();
    },

    startRound() {
      this.phase = 'intro';
      this.phaseT = 0;
      this.timer = this.roundTime;
      this.hitstop = 0;
      this.slowmo = 1;
      this.shake = 0;
      this.projectiles = [];
      this.hazards = [];
      this.endInfo = null;
      this.hintT = 0;
      NG.FX.clear();
      const [p1, p2] = this.fighters;
      const spots = [
        [430, 1],
        [850, -1],
      ];
      this.fighters.forEach((f, i) => {
        f.x = spots[i][0];
        f.y = GROUND;
        f.facing = spots[i][1];
        f.vx = 0;
        f.vy = 0;
        f.onGround = true;
        f.jumps = 0;
        const startHp = i === 0 && this.boutStartHp != null ? NG.clamp(this.boutStartHp, 1, f.maxHp) : f.maxHp;
        f.hp = startHp;
        f.ghostHp = startHp;
        f.ghostDelay = 0;
        f.energy = 0;
        f.attack = null;
        f.casting = null;
        f.blocking = false;
        f.hitstun = 0;
        f.invuln = 0.5;
        f.flash = 0;
        f.state = 'idle';
        f.ko = false;
        f.victory = false;
        f.skillCD = 0;
        f.dashCD = 0;
        f.dashT = 0;
        f.status.burnT = 0;
        f.status.rootT = 0;
        f.lastHitT = 99;
        f.walkPhase = 0;
        f.moveDir = 0;
        f.aiT = 0;
        f.aiMove = 0;
        f.aiWantBlock = false;
      });
      for (let i = 0; i < this.fighters.length; i++) this.fighters[i].wins = this.wins[i];
      const arName = NG.ARENAS[this.arenaId].name;
      if (this.mode === 'survival' && this.survival) {
        const s = this.survival;
        this.showBanner(
          `SINH TỒN ${s.index + 1}/${s.total}`,
          `${NG.FIGHTERS[this.picks.p1].name} vs ${NG.FIGHTERS[this.picks.p2].name} · ${arName}`,
          1.55,
          '#ffcf7d'
        );
      } else {
        this.showBanner(`HIỆP ${this.round}`, arName, 1.35, '#eef4ff');
      }
      NG.Audio.round();
      NG.Input.clearAll();
    },

    startFightPhase() {
      this.phase = 'fight';
      this.phaseT = 0;
      this.hintT = 0;
      this.showBanner('CHIẾN!', '', 0.75, '#ffcf7d');
      NG.Audio.fight();
    },

    togglePause() {
      if (this.state === 'battle') {
        this.setScreen('paused');
        NG.Input.clearAll();
      } else if (this.state === 'paused') {
        this.setScreen('battle');
        NG.Input.clearAll();
      }
    },

    /* ============================ MAIN LOOP ============================ */
    tick(dt) {
      if (this.state === 'battle' && (NG.Input.hit('escape') || NG.Input.hit('p'))) {
        this.togglePause();
        return;
      }
      if (this.state === 'paused' && (NG.Input.hit('escape') || NG.Input.hit('p'))) {
        this.togglePause();
        return;
      }

      if (this.state === 'battle') {
        this.time += dt;
        this.updateBattle(dt);
      } else if (this.state === 'paused') {
        /* frozen */
      } else if (this.state === 'result') {
        this.time += dt;
        this.fighters.forEach((f) => (f.animT += dt * 0.7));
        NG.FX.update(dt);
        this.updateBanner(dt);
      } else {
        this.time += dt;
        this.backdropFighters.forEach((f) => (f.animT += dt));
        if (this.arena) this.arena.update(dt, null);
        if (this.state === 'select') {
          this.cardTimer -= dt;
          if (this.cardTimer <= 0) {
            this.cardTimer = 1 / 30;
            this.drawCardPreviews();
          }
        }
      }
    },

    updateBattle(dt) {
      if (this.hitstop > 0) {
        this.hitstop -= dt;
        this.shake = Math.max(0, this.shake - dt * 18);
        NG.FX.update(dt * 0.25);
        this.updateBanner(dt);
        return;
      }

      this.slowmo = NG.approach(this.slowmo, 1, dt * 0.8);
      const sdt = dt * this.slowmo;
      this.shake = Math.max(0, this.shake - dt * 26);
      this.updateBanner(dt);

      if (this.phase === 'intro') {
        this.phaseT += dt;
        if (this.phaseT > 1.35) this.startFightPhase();
      } else if (this.phase === 'fight') {
        this.phaseT += dt;
        this.hintT += dt;
        this.timer -= sdt;
        if (this.timer <= 0) {
          this.timer = 0;
          this.onTimeUp();
        }
      } else if (this.phase === 'end') {
        this.phaseT += dt;
        if (this.phaseT > 0.8 && this.endInfo && this.endInfo.winner && !this.endInfo.winner.victory) {
          this.endInfo.winner.state = 'victory';
          this.endInfo.winner.victory = true;
          this.endInfo.winner.blocking = false;
        }
        if (this.phaseT > 2.7) {
          this.resolveRound();
          return;
        }
      }

      const canAct = this.phase === 'fight';
      const p1 = this.fighters[0];
      const p2 = this.fighters[1];

      if (canAct) {
        this.readPlayerIntent(p1);
        if (this.mode === 'pvp') this.readPlayerIntent2(p2);
        else this.updateAI(p2, p1, dt);
      } else {
        [p1, p2].forEach((f) => this.resetIntent(f));
      }

      for (const f of this.fighters) this.updateFighter(f, sdt, dt);

      // keep fighters from stacking
      const dx = p2.x - p1.x;
      if (Math.abs(dx) < 62) {
        const push = (62 - Math.abs(dx)) * 0.25;
        const s = dx >= 0 ? 1 : -1;
        p1.x -= s * push;
        p2.x += s * push;
        p1.x = NG.clamp(p1.x, 70, W - 70);
        p2.x = NG.clamp(p2.x, 70, W - 70);
      }

      this.updateProjectiles(sdt);
      this.updateHazards(sdt);
      this.arena.update(sdt, this);
      NG.FX.update(sdt);

      for (const f of this.fighters) {
        if (f.ghostDelay > 0) f.ghostDelay -= dt;
        else if (f.ghostHp > f.hp) f.ghostHp = NG.approach(f.ghostHp, f.hp, 220 * dt);
        else if (f.ghostHp < f.hp) f.ghostHp = f.hp;
      }
    },

    resetIntent(f) {
      const i = f.intent;
      i.move = 0;
      i.jump = false;
      i.block = false;
      i.light = false;
      i.heavy = false;
      i.skill = false;
      i.dash = false;
    },

    readPlayerIntent(f) {
      const i = f.intent;
      const I = NG.Input;
      const arrows = this.mode !== 'pvp';
      i.move =
        (I.down('d') || (arrows && I.down('arrowright')) ? 1 : 0) -
        (I.down('a') || (arrows && I.down('arrowleft')) ? 1 : 0);
      i.jump = I.hit('w') || (arrows && I.hit('arrowup'));
      i.block = I.down('s') || (arrows && I.down('arrowdown'));
      i.light = I.hit('j');
      i.heavy = I.hit('k');
      i.skill = I.hit('l');
      i.dash = I.hit('shift');
    },

    readPlayerIntent2(f) {
      const i = f.intent;
      const I = NG.Input;
      i.move = (I.down('arrowright') ? 1 : 0) - (I.down('arrowleft') ? 1 : 0);
      i.jump = I.hit('arrowup');
      i.block = I.down('arrowdown');
      i.light = I.hit('1');
      i.heavy = I.hit('2');
      i.skill = I.hit('3');
      i.dash = I.hit('4');
    },

    updateAI(f, opp, dt) {
      const i = f.intent;
      this.resetIntent(f);
      if (f.ko || f.hitstun > 0 || f.casting || this.phase !== 'fight') return;
      const diff = DIFFICULTY[this.settings.difficulty] || DIFFICULTY.normal;
      const d = Math.abs(opp.x - f.x);
      const dir = opp.x > f.x ? 1 : -1;
      f.aiDodgeCD = Math.max(0, f.aiDodgeCD - dt);

      // dodge incoming projectiles
      const threat = this.projectiles.find(
        (p) => p.owner !== f && Math.abs(p.x - f.x) < 330 && (p.vx > 0 ? f.x > p.x : f.x < p.x)
      );
      if (threat && f.aiDodgeCD <= 0 && NG.chance(0.8)) {
        f.aiDodgeCD = 1.0;
        if (NG.chance(0.5) && f.jumps < f.maxJumps) i.jump = true;
        else i.block = true;
      }

      f.aiT -= dt;
      if (f.aiT > 0) {
        i.move = f.aiMove || 0;
        if (f.aiWantBlock) i.block = true;
        return;
      }
      f.aiT = diff.react * NG.rand(0.7, 1.5);
      f.aiMove = 0;
      f.aiWantBlock = false;

      const sRange = f.def.skill.range;
      const near = d < 110;
      const mid = d >= 110 && d < 270;

      if (near) {
        if (NG.chance(diff.aggro)) {
          if (NG.chance(0.28)) i.heavy = true;
          else i.light = true;
          f.aiT = Math.max(0.12, f.aiT * 0.8);
        } else if (NG.chance(0.45)) {
          f.aiWantBlock = NG.chance(diff.block);
          f.aiMove = -dir * 0.7;
        } else {
          f.aiMove = dir;
        }
      } else if (mid) {
        f.aiMove = dir;
        if (NG.chance(0.15)) i.dash = true;
      } else {
        if (f.energy >= 100 && f.skillCD <= 0 && NG.chance(diff.skill) && sRange > d) {
          i.skill = true;
        } else {
          f.aiMove = dir;
          if (NG.chance(0.1)) i.dash = true;
        }
      }

      if (f.energy >= 100 && f.skillCD <= 0 && d < sRange * 1.05 && NG.chance(diff.skill * 0.55)) {
        i.skill = true;
      }
      if (d < 160 && opp.attack && NG.chance(diff.block)) {
        i.block = true;
        f.aiMove = 0;
        f.aiWantBlock = true;
      }
    },

    /* ============================ FIGHTER UPDATE ============================ */
    updateFighter(f, sdt, dt) {
      f.animT += sdt;
      if (f.ko) {
        this.physics(f, sdt);
        return;
      }
      f.lastHitT += sdt;
      f.skillCD = Math.max(0, f.skillCD - sdt);
      f.dashCD = Math.max(0, f.dashCD - sdt);
      f.invuln = Math.max(0, f.invuln - sdt);
      f.flash = Math.max(0, f.flash - sdt * 5);
      f.hitstun = Math.max(0, f.hitstun - sdt);
      if (f.hitstun <= 0 && f.state === 'hit') f.state = 'idle';

      // status: burn
      if (f.status.burnT > 0) {
        f.status.burnT -= sdt;
        f.status.burnTick -= sdt;
        if (f.status.burnTick <= 0) {
          f.status.burnTick = 0.5;
          const src = f.status.burnSrc || this.other(f);
          this.applyHit(f, src, 8, { dot: true, color: '#ff9440', quiet: true });
          if (f.ko) return;
        }
        if (Math.random() < 0.35) {
          NG.FX.add({
            kind: 'dot',
            x: f.x + NG.rand(-16, 16),
            y: f.y - NG.rand(30, 150),
            vx: NG.rand(-15, 15),
            vy: NG.rand(-90, -40),
            life: 0.5,
            size: NG.rand(2, 4.5),
            color: '#ff8a2a',
            grav: -60,
          });
        }
      }
      if (f.status.rootT > 0) f.status.rootT -= sdt;

      // passive regen
      const st = f.def.stats;
      if (st.regen && f.lastHitT > 2.5 && f.hp < f.maxHp) {
        f.hp = Math.min(f.maxHp, f.hp + st.regen * sdt);
        if (Math.random() < 0.06) {
          NG.FX.add({ kind: 'dot', x: f.x + NG.rand(-20, 20), y: f.y - NG.rand(10, 150), vx: 0, vy: -40, life: 0.8, size: 2.5, color: '#7fe07a', grav: 0, add: true });
        }
      }

      f.energy = Math.min(f.maxEnergy, f.energy + 6.5 * sdt);

      // casting
      if (f.casting) {
        const c = f.casting;
        c.t += sdt;
        for (const ev of c.events) {
          if (!ev.done && c.t >= ev.at) {
            ev.done = true;
            try {
              ev.fn();
            } catch (err) {
              console.error(err);
            }
          }
        }
        if (c.t >= c.dur) {
          f.casting = null;
          f.state = 'idle';
        }
      } else if (f.attack) {
        this.updateAttack(f, sdt);
      }

      // facing
      const opp = this.other(f);
      if (!f.attack && !f.casting && f.hitstun <= 0 && Math.abs(opp.x - f.x) > 8) {
        f.facing = opp.x > f.x ? 1 : -1;
      }

      // intents
      if (this.phase === 'fight' && f.hitstun <= 0 && !f.ko) {
        this.applyIntent(f, f.intent);
      }

      // dash
      if (f.dashT > 0) {
        f.dashT -= sdt;
        f.vx = f.facing * (f.def.stats.dashSpeed || 760);
        if (Math.random() < 0.5) {
          NG.FX.add({ kind: 'smoke', x: f.x - f.facing * 14, y: f.y - 70, vx: -f.facing * 40, vy: -20, life: 0.3, size: 6, color: 'rgba(200,220,255,0.35)', grav: 0, drag: 2, add: false });
        }
      }

      // idle facing during round intro
      this.physics(f, sdt);

      // walking dust
      if (f.onGround && Math.abs(f.vx) > 160 && Math.random() < 0.08) {
        NG.FX.dust(f.x - f.facing * 18, f.y, f.facing);
      }
    },

    physics(f, dt) {
      const mods = this.arena.mods;
      if (!f.onGround) {
        f.vy += 2400 * mods.gravity * dt;
        if (f.vy > 1900) f.vy = 1900;
      }

      const canControl = f.hitstun <= 0 && f.dashT <= 0 && !f.casting && !f.attack && !f.ko;
      if (canControl) {
        let spd = f.def.stats.speed * mods.speed;
        if (f.blocking) spd *= 0.26;
        if (f.status.rootT > 0) spd = 0;
        if (!f.onGround) spd *= 0.82;
        const target = f.moveDir * spd;
        const accel = (f.onGround ? 3000 : 1600) * (mods.grip || 1);
        f.vx = NG.approach(f.vx, target, accel * dt);
      } else {
        const fr = f.hitstun > 0 ? 540 : f.dashT > 0 ? 0 : f.onGround ? 2000 : 200;
        f.vx = NG.approach(f.vx, 0, fr * dt);
      }

      f.x += f.vx * dt;
      f.y += f.vy * dt;

      if (f.y >= GROUND) {
        if (!f.onGround) {
          NG.FX.dust(f.x, GROUND, 0);
        }
        f.y = GROUND;
        f.vy = 0;
        f.onGround = true;
        f.jumps = 0;
      } else {
        f.onGround = false;
      }
      f.x = NG.clamp(f.x, 70, W - 70);

      if (f.onGround && Math.abs(f.vx) > 40 && !f.attack && !f.casting && f.hitstun <= 0) {
        f.walkPhase += dt * (6 + Math.abs(f.vx) / 55);
      } else {
        f.walkPhase += dt * 2;
      }
    },

    applyIntent(f, i) {
      if (f.ko) return;
      if (this.phase !== 'fight') return;

      // skill
      if (i.skill && f.energy >= f.maxEnergy && f.skillCD <= 0 && !f.attack && !f.casting && f.onGround) {
        this.castSkill(f);
        return;
      }
      // attacks
      if ((i.light || i.heavy) && !f.attack && !f.casting && f.onGround && f.hitstun <= 0) {
        this.startAttack(f, i.light ? 'light' : 'heavy');
      }
      // dash
      if (i.dash && f.dashCD <= 0 && !f.casting && !f.attack && f.onGround) {
        f.dashCD = f.def.stats.dashCD || 0.85;
        f.dashT = 0.15;
        f.invuln = Math.max(f.invuln, 0.12);
        f.blocking = false;
        NG.Audio.dash();
        NG.FX.dust(f.x, f.y, -f.facing);
        NG.FX.add({ kind: 'ring', x: f.x, y: f.y - 80, life: 0.25, size: 10, grow: 70, color: f.def.accent, add: true, weight: 2 });
      }
      // block
      if (i.block && f.onGround && !f.attack && !f.casting) f.blocking = true;
      else f.blocking = false;

      // movement
      if (!f.attack && !f.casting && f.dashT <= 0) {
        f.moveDir = i.move || 0;
      } else if (f.attack || f.casting) {
        f.moveDir = 0;
      }

      // jump
      if (i.jump && !f.casting && f.jumps < f.maxJumps && f.hitstun <= 0) {
        f.vy = -880 * this.arena.mods.jump;
        f.onGround = false;
        f.jumps++;
        f.blocking = false;
        NG.Audio.jump();
        NG.FX.dust(f.x, f.y, 0);
      }
    },

    startAttack(f, type) {
      if (f.ko || f.attack || f.casting || !f.onGround) return;
      const a = f.def.attacks[type];
      f.attack = Object.assign({}, a, { type, t: 0, hit: false });
      f.blocking = false;
      f.moveDir = 0;
      f.state = 'attack';
      NG.Audio.swing();
    },

    updateAttack(f, dt) {
      const a = f.attack;
      a.t += dt;
      const total = a.startup + a.active + a.recover;
      if (!a.hit && a.t >= a.startup && a.t <= a.startup + a.active) {
        const opp = this.other(f);
        const fwd = (opp.x - f.x) * f.facing;
        if (!opp.ko && fwd > -12 && fwd < a.range + 18 && Math.abs(opp.y - f.y) < 130) {
          a.hit = true;
          this.applyHit(opp, f, a.dmg, {
            type: a.type,
            knock: a.knock,
            hitstun: a.hitstun,
            launch: a.launch,
            hitstop: a.hitstop,
          });
        }
      }
      if (a.t >= total) {
        f.attack = null;
        if (f.state === 'attack') f.state = 'idle';
      }
    },

    /* ============================== SKILLS ============================== */
    castSkill(f) {
      const id = f.def.skill.id;
      f.energy = 0;
      f.skillCD = f.def.skill.cd;
      f.attack = null;
      f.blocking = false;
      f.moveDir = 0;
      f.vx = 0;
      f.casting = { id, t: 0, dur: 0.8, events: [] };
      f.state = 'skill';
      NG.Audio.skill(id);
      NG.FX.ring(f.x, f.y - 90, f.def.accent, 18, 0.5, 4);
      NG.FX.burst(f.x, f.y - 90, { count: 16, color: [f.def.accent, '#ffffff'], speed: 320, life: 0.55, grav: -120 });

      const ev = f.casting.events;
      const self = this;

      if (id === 'kim') {
        f.casting.dur = 0.78;
        for (let k = 0; k < 3; k++) {
          ev.push({
            at: 0.2 + k * 0.11,
            done: false,
            fn() {
              const y = f.y - 132 + (k - 1) * 24;
              self.projectiles.push({
                kind: 'blade',
                x: f.x + f.facing * 46,
                y,
                vx: f.facing * 1040,
                vy: 0,
                r: 25,
                dmg: 48,
                owner: f,
                life: 1.35,
                knock: 170,
                hitstun: 0.24,
                type: 'light',
                hit: false,
              });
              NG.Audio.swing();
              NG.FX.burst(f.x + f.facing * 44, y, { count: 6, color: f.def.accent, speed: 240, life: 0.3, grav: 0 });
            },
          });
        }
      } else if (id === 'moc') {
        f.casting.dur = 0.86;
        for (let k = 0; k < 4; k++) {
          ev.push({
            at: 0.18 + k * 0.1,
            done: false,
            fn() {
              const x = NG.clamp(f.x + f.facing * (120 + k * 84), 80, W - 80);
              self.hazards.push({
                kind: 'root',
                x,
                owner: f,
                dmg: 38,
                delay: 0.12,
                dur: 1.4,
                t: 0,
                hit: false,
                root: 0.75,
                knock: 90,
                hitstun: 0.3,
              });
              NG.FX.burst(x, GROUND, { count: 8, color: ['#6fe08a', '#c9f7b0'], speed: 200, life: 0.5, grav: 500 });
            },
          });
        }
      } else if (id === 'thuy') {
        f.casting.dur = 0.72;
        ev.push({
          at: 0.24,
          done: false,
          fn() {
            f.hp = Math.min(f.maxHp, f.hp + 70);
            NG.FX.text(f.x, f.y - 214, '+70', '#7fe0ff', 24);
            NG.FX.ring(f.x, f.y - 90, '#55c9ff', 24, 0.5, 4);
            self.projectiles.push({
              kind: 'dragon',
              x: f.x + f.facing * 60,
              y: f.y - 108,
              vx: f.facing * 640,
              vy: 0,
              r: 62,
              dmg: 122,
              owner: f,
              life: 2.4,
              knock: 540,
              hitstun: 0.5,
              type: 'heavy',
              hit: false,
            });
            NG.FX.burst(f.x + f.facing * 60, f.y - 108, { count: 20, color: ['#8fe6ff', '#2f9dff'], speed: 340, life: 0.6, grav: -60 });
          },
        });
      } else if (id === 'hoa') {
        f.casting.dur = 0.86;
        ev.push({
          at: 0.26,
          done: false,
          fn() {
            const x = NG.clamp(f.x + f.facing * 165, 90, W - 90);
            self.hazards.push({
              kind: 'pillar',
              x,
              owner: f,
              dmg: 112,
              delay: 0.36,
              dur: 0.55,
              t: 0,
              hit: false,
              launch: 520,
              knock: 300,
              hitstun: 0.46,
            });
            self.hazards.push({
              kind: 'fire',
              x,
              owner: f,
              dmg: 12,
              delay: 0.45,
              dur: 5,
              t: 0,
              tick: 0.5,
              w: 72,
            });
            NG.FX.ring(x, GROUND, '#ff8a3c', 20, 0.5, 5);
          },
        });
      } else if (id === 'phong') {
        f.casting.dur = 0.8;
        ev.push({
          at: 0.22,
          done: false,
          fn() {
            self.projectiles.push({
              kind: 'tornado',
              x: f.x + f.facing * 72,
              y: f.y - 104,
              vx: f.facing * 240,
              vy: 0,
              r: 70,
              dmg: 24,
              owner: f,
              life: 1.7,
              knock: 80,
              hitstun: 0.14,
              type: 'light',
              tick: 0.24,
              hitCD: 0,
              multi: true,
              hit: false,
            });
            NG.Audio.swing();
            NG.FX.ring(f.x + f.facing * 60, f.y - 90, '#7ff0d8', 18, 0.5, 5);
            NG.FX.burst(f.x + f.facing * 60, f.y - 90, {
              count: 18,
              color: ['#9ff2dd', '#ffffff'],
              speed: 300,
              life: 0.5,
              grav: -140,
            });
          },
        });
      } else {
        f.casting.dur = 0.92;
        ev.push({
          at: 0.34,
          done: false,
          fn() {
            for (const dir of [-1, 1]) {
              self.projectiles.push({
                kind: 'shock',
                x: f.x + dir * 42,
                y: GROUND,
                vx: dir * 760,
                vy: 0,
                r: 46,
                dmg: 70,
                owner: f,
                life: 1.5,
                knock: 430,
                hitstun: 0.4,
                type: 'heavy',
                ground: true,
                hit: false,
              });
            }
            const opp = self.other(f);
            self.hazards.push({
              kind: 'rock',
              x: NG.clamp(opp.x, 80, W - 80),
              owner: f,
              dmg: 58,
              delay: 0.32,
              dur: 0.7,
              t: 0,
              hit: false,
              launch: 560,
              knock: 220,
              hitstun: 0.4,
            });
            self.shake = Math.max(self.shake, 12);
            NG.FX.dust(f.x - 40, GROUND, -1, 'rgba(190,150,90,0.55)');
            NG.FX.dust(f.x + 40, GROUND, 1, 'rgba(190,150,90,0.55)');
            NG.FX.burst(f.x, GROUND, { count: 18, color: ['#e0a84f', '#a9743a'], speed: 380, life: 0.6, grav: 900 });
          },
        });
      }
    },

    /* ============================ COMBAT ============================ */
    applyHit(target, attacker, amount, opt) {
      const o = opt || {};
      if (!target || target.ko || target.invuln > 0) return;
      if (!attacker) attacker = this.other(target);
      const blocked = !o.dot && target.blocking && target.onGround && target.hitstun <= 0;
      let dmg = amount * (o.dot ? 1 : attacker.def.stats.power) * target.def.stats.defense;
      if (blocked) dmg *= 0.2;
      dmg = Math.max(1, Math.round(dmg));
      target.hp = Math.max(0, target.hp - dmg);
      target.lastHitT = 0;
      target.ghostDelay = 0.45;
      target.flash = 1;

      const col = attacker.def.accent;
      const sx = target.x;
      const sy = target.y - 108;

      if (o.dot) {
        NG.FX.text(target.x + NG.rand(-16, 16), target.y - 168, String(dmg), o.color || col, 16);
        if (!o.quiet) NG.FX.burst(sx, sy, { count: 3, color: o.color || col, speed: 100, life: 0.4, grav: -80 });
      } else if (blocked) {
        NG.Audio.block();
        target.vx += attacker.facing * (o.knock || 150) * 0.18;
        NG.FX.text(target.x, target.y - 192, 'CHẶN', '#a7dcff', 15);
        NG.FX.burst(sx, sy, { count: 7, color: ['#d9f2ff', '#9fdcff'], speed: 260, life: 0.35, grav: 100 });
        NG.FX.ring(sx, sy, '#bfe8ff', 8, 0.3, 3);
        this.shake = Math.max(this.shake, 2);
        this.hitstop = Math.max(this.hitstop, 0.025);
        target.energy = Math.min(target.maxEnergy, target.energy + 5);
        attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + 4);
      } else {
        const heavy = o.type === 'heavy' || o.big;
        const knock = (o.knock || 150) * (target.def.stats.knockResist || 1);
        target.vx += attacker.facing * knock;
        if (o.launch) {
          target.vy = -o.launch;
          target.onGround = false;
        }
        target.hitstun = Math.max(target.hitstun, o.hitstun || 0.2);
        target.state = 'hit';
        target.attack = null;
        target.casting = null;
        target.blocking = false;
        if (o.root) target.status.rootT = Math.max(target.status.rootT, o.root);
        if (attacker.def.stats.burn && target.status) {
          target.status.burnT = 3;
          target.status.burnTick = 0.5;
          target.status.burnSrc = attacker;
        }
        NG.Audio.hit(heavy ? 'heavy' : 'light');
        this.shake = Math.max(this.shake, heavy ? 10 : 4);
        this.hitstop = Math.max(this.hitstop, o.hitstop || (heavy ? 0.09 : 0.05));
        NG.FX.burst(sx, sy, {
          count: heavy ? 16 : 10,
          color: [col, '#ffffff'],
          speed: heavy ? 440 : 330,
          life: 0.45,
          size: 3.4,
          grav: 240,
        });
        NG.FX.ring(sx, sy, col, 10, 0.32, 4);
        NG.FX.text(target.x + NG.rand(-12, 12), target.y - 186, String(dmg), col, heavy ? 30 : 22);
        attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + 11);
        target.energy = Math.min(target.maxEnergy, target.energy + 7);
      }

      if (target.hp <= 0) this.onKO(target, attacker);
    },

    envHit(target, amount, opt) {
      const o = opt || {};
      if (!target || target.ko) return;
      this.applyHit(target, null, amount, { dot: true, color: o.color, quiet: true });
      if (target.ko) return;
      if (o.hitstun) {
        target.hitstun = Math.max(target.hitstun, o.hitstun);
        target.state = 'hit';
        target.attack = null;
        target.casting = null;
        target.blocking = false;
      }
      if (o.knock) target.vx += o.knock;
      if (o.launch && target.onGround) {
        target.vy = -o.launch;
        target.onGround = false;
      }
      if (o.burn) {
        target.status.burnT = Math.max(target.status.burnT, o.burn);
        target.status.burnTick = 0.5;
        target.status.burnSrc = this.other(target);
      }
      NG.FX.burst(target.x, target.y - 106, {
        count: 9,
        color: o.color || '#ffd27a',
        speed: 240,
        life: 0.45,
        size: 3,
        grav: 280,
      });
      this.shake = Math.max(this.shake, o.shake || 4);
    },

    onKO(target, attacker) {
      if (target.ko || this.phase === 'end') return;
      target.ko = true;
      target.hp = 0;
      target.state = 'ko';
      target.attack = null;
      target.casting = null;
      target.blocking = false;
      target.vx = attacker.facing * 330;
      target.vy = -280;
      target.onGround = false;
      this.phase = 'end';
      this.phaseT = 0;
      this.endInfo = { winner: attacker, loser: target, reason: 'ko' };
      this.slowmo = 0.35;
      this.hitstop = 0.14;
      this.shake = 16;
      this.projectiles = [];
      this.hazards = [];
      NG.Audio.ko();
      this.showBanner('K.O.', `${attacker.def.name} thắng hiệp ${this.round}`, 2.2, attacker.def.accent);
      NG.FX.burst(target.x, target.y - 100, { count: 32, color: [target.def.accent, '#ffffff'], speed: 560, life: 0.8, size: 3.6 });
      NG.FX.ring(target.x, target.y - 100, target.def.accent, 14, 0.6, 5);
      attacker.victory = false;
    },

    onTimeUp() {
      if (this.phase === 'end') return;
      const [a, b] = this.fighters;
      const pa = a.hp / a.maxHp;
      const pb = b.hp / b.maxHp;
      let winner = null;
      if (Math.abs(pa - pb) > 0.001) winner = pa > pb ? a : b;
      this.phase = 'end';
      this.phaseT = 0;
      this.endInfo = { winner, reason: 'time' };
      this.projectiles = [];
      this.hazards = [];
      if (winner) {
        this.showBanner('HẾT GIỜ', `${winner.def.name} chiếm ưu thế`, 2.3, winner.def.accent);
        NG.Audio.round();
      } else {
        this.showBanner('HẾT GIỜ', 'Bất phân thắng bại', 2.3, '#cfd9e8');
        NG.Audio.round();
      }
    },

    resolveRound() {
      const info = this.endInfo;
      let wi = -1;
      if (info && info.winner) wi = info.winner === this.fighters[0] ? 0 : 1;

      if (this.mode === 'survival' && this.survival) {
        if (wi === 0) this.survivalWin();
        else if (wi === 1) this.survivalLose();
        else this.startMatch(this.picks.p1, this.picks.p2, this.arenaId, { startHp: this.boutStartHp });
        return;
      }

      if (wi >= 0) this.wins[wi]++;

      const decided = this.wins[0] >= 2 || this.wins[1] >= 2 || this.round >= 3;
      if (decided) {
        this.finishMatch();
      } else {
        this.round++;
        this.startRound();
      }
    },

    setResultButton(label, fn) {
      const b = $('btn-rematch');
      if (!b) return;
      b.textContent = label;
      this.resultAction = fn || null;
    },

    startSurvival(playerId) {
      const pool = NG.FIGHTER_ORDER.filter((id) => id !== playerId);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = pool[i];
        pool[i] = pool[j];
        pool[j] = t;
      }
      this.survival = {
        player: playerId,
        queue: pool,
        index: 0,
        wins: 0,
        total: pool.length,
        usedArenas: [],
        startHp: null,
      };
      this.startSurvivalBout();
    },

    startSurvivalBout() {
      const s = this.survival;
      if (!s) return;
      let avail = NG.ARENA_ORDER.filter((id) => s.usedArenas.indexOf(id) === -1);
      if (!avail.length) {
        s.usedArenas = [];
        avail = NG.ARENA_ORDER.slice();
      }
      const arenaId = avail[Math.floor(Math.random() * avail.length)];
      s.usedArenas.push(arenaId);
      this.startMatch(s.player, s.queue[s.index], arenaId, { startHp: s.startHp });
    },

    survivalWin() {
      const s = this.survival;
      const f = this.fighters[0];
      s.wins++;
      s.startHp = Math.min(f.maxHp, Math.round(f.hp + f.maxHp * 0.35));
      this.showSurvivalResult(s.index >= s.queue.length - 1 ? 'complete' : 'win');
    },

    survivalLose() {
      this.showSurvivalResult('lose');
    },

    showSurvivalResult(kind) {
      const s = this.survival;
      const f = this.fighters[0];
      const pdef = NG.FIGHTERS[s.player];
      const oppdef = NG.FIGHTERS[s.queue[s.index]];
      const ar = NG.ARENAS[this.arenaId];
      const tt = $('result-tag');
      const rf = $('result-fighter');
      const titleEl = $('result-title');

      if (kind === 'complete') {
        tt.textContent = 'SINH TỒN THÀNH CÔNG';
        tt.style.color = '#ffd47d';
        rf.textContent = pdef.name;
        rf.style.color = pdef.accent;
        titleEl.textContent = 'Một mình hạ gục toàn bộ ngũ hành!';
        this.setResultButton('CHƠI LẠI', () => this.startSurvival(s.player));
        NG.Audio.victory();
      } else if (kind === 'lose') {
        tt.textContent = 'THẤT BẠI';
        tt.style.color = '#ff9c86';
        rf.textContent = oppdef.name;
        rf.style.color = oppdef.accent;
        titleEl.textContent = `Gục ngã sau khi hạ ${s.wins}/${s.total} đối thủ`;
        this.setResultButton('THỬ LẠI', () => this.startSurvival(s.player));
        NG.Audio.defeat();
      } else {
        tt.textContent = 'THẮNG TRẬN';
        tt.style.color = '#9ef0b0';
        rf.textContent = pdef.name;
        rf.style.color = pdef.accent;
        titleEl.textContent = `Đánh bại ${oppdef.name} — ${ar.short}`;
        this.setResultButton('ĐẤU TIẾP', () => {
          s.index++;
          this.startSurvivalBout();
        });
        NG.Audio.victory();
      }

      $('result-score').textContent = `${s.wins} / ${s.total}`;
      const hpTxt = kind === 'lose' ? '' : ` · Hồi +35% → ${Math.round(s.startHp)}/${f.maxHp}`;
      $('result-detail').textContent = `Trận ${Math.min(s.index + 1, s.total)}/${s.total} · ${ar.name}${hpTxt}`;
      this.setScreen('result');
    },

    finishMatch() {
      const w0 = this.wins[0];
      const w1 = this.wins[1];
      let wi = w0 > w1 ? 0 : w1 > w0 ? 1 : -1;
      this.matchWinner = wi >= 0 ? this.fighters[wi] : null;

      this.fighters.forEach((f) => {
        if (!f.ko) {
          f.state = 'idle';
          f.attack = null;
          f.casting = null;
          f.blocking = false;
          f.victory = false;
        }
      });
      if (this.matchWinner) {
        this.matchWinner.state = 'victory';
        this.matchWinner.victory = true;
      }

      const pvp = this.mode === 'pvp';
      const tag =
        wi === 0 ? (pvp ? 'P1 CHIẾN THẮNG' : 'CHIẾN THẮNG') :
        wi === 1 ? (pvp ? 'P2 CHIẾN THẮNG' : 'THẤT BẠI') :
        'BẤT PHÂN THẮNG BẠI';
      const tt = $('result-tag');
      tt.textContent = tag;
      tt.style.color = wi === 0 ? '#9ef0b0' : wi === 1 ? '#ff9c86' : '#a9bad0';
      const rf = $('result-fighter');
      rf.textContent = this.matchWinner ? this.matchWinner.def.name : 'HÒA';
      rf.style.color = this.matchWinner ? this.matchWinner.def.accent : '#dbe7fa';
      $('result-title').textContent = this.matchWinner ? this.matchWinner.def.title : 'Không ai chịu nhường bước';
      $('result-score').textContent = `${w0} — ${w1}`;
      $('result-detail').textContent = pvp
        ? `P1: ${NG.FIGHTERS[this.picks.p1].name} · P2: ${NG.FIGHTERS[this.picks.p2].name} · ${NG.ARENAS[this.arenaId].short}`
        : `Bạn: ${NG.FIGHTERS[this.picks.p1].name} · Đối thủ: ${NG.FIGHTERS[this.picks.p2].name} · ${NG.ARENAS[this.arenaId].short}`;
      this.setResultButton('TÁI ĐẤU', null);

      if (wi === 0) NG.Audio.victory();
      else if (wi === 1) NG.Audio.defeat();
      else NG.Audio.round();

      this.setScreen('result');
    },

    /* ============================ PROJECTILES ============================ */
    updateProjectiles(dt) {
      const list = this.projectiles;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === 'shock') p.y = GROUND;

        if (p.kind === 'blade' && Math.random() < 0.6) {
          NG.FX.add({ kind: 'dot', x: p.x - Math.sign(p.vx) * 20, y: p.y + NG.rand(-4, 4), vx: -p.vx * 0.1, vy: 0, life: 0.25, size: NG.rand(1, 2.5), color: p.owner.def.accent, grav: 0, add: true });
        }
        if (p.kind === 'dragon' && Math.random() < 0.7) {
          NG.FX.add({ kind: 'dot', x: p.x - Math.sign(p.vx) * NG.rand(0, 50), y: p.y + NG.rand(-40, 40), vx: -p.vx * 0.15, vy: NG.rand(-40, 15), life: 0.5, size: NG.rand(1.5, 4), color: '#8fe6ff', grav: -50, add: true });
        }

        const target = this.other(p.owner);

        if (p.kind === 'tornado') {
          if (target && !target.ko) {
            const dx = p.x - target.x;
            if (Math.abs(dx) < 280) target.vx += dx * 0.9 * dt;
          }
          if (Math.random() < 0.8) {
            const ang = Math.random() * NG.TAU;
            NG.FX.add({
              kind: 'dot',
              x: p.x + Math.cos(ang) * NG.rand(14, 54),
              y: p.y + NG.rand(-74, 62),
              vx: -Math.sign(p.vx) * 40,
              vy: NG.rand(-80, -10),
              life: 0.45,
              size: NG.rand(1.4, 2.8),
              color: '#9ff2dd',
              grav: -60,
              add: true,
            });
          }
        }

        let dead = false;
        if (target && !target.ko) {
          let hit = false;
          if (p.ground) {
            hit = Math.abs(p.x - target.x) < p.r + 18 && target.y > GROUND - 96;
          } else {
            hit = this.circleHitsBody(p, target);
          }
          if (p.multi) {
            p.hitCD = (p.hitCD || 0) - dt;
            if (hit && p.hitCD <= 0) {
              p.hitCD = p.tick || 0.3;
              this.envHit(target, p.dmg, {
                color: '#9ff2dd',
                hitstun: p.hitstun,
                knock: Math.sign(p.vx) * p.knock,
                shake: 3,
              });
              NG.FX.ring(target.x, target.y - 108, '#9ff2dd', 12, 0.22, 3);
              if (target.ko) dead = true;
            }
          } else if (!p.hit && hit) {
            p.hit = true;
            this.applyHit(target, p.owner, p.dmg, {
              type: p.type || 'light',
              knock: p.knock,
              hitstun: p.hitstun,
              hitstop: 0.07,
              big: p.kind === 'dragon',
            });
            if (p.kind === 'dragon' || p.kind === 'shock') {
              NG.FX.burst(p.x, p.kind === 'shock' ? GROUND - 30 : p.y, { count: 16, color: [p.owner.def.accent, '#fff'], speed: 380, life: 0.5 });
            }
            if (!p.pierce) dead = true;
          }
        }
        if (p.kind === 'tornado' && !p.burst && (p.life <= 0 || p.x < 52 || p.x > W - 52)) {
          p.burst = true;
          if (target && !target.ko && Math.abs(p.x - target.x) < 200) {
            this.applyHit(target, p.owner, 42, {
              type: 'heavy',
              knock: 320,
              hitstun: 0.4,
              launch: 430,
              hitstop: 0.09,
              big: true,
            });
            NG.FX.burst(target.x, target.y - 120, { count: 22, color: ['#9ff2dd', '#ffffff'], speed: 420, life: 0.6 });
            this.shake = Math.max(this.shake, 10);
          }
        }
        if (p.life <= 0 || p.x < 50 || p.x > W - 50) dead = true;
        if (dead) list.splice(i, 1);
      }
    },

    circleHitsBody(p, f) {
      const left = f.x - 22;
      const right = f.x + 22;
      const top = f.y - 174;
      const bottom = f.y - 6;
      const cx = NG.clamp(p.x, left, right);
      const cy = NG.clamp(p.y, top, bottom);
      return (p.x - cx) * (p.x - cx) + (p.y - cy) * (p.y - cy) <= p.r * p.r;
    },

    /* ============================== HAZARDS ============================== */
    updateHazards(dt) {
      const list = this.hazards;
      for (let i = list.length - 1; i >= 0; i--) {
        const h = list[i];
        h.t += dt;
        if (h.t > h.delay) {
          const target = this.other(h.owner);
          if (target && !target.ko) {
            if (h.kind === 'root') {
              if (!h.hit && Math.abs(target.x - h.x) < 44 && target.y > GROUND - 50) {
                h.hit = true;
                this.applyHit(target, h.owner, h.dmg, {
                  type: 'light',
                  knock: h.knock,
                  hitstun: h.hitstun,
                  root: h.root,
                  hitstop: 0.06,
                });
                NG.FX.burst(h.x, GROUND - 40, { count: 12, color: ['#6fe08a', '#c9f7b0'], speed: 300, life: 0.5, grav: 600 });
              }
            } else if (h.kind === 'pillar') {
              if (!h.hit) {
                const active = h.t - h.delay;
                if (Math.abs(target.x - h.x) < 82 && target.y > GROUND - 150) {
                  h.hit = true;
                  this.applyHit(target, h.owner, h.dmg, {
                    type: 'heavy',
                    knock: h.knock,
                    hitstun: h.hitstun,
                    launch: h.launch,
                    hitstop: 0.12,
                    big: true,
                  });
                  this.shake = Math.max(this.shake, 16);
                  NG.FX.burst(h.x, GROUND - 80, { count: 34, color: ['#ffcf6a', '#ff6a1f', '#ffffff'], speed: 540, life: 0.8, size: 4 });
                  NG.FX.ring(h.x, GROUND - 60, '#ff8a2a', 20, 0.6, 6);
                } else if (active > h.dur) {
                  h.hit = true;
                }
              }
            } else if (h.kind === 'rock') {
              if (!h.hit && h.t - h.delay > 0.06 && Math.abs(target.x - h.x) < 76 && target.y > GROUND - 120) {
                h.hit = true;
                this.applyHit(target, h.owner, h.dmg, {
                  type: 'heavy',
                  knock: h.knock,
                  hitstun: h.hitstun,
                  launch: h.launch,
                  hitstop: 0.1,
                  big: true,
                });
                NG.FX.burst(h.x, GROUND - 50, { count: 24, color: ['#e0a84f', '#a9743a', '#ffffff'], speed: 420, life: 0.7, grav: 900 });
              }
            } else if (h.kind === 'fire') {
              h.tick -= dt;
              if (h.tick <= 0) {
                h.tick = 0.62;
                if (Math.abs(target.x - h.x) < h.w && target.y > GROUND - 26) {
                  this.applyHit(target, h.owner, h.dmg, { dot: true, color: '#ff9440' });
                  if (target.ko) {
                    list.splice(i, 1);
                    continue;
                  }
                }
              }
            }
          }
        }
        if (h.t > h.delay + h.dur + (h.kind === 'fire' ? 0 : 0.35)) list.splice(i, 1);
      }
    },

    /* ============================== HELPERS ============================== */
    other(f) {
      return this.fighters[0] === f ? this.fighters[1] : this.fighters[0];
    },

    /* ============================== BANNER ============================== */
    showBanner(text, sub, dur, color) {
      this.banner = { text, sub: sub || '', dur: dur || 1.5, t: 0, color: color || '#ffffff' };
    },

    updateBanner(dt) {
      if (!this.banner) return;
      this.banner.t += dt;
      if (this.banner.t > this.banner.dur) this.banner = null;
    },

    /* ================================ DRAW ================================ */
    draw() {
      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);

      if (this.state === 'battle' || this.state === 'paused' || this.state === 'result') {
        this.drawWorld(ctx);
      } else {
        this.drawBackdrop(ctx);
      }
    },

    drawBackdrop(ctx) {
      const arena = this.arena || NG.ARENAS[this.picks.arena];
      if (arena.drawBack) {
        arena.drawBack(ctx, this.time);
        arena.drawGround(ctx, this.time);
        for (const f of this.backdropFighters) NG.drawShadow(ctx, f);
        for (const f of this.backdropFighters) NG.drawFighter(ctx, f, {});
        arena.drawFront(ctx, this.time);
      }
    },

    drawWorld(ctx) {
      const sh = this.shake;
      const ox = sh > 0 ? NG.rand(-sh, sh) : 0;
      const oy = sh > 0 ? NG.rand(-sh, sh) : 0;
      ctx.save();
      ctx.translate(ox, oy);
      this.arena.drawBack(ctx, this.time);
      this.arena.drawGround(ctx, this.time);
      this.drawHazards(ctx);

      for (const f of this.fighters) NG.drawShadow(ctx, f);
      const ordered = this.fighters.slice().sort((a, b) => a.x - b.x);
      for (const f of ordered) {
        NG.drawFighter(ctx, f, {});
        this.drawStatusFX(ctx, f);
      }

      this.drawProjectiles(ctx);
      NG.FX.draw(ctx);
      this.arena.drawFront(ctx, this.time);
      ctx.restore();

      if (this.state !== 'result') {
        this.drawHUD(ctx);
        this.drawBanner(ctx);
      } else {
        this.drawBanner(ctx);
        this.drawHUD(ctx);
      }
    },

    drawStatusFX(ctx, f) {
      if (f.status.rootT > 0 && !f.ko) {
        ctx.save();
        ctx.strokeStyle = '#6fe08a';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#57d46b';
        ctx.shadowBlur = 10;
        for (let i = 0; i < 3; i++) {
          const x = f.x - 24 + i * 24;
          ctx.beginPath();
          ctx.moveTo(x, GROUND);
          ctx.quadraticCurveTo(x + 10, GROUND - 20, x + 2, GROUND - 38 - i * 4);
          ctx.stroke();
        }
        ctx.restore();
      }
    },

    drawProjectiles(ctx) {
      for (const p of this.projectiles) {
        ctx.save();
        if (p.kind === 'blade') {
          const dir = Math.sign(p.vx);
          ctx.globalCompositeOperation = 'lighter';
          const grd = ctx.createLinearGradient(p.x - dir * 70, p.y, p.x, p.y);
          grd.addColorStop(0, 'rgba(150,200,255,0)');
          grd.addColorStop(1, 'rgba(225,242,255,0.95)');
          ctx.strokeStyle = grd;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(p.x - dir * 74, p.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          ctx.translate(p.x, p.y);
          ctx.rotate(dir > 0 ? 0 : Math.PI);
          ctx.shadowColor = '#6fb2ff';
          ctx.shadowBlur = 18;
          ctx.fillStyle = '#eef7ff';
          ctx.beginPath();
          ctx.moveTo(19, 0);
          ctx.lineTo(-3, -5.5);
          ctx.lineTo(-12, 0);
          ctx.lineTo(-3, 5.5);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.4;
          ctx.stroke();
        } else if (p.kind === 'dragon') {
          const dir = Math.sign(p.vx);
          ctx.translate(p.x, p.y);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, 86);
          glow.addColorStop(0, 'rgba(150,235,255,0.6)');
          glow.addColorStop(0.55, 'rgba(50,160,255,0.25)');
          glow.addColorStop(1, 'rgba(30,120,255,0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(0, 0, 86, 0, TAU);
          ctx.fill();
          for (let i = 0; i < 7; i++) {
            const bx = -dir * (i * 17);
            const by = Math.sin(p.x * 0.03 + i * 0.8) * (i * 2.6);
            const r = 27 - i * 2.6;
            ctx.fillStyle = `rgba(90,200,255,${0.55 - i * 0.06})`;
            ctx.beginPath();
            ctx.arc(bx, by, Math.max(2, r), 0, TAU);
            ctx.fill();
          }
          ctx.strokeStyle = 'rgba(225,248,255,0.9)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(dir * 18, -30);
          ctx.quadraticCurveTo(dir * 34, 0, dir * 18, 30);
          ctx.stroke();
          ctx.fillStyle = '#c9f3ff';
          ctx.beginPath();
          ctx.arc(0, 0, 24, 0, TAU);
          ctx.fill();
          ctx.fillStyle = '#0a3550';
          ctx.beginPath();
          ctx.arc(dir * 7, -4, 3.4, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = '#eaf9ff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-dir * 8, -20);
          ctx.lineTo(-dir * 26, -34);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-dir * 8, 20);
          ctx.lineTo(-dir * 26, 30);
          ctx.stroke();
          ctx.restore();
        } else if (p.kind === 'tornado') {
          const fade = Math.min(1, p.life / 0.25);
          ctx.translate(p.x, GROUND + 4);
          ctx.globalAlpha = fade;
          const spin = this.time * 12 + p.x * 0.02;

          ctx.fillStyle = 'rgba(12,40,38,0.35)';
          ctx.beginPath();
          ctx.ellipse(0, 0, 62, 11, 0, 0, TAU);
          ctx.fill();

          ctx.globalCompositeOperation = 'lighter';
          const glow = ctx.createLinearGradient(0, -220, 0, 8);
          glow.addColorStop(0, 'rgba(150,255,235,0)');
          glow.addColorStop(0.45, 'rgba(130,245,220,0.2)');
          glow.addColorStop(1, 'rgba(90,225,205,0.46)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.moveTo(-14, -220);
          ctx.quadraticCurveTo(-74, -80, -60, 4);
          ctx.lineTo(60, 4);
          ctx.quadraticCurveTo(74, -80, 14, -220);
          ctx.closePath();
          ctx.fill();

          for (let i = 0; i < 11; i++) {
            const k = i / 10;
            const yy = -4 - k * 200;
            const rx = 58 - k * 47;
            const ph = spin + i * 0.9;
            ctx.strokeStyle = `rgba(180,255,242,${0.9 - k * 0.62})`;
            ctx.lineWidth = 4.2 - k * 2.8;
            ctx.beginPath();
            ctx.ellipse(Math.sin(ph) * (10 - k * 7), yy, rx, 12 - k * 5.5, 0, 0, TAU);
            ctx.stroke();
          }

          ctx.strokeStyle = 'rgba(232,255,250,0.65)';
          ctx.lineWidth = 2.4;
          for (let i = 0; i < 3; i++) {
            const ph = spin * 1.3 + i * 2.1;
            ctx.beginPath();
            for (let s = 0; s <= 6; s++) {
              const k = s / 6;
              const rx = 52 - k * 44;
              const xx = Math.cos(ph + k * 7.2) * rx;
              const yy = -6 - k * 208;
              if (s === 0) ctx.moveTo(xx, yy);
              else ctx.lineTo(xx, yy);
            }
            ctx.stroke();
          }

          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
        } else if (p.kind === 'shock') {
          const dir = Math.sign(p.vx);
          ctx.translate(p.x, GROUND);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const g2 = ctx.createRadialGradient(0, -16, 2, 0, -16, 66);
          g2.addColorStop(0, 'rgba(255,190,90,0.45)');
          g2.addColorStop(1, 'rgba(180,110,30,0)');
          ctx.fillStyle = g2;
          ctx.beginPath();
          ctx.ellipse(0, -14, 70, 40, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
          for (let i = 0; i < 4; i++) {
            const off = -dir * i * 15;
            const hgt = 38 - i * 7;
            ctx.fillStyle = i % 2 ? '#9a6a32' : '#7c5124';
            ctx.beginPath();
            ctx.moveTo(off - 12, 0);
            ctx.lineTo(off + dir * 4, -hgt);
            ctx.lineTo(off + 14, 0);
            ctx.closePath();
            ctx.fill();
          }
          ctx.fillStyle = 'rgba(210,170,110,0.32)';
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(NG.rand(-26, 26), -NG.rand(4, 24), NG.rand(4, 9), 0, TAU);
            ctx.fill();
          }
        }
        ctx.restore();
      }
    },

    drawHazards(ctx) {
      for (const h of this.hazards) {
        const t = h.t;
        const active = t - h.delay;
        ctx.save();
        if (h.kind === 'root') {
          if (t < h.delay) {
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = '#6fe08a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(h.x, GROUND + 2, 26, 7, 0, 0, TAU);
            ctx.stroke();
          } else {
            const k = NG.clamp(active / 0.16, 0, 1);
            const fade = NG.clamp((h.delay + h.dur + 0.2 - t) / 0.3, 0, 1);
            ctx.globalAlpha = fade;
            const grad = ctx.createLinearGradient(h.x, GROUND, h.x, GROUND - 90);
            grad.addColorStop(0, '#2b7a3f');
            grad.addColorStop(1, '#a9f08a');
            ctx.shadowColor = '#57d46b';
            ctx.shadowBlur = 14;
            const spikes = [
              [-20, 44, 9],
              [0, 82, 13],
              [20, 52, 10],
            ];
            for (const s of spikes) {
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.moveTo(h.x + s[0] - s[2], GROUND + 2);
              ctx.quadraticCurveTo(h.x + s[0] - s[2] * 0.5, GROUND - s[1] * 0.6 * k, h.x + s[0], GROUND - s[1] * k);
              ctx.quadraticCurveTo(h.x + s[0] + s[2] * 0.6, GROUND - s[1] * 0.5 * k, h.x + s[0] + s[2], GROUND + 2);
              ctx.closePath();
              ctx.fill();
            }
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 0.4 * fade;
            ctx.fillStyle = '#b9ff9f';
            ctx.beginPath();
            ctx.ellipse(h.x, GROUND + 3, 34, 8, 0, 0, TAU);
            ctx.fill();
          }
        } else if (h.kind === 'pillar') {
          if (t < h.delay) {
            const k = t / h.delay;
            ctx.globalAlpha = 0.35 + k * 0.45;
            ctx.strokeStyle = '#ff7a2a';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(h.x, GROUND + 2, 64 + k * 10, 13, 0, 0, TAU);
            ctx.stroke();
            ctx.globalAlpha = 0.18 + k * 0.2;
            ctx.fillStyle = '#ff5a10';
            ctx.beginPath();
            ctx.ellipse(h.x, GROUND + 2, 60 + k * 10, 12, 0, 0, TAU);
            ctx.fill();
            ctx.globalAlpha = (0.4 + k * 0.5) * 0.6;
            ctx.fillStyle = '#ffd08a';
            for (let i = 0; i < 3; i++) {
              ctx.beginPath();
              ctx.arc(h.x + NG.rand(-40, 40), GROUND - NG.rand(0, 20), NG.rand(1, 3), 0, TAU);
              ctx.fill();
            }
          } else {
            const k = NG.clamp(active / 0.12, 0, 1);
            const out = NG.clamp((h.delay + h.dur + 0.2 - t) / 0.25, 0, 1);
            const hh = 250 * k * out;
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 6; i++) {
              const fx = h.x - 46 + i * 18;
              const fh = hh * (0.55 + 0.45 * Math.sin(t * 9 + i * 1.7));
              const fw = 18 + (i % 3) * 5;
              const grad = ctx.createLinearGradient(0, GROUND - fh, 0, GROUND);
              grad.addColorStop(0, 'rgba(255,240,160,0)');
              grad.addColorStop(0.35, 'rgba(255,180,70,0.75)');
              grad.addColorStop(1, 'rgba(255,80,20,0.85)');
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.moveTo(fx - fw * 0.5, GROUND + 2);
              ctx.quadraticCurveTo(fx - fw * 0.7, GROUND - fh * 0.6, fx + Math.sin(t * 10 + i) * 8, GROUND - fh);
              ctx.quadraticCurveTo(fx + fw * 0.8, GROUND - fh * 0.55, fx + fw * 0.5, GROUND + 2);
              ctx.closePath();
              ctx.fill();
            }
            const base = ctx.createRadialGradient(h.x, GROUND - 20, 6, h.x, GROUND - 20, 100);
            base.addColorStop(0, 'rgba(255,220,140,0.55)');
            base.addColorStop(1, 'rgba(255,90,20,0)');
            ctx.fillStyle = base;
            ctx.beginPath();
            ctx.arc(h.x, GROUND - 20, 100, 0, TAU);
            ctx.fill();
          }
        } else if (h.kind === 'rock') {
          if (t < h.delay) {
            ctx.globalAlpha = 0.4;
            ctx.strokeStyle = '#e0a84f';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.ellipse(h.x, GROUND + 2, 54, 11, 0, 0, TAU);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(h.x - 40, GROUND + 4);
            ctx.lineTo(h.x - 18, GROUND - 6);
            ctx.lineTo(h.x + 2, GROUND + 2);
            ctx.lineTo(h.x + 26, GROUND - 8);
            ctx.lineTo(h.x + 44, GROUND + 3);
            ctx.stroke();
          } else {
            const k = NG.clamp(active / 0.14, 0, 1);
            const out = NG.clamp((h.delay + h.dur + 0.2 - t) / 0.25, 0, 1);
            ctx.globalAlpha = out;
            ctx.fillStyle = '#7c5124';
            ctx.strokeStyle = '#c99a5b';
            ctx.lineWidth = 2;
            const rocks = [
              [-28, 62, 16],
              [0, 96, 22],
              [28, 70, 14],
            ];
            for (const r of rocks) {
              const rh = r[1] * k;
              ctx.beginPath();
              ctx.moveTo(h.x + r[0] - r[2], GROUND + 2);
              ctx.lineTo(h.x + r[0] - r[2] * 0.3, GROUND - rh * 0.7);
              ctx.lineTo(h.x + r[0] + r[2] * 0.2, GROUND - rh);
              ctx.lineTo(h.x + r[0] + r[2], GROUND + 2);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }
          }
        } else if (h.kind === 'fire') {
          if (t > h.delay) {
            const fade = NG.clamp((h.delay + h.dur - t) / 0.5, 0, 1);
            ctx.globalAlpha = fade;
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 7; i++) {
              const fx = h.x - h.w + i * ((h.w * 2) / 6);
              const fh = 26 + Math.abs(Math.sin(t * 7 + i * 1.9)) * 28;
              const fw = 13 + (i % 2) * 4;
              const grad = ctx.createLinearGradient(0, GROUND - fh, 0, GROUND);
              grad.addColorStop(0, 'rgba(255,220,120,0)');
              grad.addColorStop(0.5, 'rgba(255,140,40,0.6)');
              grad.addColorStop(1, 'rgba(220,60,10,0.6)');
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.moveTo(fx - fw * 0.5, GROUND + 2);
              ctx.quadraticCurveTo(fx - fw * 0.6, GROUND - fh * 0.6, fx + Math.sin(t * 8 + i) * 4, GROUND - fh);
              ctx.quadraticCurveTo(fx + fw * 0.7, GROUND - fh * 0.5, fx + fw * 0.5, GROUND + 2);
              ctx.closePath();
              ctx.fill();
            }
          }
        }
        ctx.restore();
      }
    },

    /* ================================ HUD ================================ */
    drawHUD(ctx) {
      const f1 = this.fighters[0];
      const f2 = this.fighters[1];
      if (!f1 || !f2) return;

      const top = ctx.createLinearGradient(0, 0, 0, 170);
      top.addColorStop(0, 'rgba(3,6,12,0.8)');
      top.addColorStop(0.7, 'rgba(3,6,12,0.35)');
      top.addColorStop(1, 'rgba(3,6,12,0)');
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, W, 170);

      this.drawPanel(ctx, f1, 34, 24, 1);
      this.drawPanel(ctx, f2, W - 34, 24, -1);

      // timer
      const timeLeft = Math.max(0, Math.ceil(this.timer));
      const low = timeLeft <= 10;
      ctx.save();
      ctx.translate(W / 2, 62);
      ctx.beginPath();
      ctx.arc(0, 0, 44, 0, TAU);
      ctx.fillStyle = 'rgba(6,10,18,0.85)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = low ? '#ff6a4a' : 'rgba(180,205,240,0.55)';
      if (low) {
        ctx.shadowColor = '#ff4d2a';
        ctx.shadowBlur = 16 + Math.sin(this.time * 10) * 6;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, TAU);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = `900 36px ${NG.FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = low ? '#ffb0a0' : '#f2f8ff';
      ctx.fillText(String(timeLeft), 0, 2);
      ctx.font = `800 10px ${NG.FONT}`;
      ctx.fillStyle = 'rgba(160,180,206,0.9)';
      const centerLabel =
        this.mode === 'survival' && this.survival
          ? `SINH TỒN ${this.survival.index + 1}/${this.survival.total}`
          : `HIỆP ${this.round} / 3`;
      ctx.fillText(centerLabel, 0, 60);
      ctx.font = `700 9px ${NG.FONT}`;
      ctx.fillStyle = 'rgba(140,160,190,0.8)';
      ctx.fillText(NG.ARENAS[this.arenaId].short.toUpperCase(), 0, 74);
      ctx.restore();

      // controls hint
      const hintOn =
        this.state === 'battle' &&
        (this.mode === 'pvp' || this.round === 1) &&
        this.hintT < 12 &&
        this.phase !== 'end';
      if (hintOn) {
        const a = NG.clamp((12 - this.hintT) / 2.5, 0, 1);
        ctx.save();
        ctx.globalAlpha = a * 0.85;
        const txt =
          this.mode === 'pvp'
            ? 'P1  A/D · W · S · J/K/L · SHIFT        P2  ←/→ · ↑ · ↓ · 1/2/3/4'
            : 'A / D  DI CHUYỂN     W  NHẢY     S  CHẶN     J  ĐẤM     K  ĐÁ     SHIFT  LƯỚT     L  TUYỆT KỸ';
        ctx.font = `700 11px ${NG.FONT}`;
        const tw = ctx.measureText(txt).width;
        NG.roundRect(ctx, W / 2 - tw / 2 - 22, 660, tw + 44, 30, 15);
        ctx.fillStyle = 'rgba(5,9,16,0.7)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = 'rgba(200,215,235,0.9)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, W / 2, 676);
        ctx.restore();
      }
    },

    drawPanel(ctx, f, anchorX, y, dir) {
      const d = f.def;
      const pal = d.palette;
      const barW = 356;
      const bx = dir === 1 ? anchorX + 64 : anchorX - 64 - barW;
      const nx = dir === 1 ? anchorX + 64 : anchorX - 64;
      const align = dir === 1 ? 'left' : 'right';
      const badgeX = dir === 1 ? anchorX + 28 : anchorX - 28;

      ctx.save();
      ctx.textBaseline = 'alphabetic';

      // element badge
      ctx.beginPath();
      ctx.arc(badgeX, y + 28, 24, 0, TAU);
      ctx.fillStyle = 'rgba(7,11,18,0.9)';
      ctx.fill();
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 2;
      ctx.shadowColor = pal.glow;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = pal.accent;
      ctx.font = `700 19px ${NG.FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.char, badgeX, y + 29);
      ctx.textBaseline = 'alphabetic';

      // name & tag
      ctx.textAlign = align;
      ctx.font = `900 21px ${NG.FONT}`;
      ctx.fillStyle = '#f4f8ff';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(d.name, nx, y + 24);
      const nw = ctx.measureText(d.name).width;
      ctx.font = `800 9px ${NG.FONT}`;
      ctx.fillStyle = dir === 1 ? 'rgba(90,200,255,0.95)' : 'rgba(255,140,110,0.95)';
      ctx.shadowBlur = 0;
      const tagX = dir === 1 ? nx + nw + 12 : nx - nw - 12;
      ctx.textAlign = dir === 1 ? 'left' : 'right';
      const tag =
        this.mode === 'pvp' ? (dir === 1 ? 'P1' : 'P2') : this.mode === 'survival' ? (dir === 1 ? 'BẠN' : 'ĐỊCH') : dir === 1 ? 'BẠN' : 'MÁY';
      ctx.fillText(tag, tagX, y + 22);

      ctx.textAlign = align;
      ctx.font = `600 10px ${NG.FONT}`;
      ctx.fillStyle = 'rgba(160,178,200,0.92)';
      ctx.fillText(d.title, nx, y + 40);

      // hp bar
      const hpY = y + 48;
      const hpFrac = NG.clamp(f.hp / f.maxHp, 0, 1);
      const ghostFrac = NG.clamp(f.ghostHp / f.maxHp, 0, 1);
      NG.roundRect(ctx, bx, hpY, barW, 16, 7);
      ctx.fillStyle = 'rgba(5,8,14,0.85)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,220,255,0.22)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const ghostW = barW * ghostFrac;
      const ghostX = dir === 1 ? bx : bx + barW - ghostW;
      NG.roundRect(ctx, ghostX, hpY + 1, Math.max(0, ghostW - 2), 14, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fill();

      const hpW = barW * hpFrac;
      if (hpW > 0.5) {
        const hpX = dir === 1 ? bx : bx + barW - hpW;
        const grad = ctx.createLinearGradient(bx, 0, bx + barW, 0);
        grad.addColorStop(0, pal.glow);
        grad.addColorStop(1, pal.accent);
        NG.roundRect(ctx, hpX + 1, hpY + 1, Math.max(0, hpW - 2), 14, 6);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        NG.roundRect(ctx, hpX + 1, hpY + 1, Math.max(0, hpW - 2), 5, 3);
        ctx.fill();
      }

      // hp numbers inside the bar
      ctx.font = `800 9px ${NG.FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(3,6,12,0.75)';
      ctx.strokeText(`${Math.ceil(f.hp)} / ${f.maxHp}`, bx + barW / 2, hpY + 9);
      ctx.fillStyle = 'rgba(240,248,255,0.95)';
      ctx.fillText(`${Math.ceil(f.hp)} / ${f.maxHp}`, bx + barW / 2, hpY + 9);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = align;

      // energy bar
      const enY = y + 70;
      NG.roundRect(ctx, bx, enY, barW, 7, 3.5);
      ctx.fillStyle = 'rgba(5,8,14,0.85)';
      ctx.fill();
      const enFrac = NG.clamp(f.energy / f.maxEnergy, 0, 1);
      const enW = barW * enFrac;
      if (enW > 0.5) {
        const enX = dir === 1 ? bx + 1 : bx + barW - enW + 1;
        const eg = ctx.createLinearGradient(bx, 0, bx + barW, 0);
        eg.addColorStop(0, f.energy >= 100 ? '#ffe9a0' : '#53d7ff');
        eg.addColorStop(1, f.energy >= 100 ? '#ffb14a' : '#2b8cff');
        NG.roundRect(ctx, enX, enY + 1, Math.max(0, enW - 2), 5, 2.5);
        ctx.fillStyle = eg;
        if (f.energy >= 100) {
          ctx.shadowColor = '#ffc35c';
          ctx.shadowBlur = 10 + Math.sin(this.time * 8) * 5;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // round pips
      for (let i = 0; i < (this.mode === 'survival' ? 0 : 2); i++) {
        const px = dir === 1 ? bx + 8 + i * 16 : bx + barW - 8 - i * 16;
        ctx.beginPath();
        ctx.arc(px, y + 88, 4.2, 0, TAU);
        if (i < f.wins) {
          ctx.fillStyle = pal.accent;
          ctx.shadowColor = pal.glow;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = 'rgba(160,180,210,0.35)';
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }

      // skill label
      ctx.font = `800 9.5px ${NG.FONT}`;
      ctx.textAlign = align;
      const ready = f.energy >= 100 && f.skillCD <= 0;
      ctx.fillStyle = ready ? '#ffe2a0' : 'rgba(150,172,200,0.85)';
      let skillTxt = `TUYỆT KỸ · ${d.skill.name}`;
      if (f.skillCD > 0) skillTxt += `  (${f.skillCD.toFixed(1)}s)`;
      else if (!ready) skillTxt += `  · ${Math.floor(f.energy)}%`;
      else skillTxt += '  · SẴN SÀNG';
      if (ready) {
        ctx.shadowColor = '#ffb04a';
        ctx.shadowBlur = 10;
      }
      ctx.fillText(skillTxt, nx, y + 109);
      ctx.shadowBlur = 0;

      ctx.restore();
    },

    drawBanner(ctx) {
      const b = this.banner;
      if (!b) return;
      const k = b.t / b.dur;
      const a = Math.min(1, b.t * 10, (1 - k) * 5);
      const pop = 1 + Math.max(0, 0.22 - b.t) * 1.8;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(W / 2, 268);
      ctx.scale(pop, pop);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 78px ${NG.FONT}`;
      ctx.lineWidth = 10;
      ctx.strokeStyle = 'rgba(2,4,8,0.82)';
      ctx.strokeText(b.text, 0, 0);
      const grd = ctx.createLinearGradient(0, -44, 0, 44);
      grd.addColorStop(0, '#ffffff');
      grd.addColorStop(1, b.color);
      ctx.fillStyle = grd;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 28;
      ctx.fillText(b.text, 0, 0);
      ctx.shadowBlur = 0;
      if (b.sub) {
        ctx.font = `700 17px ${NG.FONT}`;
        ctx.fillStyle = 'rgba(235,244,255,0.92)';
        ctx.fillText(b.sub, 0, 58);
      }
      ctx.restore();
    },

    drawCardPreviews() {
      for (const p of this.cardPreviews) {
        const c = p.ctx;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, 104, 196);
        const g = c.createRadialGradient(52, 130, 6, 52, 130, 78);
        g.addColorStop(0, NG.hexA(p.def.glow, 0.22));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, 104, 196);
        c.fillStyle = 'rgba(0,0,0,0.35)';
        c.beginPath();
        c.ellipse(52, 188, 26, 5, 0, 0, TAU);
        c.fill();
        const fake = {
          def: p.def,
          x: 52,
          y: 187,
          facing: 1,
          state: 'idle',
          animT: this.time + p.off,
          vx: 0,
          vy: 0,
          onGround: true,
          hp: 1,
          maxHp: 1,
          energy: 0,
          blocking: false,
          hitstun: 0,
          attack: null,
          casting: null,
          walkPhase: 0,
        };
        NG.drawFighter(c, fake, { preview: true, scale: 0.92 });
      }
    },
  };

  NG.game = game;

  window.addEventListener('load', () => {
    try {
      game.init();
    } catch (err) {
      console.error('Init failed', err);
    }
  });
})();
