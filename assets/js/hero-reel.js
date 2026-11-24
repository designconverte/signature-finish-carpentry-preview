/* hero-reel.js: o hero V3. Fotos REAIS de uma mesma obra, do começo ao acabamento.
   Posição contínua p (0 = 1ª etapa, n-1 = acabado). Em p inteiro a etapa aparece inteira; entre duas etapas a seguinte
   sobe de baixo para cima atrás de uma linha de laser. Ao carregar: mostra o acabado (LCP), volta ao começo e monta de
   novo. Régua (arrasta, clica, setas do teclado) e a própria foto (arrasto na horizontal) controlam. Sem dependências;
   sem JS fica a foto do acabamento. Reduced motion: nada anda sozinho, trocas sem varredura. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SWEEP = 950;   // ms de uma etapa para a outra
  var HOLD = 1050;   // ms parado em cada etapa
  var inOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var sine = function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; };
  var out = function (t) { return 1 - Math.pow(1 - t, 3); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var ratio = function (s) { var a = String(s).split('/'); return a.length === 2 ? Number(a[0]) / Number(a[1]) : Number(s) || 4 / 3; };

  function Reel(root) {
    var self = this;
    this.root = root;
    this.frame = root.querySelector('[data-reel-frame]');
    this.laser = root.querySelector('.reel__laser');
    this.nEl = root.querySelector('[data-reel-n]');
    this.lEl = root.querySelector('[data-reel-label]');
    this.rule = root.querySelector('[data-reel-rule]');
    this.fill = root.querySelector('[data-reel-fill]');
    this.knob = root.querySelector('[data-reel-knob]');
    this.stopsEl = root.querySelector('[data-reel-stops]');
    this.btn = root.querySelector('[data-reel-play]');
    // as etapas intermediárias são desenhadas num canvas: só a foto do acabado é <img> visível na página, e o
    // canvas não entra na conta do LCP (uma etapa que aparece segundos depois não vira o "maior conteúdo")
    this.cv = root.querySelector('.reel__cv');
    this.ctx = this.cv && this.cv.getContext ? this.cv.getContext('2d') : null;
    this.sets = {};
    Array.prototype.forEach.call(root.querySelectorAll('[data-reel-set]'), function (el) {
      var s = { svc: el.getAttribute('data-reel-set'), el: el, ar: ratio(el.getAttribute('data-ar')), imgs: Array.prototype.slice.call(el.querySelectorAll('img')), ready: null };
      self.sets[s.svc] = s;
      if (el.classList.contains('is-on')) self.cur = s;
    });
    if (!this.cur) return;
    this.svc = this.cur.svc;
    this.p = this.cur.imgs.length - 1;
    this.seq = null; this.paused = false; this.visible = true; this.raf = 0; this.touched = false;
    this.shown = -1; this.pending = null;
    root.classList.add('is-js');
    root.style.setProperty('--ar', this.cur.ar.toFixed(4));
    root.__reel = this;
    this.buildStops();
    this.render();
    this.bind();
  }

  Reel.prototype.n = function () { return this.cur.imgs.length; };

  /* carrega as etapas de uma obra (as que ainda não têm src) e espera decodificar; nunca trava mais de 4 s */
  Reel.prototype.load = function (s) {
    if (s.ready) return s.ready;
    var jobs = s.imgs.map(function (img) {
      var ss = img.getAttribute('data-srcset');
      if (ss) { img.srcset = ss; img.removeAttribute('data-srcset'); }
      return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
    });
    s.ready = Promise.race([Promise.all(jobs), new Promise(function (r) { setTimeout(r, 4000); })]);
    return s.ready;
  };

  Reel.prototype.buildStops = function () {
    var n = this.n(), h = '';
    for (var k = 0; k < n; k++) h += '<span class="reel__stop" style="left:' + (n > 1 ? (k / (n - 1)) * 100 : 100) + '%"><i></i><em>' + pad(k + 1) + '</em></span>';
    this.stopsEl.innerHTML = h;
    this.stopEls = Array.prototype.slice.call(this.stopsEl.children);
    this.rule.setAttribute('aria-valuemax', String(n));
    this.shown = -1;
  };

  Reel.prototype.render = function () {
    var s = this.cur, n = s.imgs.length;
    var p = Math.max(0, Math.min(n - 1, this.p));
    var i = Math.floor(p), f = p - i;
    if (i >= n - 1) { i = n - 1; f = 0; }
    var top = (1 - f) * 100, sc = 1.035 - 0.035 * f;
    // a imagem que sobe escala a partir da base: a borda do recorte vai para 100 - (100 - top) * sc
    var line = 100 - (100 - top) * sc;
    this.paint(s, i, f, sc, line);
    this.laser.style.transform = 'translate3d(0,' + line.toFixed(2) + '%,0)';
    this.laser.style.opacity = f > 0.0005 && f < 0.9995 ? '1' : '0';
    var k = f >= 0.5 ? i + 1 : i;
    if (k !== this.shown) {
      this.shown = k;
      var label = s.imgs[k].getAttribute('data-label');
      this.nEl.textContent = pad(k + 1);
      this.lEl.textContent = label;
      this.rule.setAttribute('aria-valuenow', String(k + 1));
      this.rule.setAttribute('aria-valuetext', label);
      this.stopEls.forEach(function (el, j) { el.classList.toggle('is-past', j <= k); });
    }
    var pct = n > 1 ? (p / (n - 1)) * 100 : 100;
    this.fill.style.transform = 'scaleX(' + (pct / 100).toFixed(4) + ')';
    this.knob.style.transform = 'translate3d(' + pct.toFixed(2) + '%,0,0)';
    if (!this.seq) this.setBtn();
  };

  /* desenha a etapa i inteira e, por cima, a etapa i+1 da linha de laser para baixo. No acabado o canvas some e
     fica a <img>. Etapa ainda não carregada: o canvas fica transparente e a foto do acabado aparece por baixo. */
  Reel.prototype.paint = function (s, i, f, sc, line) {
    var cv = this.cv, ctx = this.ctx, n = s.imgs.length;
    if (!ctx) return;
    if (i >= n - 1 && f <= 0.0005) { cv.style.opacity = '0'; return; }
    var d = Math.min(2, window.devicePixelRatio || 1);
    var cw = Math.max(1, Math.round(this.frame.clientWidth * d)), ch = Math.max(1, Math.round(this.frame.clientHeight * d));
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    this.draw(s.imgs[i], cw, ch, 1);
    if (f > 0.0005 && s.imgs[i + 1]) {
      var y = Math.round((line / 100) * ch);
      ctx.save(); ctx.beginPath(); ctx.rect(0, y, cw, ch - y); ctx.clip();
      this.draw(s.imgs[i + 1], cw, ch, sc);
      ctx.restore();
    }
    cv.style.opacity = '1';
  };
  // object-fit: cover com o object-position da <img>, escala a partir do centro da base
  Reel.prototype.draw = function (img, cw, ch, sc) {
    var iw = img.naturalWidth, ih = img.naturalHeight;
    if (!iw || !img.complete) return;
    var r = Math.max(cw / iw, ch / ih), dw = iw * r, dh = ih * r;
    var pos = (img.style.objectPosition || '50% 50%').split(' ');
    var x = (cw - dw) * (parseFloat(pos[0]) / 100), y = (ch - dh) * (parseFloat(pos[1] || '50') / 100);
    this.ctx.drawImage(img, cw / 2 + (x - cw / 2) * sc, ch + (y - ch) * sc, dw * sc, dh * sc);
  };

  /* botão: pausar enquanto anda; continuar se parou no meio; repetir no acabado */
  Reel.prototype.setBtn = function (force) {
    var st = force || (this.seq && !this.paused ? 'pause' : (this.p >= this.n() - 1.001 ? 'replay' : 'play'));
    if (st === this.btnState) return;
    this.btnState = st;
    var ic = { pause: 'i-pause', play: 'i-play', replay: 'i-replay' }[st];
    var lb = { pause: 'Pause', play: 'Play the build', replay: 'Replay the build' }[st];
    this.btn.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#' + ic + '"></use></svg>';
    this.btn.setAttribute('aria-label', lb);
  };

  /* sequenciador: passos {to, dur, hold, ease}; anda só com o hero visível e a aba ativa */
  Reel.prototype.run = function (steps, done) {
    this.seq = { steps: steps, k: 0, t: 0, from: this.p, ph: 'move', done: done };
    this.paused = false;
    this.setBtn('pause');
    this.kick();
  };
  Reel.prototype.kick = function () {
    if (this.raf || !this.seq || this.paused || !this.visible) return;
    var self = this, last = performance.now();
    var loop = function (now) {
      self.raf = 0;
      var dt = Math.min(64, now - last); last = now;
      if (self.tick(dt)) self.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  };
  Reel.prototype.tick = function (dt) {
    var q = this.seq;
    if (!q || this.paused || !this.visible) return false;
    var s = q.steps[q.k];
    q.t += dt;
    if (q.ph === 'move') {
      var u = s.dur ? Math.min(1, q.t / s.dur) : 1;
      this.p = q.from + (s.to - q.from) * (s.ease || sine)(u);
      this.render();
      if (u >= 1) { q.ph = 'hold'; q.t = 0; }
    } else if (q.t >= (s.hold || 0)) {
      q.k++; q.t = 0; q.ph = 'move'; q.from = this.p;
      if (q.k >= q.steps.length) {
        this.seq = null; this.setBtn();
        if (q.done) q.done();
        return false;
      }
    }
    return true;
  };
  Reel.prototype.halt = function () {
    this.seq = null; this.paused = false;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
    this.setBtn();
  };

  /* monta a obra: (opcional) volta ao começo e sobe etapa por etapa até o acabado */
  Reel.prototype.build = function (rewind) {
    var n = this.n(), steps = [], self = this;
    var start = rewind ? 0 : this.p;
    if (rewind && this.p > 0) steps.push({ to: 0, dur: reduce ? 0 : 420 + 260 * this.p, hold: reduce ? 1200 : 700, ease: inOut });
    if (!rewind && start === 0) steps.push({ to: 0, dur: 0, hold: reduce ? 1200 : 650 });
    for (var k = Math.floor(start + 0.001) + 1; k < n; k++) steps.push({ to: k, dur: reduce ? 0 : SWEEP, hold: k === n - 1 ? 0 : (reduce ? 1400 : HOLD) });
    if (!steps.length) return;
    this.run(steps, function () { self.flash(); });
  };
  Reel.prototype.flash = function () {
    var f = this.frame;
    f.classList.remove('is-set'); void f.offsetWidth; f.classList.add('is-set');
    setTimeout(function () { f.classList.remove('is-set'); }, 1600);
  };
  Reel.prototype.goTo = function (k) {
    var n = this.n();
    k = Math.max(0, Math.min(n - 1, k));
    var d = Math.abs(k - this.p);
    if (d < 0.001) return;
    this.halt();
    this.run([{ to: k, dur: reduce ? 0 : Math.min(1400, 180 + d * 620), hold: 0, ease: d > 1 ? inOut : sine }]);
  };
  Reel.prototype.snap = function () { this.goTo(Math.round(this.p)); };

  /* o usuário assumiu: some a introdução automática */
  Reel.prototype.take = function () { this.touched = true; if (this.introT) { clearTimeout(this.introT); this.introT = 0; } this.halt(); };

  Reel.prototype.intro = function () {
    if (reduce || this.touched) return;
    var self = this, s = this.cur;
    var lazy = this.root.hasAttribute('data-reel-lazy');
    var go = function () {
      self.load(s).then(function () {
        if (self.touched || self.cur !== s) return;
        self.introT = setTimeout(function () { self.introT = 0; if (!self.touched && self.cur === s) self.build(true); }, lazy ? 500 : 900);
      });
    };
    // fora da 1ª tela (seção da V2): só carrega e abre quando o rolo chega a ~2/3 da tela
    if (lazy && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        go();
      }, { rootMargin: '0px 0px -30% 0px' });
      io.observe(this.root);
    } else go();
  };

  /* troca a obra (passo 1 do form). Mesma obra: monta de novo. */
  Reel.prototype.show = function (svc, play) {
    var next = this.sets[svc], self = this;
    if (!next) return;
    this.touched = true;
    if (this.introT) { clearTimeout(this.introT); this.introT = 0; }
    if (svc === this.svc && !this.pending) { if (play) { this.halt(); this.build(true); } return; }
    this.halt();
    this.pending = svc;
    this.frame.classList.add('is-loading');
    this.load(next).then(function () {
      if (self.pending !== svc) return;
      self.pending = null;
      self.frame.classList.remove('is-loading');
      self.cur.el.classList.remove('is-on');
      next.el.classList.add('is-on');
      self.cur = next; self.svc = svc;
      self.root.style.setProperty('--ar', next.ar.toFixed(4));
      self.buildStops();
      self.p = play && !reduce ? 0 : next.imgs.length - 1;
      self.render();
      if (play && !reduce) self.build(false);
    });
  };
  Reel.prototype.prefetch = function (svc) { if (this.sets[svc]) this.load(this.sets[svc]); };

  Reel.prototype.bind = function () {
    var self = this, rule = this.rule, frame = this.frame;

    this.btn.addEventListener('click', function () {
      self.touched = true;
      if (self.introT) { clearTimeout(self.introT); self.introT = 0; }
      if (self.seq && !self.paused) { self.paused = true; self.setBtn('play'); return; }
      if (self.seq && self.paused) { self.paused = false; self.setBtn('pause'); self.kick(); return; }
      self.load(self.cur).then(function () { self.build(self.p >= self.n() - 1.001); });
    });

    // régua: arrastar ou clicar leva a obra até ali; solta na etapa mais próxima
    var fromRule = function (e) {
      var r = rule.getBoundingClientRect(), n = self.n();
      self.p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (n - 1);
      self.render();
    };
    rule.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      self.take(); self.load(self.cur);
      rule.setPointerCapture(e.pointerId);
      rule.classList.add('is-drag');
      fromRule(e);
    });
    rule.addEventListener('pointermove', function (e) { if (rule.hasPointerCapture(e.pointerId)) fromRule(e); });
    var endRule = function (e) { if (!rule.classList.contains('is-drag')) return; rule.classList.remove('is-drag'); if (rule.hasPointerCapture(e.pointerId)) rule.releasePointerCapture(e.pointerId); self.snap(); };
    rule.addEventListener('pointerup', endRule);
    rule.addEventListener('pointercancel', endRule);
    rule.addEventListener('keydown', function (e) {
      var k = Math.round(self.p), n = self.n(), to = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') to = k + 1;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') to = k - 1;
      else if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = n - 1;
      if (to === null) return;
      e.preventDefault();
      self.take(); self.load(self.cur).then(function () { self.goTo(to); });
    });

    // a própria foto: arrasto na horizontal anda pela obra (o vertical continua rolando a página)
    var drag = null;
    frame.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, p: self.p, on: false };
    });
    frame.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.on) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
        drag.on = true; drag.x = e.clientX; dx = 0;
        self.take(); self.load(self.cur);
        frame.setPointerCapture(e.pointerId);
        frame.classList.add('is-drag');
      }
      self.p = Math.max(0, Math.min(self.n() - 1, drag.p + dx / (frame.clientWidth * 0.55)));
      self.render();
    });
    var endFrame = function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var was = drag.on; drag = null;
      frame.classList.remove('is-drag');
      if (was) self.snap();
    };
    frame.addEventListener('pointerup', endFrame);
    frame.addEventListener('pointercancel', endFrame);

    // o quadro muda de tamanho (troca de obra, giro do celular): redesenha
    if ('ResizeObserver' in window) new ResizeObserver(function () { self.render(); }).observe(frame);

    // anda só com o hero na tela
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        self.visible = es[0].isIntersecting;
        if (self.visible) self.kick();
      }, { threshold: 0.15 }).observe(this.root);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) self.kick(); });
  };

  window.HeroReel = Reel;
})();
