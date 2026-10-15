(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  $('#copyright-year').textContent = new Date().getFullYear();

  /* ---------- nav / menu ---------- */
  const nav = $('#nav'), burger = $('#burger'), menu = $('#menu');
  const setMenu = open => {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? '關閉選單' : '展開選單');
    menu.hidden = !open;
    document.documentElement.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); } });

  /* ---------- smooth scroll ---------- */
  gsap.registerPlugin(ScrollTrigger);
  let lenis = null;
  if (!reduce) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  let lastY = 0;
  const onScroll = y => {
    nav.classList.toggle('solid', y > 40);
    nav.classList.toggle('hide', y > lastY && y > 300 && menu.hidden);
    lastY = y;
  };
  addEventListener('scroll', () => onScroll(scrollY), { passive: true });
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(t, { duration: 1.6, easing: x => 1 - Math.pow(1 - x, 4) }) : t.scrollIntoView();
    history.replaceState(null, '', a.getAttribute('href'));
  }));
  $$('.nav-links a[href^="#"]').forEach(a => {
    const t = $(a.getAttribute('href'));
    ScrollTrigger.create({ trigger: t, start: 'top 55%', end: 'bottom 55%', onToggle: s => a.classList.toggle('is-active', s.isActive) });
  });

  /* ---------- cursor ---------- */
  const cur = $('.cursor');
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
    cur.style.opacity = 0;
    const xTo = gsap.quickTo(cur, 'x', { duration: .35, ease: 'power3' });
    const yTo = gsap.quickTo(cur, 'y', { duration: .35, ease: 'power3' });
    addEventListener('mousemove', e => { cur.style.opacity = 1; xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    document.addEventListener('mouseover', e => cur.classList.toggle('on', !!e.target.closest('a, button, [data-cursor]')));
  }

  /* ---------- hero WebGL ---------- */
  const hero = $('#top'), canvas = $('#gl');
  const state = { h: 0, hovT: 0, reveal: 0, scroll: 0, mx: .5, my: .5, tx: .5, ty: .5 };
  let draw = () => {}, glOK = false;

  const VS = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  const FS = `precision highp float;varying vec2 v;
uniform sampler2D t;uniform vec2 res,img,m;uniform float time,reveal,scroll,hov;
vec2 cover(vec2 u){float ra=res.x/res.y,ia=img.x/img.y;vec2 s=ra>ia?vec2(1.,ia/ra):vec2(ra/ia,1.);return (u-.5)*s+.5;}
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec2 uv=v; vec2 q=uv;
  float zoom=mix(1.32,1.07,reveal)+scroll*.12;
  q=(q-.5)/zoom+.5;
  q+=(m-.5)*vec2(-.028,-.018);
  vec2 d=uv-m; d.x*=res.x/res.y; float r=length(d);
  float lens=exp(-r*r*14.)*hov;
  q-=(uv-m)*lens*.05;
  q+=vec2(sin(uv.y*7.+time*.5),cos(uv.x*6.+time*.4))*.0012*(1.-reveal*.3);
  float ca=.0006+lens*.004;
  vec2 c=cover(q);
  vec3 col=vec3(texture2D(t,cover(q+vec2(ca,0.))).r,texture2D(t,c).g,texture2D(t,cover(q-vec2(ca,0.))).b);
  float lum=dot(col,vec3(.3,.55,.15));
  float sw=exp(-pow((uv.x-fract(time*.045+.1))*5.,2.));
  col+=vec3(.05,.55,.68)*sw*lum*.55;
  col+=vec3(.03,.28,.35)*lens*lum*.5;
  col*=1.-.55*smoothstep(.35,1.05,length((uv-.5)*vec2(1.,.9)));
  col+=(h(uv*res+time)-.5)*.035;
  col*=smoothstep(0.,1.,reveal*1.15);
  gl_FragColor=vec4(col,1.);
}`;

  function initGL() {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) throw 0;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr); gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = n => gl.getUniformLocation(pr, n);
    const u = { res: U('res'), img: U('img'), m: U('m'), time: U('time'), reveal: U('reveal'), scroll: U('scroll'), hov: U('hov') };
    const tex = gl.createTexture();
    const im = new Image();
    return new Promise((ok, no) => {
      im.onerror = no;
      im.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
        [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]].forEach(([k, v]) => gl.texParameteri(gl.TEXTURE_2D, k, v));
        gl.uniform2f(u.img, im.naturalWidth, im.naturalHeight);
        const size = () => {
          const dpr = Math.min(devicePixelRatio || 1, 1.75);
          canvas.width = Math.round(hero.clientWidth * dpr); canvas.height = Math.round(hero.clientHeight * dpr);
          gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(u.res, canvas.width, canvas.height);
        };
        size(); addEventListener('resize', size);
        draw = time => {
          state.mx += (state.tx - state.mx) * .06; state.my += (state.ty - state.my) * .06;
          gl.uniform2f(u.m, state.mx, state.my); gl.uniform1f(u.time, time);
          gl.uniform1f(u.reveal, state.reveal); gl.uniform1f(u.scroll, state.scroll);
          state.h += (state.hovT - state.h) * .05; gl.uniform1f(u.hov, state.h);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        };
        ok();
      };
      im.src = 'images/hero-bg.webp';
    });
  }

  let heroVisible = true;
  new IntersectionObserver(([e]) => heroVisible = e.isIntersecting).observe(hero);
  hero.addEventListener('pointerleave', () => state.hovT = 0);
  hero.addEventListener('pointermove', e => { state.hovT = e.pointerType === 'mouse' ? 1 : 0; const r = hero.getBoundingClientRect(); state.tx = (e.clientX - r.left) / r.width; state.ty = 1 - (e.clientY - r.top) / r.height; });
  ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', scrub: true, onUpdate: s => state.scroll = s.progress });
  const t0 = performance.now();
  gsap.ticker.add(() => {
    if (!glOK || !heroVisible) return;
    const t = (performance.now() - t0) / 1000;
    if (!matchMedia('(pointer: fine)').matches) { state.tx = .5 + Math.sin(t * .35) * .22; state.ty = .5 + Math.cos(t * .27) * .12; } // 觸控裝置沒有游標,自己慢慢飄
    draw(t);
  });

  const ready = (reduce ? Promise.reject() : initGL().then(() => { glOK = true; })).catch(() => { hero.classList.add('no-gl'); state.reveal = 1; });

  /* ---------- loader + hero intro ---------- */
  const loader = $('#loader'), num = $('#loader-num'), bar = $('#loader i');
  const heroIn = () => {
    gsap.timeline({ defaults: { ease: 'power4.out' } })
      .to(state, { reveal: 1, duration: 2.4, ease: 'power2.inOut' }, 0)
      .to('.ln > span', { y: 0, duration: 1.4, stagger: .12 }, .3)
      .to('.hero-kicker', { opacity: 1, duration: 1 }, .2)
      .to(['.hero-sub', '.hero-actions'], { opacity: 1, duration: 1, stagger: .15 }, 1.1);
  };
  const endYear = new Date().getFullYear();
  const go = () => {
    if (reduce) { loader.remove(); return; }
    const o = { y: 1984 };
    gsap.timeline()
      .to(bar, { scaleX: 1, duration: 1.5, ease: 'power2.inOut' }, 0)
      .to(o, { y: endYear, duration: 1.5, ease: 'power2.inOut', onUpdate: () => num.textContent = Math.round(o.y) }, 0)
      .to(loader, { yPercent: -100, duration: .9, ease: 'power4.inOut', delay: .2, onStart: heroIn })
      .add(() => loader.remove());
  };
  Promise.race([ready, new Promise(r => setTimeout(r, 4000))]).then(go);

  if (reduce) return;

  /* ---------- manifesto: 逐字點亮 ---------- */
  const mf = $('#manifesto'), txt = mf.textContent;
  mf.setAttribute('aria-label', txt); mf.textContent = '';
  [...txt].forEach(ch => { const s = document.createElement('span'); s.className = 'c'; s.setAttribute('aria-hidden', 'true'); s.textContent = ch; mf.append(s); });
  gsap.fromTo($$('.c', mf), { opacity: .16 }, { opacity: 1, stagger: .06, ease: 'none',
    scrollTrigger: { trigger: mf, start: 'top 82%', end: 'bottom 48%', scrub: true } });

  /* ---------- count up ---------- */
  $$('[data-count]').forEach(el => {
    const to = +el.dataset.count, o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () =>
      gsap.to(o, { v: to, duration: 1.8, ease: 'power3.out', onUpdate: () => el.textContent = Math.round(o.v) }) });
  });

  /* ---------- image parallax ---------- */
  $$('.about-img img, .feature-media img').forEach(img =>
    gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none',
      scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));

  /* ---------- process ---------- */
  const steps = $('.steps');
  $$('li', steps).forEach(li => ScrollTrigger.create({ trigger: li, start: 'top 62%', onToggle: s => li.classList.toggle('on', s.isActive || s.progress === 1 && li.classList.contains('on')),
    onEnter: () => li.classList.add('on'), onLeaveBack: () => li.classList.remove('on') }));
  ScrollTrigger.create({ trigger: steps, start: 'top 62%', end: 'bottom 62%', scrub: true, onUpdate: s => steps.style.setProperty('--p', s.progress) });

  /* ---------- cases: 橫向 pin ---------- */
  ScrollTrigger.matchMedia({
    '(min-width: 901px)': () => {
      const track = $('#track'), pin = $('.cases-pin');
      const dist = () => track.scrollWidth - innerWidth + 40;
      gsap.to(track, { x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .6, invalidateOnRefresh: true, anticipatePin: 1 } });
    }
  });
})();
