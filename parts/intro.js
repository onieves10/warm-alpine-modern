(function () {
  var intro  = document.getElementById('wam-intro');
  var topbar = document.getElementById('wam-topbar');
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

  var root   = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SCENE_MS = 3000;                 // 5 scenes x 3s = 15s fly-through
  var EXIT_MS  = reduce ? 360 : 1150;
  var timers = [];

  // captions straight from the mood board's own copy
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

  // wire each scene's background to the matching render already in the board
  function loadBackgrounds() {
    var map = {};
    document.querySelectorAll('img[data-img]').forEach(function (im) {
      var src = im.currentSrc || im.src;
      if (src) map[im.getAttribute('data-img')] = src;
    });
    var missing = 0;
    scenes.forEach(function (s) {
      var id = s.getAttribute('data-img');
      var layer = s.querySelector('.wam-scene__img');
      if (map[id]) layer.style.backgroundImage = 'url("' + map[id] + '")';
      else missing++;
    });
    return missing;
  }

  function activate(i) {
    scenes.forEach(function (s, idx) { s.classList.toggle('is-active', idx === i); });
    dots.forEach(function (d, idx) { d.classList.toggle('is-on', idx === i); });
    if (flash) { flash.classList.remove('is-bloom'); void flash.offsetWidth; flash.classList.add('is-bloom'); }
    capWord.textContent = CAPTIONS[i].word;
    capSub.textContent  = CAPTIONS[i].sub;
    cap.classList.remove('is-in'); void cap.offsetWidth; cap.classList.add('is-in');
  }

  function outro() {
    intro.classList.add('wam-outro', 'wam-ready');
  }

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function startTimeline() {
    clearTimers();
    intro.classList.remove('wam-exit', 'wam-ready', 'wam-outro');
    scenes.forEach(function (s) { s.classList.remove('is-active'); });
    cap.classList.remove('is-in');
    void intro.offsetWidth;

    if (loadBackgrounds() > 0) setTimeout(loadBackgrounds, 250); // retry if board images not yet assigned

    if (reduce) { scenes[0].classList.add('is-active'); outro(); return; }

    activate(0);
    for (var i = 1; i < scenes.length; i++) {
      (function (idx) { timers.push(setTimeout(function () { activate(idx); }, idx * SCENE_MS)); })(i);
    }
    timers.push(setTimeout(outro, scenes.length * SCENE_MS));
  }

  function enter() {
    if (intro.classList.contains('wam-exit')) return;
    clearTimers();
    intro.classList.add('wam-exit');
    topbar.setAttribute('aria-hidden', 'false');
    root.classList.add('wam-entered');
    setTimeout(function () {
      root.classList.remove('wam-intro-active');
      intro.style.display = 'none';
      window.scrollTo(0, 0);
      topbar.classList.add('wam-show');
    }, EXIT_MS);
  }

  function replayIntro() {
    topbar.classList.remove('wam-show');
    topbar.setAttribute('aria-hidden', 'true');
    root.classList.remove('wam-entered');
    root.classList.add('wam-intro-active');
    intro.style.display = '';
    window.scrollTo(0, 0);
    startTimeline();
  }

  enterBtn && enterBtn.addEventListener('click', function (e) { e.stopPropagation(); enter(); });
  replay   && replay.addEventListener('click',  function (e) { e.stopPropagation(); replayIntro(); });
  skipBtn  && skipBtn.addEventListener('click',  function (e) { e.stopPropagation(); enter(); });

  // once the sequence reaches the outro, a tap anywhere enters
  intro.addEventListener('click', function (ev) {
    if (!intro.classList.contains('wam-ready')) return;
    if (ev.target.closest('#wam-skip') || ev.target.closest('#wam-enter')) return;
    enter();
  });

  startTimeline();
})();
