/* Study Coffee — "Minha visão": a foto da mesa do aluno com vida por cima (vapor da caneca, luz das
   luminárias respirando, poeira na luz, neve na janela) e um zoom bem lento. Canvas 2D, sem bibliotecas. */
(function(){
'use strict';

/* Coordenadas em frações da imagem (x, y). r = raio em fração da largura. */
const SCENES = {
  books: {
    label:'Estante de livros', short:'Estante', src:'img/vista-estante.jpg', thumb:'img/vista-estante-mini.jpg',
    steam:[{at:[.775, .672], rate:1, size:1}],
    lamps:[[.07, .30, .13, 1], [.11, .10, .035, .7], [.455, .335, .03, .7], [.275, .305, .025, .6], [.68, .25, .03, .7], [.855, .245, .03, .7], [.935, .39, .03, .6], [.692, .49, .022, .6]],
    motes:{x:[.08, .96], y:[.04, .62], n:34}
  },
  counter: {
    label:'Balcão do café', short:'Balcão', src:'img/vista-balcao.jpg', thumb:'img/vista-balcao-mini.jpg',
    steam:[{at:[.745, .685], rate:1, size:1}, {at:[.548, .30], rate:.45, size:.55}],
    lamps:[[.333, .085, .05, .9], [.47, .055, .05, .9], [.68, .02, .05, .8], [.04, .16, .02, .5], [.11, .34, .02, .5], [.235, .34, .02, .5]],
    motes:{x:[.28, .97], y:[.04, .5], n:26}
  },
  window: {
    label:'Janela com neve', short:'Janela', src:'img/vista-janela.jpg', thumb:'img/vista-janela-mini.jpg',
    steam:[{at:[.75, .648], rate:1, size:1}],
    lamps:[[.07, .36, .12, 1], [.43, .265, .03, .8], [.47, .335, .025, .7], [.77, .27, .03, .8], [.81, .33, .025, .7], [.645, .345, .02, .6], [.55, .37, .02, .6], [.61, .39, .015, .5], [.46, .53, .015, .5], [.75, .53, .015, .5]],
    snow:{panes:[[.17, .45], [.46, .74], [.75, .92]], y:[-.02, .49], n:150}
  }
};
const KEYS = Object.keys(SCENES);
const legacy = {plants:'books', top:'window'};
function viewKey(v){ if(SCENES[v]) return v; if(legacy[v]) return legacy[v]; return 'window'; }
function reduced(){ try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){ return false; } }
const rnd = Math.random;

function create(root){
  const img = root.querySelector('img'), canvas = root.querySelector('canvas');
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  const st = {key:'', spec:null, running:false, raf:0, last:0, t:0, w:0, h:0, dpr:1, steam:[], motes:[], snow:[], emit:[], loaded:false};

  function resize(){
    if(!canvas) return;
    const w = root.clientWidth || 640, h = Math.round(w * 9 / 16);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if(w === st.w && h === st.h && dpr === st.dpr) return;
    st.w = w; st.h = h; st.dpr = dpr;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    if(ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }
  function seed(){
    const s = st.spec; if(!s) return;
    st.steam = []; st.emit = (s.steam || []).map(function(e){ return {e:e, acc:0}; });
    st.motes = [];
    if(s.motes){ for(let i = 0; i < s.motes.n; i++) st.motes.push(newMote(s.motes, true)); }
    st.snow = [];
    if(s.snow){ for(let i = 0; i < s.snow.n; i++) st.snow.push(newFlake(s.snow, true)); }
  }
  function newMote(m, anywhere){
    return {x:m.x[0] + rnd() * (m.x[1] - m.x[0]), y:anywhere ? (m.y[0] + rnd() * (m.y[1] - m.y[0])) : m.y[1], vx:(rnd() - .5) * .006, vy:-(.002 + rnd() * .006), r:.6 + rnd() * 1.2, a:.12 + rnd() * .3, ph:rnd() * 6.28, f:.4 + rnd() * .9};
  }
  function newFlake(sn, anywhere){
    const pane = sn.panes[Math.floor(rnd() * sn.panes.length)];
    const near = rnd() < .18;
    return {pane:pane, x:pane[0] + rnd() * (pane[1] - pane[0]), y:anywhere ? (sn.y[0] + rnd() * (sn.y[1] - sn.y[0])) : sn.y[0], vy:(near ? .07 : .03) + rnd() * .035, sw:.002 + rnd() * .006, ph:rnd() * 6.28, f:.5 + rnd() * 1.2, r:near ? (2.2 + rnd() * 1.6) : (.7 + rnd() * 1.3), a:near ? (.28 + rnd() * .2) : (.45 + rnd() * .45)};
  }
  function emitSteam(dt){
    st.emit.forEach(function(em){
      em.acc += dt * em.e.rate * 7;
      while(em.acc >= 1){
        em.acc -= 1;
        st.steam.push({x:em.e.at[0] + (rnd() - .5) * .018, y:em.e.at[1], age:0, life:2.4 + rnd() * 1.8, vx:(rnd() - .5) * .004, vy:-(.03 + rnd() * .02), sw:.004 + rnd() * .006, ph:rnd() * 6.28, size:em.e.size * (.55 + rnd() * .5)});
      }
    });
  }
  function draw(dt){
    if(!ctx || !st.spec) return;
    const w = st.w, h = st.h, t = st.t, s = st.spec;
    ctx.clearRect(0, 0, w, h);
    // luminárias respirando
    ctx.globalCompositeOperation = 'lighter';
    s.lamps.forEach(function(l, i){
      const base = .10 * l[3], pulse = .035 * l[3] * (.5 + .5 * Math.sin(t * (.6 + (i % 3) * .25) + i * 1.7));
      const flick = (rnd() < .012) ? -.03 * l[3] : 0;
      const a = Math.max(0, base + pulse + flick);
      const r = l[2] * w;
      const g = ctx.createRadialGradient(l[0] * w, l[1] * h, 0, l[0] * w, l[1] * h, r);
      g.addColorStop(0, 'rgba(255,205,130,' + a.toFixed(3) + ')');
      g.addColorStop(.45, 'rgba(255,180,100,' + (a * .45).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,160,80,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(l[0] * w, l[1] * h, r, 0, 6.2832); ctx.fill();
    });
    // poeira na luz
    if(s.motes){
      const m = s.motes;
      st.motes.forEach(function(p, i){
        p.x += p.vx * dt; p.y += p.vy * dt; p.ph += dt * p.f;
        if(p.y < m.y[0] || p.x < m.x[0] || p.x > m.x[1]) st.motes[i] = newMote(m, false);
        const a = p.a * (.45 + .55 * Math.sin(p.ph));
        ctx.fillStyle = 'rgba(255,236,200,' + Math.max(0, a).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.r, 0, 6.2832); ctx.fill();
      });
    }
    // neve, só dentro dos vidros
    if(s.snow){
      const sn = s.snow;
      ctx.save(); ctx.beginPath();
      sn.panes.forEach(function(p){ ctx.rect(p[0] * w, sn.y[0] * h, (p[1] - p[0]) * w, (sn.y[1] - sn.y[0]) * h); });
      ctx.clip();
      ctx.globalCompositeOperation = 'source-over';
      st.snow.forEach(function(f, i){
        f.y += f.vy * dt; f.ph += dt * f.f; f.x += Math.sin(f.ph) * f.sw * dt;
        if(f.y > sn.y[1] + .01 || f.x < f.pane[0] - .01 || f.x > f.pane[1] + .01) st.snow[i] = newFlake(sn, false);
        ctx.fillStyle = 'rgba(245,248,255,' + f.a.toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(f.x * w, f.y * h, f.r, 0, 6.2832); ctx.fill();
      });
      ctx.restore();
      ctx.globalCompositeOperation = 'lighter';
    }
    // vapor da caneca
    emitSteam(dt);
    for(let i = st.steam.length - 1; i >= 0; i--){
      const p = st.steam[i];
      p.age += dt; if(p.age >= p.life){ st.steam.splice(i, 1); continue; }
      p.ph += dt * 1.6; p.x += (p.vx + Math.sin(p.ph) * p.sw) * dt; p.y += p.vy * dt;
      const k = p.age / p.life, a = Math.sin(k * Math.PI) * .16, r = (6 + k * 26) * p.size * (w / 900);
      const g = ctx.createRadialGradient(p.x * w, p.y * h, 0, p.x * w, p.y * h, r);
      g.addColorStop(0, 'rgba(255,250,240,' + a.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,250,240,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x * w, p.y * h, r, 0, 6.2832); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  function frame(now){
    if(!st.running) return;
    st.raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, Math.max(0, (now - (st.last || now)) / 1000));
    st.last = now; st.t += dt;
    resize();
    draw(dt);
  }
  function setScene(key){
    key = viewKey(key);
    if(key === st.key) return key;
    st.key = key; st.spec = SCENES[key];
    root.dataset.scene = key;
    if(img){ img.src = st.spec.src; img.alt = st.spec.label; }
    st.w = 0; resize();
    if(!st.running){ st.t = 0; draw(0); }
    return key;
  }
  function start(){
    if(st.running) return;
    resize();
    if(reduced()){ st.t = 0; draw(0); return; }   // sem movimento: um quadro parado com as luzes
    st.running = true; st.last = 0; st.raf = requestAnimationFrame(frame);
  }
  function stop(){ st.running = false; cancelAnimationFrame(st.raf); }
  function fullscreen(){
    const el = root;
    try {
      if(document.fullscreenElement){ document.exitFullscreen(); return false; }
      if(el.requestFullscreen){ el.requestFullscreen().catch(function(){}); return true; }
      if(el.webkitRequestFullscreen){ el.webkitRequestFullscreen(); return true; }
    } catch(e){}
    return false;
  }
  window.addEventListener('resize', resize);
  return {setScene:setScene, start:start, stop:stop, resize:resize, fullscreen:fullscreen, key:function(){ return st.key; }, running:function(){ return st.running; },
    dispose:function(){ stop(); window.removeEventListener('resize', resize); }};
}

window.SCScene = {SCENES:SCENES, KEYS:KEYS, viewKey:viewKey, create:create};
})();
