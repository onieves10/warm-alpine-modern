(function () {
  var intro  = document.getElementById('wam-intro');
  var topbar = document.getElementById('wam-topbar');
  var theater= document.getElementById('wam-theater');
  if (!intro) return;

  var enterBtn = document.getElementById('wam-enter');
  var skipBtn  = document.getElementById('wam-skip');
  var replay   = document.getElementById('wam-replay');
  var scenes   = [].slice.call(intro.querySelectorAll('.wam-scene'));
  var cap      = intro.querySelector('.wam-cap');
  var capWord  = intro.querySelector('.wam-cap__word');
  var capSub   = intro.querySelector('.wam-cap__sub');
  var flash    = intro.querySelector('.wam-flash');
  var dots     = [].slice.call(intro.querySelectorAll('.wam-dots span'));
  var canvas   = document.getElementById('wam-cosmos-canvas');
  var descent  = intro.querySelector('.wam-descent');
  var place    = intro.querySelector('.wam-place');
  var white    = intro.querySelector('.wam-white');

  var root   = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SCENE_MS = 3000;
  var EXIT_MS  = reduce ? 360 : 1150;
  var timers = [];
  var cosmos = null;

  var CAPTIONS = [
    { word: 'Warm.',      sub: 'The living room, at dusk' },
    { word: 'Sleek.',     sub: 'Whites & marble · brass warmth' },
    { word: 'Collected.', sub: 'A lit wood bookshelf wall' },
    { word: 'Glowing.',   sub: 'Movie nights · a glowing back bar' },
    { word: 'Alpine.',    sub: 'Lodge warmth, modernized' }
  ];

  root.classList.add('wam-intro-active');

  // embers
  (function () {
    if (reduce) return;
    var box = intro.querySelector('.wam-embers');
    for (var i = 0; i < 16; i++) {
      var e = document.createElement('span');
      e.className = 'wam-ember';
      e.style.left = (Math.random() * 100).toFixed(2) + '%';
      e.style.setProperty('--d', (6 + Math.random() * 7).toFixed(2) + 's');
      e.style.setProperty('--delay', (Math.random() * 6).toFixed(2) + 's');
      e.style.setProperty('--x', Math.round(Math.random() * 60 - 30) + 'px');
      e.style.setProperty('--s', (0.5 + Math.random() * 0.9).toFixed(2));
      box.appendChild(e);
    }
  })();

  function loadBackgrounds() {
    var map = {};
    document.querySelectorAll('img[data-img]').forEach(function (im) {
      var src = im.currentSrc || im.src; if (src) map[im.getAttribute('data-img')] = src;
    });
    var missing = 0;
    scenes.forEach(function (s) {
      var id = s.getAttribute('data-img'); var layer = s.querySelector('.wam-scene__img');
      if (map[id]) layer.style.backgroundImage = 'url("' + map[id] + '")'; else missing++;
    });
    return missing;
  }

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  // ---------- MOOD fly-through ----------
  function activate(i) {
    scenes.forEach(function (s, idx) { s.classList.toggle('is-active', idx === i); });
    dots.forEach(function (d, idx) { d.classList.toggle('is-on', idx === i); });
    if (flash) { flash.classList.remove('is-bloom'); void flash.offsetWidth; flash.classList.add('is-bloom'); }
    capWord.textContent = CAPTIONS[i].word; capSub.textContent = CAPTIONS[i].sub;
    cap.classList.remove('is-in'); void cap.offsetWidth; cap.classList.add('is-in');
  }
  function outro() { intro.classList.add('wam-outro', 'wam-ready'); }

  function startMood() {
    intro.classList.add('wam-mood');
    if (canvas) canvas.style.display = 'none';
    if (loadBackgrounds() > 0) setTimeout(loadBackgrounds, 250);
    if (reduce) { scenes[0].classList.add('is-active'); outro(); return; }
    activate(0);
    for (var i = 1; i < scenes.length; i++) {
      (function (idx) { timers.push(setTimeout(function () { activate(idx); }, idx * SCENE_MS)); })(i);
    }
    timers.push(setTimeout(outro, scenes.length * SCENE_MS));
  }

  // ---------- COSMIC prologue ----------
  function startPrologue() {
    clearTimers();
    intro.classList.remove('wam-exit', 'wam-ready', 'wam-outro', 'wam-mood');
    scenes.forEach(function (s) { s.classList.remove('is-active'); });
    cap.classList.remove('is-in');
    if (descent) { descent.classList.remove('is-on'); }
    if (place) place.classList.remove('is-in');
    if (white) white.classList.remove('is-in', 'is-bloom');
    if (canvas) { canvas.style.display = 'block'; canvas.style.opacity = '1'; canvas.style.transition = 'none'; }
    void intro.offsetWidth;

    loadBackgrounds(); // warm up mood renders behind

    var canUseCosmos = !reduce && window.WAMCosmos && window.WAMCosmos.supported && window.WAMCosmos.supported();
    if (!canUseCosmos) { startMood(); return; }

    try {
      cosmos = window.WAMCosmos.play({
        canvas: canvas, descentEl: descent, placeEl: place, whiteEl: white,
        assetsBase: 'assets/', onComplete: startMood
      });
    } catch (e) { startMood(); }
    // safety net in case WebGL stalls
    timers.push(setTimeout(function () { if (!intro.classList.contains('wam-mood')) { if (cosmos) cosmos.skip(); startMood(); } }, 16000));
  }

  // ---------- THEATER -> board ----------
  function revealBoard() {
    root.classList.remove('wam-intro-active');
    intro.style.display = 'none';
    if (theater) { theater.style.display = 'none'; }
    window.scrollTo(0, 0);
    topbar.classList.add('wam-show');
  }

  function enterViaTheater() {
    topbar.setAttribute('aria-hidden', 'false');
    theater.classList.add('is-in');
    // once the theater covers the screen, hide the intro so the board sits right behind the curtains
    timers.push(setTimeout(function () {
      intro.style.display = 'none';
      root.classList.add('wam-entered');
    }, 850));
    // hold on the marquee, then part the curtains
    timers.push(setTimeout(function () { theater.classList.add('is-open'); }, 2450));
    timers.push(setTimeout(function () { topbar.classList.add('wam-show'); }, 3050));
    // curtains finished -> clear the theater, enable scrolling
    timers.push(setTimeout(function () { theater.classList.add('is-out'); }, 4650));
    timers.push(setTimeout(function () {
      root.classList.remove('wam-intro-active');
      theater.style.display = 'none'; window.scrollTo(0, 0);
    }, 5350));
  }

  function enterQuick() {
    intro.classList.add('wam-exit');
    topbar.setAttribute('aria-hidden', 'false');
    root.classList.add('wam-entered');
    timers.push(setTimeout(revealBoard, EXIT_MS));
  }

  var entering = false;
  function enter(withTheater) {
    if (entering) return; entering = true;
    clearTimers();
    if (cosmos) { try { cosmos.skip(); } catch (e) {} cosmos = null; }
    if (withTheater && !reduce && theater) enterViaTheater();
    else enterQuick();
  }

  function replayIntro() {
    entering = false;
    clearTimers();
    if (theater) { theater.classList.remove('is-in', 'is-open', 'is-out'); theater.style.display = ''; theater.setAttribute('aria-hidden', 'true'); }
    topbar.classList.remove('wam-show'); topbar.setAttribute('aria-hidden', 'true');
    root.classList.remove('wam-entered');
    root.classList.add('wam-intro-active');
    intro.style.display = '';
    window.scrollTo(0, 0);
    startPrologue();
  }

  enterBtn && enterBtn.addEventListener('click', function (e) { e.stopPropagation(); enter(true); });
  replay   && replay.addEventListener('click',  function (e) { e.stopPropagation(); replayIntro(); });
  skipBtn  && skipBtn.addEventListener('click',  function (e) { e.stopPropagation(); enter(false); });

  intro.addEventListener('click', function (ev) {
    if (!intro.classList.contains('wam-ready')) return;
    if (ev.target.closest('#wam-skip') || ev.target.closest('#wam-enter')) return;
    enter(true);
  });

  startPrologue();
})();
