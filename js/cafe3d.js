/* Study Coffee — café 3D (Three.js r128, geometria procedural, sem arquivos externos).
   Expõe window.SCCafe: opções do personagem, normalização, cena do café e prévia do personagem. */
(function(){
'use strict';

const OPTIONS = {
  skins: ['#f6d7c3', '#e7b89a', '#c98f66', '#a06a44', '#7a4a2b', '#4b2f1f'],
  hairs: [['short','Curto'], ['long','Longo'], ['bun','Coque'], ['curly','Cacheado'], ['none','Sem cabelo']],
  hairColors: ['#1d1410', '#3b2a1a', '#7a4a2b', '#b5752f', '#d9b36b', '#8a1c1c', '#4a4a4a', '#2f5fa8'],
  shirts: ['#f4b94e', '#86d1b0', '#ff9b85', '#6aa2ff', '#c893f2', '#f1ead9', '#2b2b2b', '#3f8a5a'],
  accs: [['none','Nada'], ['glasses','Óculos'], ['headphones','Fones'], ['cap','Boné']],
  views: [['window','Janela com chuva'], ['books','Estante de livros'], ['counter','Balcão do café'], ['plants','Parede de plantas']]
};
const VIEW_KEYS = OPTIONS.views.map(function(v){ return v[0]; });
const HAIR_KEYS = OPTIONS.hairs.map(function(v){ return v[0]; });
const ACC_KEYS = OPTIONS.accs.map(function(v){ return v[0]; });
const isHex = (v) => /^#[0-9a-fA-F]{6}$/.test(String(v || ''));

function hashStr(s){ let h = 2166136261; const str = String(s || ''); for(let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function defaultAvatar(seed){
  const h = hashStr(seed || String(Math.random()));
  return {skin:h % 6, hair:HAIR_KEYS[(h >>> 3) % 4], hairColor:OPTIONS.hairColors[(h >>> 6) % OPTIONS.hairColors.length], shirt:OPTIONS.shirts[(h >>> 9) % OPTIONS.shirts.length], acc:'none', view:VIEW_KEYS[(h >>> 12) % 4]};
}
function normalize(a){
  const d = defaultAvatar('x');
  const o = (a && typeof a === 'object') ? a : {};
  return {
    skin: (Number.isInteger(o.skin) && o.skin >= 0 && o.skin < OPTIONS.skins.length) ? o.skin : 1,
    hair: HAIR_KEYS.indexOf(o.hair) >= 0 ? o.hair : (d.hair || 'short'),
    hairColor: isHex(o.hairColor) ? o.hairColor : (d.hairColor || OPTIONS.hairColors[1]),
    shirt: isHex(o.shirt) ? o.shirt : (d.shirt || OPTIONS.shirts[0]),
    acc: ACC_KEYS.indexOf(o.acc) >= 0 ? o.acc : 'none',
    view: VIEW_KEYS.indexOf(o.view) >= 0 ? o.view : 'window'
  };
}

/* ---------- materiais e peças ---------- */
function mat(color, opts){ return new THREE.MeshStandardMaterial(Object.assign({color:new THREE.Color(color), roughness:.85, metalness:.02}, opts || {})); }
function box(w, h, d, color, opts){ const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts)); return m; }
function cyl(rt, rb, h, color, seg, opts){ return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 16), mat(color, opts)); }
function sph(r, color, opts){ return new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat(color, opts)); }
function textSprite(text, opts){
  const o = Object.assign({font:'600 44px Figtree, system-ui, sans-serif', pad:18, bg:'rgba(19,32,28,.72)', fg:'#f1ead9', scale:.0045}, opts || {});
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = o.font;
  const w = Math.ceil(ctx.measureText(text).width) + o.pad * 2, h = 64 + o.pad;
  c.width = w; c.height = h;
  ctx.font = o.font;
  ctx.fillStyle = o.bg;
  const r = 18;
  ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(w - r, 0); ctx.quadraticCurveTo(w, 0, w, r); ctx.lineTo(w, h - r); ctx.quadraticCurveTo(w, h, w - r, h); ctx.lineTo(r, h); ctx.quadraticCurveTo(0, h, 0, h - r); ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = o.fg; ctx.textBaseline = 'middle'; ctx.fillText(text, o.pad, h / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthTest:false}));
  sp.scale.set(w * o.scale, h * o.scale, 1);
  sp.renderOrder = 5;
  return sp;
}

let _dot = null;
function dotTexture(){
  if(_dot) return _dot;
  const c = document.createElement('canvas'); c.width = 32; c.height = 32;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.5, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
  _dot = new THREE.CanvasTexture(c);
  return _dot;
}

/* ---------- personagem ---------- */
function buildAvatar(cfg, opts){
  const a = normalize(cfg);
  const o = Object.assign({sitting:true, label:'', labelOpts:null}, opts || {});
  const g = new THREE.Group();
  const skin = OPTIONS.skins[a.skin];
  const headParts = [];
  const H = function(m){ headParts.push(m); return m; };
  // tronco
  const torso = cyl(.2, .24, .5, a.shirt, 18); torso.position.y = o.sitting ? .72 : .78; g.add(torso);
  const collar = cyl(.22, .2, .08, a.shirt, 18); collar.position.y = torso.position.y + .28; g.add(collar);
  // pescoço e cabeça
  const neck = cyl(.07, .08, .1, skin, 12); neck.position.y = torso.position.y + .33; g.add(neck);
  const head = H(sph(.2, skin)); head.position.y = torso.position.y + .55; g.add(head);
  // olhos
  [-1, 1].forEach(function(s){ const eye = H(sph(.025, '#1d1410')); eye.position.set(s * .07, head.position.y + .03, .17); g.add(eye); });
  // boca
  const mouth = H(box(.07, .012, .01, '#8a3b32')); mouth.position.set(0, head.position.y - .07, .19); g.add(mouth);
  // cabelo
  if(a.hair !== 'none'){
    const hc = a.hairColor;
    if(a.hair === 'short' || a.hair === 'curly' || a.hair === 'long' || a.hair === 'bun'){
      const cap = H(sph(.215, hc)); cap.scale.set(1, .78, 1); cap.position.y = head.position.y + .07; g.add(cap);
    }
    if(a.hair === 'long'){
      const back = H(box(.3, .34, .14, hc)); back.position.set(0, head.position.y - .1, -.13); g.add(back);
    }
    if(a.hair === 'bun'){
      const bun = H(sph(.1, hc)); bun.position.set(0, head.position.y + .24, -.08); g.add(bun);
    }
    if(a.hair === 'curly'){
      [[-.16,.18,.02],[.16,.18,.02],[0,.26,-.06],[-.12,.12,-.16],[.12,.12,-.16],[0,.1,-.2]].forEach(function(p){ const c = H(sph(.09, hc)); c.position.set(p[0], head.position.y + p[1], p[2]); g.add(c); });
    }
  }
  // acessórios
  if(a.acc === 'glasses'){
    [-1, 1].forEach(function(s){ const ring = H(new THREE.Mesh(new THREE.TorusGeometry(.055, .012, 8, 18), mat('#2b2b2b', {metalness:.3, roughness:.5}))); ring.position.set(s * .075, head.position.y + .03, .19); g.add(ring); });
    const bridge = H(box(.05, .012, .012, '#2b2b2b')); bridge.position.set(0, head.position.y + .03, .19); g.add(bridge);
  }
  if(a.acc === 'headphones'){
    const band = H(new THREE.Mesh(new THREE.TorusGeometry(.22, .02, 8, 24, Math.PI), mat('#2b2b2b'))); band.position.y = head.position.y + .02; g.add(band);
    [-1, 1].forEach(function(s){ const cup = H(cyl(.06, .06, .05, '#2b2b2b', 14)); cup.rotation.z = Math.PI / 2; cup.position.set(s * .22, head.position.y, 0); g.add(cup); });
  }
  if(a.acc === 'cap'){
    const crown = H(sph(.215, a.shirt)); crown.scale.set(1, .7, 1); crown.position.y = head.position.y + .09; g.add(crown);
    const brim = H(box(.3, .02, .18, a.shirt)); brim.position.set(0, head.position.y + .1, .24); g.add(brim);
  }
  // braços para a frente (na mesa) ou soltos
  [-1, 1].forEach(function(s){
    const arm = cyl(.055, .06, .42, a.shirt, 10);
    if(o.sitting){ arm.rotation.x = -Math.PI / 2.4; arm.position.set(s * .25, torso.position.y + .02, .2); }
    else { arm.position.set(s * .27, torso.position.y - .05, 0); }
    g.add(arm);
    const hand = sph(.06, skin);
    if(o.sitting){ hand.position.set(s * .25, torso.position.y - .06, .4); } else { hand.position.set(s * .27, torso.position.y - .3, 0); }
    g.add(hand);
  });
  // pernas
  if(o.sitting){
    [-1, 1].forEach(function(s){ const thigh = box(.13, .12, .36, '#2a3340'); thigh.position.set(s * .1, .4, .18); g.add(thigh); const shin = box(.12, .36, .12, '#2a3340'); shin.position.set(s * .1, .18, .34); g.add(shin); });
  } else {
    [-1, 1].forEach(function(s){ const leg = box(.14, .5, .14, '#2a3340'); leg.position.set(s * .1, .25, 0); g.add(leg); });
  }
  if(o.label){
    const sp = textSprite(o.label, o.labelOpts || {});
    sp.position.y = head.position.y + .45;
    g.add(sp);
    g.userData.label = sp;
    headParts.push(sp);
  }
  g.userData.head = head;
  g.userData.headParts = headParts;
  return g;
}

/* ---------- cena do café ---------- */
const SEATS = {
  window: {desk:[0, 0, -4.45], face:[0, 0, -1], chairs:[[-.62, 0, -3.55], [.62, 0, -3.55]]},
  books: {desk:[4.45, 0, 0], face:[1, 0, 0], chairs:[[3.55, 0, -.62], [3.55, 0, .62]]},
  counter: {desk:[0, 0, 4.45], face:[0, 0, 1], chairs:[[-.62, 0, 3.55], [.62, 0, 3.55]]},
  plants: {desk:[-4.45, 0, 0], face:[-1, 0, 0], chairs:[[-3.55, 0, -.62], [-3.55, 0, .62]]}
};
const WOOD = '#6b4a2e', WOOD_D = '#4e3522', WALL = '#24332c', FLOOR = '#3a2819', FLOOR2 = '#43301e';

function buildRoom(scene){
  // piso de tábuas
  const floor = new THREE.Group();
  for(let i = 0; i < 14; i++){
    const plank = box(12, .05, .84, i % 2 ? FLOOR : FLOOR2);
    plank.position.set(0, -.025, -5.6 + i * .86);
    floor.add(plank);
  }
  scene.add(floor);
  // tapete central
  const rug = cyl(2.2, 2.2, .02, '#7a3b2e', 40); rug.position.y = .01; scene.add(rug);
  const rug2 = cyl(1.6, 1.6, .025, '#a8553f', 40); rug2.position.y = .012; scene.add(rug2);
  // paredes (sem teto)
  const h = 3.2;
  const wN = box(12.2, h, .12, WALL); wN.position.set(0, h / 2, -6.06); scene.add(wN);
  const wS = box(12.2, h, .12, WALL); wS.position.set(0, h / 2, 6.06); scene.add(wS);
  const wE = box(.12, h, 12.2, WALL); wE.position.set(6.06, h / 2, 0); scene.add(wE);
  const wW = box(.12, h, 12.2, WALL); wW.position.set(-6.06, h / 2, 0); scene.add(wW);
  // rodapé
  [[0, -5.97, 12, .06], [0, 5.97, 12, .06]].forEach(function(p){ const b = box(p[2], .18, p[3], WOOD_D); b.position.set(p[0], .09, p[1]); scene.add(b); });
  [[-5.97, 0], [5.97, 0]].forEach(function(p){ const b = box(.06, .18, 12, WOOD_D); b.position.set(p[0], .09, p[1]); scene.add(b); });

  // mesinha central com planta
  const ct = cyl(.6, .6, .06, WOOD, 24); ct.position.y = .45; scene.add(ct);
  const cl = cyl(.06, .08, .45, WOOD_D, 10); cl.position.y = .22; scene.add(cl);
  const pot = cyl(.14, .1, .2, '#b7643c', 12); pot.position.set(0, .58, 0); scene.add(pot);
  [[0, .78, 0, .22], [-.12, .72, .1, .14], [.14, .74, -.08, .15]].forEach(function(p){ const leaf = sph(p[3], '#3f8a5a'); leaf.position.set(p[0], p[1], p[2]); scene.add(leaf); });

  // mesas de estudo, cadeiras, luminárias
  Object.keys(SEATS).forEach(function(k){
    const s = SEATS[k];
    const desk = box(1.9, .06, .7, WOOD); desk.position.set(s.desk[0], .74, s.desk[2]);
    const horizontal = Math.abs(s.face[0]) > 0;
    if(horizontal) desk.rotation.y = Math.PI / 2;
    scene.add(desk);
    // pés
    [[-.85, -.28], [.85, -.28], [-.85, .28], [.85, .28]].forEach(function(p){
      const leg = box(.06, .72, .06, WOOD_D);
      const lx = horizontal ? p[1] : p[0], lz = horizontal ? p[0] : p[1];
      leg.position.set(s.desk[0] + lx, .36, s.desk[2] + lz);
      scene.add(leg);
    });
    // luminária pendente
    const cord = cyl(.01, .01, 1.1, '#1d1410', 6); cord.position.set(s.desk[0], 2.65, s.desk[2]); scene.add(cord);
    const shade = cyl(.12, .3, .26, '#40594e', 20); shade.position.set(s.desk[0], 2.0, s.desk[2]); scene.add(shade);
    const bulb = sph(.07, '#ffd27a', {emissive:new THREE.Color('#ffb84d'), emissiveIntensity:1.6}); bulb.position.set(s.desk[0], 1.92, s.desk[2]); scene.add(bulb);
    const light = new THREE.PointLight(0xffb866, 1.4, 8, 2); light.position.set(s.desk[0], 2.05, s.desk[2]); scene.add(light);
    // cadeiras
    s.chairs.forEach(function(c){
      const seat = box(.46, .06, .46, '#5b3d27'); seat.position.set(c[0], .45, c[2]); scene.add(seat);
      const back = box(.46, .5, .06, '#5b3d27');
      // encosto fica do lado oposto à mesa
      back.position.set(c[0] - s.face[0] * .2, .72, c[2] - s.face[2] * .2);
      if(horizontal) back.rotation.y = Math.PI / 2;
      scene.add(back);
      [[-.19, -.19], [.19, -.19], [-.19, .19], [.19, .19]].forEach(function(p){ const l = box(.04, .45, .04, '#3a2619'); l.position.set(c[0] + p[0], .22, c[2] + p[1]); scene.add(l); });
    });
  });
  buildWindow(scene); buildBooks(scene); buildCounter(scene); buildPlants(scene);
}

function buildWindow(scene){
  const frame = box(4.4, 2.3, .08, '#1d1410'); frame.position.set(0, 1.75, -5.96); scene.add(frame);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 2.0), new THREE.MeshStandardMaterial({color:new THREE.Color('#17303a'), emissive:new THREE.Color('#0d2030'), emissiveIntensity:.9, roughness:.2, metalness:.1}));
  glass.position.set(0, 1.75, -5.9); scene.add(glass);
  // luzes da cidade
  const rnd = (function(){ let s = 7; return function(){ s = (s * 9301 + 49297) % 233280; return s / 233280; }; })();
  const colors = ['#f4b94e', '#86d1b0', '#ff8c6e', '#ffe9a8'];
  // pontinhos pequenos, como prédios ao longe atrás do vidro
  for(let i = 0; i < 46; i++){
    const d = sph(.01 + rnd() * .016, colors[i % 4], {emissive:new THREE.Color(colors[i % 4]), emissiveIntensity:1.6});
    d.position.set(-1.95 + rnd() * 3.9, .85 + rnd() * 1.1, -5.88);
    scene.add(d);
  }
  // cruzeta da janela
  const cross1 = box(4.1, .05, .06, '#1d1410'); cross1.position.set(0, 1.75, -5.86); scene.add(cross1);
  const cross2 = box(.05, 2.0, .06, '#1d1410'); cross2.position.set(0, 1.75, -5.86); scene.add(cross2);
  // peitoril com caneca e luzinhas
  const sill = box(4.4, .08, .3, WOOD); sill.position.set(0, .58, -5.8); scene.add(sill);
  // chuva: pontos que caem na frente do vidro
  // riscos finos (segmentos de linha) em vez de pontos: perto da janela continuam parecendo chuva
  const n = 260, pos = new Float32Array(n * 6), speed = new Float32Array(n), len = .14;
  for(let i = 0; i < n; i++){
    const x = -2.05 + rnd() * 4.1, y = .7 + rnd() * 2.1, z = -5.84 + rnd() * .04;
    pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z;
    pos[i * 6 + 3] = x + .01; pos[i * 6 + 4] = y + len; pos[i * 6 + 5] = z;
    speed[i] = .03 + rnd() * .045;
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({color:0xcfe3ee, transparent:true, opacity:.5, depthWrite:false}));
  rain.userData.speed = speed; rain.userData.len = len; rain.name = 'rain';
  scene.add(rain);
  // cortina de luzinhas
  for(let i = 0; i < 9; i++){ const b = sph(.035, '#ffd27a', {emissive:new THREE.Color('#ffb84d'), emissiveIntensity:1.4}); b.position.set(-2.0 + i * .5, 2.95 - (i % 2) * .08, -5.8); scene.add(b); }
}
function buildBooks(scene){
  const shelf = box(.35, 2.6, 4.2, '#4e3522'); shelf.position.set(5.82, 1.3, 0); scene.add(shelf);
  const inner = box(.3, 2.5, 4.0, '#2d1d12'); inner.position.set(5.80, 1.3, 0); scene.add(inner);
  const cols = ['#b23b25', '#1f7a58', '#2f5fa8', '#f4b94e', '#c893f2', '#f1ead9', '#8a1c1c', '#3f8a5a', '#ff9b85', '#a86400'];
  let ci = 0;
  for(let r = 0; r < 4; r++){
    const plank = box(.3, .04, 4.0, WOOD); plank.position.set(5.80, .34 + r * .6, 0); scene.add(plank);
    let z = -1.9;
    while(z < 1.85){
      const w = .08 + ((ci * 7) % 5) * .025, h = .34 + ((ci * 3) % 4) * .05;
      const b = box(.24, h, w, cols[ci % cols.length]); b.position.set(5.78 - ((ci % 3) * .02), .36 + r * .6 + h / 2, z + w / 2); scene.add(b);
      z += w + .015; ci++;
      if(ci % 11 === 0) z += .18;
    }
  }
  const ladder = box(.05, 2.4, .05, WOOD_D); ladder.position.set(5.55, 1.2, 2.3); scene.add(ladder);
}
function buildCounter(scene){
  const bar = box(5.2, 1.0, .8, '#4e3522'); bar.position.set(0, .5, 5.3); scene.add(bar);
  const top = box(5.4, .08, .9, WOOD); top.position.set(0, 1.04, 5.3); scene.add(top);
  const front = box(5.2, .9, .05, '#5b3d27'); front.position.set(0, .5, 4.88); scene.add(front);
  // máquina de café
  const mach = box(.8, .6, .5, '#2b2b2b', {metalness:.5, roughness:.4}); mach.position.set(1.4, 1.38, 5.3); scene.add(mach);
  const machTop = box(.8, .08, .5, '#8a8a8a', {metalness:.6, roughness:.3}); machTop.position.set(1.4, 1.72, 5.3); scene.add(machTop);
  const spout = cyl(.03, .03, .2, '#8a8a8a', 8); spout.position.set(1.3, 1.18, 5.08); scene.add(spout);
  // xícaras
  for(let i = 0; i < 5; i++){ const cup = cyl(.06, .05, .09, i % 2 ? '#f1ead9' : '#f4b94e', 12); cup.position.set(-2.0 + i * .22, 1.13, 5.1); scene.add(cup); }
  // bule e canecas
  const kettle = cyl(.14, .16, .26, '#c9c9c9', 16, {metalness:.6, roughness:.3}); kettle.position.set(-.6, 1.21, 5.4); scene.add(kettle);
  // lousa do cardápio
  const board = box(2.2, 1.2, .05, '#1d1410'); board.position.set(-1.2, 2.2, 5.97); scene.add(board);
  const c = document.createElement('canvas'); c.width = 440; c.height = 240;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1f2a24'; ctx.fillRect(0, 0, 440, 240);
  ctx.fillStyle = '#f1ead9'; ctx.font = '700 34px Figtree, system-ui, sans-serif'; ctx.fillText('Study Coffee', 24, 54);
  ctx.font = '26px Figtree, system-ui, sans-serif';
  ['Coado ............ 4', 'Cappuccino ..... 8', 'Pão de queijo .. 5', 'Pomodoro ...... grátis'].forEach(function(t, i){ ctx.fillText(t, 24, 104 + i * 36); });
  const tex = new THREE.CanvasTexture(c);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.1), new THREE.MeshStandardMaterial({map:tex, roughness:.9}));
  plane.position.set(-1.2, 2.2, 5.94); plane.rotation.y = Math.PI; scene.add(plane);
  // prateleira com potes
  const sh = box(2.0, .05, .3, WOOD); sh.position.set(1.6, 2.3, 5.8); scene.add(sh);
  for(let i = 0; i < 4; i++){ const jar = cyl(.1, .1, .26, ['#a86400', '#7a4a2b', '#d9b36b', '#3f8a5a'][i], 12); jar.position.set(.9 + i * .45, 2.46, 5.8); scene.add(jar); }
  // luz quente do balcão
  const l = new THREE.PointLight(0xffc27a, .6, 6, 2); l.position.set(0, 2.4, 5.0); scene.add(l);
}
function buildPlants(scene){
  const greens = ['#3f8a5a', '#2f6b46', '#5aa06c', '#86d1b0'];
  for(let r = 0; r < 3; r++){
    const plank = box(.3, .05, 3.6, WOOD); plank.position.set(-5.78, .9 + r * .75, 0); scene.add(plank);
    for(let i = 0; i < 5; i++){
      const z = -1.5 + i * .75;
      const pot = cyl(.13, .1, .22, ['#b7643c', '#f1ead9', '#a86400'][(i + r) % 3], 12); pot.position.set(-5.72, 1.04 + r * .75, z); scene.add(pot);
      const k = (i * 3 + r) % 4;
      const leaf = sph(.16 + (k % 2) * .05, greens[k]); leaf.scale.set(1, .85 + (k % 3) * .2, 1); leaf.position.set(-5.68, 1.3 + r * .75, z); scene.add(leaf);
      if(k === 3){ const vine = box(.04, .5, .04, greens[1]); vine.position.set(-5.66, 1.0 + r * .75 - .2, z + .1); scene.add(vine); }
    }
  }
  // quadro
  const frame = box(.06, 1.1, 1.6, '#1d1410'); frame.position.set(-5.95, 1.7, 3.8); scene.add(frame);
  const c = document.createElement('canvas'); c.width = 320; c.height = 220;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#eef1e9'; ctx.fillRect(0, 0, 320, 220);
  ctx.fillStyle = '#a86400'; ctx.font = '700 42px Georgia, serif';
  ['Estude.', 'Descanse.', 'Repita.'].forEach(function(t, i){ ctx.fillText(t, 36, 74 + i * 56); });
  const tex = new THREE.CanvasTexture(c);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), new THREE.MeshStandardMaterial({map:tex, roughness:.9}));
  art.position.set(-5.91, 1.7, 3.8); art.rotation.y = Math.PI / 2; scene.add(art);
  // poltrona no canto
  const arm = box(1.0, .5, 1.0, '#8a3b32'); arm.position.set(-4.6, .25, 4.6); scene.add(arm);
  const armB = box(1.0, .6, .25, '#8a3b32'); armB.position.set(-4.6, .75, 5.0); scene.add(armB);
}

function createScene(canvas, opts){
  const o = Object.assign({rain:true, mode:'top'}, opts || {});
  const renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true, alpha:false, powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a1613');
  scene.fog = new THREE.Fog('#0a1613', 16, 30);
  scene.add(new THREE.AmbientLight(0xffd9a8, .22));
  const hemi = new THREE.HemisphereLight(0x7fa3b8, 0x3a2a1c, .32); scene.add(hemi);
  buildRoom(scene);
  const camera = new THREE.PerspectiveCamera(50, 1, .05, 60);
  const people = new THREE.Group(); scene.add(people);
  const state = {mode:o.mode, rain:o.rain, people:[], seatOf:{}, yaw:0, pitch:0, orbit:0, me:null, running:false, raf:0, drag:null, mugs:[], t:0};
  const rainObj = scene.getObjectByName('rain');

  function resize(){
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 200;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  function assignSeats(list){
    const taken = {}; const seatOf = {};
    const all = [];
    Object.keys(SEATS).forEach(function(k){ SEATS[k].chairs.forEach(function(c, i){ all.push({view:k, idx:i, id:k + ':' + i}); }); });
    const sorted = list.slice().sort(function(a, b){ return (b.isMe ? 1 : 0) - (a.isMe ? 1 : 0) || String(a.key).localeCompare(String(b.key)); });
    sorted.forEach(function(p){
      const pref = normalize(p.avatar).view;
      let seat = all.find(function(s){ return s.view === pref && !taken[s.id]; }) || all.find(function(s){ return !taken[s.id]; });
      if(!seat) return;
      taken[seat.id] = true; seatOf[p.key] = seat;
    });
    return seatOf;
  }
  function setPeople(list){
    state.people = list.slice(0, 8);
    state.seatOf = assignSeats(state.people);
    while(people.children.length) people.remove(people.children[0]);
    state.mugs = [];
    state.me = null;
    state.people.forEach(function(p){
      const seat = state.seatOf[p.key]; if(!seat) return;
      const S = SEATS[seat.view], c = S.chairs[seat.idx];
      const g = buildAvatar(p.avatar, {sitting:true, label:p.name || 'Colega', labelOpts:p.isMe ? {bg:'rgba(244,185,78,.9)', fg:'#2b1c04'} : null});
      g.position.set(c[0], 0, c[2]);
      g.rotation.y = Math.atan2(S.face[0], S.face[2]);
      g.userData.person = p;
      people.add(g);
      // caneca na mesa, na frente do personagem
      const mug = cyl(.06, .05, .1, p.running ? '#f4b94e' : '#f1ead9', 12);
      mug.position.set(c[0] + S.face[0] * .55, .84, c[2] + S.face[2] * .55);
      people.add(mug);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(.035, .012, 6, 12), mat(p.running ? '#f4b94e' : '#f1ead9'));
      handle.position.copy(mug.position); handle.position.y += .01; handle.rotation.y = Math.PI / 2; people.add(handle);
      // caderno/laptop
      const book = box(.34, .02, .26, p.phase === 'focus' ? '#f1ead9' : '#86d1b0'); book.position.set(c[0] + S.face[0] * .72 - S.face[2] * .25, .78, c[2] + S.face[2] * .72 + S.face[0] * .25); people.add(book);
      if(p.running){
        // vapor
        const n = 24, pos = new Float32Array(n * 3);
        for(let i = 0; i < n; i++){ pos[i * 3] = mug.position.x + (Math.random() - .5) * .05; pos[i * 3 + 1] = mug.position.y + .06 + Math.random() * .35; pos[i * 3 + 2] = mug.position.z + (Math.random() - .5) * .05; }
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const steam = new THREE.Points(geo, new THREE.PointsMaterial({color:0xf1ead9, size:.045, map:dotTexture(), transparent:true, opacity:.35, depthWrite:false}));
        steam.userData.base = mug.position.clone();
        people.add(steam); state.mugs.push(steam);
      }
      if(p.mic){ const dot = sph(.045, '#86d1b0', {emissive:new THREE.Color('#86d1b0'), emissiveIntensity:1.2}); dot.position.set(0, g.userData.head.position.y + .32, .12); g.add(dot); }
      if(p.isMe) state.me = {group:g, seat:seat, chair:c, face:S.face};
    });
    placeCamera();
  }
  function setHeadVisible(v){ if(state.me && state.me.group.userData.headParts){ state.me.group.userData.headParts.forEach(function(m){ m.visible = v; }); } }
  function placeCamera(){
    if(state.mode === 'first' && state.me){
      setHeadVisible(false);
      const c = state.me.chair, f = state.me.face;
      camera.position.set(c[0] + f[0] * .16, 1.3, c[2] + f[2] * .16);
      const base = Math.atan2(f[0], f[2]);
      const yaw = base + state.yaw, pitch = -.3 + state.pitch;
      camera.lookAt(camera.position.x + Math.sin(yaw) * Math.cos(pitch), camera.position.y + Math.sin(pitch), camera.position.z + Math.cos(yaw) * Math.cos(pitch));
      camera.fov = 62;
    } else {
      setHeadVisible(true);
      const r = 9.2, a = state.orbit;
      camera.position.set(Math.sin(a) * r * .72, 8.2, Math.cos(a) * r * .72);
      camera.lookAt(0, .3, 0);
      camera.fov = 50;
    }
    camera.updateProjectionMatrix();
  }
  function setMode(m){ const nm = (m === 'first' && state.me) ? 'first' : 'top'; if(nm !== state.mode){ state.yaw = 0; state.pitch = 0; } state.mode = nm; placeCamera(); return state.mode; }
  function animate(){
    if(!state.running) return;
    state.raf = requestAnimationFrame(animate);
    state.t += .016;
    if(rainObj){
      const p = rainObj.geometry.attributes.position, sp = rainObj.userData.speed;
      rainObj.visible = state.rain;
      if(state.rain){ const L = rainObj.userData.len; for(let i = 0; i < sp.length; i++){ let y = p.array[i * 6 + 1] - sp[i]; if(y < .7) y = 2.8; p.array[i * 6 + 1] = y; p.array[i * 6 + 4] = y + L; } p.needsUpdate = true; }
    }
    state.mugs.forEach(function(s){ const p = s.geometry.attributes.position; for(let i = 0; i < p.count; i++){ let y = p.array[i * 3 + 1] + .004; if(y > s.userData.base.y + .45){ y = s.userData.base.y + .06; } p.array[i * 3 + 1] = y; p.array[i * 3] += (Math.random() - .5) * .002; } p.needsUpdate = true; });
    people.children.forEach(function(g, i){ if(g.userData.person){ g.position.y = Math.sin(state.t * 1.6 + i) * .006; } });
    if(state.mode === 'top' && !state.drag){ state.orbit += .0009; placeCamera(); }
    renderer.render(scene, camera);
  }
  function start(){ if(state.running) return; state.running = true; resize(); placeCamera(); animate(); }
  function stop(){ state.running = false; cancelAnimationFrame(state.raf); }
  // arrastar para olhar / girar
  function onDown(e){ state.drag = {x:e.clientX, y:e.clientY, yaw:state.yaw, pitch:state.pitch, orbit:state.orbit}; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); }
  function onMove(e){
    if(!state.drag) return;
    const dx = (e.clientX - state.drag.x) / Math.max(1, canvas.clientWidth), dy = (e.clientY - state.drag.y) / Math.max(1, canvas.clientHeight);
    if(state.mode === 'first'){ state.yaw = Math.max(-1.3, Math.min(1.3, state.drag.yaw - dx * 2.2)); state.pitch = Math.max(-.6, Math.min(.5, state.drag.pitch - dy * 1.4)); }
    else { state.orbit = state.drag.orbit - dx * 3; }
    placeCamera();
  }
  function onUp(){ state.drag = null; }
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
  window.addEventListener('resize', resize);
  return {
    setPeople:setPeople, setMode:setMode, start:start, stop:stop, resize:resize,
    setRain:function(v){ state.rain = !!v; },
    mode:function(){ return state.mode; },
    dispose:function(){ stop(); window.removeEventListener('resize', resize); canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp); renderer.dispose(); }
  };
}

/* ---------- prévia do personagem (montador) ---------- */
function createPreview(canvas){
  const renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffe2bd, .55));
  const key = new THREE.DirectionalLight(0xfff1d6, .9); key.position.set(2, 4, 3); scene.add(key);
  const rim = new THREE.PointLight(0x86d1b0, .5, 10); rim.position.set(-2, 2, -2); scene.add(rim);
  const stool = cyl(.3, .3, .06, WOOD, 24); stool.position.y = .42; scene.add(stool);
  const stoolLeg = cyl(.05, .07, .42, WOOD_D, 10); stoolLeg.position.y = .21; scene.add(stoolLeg);
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 20);
  camera.position.set(0, 1.25, 3.4); camera.lookAt(0, .85, 0);
  let group = null, raf = 0, running = false, t = 0;
  function resize(){ const w = canvas.clientWidth || 200, h = canvas.clientHeight || 200; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  function setAvatar(a){
    if(group) scene.remove(group);
    group = buildAvatar(a, {sitting:true});
    scene.add(group);
  }
  function loop(){ if(!running) return; raf = requestAnimationFrame(loop); t += .016; if(group){ group.rotation.y = Math.sin(t * .8) * .55; } renderer.render(scene, camera); }
  function start(){ if(running) return; running = true; resize(); loop(); }
  function stop(){ running = false; cancelAnimationFrame(raf); }
  window.addEventListener('resize', resize);
  return {setAvatar:setAvatar, start:start, stop:stop, resize:resize, dispose:function(){ stop(); window.removeEventListener('resize', resize); renderer.dispose(); }};
}

window.SCCafe = {OPTIONS:OPTIONS, defaultAvatar:defaultAvatar, normalize:normalize, createScene:createScene, createPreview:createPreview, buildAvatar:buildAvatar, available:function(){ return typeof THREE !== 'undefined' && !!window.WebGLRenderingContext; }};
})();
