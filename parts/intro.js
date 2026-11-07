(function () {
  var intro   = document.getElementById('wam-intro');
  var topbar  = document.getElementById('wam-topbar');
  var enterBtn= document.getElementById('wam-enter');
  var skipBtn = document.getElementById('wam-skip');
  var replay  = document.getElementById('wam-replay');
  if (!intro) return;

  var root   = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var READY_MS = 7000;       // when the "Enter" gate becomes active
  var EXIT_MS  = reduce ? 360 : 1150;
  var readyTimer = null;

  root.classList.add('wam-intro-active');

  // --- atmospheric embers ---
  (function embers() {
    if (reduce) return;
    var box = intro.querySelector('.wam-embers');
    if (!box) return;
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

  function startTimeline() {
    intro.classList.remove('wam-exit', 'wam-ready', 'wam-play');
    void intro.offsetWidth;                 // force reflow so re-adding replays
    requestAnimationFrame(function () {
      intro.classList.add('wam-play');
      clearTimeout(readyTimer);
      readyTimer = setTimeout(function () { intro.classList.add('wam-ready'); },
                              reduce ? 0 : READY_MS);
    });
  }

  function enter() {
    if (intro.classList.contains('wam-exit')) return;
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
  skipBtn  && skipBtn.addEventListener('click',  function (e) { e.stopPropagation(); intro.classList.add('wam-ready'); enter(); });

  // tap anywhere once the sequence has finished
  intro.addEventListener('click', function (ev) {
    if (!intro.classList.contains('wam-ready')) return;
    if (ev.target.closest('#wam-skip') || ev.target.closest('#wam-enter')) return;
    enter();
  });

  startTimeline();
})();
