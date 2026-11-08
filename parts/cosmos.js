/* ============================================================
   WAMCosmos — real-time 3D flight: stars -> 3D Earth -> atmosphere,
   then hands off to the DOM "descent" (Rockies -> Lakewood).
   Requires global THREE (loaded from CDN before this file).
   ============================================================ */
(function () {
  window.WAMCosmos = {
    supported: function () { return !!window.THREE && hasWebGL(); },
    play: play
  };

  function hasWebGL() {
    try { var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); }
    catch (e) { return false; }
  }

  // timeline (seconds)
  var T_WARP_PEAK = 2.4;
  var T_EARTH_FILL = 6.0;     // earth fills the frame
  var T_WHITE_IN  = 6.1;
  var T_DESCENT   = 6.7;      // DOM descent begins (canvas fades under whiteout)
  var T_LABEL     = 10.2;
  var T_BLOOM     = 11.4;
  var T_DONE      = 12.1;

  function play(opts) {
    var THREE = window.THREE;
    var canvas   = opts.canvas;
    var descent  = opts.descentEl;
    var place    = opts.placeEl;
    var white    = opts.whiteEl;
    var onDone   = opts.onComplete || function () {};
    var base     = opts.assetsBase || 'assets/';

    var W = window.innerWidth, H = window.innerHeight;
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H, false);

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060b);
    var camera = new THREE.PerspectiveCamera(62, W / H, 0.1, 4000);
    camera.position.set(0, 0, 0);

    // ---- stars ----
    var STAR_N = 5200, spread = 420, depth = 1100;
    var pos = new Float32Array(STAR_N * 3);
    for (var i = 0; i < STAR_N; i++) {
      pos[i*3]   = (Math.random()*2 - 1) * spread;
      pos[i*3+1] = (Math.random()*2 - 1) * spread;
      pos[i*3+2] = -Math.random() * depth;
    }
    var starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 2.2, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false
    }));
    scene.add(stars);

    var loader = new THREE.TextureLoader();

    // ---- Milky Way skybox (surrounds the camera, no seams) ----
    var sky = null;
    loader.load(base + 'galaxy.jpg', function (tex) {
      if (tex.colorSpace !== undefined && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      sky = new THREE.Mesh(
        new THREE.SphereGeometry(2600, 40, 40),
        new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false })
      );
      scene.add(sky);
    });

    // ---- Earth + atmosphere (starts as a distant dot) ----
    var earthGroup = new THREE.Group();
    earthGroup.position.set(0, 0, -1500);
    scene.add(earthGroup);
    var EARTH_R = 62;
    var earth = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_R, 64, 64),
      new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, color: 0x889099 })
    );
    earthGroup.add(earth);
    loader.load(base + 'earthmap.jpg', function (tex) {
      if (tex.colorSpace !== undefined && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
      earth.material.map = tex; earth.material.color.set(0xffffff); earth.material.needsUpdate = true;
    });
    earth.rotation.y = 0.0;   // North America faces the camera at arrival (tuned)
    earth.rotation.x = 0.18;

    var atm = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_R * 1.14, 48, 48),
      new THREE.ShaderMaterial({
        uniforms: { glowColor: { value: new THREE.Color(0x6cb7ff) }, c: { value: 0.62 }, p: { value: 4.2 } },
        vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 glowColor; uniform float c; uniform float p; varying vec3 vN; void main(){ float i = pow(clamp(c - dot(vN, vec3(0.0,0.0,1.0)), 0.0, 1.0), p); gl_FragColor = vec4(glowColor, 1.0) * i; }',
        side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false
      })
    );
    earthGroup.add(atm);

    scene.add(new THREE.AmbientLight(0x2a3b55, 0.45));
    var sun = new THREE.DirectionalLight(0xfff0d8, 1.5);
    sun.position.set(-1, 0.35, 0.8);
    scene.add(sun);

    // ---- loop ----
    var started = false, t0 = 0, raf = 0, done = false;
    var fired = { white: false, descent: false, label: false, bloom: false, done: false };

    function lerp(a, b, p) { return a + (b - a) * p; }
    function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function smooth(x) { x = clamp01(x); return x * x * (3 - 2 * x); }

    function speedAt(t) {
      if (t < T_WARP_PEAK) return lerp(3, 30, smooth(t / T_WARP_PEAK));
      return lerp(30, 7, smooth((t - T_WARP_PEAK) / 3.2));
    }

    function frame(now) {
      if (!started) { t0 = now; started = true; }
      var t = (now - t0) / 1000;
      var dt = Math.min(0.05, (now - (frame._last || now)) / 1000); frame._last = now;

      // stars fly past
      var sp = speedAt(t), p = stars.geometry.attributes.position.array;
      for (var i = 0; i < STAR_N; i++) {
        p[i*3+2] += sp * dt * 60;
        if (p[i*3+2] > 6) { p[i*3+2] -= depth; p[i*3] = (Math.random()*2-1)*spread; p[i*3+1] = (Math.random()*2-1)*spread; }
      }
      stars.geometry.attributes.position.needsUpdate = true;

      // slow skybox drift for subtle parallax
      if (sky) sky.rotation.y += dt * 0.006;

      // earth grows from a distant dot and fills the frame
      var ep = smooth((t - 1.4) / (T_EARTH_FILL - 1.4));
      earthGroup.position.z = lerp(-1500, -108, ep);
      if (t > T_EARTH_FILL) earthGroup.position.z = lerp(-108, -66, smooth((t - T_EARTH_FILL) / 0.9)); // push into surface
      earth.rotation.y += dt * 0.04;
      stars.material.opacity = lerp(0.95, 0.15, smooth((t - 3.5) / 2.5));

      renderer.render(scene, camera);

      // timeline hooks
      if (!fired.white && t >= T_WHITE_IN) { fired.white = true; if (white) white.classList.add('is-in'); }
      if (!fired.descent && t >= T_DESCENT) {
        fired.descent = true;
        if (descent) descent.classList.add('is-on');
        canvas.style.transition = 'opacity .9s ease'; canvas.style.opacity = '0';
        if (white) setTimeout(function () { white.classList.remove('is-in'); }, 500); // clear whiteout to reveal dive
      }
      if (!fired.label && t >= T_LABEL) { fired.label = true; if (place) place.classList.add('is-in'); }
      if (!fired.bloom && t >= T_BLOOM) { fired.bloom = true; if (white) { white.classList.add('is-bloom'); } }
      if (!fired.done && t >= T_DONE) { fired.done = true; done = true; onDone(); }

      if (done) { cancelAnimationFrame(raf); cleanup(); return; }
      raf = requestAnimationFrame(frame);
    }

    function cleanup() {
      // free GPU resources shortly after handoff
      setTimeout(function () {
        try {
          starGeo.dispose(); stars.material.dispose();
          earth.geometry.dispose(); earth.material.dispose();
          atm.geometry.dispose(); atm.material.dispose();
          if (sky) { sky.geometry.dispose(); sky.material.dispose(); }
          renderer.dispose();
        } catch (e) {}
      }, 1200);
    }

    function onResize() {
      W = window.innerWidth; H = window.innerHeight;
      camera.aspect = W / H; camera.updateProjectionMatrix();
      renderer.setSize(W, H, false);
    }
    window.addEventListener('resize', onResize);

    raf = requestAnimationFrame(frame);

    return {
      skip: function () { done = true; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); cleanup(); },
      destroy: function () { done = true; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); cleanup(); }
    };
  }
})();
