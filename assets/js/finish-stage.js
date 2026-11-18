/* finish-stage.js: anima uma elevação desenhada (SVG) na ordem real de instalação.
   1) a estrutura oculta aparece em varredura; 2) o laser marca nível/prumo; 3) cada peça entra na ordem do
   atributo data-o (contorno desenha, a madeira preenche, assenta sem quique); 4) as juntas em meia-esquadria
   fecham em ouro; 5) a estrutura recua e uma lente (ponteiro fino) ou um botão mostra o que está por trás.
   Sem GSAP ou com reduced motion: estado final imediato. Sem JS: o CSS já mostra o estado final. */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var TOTAL = 2.6; // segundos da 1ª peça à última, normalizado seja qual for a quantidade

  function qa(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

  function Stage(svg) {
    this.svg = svg;
    this.tl = null;
    this.xray = false;
    this.lens = svg.querySelector('.fs-lens');
    this.all = svg.querySelector('.fs-lens-all');
    this.ring = svg.querySelector('.fs-lens-ring');
    this.sweepTl = null;
    this.bindLens();
  }

  Stage.prototype.parts = function () {
    var s = this.svg;
    return {
      wipe: s.querySelector('.fs-wipe'),
      hid: s.querySelector('.fs-hid'),
      lv: s.querySelector('.fs-lv'),
      pieces: qa(s, '.fs-p'),
      miters: qa(s, '.fs-m'),
      notes: qa(s, '.fs-n')
    };
  };

  Stage.prototype.finalState = function () {
    var p = this.parts();
    if (this.tl) { this.tl.kill(); this.tl = null; }
    this.svg.classList.remove('is-building');
    this.svg.classList.add('is-built');
    if (typeof gsap !== 'undefined') {
      gsap.set([p.lv].concat(qa(this.svg, '.fs-ps')), { clearProps: 'strokeDashoffset' });
      gsap.set(p.pieces.concat(p.miters, p.notes, qa(this.svg, '.fs-pf')), { clearProps: 'opacity,transform' });
      gsap.set(p.hid, { clearProps: 'opacity' });
      if (p.wipe) gsap.set(p.wipe, { attr: { width: 960 } });
    }
  };

  Stage.prototype.play = function () {
    var self = this;
    var p = this.parts();
    if (reduce || typeof gsap === 'undefined') { this.finalState(); return; }
    if (this.tl) this.tl.kill();
    if (this.sweepTl) { this.sweepTl.kill(); this.sweepTl = null; this.setLens(null, null, 0); this.svg.classList.remove('is-sweep'); }
    this.svg.classList.remove('is-built');
    this.svg.classList.add('is-building');

    var orders = p.pieces.concat(p.miters, p.notes).map(function (el) { return parseFloat(el.getAttribute('data-o')) || 0; });
    var uniq = orders.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
    var t0 = 1.05;
    var step = uniq.length > 1 ? TOTAL / (uniq.length - 1) : 0;
    function at(el) { return t0 + uniq.indexOf(parseFloat(el.getAttribute('data-o')) || 0) * step; }

    gsap.set(p.wipe, { attr: { width: 0 } });
    gsap.set(p.hid, { opacity: 1 });
    gsap.set(p.lv, { strokeDashoffset: 1 });
    gsap.set(qa(this.svg, '.fs-ps'), { strokeDashoffset: 1 });
    gsap.set(qa(this.svg, '.fs-pf'), { opacity: 0 });
    gsap.set(p.pieces, { opacity: 0, y: -10 });
    gsap.set(p.miters, { opacity: 0, scale: 0.2, transformOrigin: '50% 50%' });
    gsap.set(p.notes, { opacity: 0 });

    var tl = gsap.timeline({ onComplete: function () { self.svg.classList.remove('is-building'); self.svg.classList.add('is-built'); self.svg.dispatchEvent(new CustomEvent('fs:built', { bubbles: true })); self.sweep(); } });
    tl.to(p.wipe, { attr: { width: 960 }, duration: 0.8, ease: 'power2.inOut' }, 0);
    tl.to(p.lv, { strokeDashoffset: 0, duration: 0.55, ease: 'power1.inOut' }, 0.6);

    p.pieces.forEach(function (el) {
      var t = at(el);
      tl.to(el, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, t);
      qa(el, '.fs-ps').forEach(function (s) { tl.to(s, { strokeDashoffset: 0, duration: 0.45, ease: 'power1.inOut' }, t); });
      qa(el, '.fs-pf').forEach(function (f) { tl.to(f, { opacity: 1, duration: 0.4, ease: 'none' }, t + 0.22); });
    });
    p.miters.forEach(function (el) {
      var t = at(el);
      tl.to(el, { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' }, t);
      tl.to(el, { opacity: 0.55, duration: 0.6, ease: 'power1.out' }, t + 0.45);
    });
    p.notes.forEach(function (el) {
      var t = at(el) - 0.1;
      tl.to(el, { opacity: 1, duration: 0.3, ease: 'none' }, t);
    });
    // o acabamento fecha: estrutura e anotações recuam ("o que você não vê")
    tl.to(p.notes, { opacity: 0, duration: 0.6, ease: 'power1.in' }, '+=0.9');
    tl.to(p.hid, { opacity: 0, duration: 0.7, ease: 'power1.in' }, '<');
    tl.set(p.notes.concat([p.hid]), { clearProps: 'opacity' });
    this.tl = tl;
  };

  Stage.prototype.setLens = function (x, y, r) {
    [this.lens, this.ring].forEach(function (c) {
      if (!c) return;
      if (x !== null) c.setAttribute('cx', x);
      if (y !== null) c.setAttribute('cy', y);
      if (r !== null) c.setAttribute('r', r);
    });
  };

  // one pass of the "work light" across the finished drawing: the structure shows inside the lens, once
  Stage.prototype.sweep = function () {
    var self = this;
    if (reduce || typeof gsap === 'undefined' || !this.lens) return;
    if (this.sweepTl) this.sweepTl.kill();
    var o = { x: 60, r: 0 };
    var y = 430;
    this.svg.classList.add('is-sweep');
    var upd = function () { self.setLens(o.x, y, o.r); };
    this.sweepTl = gsap.timeline({ onUpdate: upd, onComplete: function () { self.svg.classList.remove('is-sweep'); self.sweepTl = null; } })
      .to(o, { r: 110, duration: 0.4, ease: 'power2.out' }, 0)
      .to(o, { x: 900, duration: 2.6, ease: 'sine.inOut' }, 0)
      .to(o, { r: 0, duration: 0.4, ease: 'power2.in' }, 2.3);
  };

  Stage.prototype.setXray = function (on) {
    this.xray = !!on;
    this.svg.classList.toggle('is-xray', this.xray);
    if (!this.all) return;
    if (typeof gsap !== 'undefined' && !reduce) gsap.to(this.all, { attr: { 'fill-opacity': this.xray ? 1 : 0 }, duration: 0.45, ease: 'power1.inOut' });
    else this.all.setAttribute('fill-opacity', this.xray ? 1 : 0);
  };

  Stage.prototype.bindLens = function () {
    var self = this;
    if (this.all) { this.all.setAttribute('fill', '#fff'); this.all.setAttribute('fill-opacity', '0'); }
    if (!finePointer || !this.lens) return;
    var pt = this.svg.createSVGPoint();
    function move(e) {
      if (!self.svg.classList.contains('is-built')) return;
      var m = self.svg.getScreenCTM();
      if (!m) return;
      pt.x = e.clientX; pt.y = e.clientY;
      var q = pt.matrixTransform(m.inverse());
      self.setLens(q.x, q.y, null);
      self.svg.classList.add('is-lens');
    }
    this.svg.addEventListener('pointerenter', function () {
      if (self.sweepTl) { self.sweepTl.kill(); self.sweepTl = null; self.svg.classList.remove('is-sweep'); }
      if (typeof gsap !== 'undefined' && !reduce) gsap.to([self.lens, self.ring], { attr: { r: 120 }, duration: 0.35, ease: 'power2.out' });
      else self.setLens(null, null, 120);
    });
    this.svg.addEventListener('pointermove', move);
    this.svg.addEventListener('pointerleave', function () {
      self.svg.classList.remove('is-lens');
      if (typeof gsap !== 'undefined' && !reduce) gsap.to([self.lens, self.ring], { attr: { r: 0 }, duration: 0.3, ease: 'power2.in' });
      else self.setLens(null, null, 0);
    });
  };

  window.FinishStage = Stage;
})();
