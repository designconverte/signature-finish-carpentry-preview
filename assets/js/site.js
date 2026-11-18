/* site.js: page behaviour. Stage tied to step 1 of the form, details composition, ZIP to town, hero to final-form
   inheritance, section gestures, gallery, live open status. Works without GSAP/Lenis (everything already visible). */
(function () {
  'use strict';

  var doc = document;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = typeof window.gsap !== 'undefined';
  var hasST = hasGsap && typeof window.ScrollTrigger !== 'undefined';
  if (hasST) window.gsap.registerPlugin(window.ScrollTrigger);

  var SERVICES = {
    'kitchen-installation': { name: 'Kitchen installation', sub: 'Labor only · your cabinetry', short: 'Kitchen installation' },
    'stairs-railings': { name: 'Stairs & railings', sub: 'Material & labor', short: 'Stairs & railings' },
    'trim-millwork': { name: 'Trim & millwork', sub: 'The whole house, room to room', short: 'Trim for the whole home' },
    'built-ins': { name: 'Custom built-ins', sub: 'Fabrication & installation', short: 'Custom built-ins' }
  };

  /* ── smooth scroll (fine pointer, wide screens) ─────────────────────── */
  var lenis = null;
  if (!reduce && fine && window.innerWidth >= 1024 && typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ duration: 1.05, smoothWheel: true });
    if (hasST) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  function goTo(target) {
    var el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -88 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  /* ── header + menu ───────────────────────────────────────────────────── */
  var hdr = $('[data-header]');
  function onScroll() { if (hdr) hdr.classList.toggle('is-solid', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var menu = $('[data-menu]');
  var opener = $('[data-menu-open]');
  function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    doc.body.style.overflow = '';
    $('#main').inert = false;
    if (opener) { opener.setAttribute('aria-expanded', 'false'); opener.focus(); }
    if (lenis) lenis.start();
  }
  if (menu && opener) {
    opener.addEventListener('click', function () {
      menu.hidden = false;
      opener.setAttribute('aria-expanded', 'true');
      doc.body.style.overflow = 'hidden';
      $('#main').inert = true;
      if (lenis) lenis.stop();
      var first = $('a', menu); if (first) first.focus();
    });
    $('[data-menu-close]', menu).addEventListener('click', closeMenu);
    $$('[data-menu-link]', menu).forEach(function (a) { a.addEventListener('click', closeMenu); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }

  /* ── hero (V3): one real job, start to finish, tied to step 1 of the form ─ */
  var reelEl = $('[data-reel]');
  var reel = reelEl && typeof window.HeroReel !== 'undefined' ? new window.HeroReel(reelEl) : null;
  if (reel && !reel.cur) reel = null;
  function showStage(svc, play) {
    if (!SERVICES[svc]) return;
    var n = $('[data-stage-name]');
    if (n) n.textContent = SERVICES[svc].name;
    if (reel) reel.show(svc, play);
  }
  if (reel) {
    // the finished photo is the LCP; after the page settles the job rewinds to the start and builds again
    var startIntro = function () { reel.intro(); };
    if (doc.readyState === 'complete') startIntro(); else window.addEventListener('load', startIntro, { once: true });
    // warm up a job's photos when the visitor is about to pick it
    $$('#quote-hero input[name="service"]').forEach(function (r) {
      var lab = r.closest('label');
      var warm = function () { reel.prefetch(r.value); };
      if (lab) { lab.addEventListener('pointerenter', warm, { once: true }); lab.addEventListener('touchstart', warm, { once: true, passive: true }); }
      r.addEventListener('focus', warm, { once: true });
    });
  }

  /* ── forms: audience, scope, town, details, ticket, inheritance ─────── */
  var AREA = window.SF_AREA || {};
  var hero = $('#quote-hero');
  var fin = $('#quote-final');

  function val(form, name) {
    var el = $$('[name="' + name + '"]', form).filter(function (i) {
      if (i.type === 'radio' || i.type === 'checkbox') return i.checked && !i.closest('[data-scope-for][hidden], [data-pro-only][hidden]');
      return true;
    })[0];
    return el ? String(el.value || '').trim() : '';
  }
  function townFor(zip) { return /^\d{5}$/.test(zip) ? (AREA[zip] || null) : null; }

  function updateTown(form) {
    var zip = val(form, 'zip');
    var help = $('[data-town-help]', form);
    if (!help) return;
    if (!help.dataset.base) help.dataset.base = help.textContent;
    var t = townFor(zip);
    if (t) { help.textContent = t + ' · we work here.'; help.classList.add('is-town'); }
    else { help.textContent = help.dataset.base; help.classList.remove('is-town'); }
  }

  function compose(form) {
    var d = $('[data-details]', form);
    if (!d) return '';
    var zip = val(form, 'zip');
    var t = townFor(zip);
    var parts = [];
    var aud = val(form, 'audience'); if (aud) parts.push('Audience: ' + aud);
    if (/^\d{5}$/.test(zip)) parts.push('Town: ' + (t || 'outside the listed towns (ZIP ' + zip + ')'));
    var scope = val(form, 'scope'); if (scope) parts.push('Scope: ' + scope);
    var when = val(form, 'timeline'); if (when) parts.push('Start: ' + when);
    var co = val(form, 'company'); if (co) parts.push('Company: ' + co);
    var reach = val(form, 'reach'); if (reach) parts.push('Best way to reach: ' + reach);
    var notes = val(form, 'notes'); if (notes) parts.push('Notes: ' + notes.replace(/\s+/g, ' '));
    d.value = parts.join(' | ').slice(0, 1000);
    return d.value;
  }

  function syncScope(form) {
    var svc = val(form, 'service');
    $$('[data-scope-for]', form).forEach(function (fs) {
      var on = fs.getAttribute('data-scope-for') === svc;
      fs.hidden = !on;
      if (!on) $$('input', fs).forEach(function (i) { i.checked = false; });
    });
    var filt = $('[data-filter-note]', form);
    var picked = $('[data-filter]:checked', form);
    if (filt) filt.hidden = !picked;
  }

  function syncAudience(form) {
    var pro = /Builder/.test(val(form, 'audience'));
    $$('[data-sub-home]', form).forEach(function (s) { s.textContent = pro ? s.getAttribute('data-sub-pro') : s.getAttribute('data-sub-home'); });
    $$('[data-pro-only]', form).forEach(function (el) { el.hidden = !pro; });
  }

  function ticket(form) {
    var box = $('[data-ticket]', form);
    if (!box) return;
    var svc = val(form, 'service');
    if (!svc) { box.hidden = true; return; }
    var bits = [SERVICES[svc] ? SERVICES[svc].short : svc];
    var t = townFor(val(form, 'zip')); if (t) bits.push(t);
    var scope = val(form, 'scope'); if (scope) bits.push(scope);
    var when = val(form, 'timeline'); if (when) bits.push(when);
    $('[data-ticket-text]', box).textContent = bits.join(' · ');
    var g = $('[data-ticket-g]', box);
    var tile = $('input[name="service"][value="' + svc + '"]', form);
    var svg = tile ? tile.closest('.tile').querySelector('.tile__g svg, .tile__g img') : null;
    if (g && svg) g.innerHTML = svg.outerHTML;
    box.hidden = false;
  }

  var finalTouched = false;
  function inherit() {
    if (!hero || !fin || finalTouched) return;
    var svc = val(hero, 'service'), zip = val(hero, 'zip'), when = val(hero, 'timeline');
    var s = $('[name="service"]', fin), z = $('[name="zip"]', fin), w = $('[name="timeline"]', fin);
    if (s && svc) s.value = svc;
    if (z && /^\d{5}$/.test(zip)) { z.value = zip; updateTown(fin); }
    if (w && when) w.value = when;
    compose(fin);
  }

  [hero, fin].forEach(function (form) {
    if (!form) return;
    var onAny = function (e) {
      if (form === fin && e && e.isTrusted) finalTouched = true;
      if (e && e.target && e.target.name === 'service' && form === hero) {
        syncScope(form);
        showStage(e.target.value, true);
      }
      if (e && e.target && e.target.name === 'audience') syncAudience(form);
      if (e && e.target && e.target.name === 'scope') syncScope(form);
      updateTown(form);
      compose(form);
      ticket(form);
      if (form === hero) inherit();
    };
    form.addEventListener('change', onAny);
    form.addEventListener('input', onAny);
    form.addEventListener('submit', function () { compose(form); }, true);
    form.addEventListener('click', function (e) { if (e.target.closest('[data-cs-next]')) { compose(form); ticket(form); } }, true);
    syncScope(form); syncAudience(form); compose(form);
  });

  // a service chosen anywhere opens the hero with that project and builds it
  function pick(svc, pro) {
    if (!hero) return;
    var r = $('input[name="service"][value="' + svc + '"]', hero);
    if (pro) { var a = $('input[name="audience"][value^="Builder"]', hero); if (a) { a.checked = true; a.dispatchEvent(new Event('change', { bubbles: true })); } }
    if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
    goTo('#top');
    setTimeout(function () { var z = $('[name="zip"]', hero); if (z && !reduce) z.focus({ preventScroll: true }); }, reduce ? 0 : 700);
  }
  $$('[data-pick]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); pick(a.getAttribute('data-pick')); }); });
  $$('[data-pro]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var x = $('input[name="audience"][value^="Builder"]', hero);
      if (x) { x.checked = true; x.dispatchEvent(new Event('change', { bubbles: true })); }
      goTo('#top');
    });
  });
  $$('a[href="#estimate"]:not([data-pick]):not([data-pro]), a[href="/#estimate"]').forEach(function (a) {
    a.addEventListener('click', function (e) { if (location.pathname === '/' || a.getAttribute('href') === '#estimate') { e.preventDefault(); goTo('#top'); } });
  });

  /* ── mobile bar: after the hero form, hidden while a form is on screen ─ */
  var mbar = $('[data-mbar]');
  if (mbar && 'IntersectionObserver' in window) {
    var visible = new Set();
    var heroForm = $('[data-hero-form]');
    var passed = false;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) visible.add(en.target); else visible.delete(en.target);
        if (en.target === heroForm && !en.isIntersecting && en.boundingClientRect.top < 0) passed = true;
      });
      mbar.classList.toggle('is-on', passed && visible.size === 0);
    }, { threshold: 0.15 });
    [heroForm, $('.final__form')].forEach(function (el) { if (el) io.observe(el); });
  }

  /* ── reveals and section gestures ────────────────────────────────────── */
  if (hasST && !reduce) {
    var g = window.gsap;
    $$('[data-reveal]').forEach(function (el) {
      g.from(el, { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    // H1 lines rise from their mask
    var h1 = $$('.hero__h1 .ln > span');
    if (h1.length) g.from(h1, { yPercent: 105, duration: 1.1, ease: 'power3.out', stagger: 0.12, delay: 0.1 });
    // ruler graduation runs with the scroll
    var rule = $('[data-rule]');
    if (rule) g.to(rule, { '--rx': '-288px', ease: 'none', scrollTrigger: { trigger: rule, start: 'top bottom', end: 'bottom top', scrub: true } });
    // profile gauge: pins drop until they touch the profile
    $$('.prof').forEach(function (svg) {
      g.from($$('.prof__pins line', svg), { attr: { y2: 14 }, duration: 0.7, ease: 'power2.out', stagger: 0.012, scrollTrigger: { trigger: svg, start: 'top 85%', once: true } });
    });
    // plat pins drop in, state by state
    var pins = $$('.plat__pin');
    if (pins.length) g.from(pins, { opacity: 0, y: -14, duration: 0.5, ease: 'power2.out', stagger: { each: 0.018 }, scrollTrigger: { trigger: '[data-plat]', start: 'top 75%', once: true } });
  }
  // behind the finish: layers light up one by one
  var sect = $('[data-sect] .sect');
  var layerSteps = $$('[data-layer-step]');
  if (sect && layerSteps.length) {
    if (reduce || !('IntersectionObserver' in window)) { sect.setAttribute('data-on', '4'); layerSteps.forEach(function (li) { li.classList.add('is-on'); }); }
    else {
      var lio = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (!en.isIntersecting) return;
          var n = Number(en.target.getAttribute('data-layer-step'));
          sect.setAttribute('data-on', String(n));
          layerSteps.forEach(function (li) { li.classList.toggle('is-on', Number(li.getAttribute('data-layer-step')) <= n); });
        });
      }, { rootMargin: '-45% 0px -45% 0px' });
      layerSteps.forEach(function (li) { lio.observe(li); });
    }
  }
  // process: the iPad screen follows the step
  var steps = $$('[data-step]');
  var scr = $$('[data-scr]');
  function setScreen(n) {
    scr.forEach(function (s) { s.classList.toggle('is-on', s.getAttribute('data-scr') === String(n)); });
    steps.forEach(function (li) { li.classList.toggle('is-on', li.getAttribute('data-step') === String(n)); });
    var svcEl = $('[data-ipad-svc]');
    var svc = hero ? val(hero, 'service') : '';
    if (svcEl) svcEl.textContent = SERVICES[svc] ? SERVICES[svc].name : 'Kitchen installation';
  }
  if (steps.length && 'IntersectionObserver' in window) {
    var pio = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) setScreen(en.target.getAttribute('data-step')); });
    }, { rootMargin: '-40% 0px -50% 0px' });
    steps.forEach(function (li) { pio.observe(li); });
    if (reduce) { steps.forEach(function (li) { li.classList.add('is-on'); }); }
  }
  // one-shot "is-in" for gestures done in CSS (gallery miters, warranty card, cut list)
  if ('IntersectionObserver' in window) {
    var once = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); once.unobserve(en.target); } });
    }, { threshold: 0.35 });
    $$('.case, [data-warranty], [data-cutlist]').forEach(function (el) { once.observe(el); });
  } else {
    $$('.case, [data-warranty], [data-cutlist]').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ── video: loads near the viewport, plays only on screen ─────────────── */
  var clip = $('[data-clip]');
  if (clip) {
    var v = $('video', clip), btn = $('[data-clip-toggle]', clip);
    var conn = navigator.connection || {};
    var lite = reduce || conn.saveData || /2g/.test(conn.effectiveType || '');
    var paused = lite;
    var setBtn = function () {
      btn.setAttribute('aria-pressed', String(paused));
      $('use', btn).setAttribute('href', paused ? '#i-play' : '#i-pause');
      $('.sr-only', btn).textContent = paused ? 'Play video' : 'Pause video';
    };
    setBtn();
    btn.addEventListener('click', function () {
      paused = !paused; setBtn();
      if (!v.src) { v.src = v.getAttribute('data-src'); }
      if (paused) v.pause(); else v.play().catch(function () {});
    });
    if (!lite && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting) { if (!v.src) v.src = v.getAttribute('data-src'); if (!paused) v.play().catch(function () {}); }
          else v.pause();
        });
      }, { rootMargin: '200px 0px', threshold: 0.2 }).observe(v);
    }
  }

  /* ── gallery (full screen) ───────────────────────────────────────────── */
  var items = $$('[data-gallery-item]');
  if (items.length && 'HTMLDialogElement' in window) {
    var dlg = doc.createElement('dialog');
    dlg.className = 'lb';
    dlg.setAttribute('aria-label', 'Project photos');
    dlg.innerHTML = '<button class="lb__close" type="button" aria-label="Close"><svg class="ic" aria-hidden="true"><use href="#i-close"></use></svg></button>' +
      '<figure class="lb__fig"><img alt=""></figure><div class="lb__bar"><button type="button" data-lb="-1" aria-label="Previous photo"><svg class="ic" aria-hidden="true"><use href="#i-arrow-left"></use></svg></button>' +
      '<span data-lb-cap></span><button type="button" data-lb="1" aria-label="Next photo"><svg class="ic" aria-hidden="true"><use href="#i-arrow-right"></use></svg></button></div>';
    doc.body.appendChild(dlg);
    var img = $('img', dlg), cap = $('[data-lb-cap]', dlg), at = 0, from = null, sx = null;
    var show = function (i) {
      at = (i + items.length) % items.length;
      var src = $('img', items[at]);
      var set = (src.getAttribute('srcset') || '').split(',').map(function (s) { return s.trim().split(' ')[0]; }).filter(Boolean);
      img.src = set[set.length - 1] || src.currentSrc || src.src;
      img.alt = src.alt;
      cap.textContent = (at + 1) + ' / ' + items.length + ' · ' + items[at].closest('figure').querySelector('figcaption').textContent;
    };
    items.forEach(function (b, i) {
      b.addEventListener('click', function () { from = b; show(i); dlg.showModal(); if (lenis) lenis.stop(); });
    });
    dlg.addEventListener('close', function () { if (lenis) lenis.start(); if (from) from.focus(); });
    $('.lb__close', dlg).addEventListener('click', function () { dlg.close(); });
    $$('[data-lb]', dlg).forEach(function (b) { b.addEventListener('click', function () { show(at + Number(b.getAttribute('data-lb'))); }); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.classList.contains('lb__fig')) dlg.close(); });
    dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') show(at + 1); if (e.key === 'ArrowLeft') show(at - 1); });
    dlg.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    dlg.addEventListener('pointerup', function (e) { if (sx !== null && Math.abs(e.clientX - sx) > 50) show(at + (e.clientX < sx ? 1 : -1)); sx = null; });
  }

  /* ── live open status (Mon–Sat 7 AM–5 PM, Massachusetts time) ─────────── */
  var st = $('[data-open-status]');
  if (st) {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
      var get = function (k) { var p = parts.filter(function (x) { return x.type === k; })[0]; return p ? p.value : ''; };
      var day = get('weekday'), h = Number(get('hour')) % 24, m = Number(get('minute'));
      var mins = h * 60 + m, open = day !== 'Sun' && mins >= 420 && mins < 1020;
      var txt;
      if (open) txt = 'Open now · until 5 PM in Massachusetts';
      else if (day === 'Sat' && mins >= 1020) txt = 'Closed now · opens Monday at 7 AM';
      else if (day === 'Sun') txt = 'Closed now · opens Monday at 7 AM';
      else if (mins < 420) txt = 'Closed now · opens at 7 AM';
      else txt = 'Closed now · opens tomorrow at 7 AM';
      $('[data-open-text]', st).textContent = txt;
      st.classList.toggle('is-open', open);
    } catch (e) { /* keeps the static hours */ }
  }
  var y = $('[data-year]'); if (y) y.textContent = String(new Date().getFullYear());

  /* ── V2 · services: the panel under the pointer (or focus) opens ─────── */
  var panels = $$('[data-svc-p]');
  function openPanel(p) { panels.forEach(function (x) { x.classList.toggle('is-open', x === p); }); }
  panels.forEach(function (p) {
    if (fine) p.addEventListener('pointerenter', function () { openPanel(p); });
    p.addEventListener('focusin', function () { openPanel(p); });
    p.addEventListener('click', function (e) { if (!e.target.closest('a')) openPanel(p); });
  });

  /* services (phone & tablet): the section pins and the four cards slide right to left as the page scrolls down,
     so every service passes in front of the visitor; snaps to a whole card. Desktop keeps the opening panels;
     reduced motion or no GSAP keeps the swipeable row. */
  var rack = $('[data-svc-rack]');
  if (rack && panels.length > 1 && hasST && !reduce && window.gsap.matchMedia) {
    window.gsap.matchMedia().add('(max-width: 1023px)', function () {
      var sec = $('#services');
      var first = panels[0], last = panels[panels.length - 1];
      var prog = doc.createElement('div');
      prog.className = 'svc__prog'; prog.setAttribute('aria-hidden', 'true');
      prog.innerHTML = '<span class="svc__count"><b>01</b> / ' + (panels.length < 10 ? '0' : '') + panels.length + '</span><span class="svc__bar"><i></i></span>';
      rack.after(prog);
      var cnt = $('b', prog), bar = $('.svc__bar i', prog);
      sec.classList.add('is-pinned');
      rack.scrollLeft = 0;
      var dist = function () {
        var pad = parseFloat(window.getComputedStyle(rack).paddingLeft) || 0;
        return Math.max(0, last.offsetLeft + last.offsetWidth - first.offsetLeft + 2 * pad - rack.clientWidth);
      };
      // where each card's left edge meets the gutter, as scroll progress (the last stop is the end)
      var stops = function () {
        var d = dist() || 1, step = panels[1].offsetLeft - panels[0].offsetLeft;
        return panels.map(function (x, k) { return Math.min(1, (k * step) / d); });
      };
      var nearest = function (v) { var pts = stops(), best = 0; pts.forEach(function (q, k) { if (Math.abs(q - v) < Math.abs(pts[best] - v)) best = k; }); return best; };
      // the section pins with its eyebrow just under the fixed header
      var lead = function () { return Math.max(0, (parseFloat(window.getComputedStyle(sec).paddingTop) || 0) - (hdr ? hdr.offsetHeight : 0) - 14); };
      var tw = window.gsap.to(rack, {
        x: function () { return -dist(); },
        ease: 'none',
        scrollTrigger: {
          trigger: sec,
          start: function () { return 'top+=' + lead() + ' top'; },
          end: function () { return '+=' + dist() * 1.15; },
          pin: true,
          scrub: 0.5,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          snap: { snapTo: function (v) { return stops()[nearest(v)]; }, inertia: false, duration: { min: 0.2, max: 0.5 }, delay: 0.12, ease: 'power1.inOut' },
          onUpdate: function (st) {
            bar.style.transform = 'scaleX(' + st.progress.toFixed(4) + ')';
            var k = nearest(st.progress) + 1;
            cnt.textContent = (k < 10 ? '0' : '') + k;
          }
        }
      });
      return function () { tw.scrollTrigger && tw.scrollTrigger.kill(); tw.kill(); window.gsap.set(rack, { clearProps: 'transform' }); prog.remove(); sec.classList.remove('is-pinned'); };
    });
  }

  /* ── V2 · behind the finish: the shop elevation builds when it comes into view ── */
  var bWrap = $('#behind [data-stage]');
  var bStages = {};
  var bCur = 'kitchen-installation';
  var bXray = bWrap ? $('[data-xray]', bWrap) : null;
  if (bWrap && typeof window.FinishStage !== 'undefined') {
    $$('.fs-svg', bWrap).forEach(function (svg) { bStages[svg.getAttribute('data-service')] = new window.FinishStage(svg); });
  }
  function bShow(svc) {
    if (!bWrap || !SERVICES[svc]) return;
    bCur = svc;
    $$('.fs-svg', bWrap).forEach(function (svg) { svg.toggleAttribute('hidden', svg.getAttribute('data-service') !== svc); });
    $$('[data-btab]', bWrap).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-btab') === svc)); });
    var n = $('[data-bstage-name]', bWrap); if (n) n.textContent = SERVICES[svc].name;
    if (bXray) bXray.setAttribute('aria-pressed', 'false');
    Object.keys(bStages).forEach(function (k) { bStages[k].setXray(false); });
    if (bStages[svc]) bStages[svc].play();
  }
  if (bWrap) {
    $$('[data-btab]', bWrap).forEach(function (b) { b.addEventListener('click', function () { bShow(b.getAttribute('data-btab')); }); });
    if (bXray) bXray.addEventListener('click', function () {
      var on = bXray.getAttribute('aria-pressed') !== 'true';
      bXray.setAttribute('aria-pressed', String(on));
      if (bStages[bCur]) bStages[bCur].setXray(on);
    });
    if ('IntersectionObserver' in window && !reduce) {
      Object.keys(bStages).forEach(function (k) { if (k !== bCur) bStages[k].finalState(); });
      var bio = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { bio.disconnect(); if (bStages[bCur]) bStages[bCur].play(); } });
      }, { threshold: 0.4 });
      bio.observe($('.sheet__draw', bWrap));
    } else Object.keys(bStages).forEach(function (k) { bStages[k].finalState(); });
  }

  /* ── V2 · proof: stars light up, one quote at a time, plaques screwed on ── */
  var qWrap = $('[data-quotes]');
  if (qWrap) {
    var qs = $$('blockquote', qWrap), qb = $$('[data-q]', qWrap), qi = 0, qt = null, qHold = false;
    var qSet = function (i) {
      qi = (i + qs.length) % qs.length;
      qs.forEach(function (b, k) { b.classList.toggle('is-on', k === qi); });
      qb.forEach(function (b, k) { b.setAttribute('aria-pressed', String(k === qi)); });
      // restart the progress bar
      qWrap.classList.remove('is-auto'); void qWrap.offsetWidth; if (!reduce && !qHold) qWrap.classList.add('is-auto');
    };
    var qRun = function () { clearInterval(qt); if (reduce || qHold) return; qt = setInterval(function () { qSet(qi + 1); }, 6500); };
    qb.forEach(function (b, k) { b.addEventListener('click', function () { qHold = true; clearInterval(qt); qWrap.classList.remove('is-auto'); qSet(k); }); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { qSet(qi); qRun(); } else { clearInterval(qt); qWrap.classList.remove('is-auto'); } });
      }, { threshold: 0.4 }).observe(qWrap);
    }
  }
  if ('IntersectionObserver' in window) {
    var once2 = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); once2.unobserve(en.target); } });
    }, { threshold: 0.3 });
    $$('[data-stars], [data-plaque]').forEach(function (el) { once2.observe(el); });
  } else $$('[data-stars], [data-plaque]').forEach(function (el) { el.classList.add('is-in'); });

  /* ── V2 · area: a rotary laser set up in Fitchburg turns once and lights the towns ── */
  var nm = $('[data-nm]');
  if (nm) {
    var nmPts = $$('.nm__t', nm);
    var sweep = $('.nm__sweep', nm);
    var bx = Number(nm.getAttribute('data-bx')), by = Number(nm.getAttribute('data-by'));
    var lightAll = function () { nmPts.forEach(function (t) { t.classList.add('is-lit'); }); nm.classList.add('is-done'); };
    var spin = function () {
      if (reduce || !hasGsap) { lightAll(); return; }
      var g = window.gsap, st = { a: -90 };
      var rings = $$('.nm__ring', nm);
      g.from(rings, { attr: { r: 0 }, duration: 1.1, ease: 'power2.out', stagger: 0.12 });
      g.set(sweep, { opacity: 1 });
      g.to(st, {
        a: 270, duration: 2.8, ease: 'sine.inOut', delay: 0.5,
        onUpdate: function () {
          sweep.setAttribute('transform', 'translate(' + bx + ' ' + by + ') rotate(' + st.a.toFixed(2) + ')');
          nmPts.forEach(function (t) {
            if (t.classList.contains('is-lit')) return;
            var ang = Number(t.getAttribute('data-ang'));
            var passed = st.a >= 270 || (st.a + 90 >= ((ang + 90) % 360));
            if (passed) { t.classList.add('is-lit', 'is-flash'); setTimeout(function () { t.classList.remove('is-flash'); }, 260); }
          });
        },
        onComplete: function () { g.to(sweep, { opacity: 0, duration: 0.6 }); lightAll(); }
      });
    };
    if ('IntersectionObserver' in window) {
      var nio = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { nio.disconnect(); spin(); } });
      }, { threshold: 0.35 });
      nio.observe(nm);
    } else lightAll();

    // ZIP check: the route from Fitchburg draws to the visitor's town
    var zc = $('[data-zipcheck]');
    var route = $('.nm__route', nm);
    if (zc) {
      var zIn = $('input', zc), zOut = $('[data-zipcheck-out]', zc), zGo = $('[data-zipcheck-go]', zc);
      var zBase = zOut.innerHTML;
      var check = function () {
        var zip = String(zIn.value || '').replace(/\D/g, '').slice(0, 5);
        nmPts.forEach(function (t) { t.classList.remove('is-pick'); });
        route.setAttribute('d', '');
        if (!/^\d{5}$/.test(zip)) { zOut.innerHTML = zip ? 'Enter the 5-digit ZIP code.' : zBase; zGo.hidden = true; return; }
        var town = townFor(zip);
        var name = town ? town.split(',')[0] : null;
        var pt = name ? nmPts.filter(function (t) { return t.getAttribute('data-town') === name && (town.indexOf(', NH') < 0 || t.getAttribute('data-st') === 'NH') && (town.indexOf(', NH') >= 0 || t.getAttribute('data-st') === 'MA'); })[0] : null;
        if (town && pt) {
          pt.classList.add('is-pick', 'is-lit');
          var tr = pt.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/);
          var tx = Number(tr[1]), ty = Number(tr[2]);
          var mx = (bx + tx) / 2, my = (by + ty) / 2 - Math.hypot(tx - bx, ty - by) * 0.18;
          route.setAttribute('d', 'M' + bx + ' ' + by + 'Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + tx + ' ' + ty);
          if (!reduce && route.getTotalLength) {
            var L = route.getTotalLength();
            route.style.strokeDasharray = L; route.style.strokeDashoffset = L;
            route.getBoundingClientRect();
            route.style.transition = 'stroke-dashoffset 1s cubic-bezier(.2,.7,.1,1)';
            route.style.strokeDashoffset = '0';
          }
          zOut.innerHTML = '<b>' + town + '</b> · ' + pt.getAttribute('data-mi') + ' miles from Fitchburg. We work here: a site visit can happen the same day you reach us or the&nbsp;next.';
        } else {
          zOut.innerHTML = 'ZIP ' + zip + " isn't on our list. Send the request anyway, and we'll tell you plainly whether we can take it&nbsp;on.";
        }
        zGo.hidden = false;
        zGo.setAttribute('data-zip', zip);
      };
      zc.addEventListener('submit', function (e) { e.preventDefault(); check(); });
      zIn.addEventListener('input', function () { if (/^\d{5}$/.test(zIn.value)) check(); });
      zGo.addEventListener('click', function (e) {
        e.preventDefault();
        var z = hero ? $('[name="zip"]', hero) : null;
        if (z) { z.value = zGo.getAttribute('data-zip') || ''; z.dispatchEvent(new Event('input', { bubbles: true })); }
        goTo('#top');
      });
    }
  }

  /* ── text links prefilled with the chosen project ────────────────────── */
  $$('[data-sms]').forEach(function (a) {
    a.addEventListener('click', function () {
      var svc = hero ? val(hero, 'service') : '';
      if (svc && SERVICES[svc]) a.href = 'sms:+19785965623?body=' + encodeURIComponent("Hi Signature Finish Carpentry, I'd like a site visit for " + SERVICES[svc].short.toLowerCase() + '.');
    });
  });
})();
