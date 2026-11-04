import { createHalftone } from './halftone.js?v=11';
import { starSVG, plainStar, petalPath, drawPoster, drawStar, PETAL_INKS, BRAND } from './art.js?v=11';

// Coordonnées de contact
const CONFIG = {
  email: 'ziani@maghrebcolor.com',
  phone: '+212 5 22 31 31 33',
  address: 'Zone industrielle Sapino, Nouaceur, Casablanca',
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);
document.body.classList.add('loading');

/* ---------- étoiles ---------- */
$$('[data-star]').forEach(el => el.innerHTML = starSVG());
const plainPetals = plainStar();
$('#star-shape').innerHTML = plainPetals;
$('#star-mark').innerHTML = plainPetals;

/* ---------- config contact ---------- */
$('[data-cfg="email"]').textContent = CONFIG.email; $('[data-cfg="email"]').href = `mailto:${CONFIG.email}`;
$('[data-cfg="phone"]').textContent = CONFIG.phone; $('[data-cfg="phone"]').href = `tel:${CONFIG.phone.replace(/\s/g,'')}`;
$('[data-cfg="address"]').textContent = CONFIG.address;
$('#yr').textContent = new Date().getFullYear();

/* ---------- gamme de contrôle (hero) ---------- */
const cb = $('.colorbar');
const seq = ['#00aeef','#ec008c','#ffe600','#111', ...PETAL_INKS, '#f2eee5','#888'];
for(let i=0;i<48;i++){ const s = document.createElement('span'); s.style.background = seq[i%seq.length]; s.style.opacity = 1 - Math.floor(i/seq.length)*.22; cb.appendChild(s); }

/* ---------- smooth scroll + vitesse ---------- */
let lenis = null;
if(!reduce && window.Lenis){
  lenis = new Lenis({ lerp:.09, wheelMultiplier:.9 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t*1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const t = $(a.getAttribute('href')); if(!t) return; e.preventDefault();
  lenis ? lenis.scrollTo(t, { duration:1.8 }) : t.scrollIntoView({ behavior:'smooth' });
}));
let mis = 0, lastY = scrollY;

/* ---------- curseur ---------- */
const cur = $('#cursor'), curLabel = $('.cur-label');
let cx = innerWidth/2, cy = innerHeight/2, tx = cx, ty = cy;
addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; });
document.addEventListener('pointerover', e => {
  const t = e.target.closest('a,button,[data-cursor],.plate,.card,.swatch,input');
  cur.classList.toggle('big', !!t);
  curLabel.textContent = t?.dataset?.cursor || (t?.classList?.contains('plate') ? 'glisser' : '');
});

/* ---------- hero : encre tramée ---------- */
const hero = createHalftone($('#hero-gl'), { mode:'ink', cell:4.2, zoom:7, loupeR:120, host:$('#hero'), dpr:1.25 });

/* ---------- manifeste ---------- */
const man = $('.manifesto');
man.innerHTML = man.textContent.split(' ').map((w,i) => {
  const col = /Maghreb|Color|cylindres|couleur|millions/.test(w) ? ` style="color:${PETAL_INKS[i%8]}"` : '';
  return `<span class="w"${col}>${w}</span>`;
}).join(' ');
const words = $$('.manifesto .w');
ScrollTrigger.create({ trigger:'#manifeste', start:'top 75%', end:'bottom 60%', scrub:true,
  onUpdate:s => { const n = Math.round(s.progress*words.length); words.forEach((w,i) => w.classList.toggle('on', i < n)); } });

/* ---------- scènes 3D (chargées à la demande) ---------- */
const scenes = {};
function steps(sel, p){ const st = $$(`${sel} .step`); const k = Math.min(st.length-1, Math.floor(p*st.length)); st.forEach((s,i) => s.classList.toggle('on', i===k)); return k; }
function lazyScene(id, loader, onP){
  let started = false;
  const io = new IntersectionObserver(([en]) => {
    if(en.isIntersecting && !started){ started = true; loader().then(s => { scenes[id] = s; s.st.visible = true; }).catch(err => console.error(id, err)); }
    if(scenes[id]) scenes[id].st.visible = en.isIntersecting;
  }, { rootMargin:'200px' });
  io.observe($(`#${id}`));
  ScrollTrigger.create({ trigger:`#${id}`, start:'top top', end:'bottom bottom', onUpdate:s => { if(scenes[id]) scenes[id].st.progress = s.progress; onP(s.progress); } });
}
const g = { speed:$('[data-gauge="speed"]'), units:$('[data-gauge="units"]'), reg:$('[data-gauge="reg"]') };
lazyScene('flexo', () => import('./flexo.js?v=11').then(m => m.createFlexo($('#flexo-gl'))), p => {
  steps('#flexo', p);
  setText(g.units, `${Math.min(8, Math.round(p*10))}/8`);
});
steps('#flexo', 0); steps('#offset', 0);
const legend = $$('.cmyk-legend span');
lazyScene('offset', () => import('./offset.js?v=12').then(m => m.createOffset($('#offset-gl'))), p => {
  steps('#offset', p);
  const n = Math.min(4, Math.floor(p*6)); legend.forEach((l,i) => l.classList.toggle('on', i < n));
});

/* ---------- loupe ---------- */
const loupe = createHalftone($('#loupe-gl'), { mode:'texture', drawSource:(c,w,h) => drawPoster(c,w,h), cell:9, zoom:6, loupeR:150, host:$('.loupe-frame'), dpr:1.5 });
if(loupe){
  document.fonts?.ready.then(() => loupe.resize());
  $('#lpi').oninput = e => loupe.st.cell = 26 - +e.target.value;
  loupe.st.cell = 26 - +$('#lpi').value;
  $('#zoom').oninput = e => loupe.st.zoom = +e.target.value;
  const seps = [['TOUTES',[1,1,1,1]],['CYAN',[1,0,0,0]],['MAGENTA',[0,1,0,0]],['JAUNE',[0,0,1,0]],['NOIR',[0,0,0,1]],['C+M',[1,1,0,0]],['C+M+J',[1,1,1,0]]];
  let si = 0;
  $('#sep-btn').onclick = () => { si = (si+1)%seps.length; loupe.st.sep = seps[si][1]; $('#sep-btn').textContent = `SÉPARATIONS : ${seps[si][0]}`; };
}
const vis = (el, obj) => obj && new IntersectionObserver(([en]) => obj.st.visible = en.isIntersecting).observe(el);
vis($('#hero'), hero); vis($('.loupe-frame'), loupe);

/* ---------- calage ---------- */
const hex2rgb = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16)/255);
const toCmyk = h => { const [r,gg,b] = hex2rgb(h); const k = 1-Math.max(r,gg,b); return [...[r,gg,b].map(v => (1-v-k)/(1-k||1)), k]; };
const svg = $('#cal-svg');
const PLATES = [['c','#00aeef'],['m','#ec008c'],['y','#ffe600'],['k','#1a1a1a']];
const mark = (x,y,c) => `<g transform="translate(${x} ${y})" stroke="${c}" fill="none" stroke-width="1.2"><circle r="7"/><line x1="-12" x2="12"/><line y1="-12" y2="12"/></g>`;
const plates = PLATES.map(([id,col], pi) => {
  const petals = PETAL_INKS.map((h,i) => `<path d="${petalPath(i)}" fill="${col}" fill-opacity="${toCmyk(h)[pi].toFixed(2)}"/>`).join('');
  const extra = id === 'k' ? `<text x="0" y="128" text-anchor="middle" font-family="Unbounded" font-weight="900" font-size="17" fill="#1a1a1a">MAGHREB COLOR</text>` : '';
  const gEl = document.createElementNS('http://www.w3.org/2000/svg','g');
  gEl.setAttribute('class','plate'); gEl.dataset.id = id;
  gEl.innerHTML = `<rect x="-160" y="-160" width="320" height="320" fill="transparent"/><g transform="translate(0 -12) scale(1.02)">${petals}</g>${extra}${mark(-138,-138,col)}${mark(138,-138,col)}${mark(-138,138,col)}${mark(138,138,col)}`;
  svg.appendChild(gEl);
  return { el:gEl, id, x:0, y:0 };
});
// seul le contenu dessiné capte le pointeur
plates.forEach(p => p.el.querySelector('rect').setAttribute('pointer-events','none'));
const calOk = $('.calage-ok');
function drawPlates(){
  let worst = 0;
  plates.forEach(p => {
    p.el.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
    const d = Math.hypot(p.x,p.y); worst = Math.max(worst,d);
    $(`[data-err="${p.id}"]`).textContent = `${(d*.02).toFixed(2)} mm`;
  });
  calOk.classList.toggle('on', worst < 2.5);
}
function mess(){ plates.forEach((p,i) => gsap.to(p, { x:(Math.random()-.5)*90, y:(Math.random()-.5)*90, duration:.9, ease:'elastic.out(1,.6)', onUpdate:drawPlates })); }
plates.forEach((p,i) => { p.x = [-38,30,8,-12][i]; p.y = [-22,-30,34,18][i]; });
drawPlates();
let drag = null;
svg.addEventListener('pointerdown', e => {
  const gEl = e.target.closest('.plate'); if(!gEl) return;
  drag = { p:plates.find(p => p.el === gEl), sx:e.clientX, sy:e.clientY };
  drag.ox = drag.p.x; drag.oy = drag.p.y; svg.setPointerCapture(e.pointerId);
  svg.appendChild(gEl);
});
svg.addEventListener('pointermove', e => {
  if(!drag) return; const k = 320/svg.getBoundingClientRect().width;
  drag.p.x = drag.ox + (e.clientX-drag.sx)*k; drag.p.y = drag.oy + (e.clientY-drag.sy)*k;
  if(Math.hypot(drag.p.x, drag.p.y) < 4){ drag.p.x = 0; drag.p.y = 0; } // aimant
  drawPlates();
});
svg.addEventListener('pointerup', () => drag = null);
$('#auto-cal').onclick = () => plates.forEach((p,i) => gsap.to(p, { x:0, y:0, duration:1.4, delay:i*.12, ease:'expo.inOut', onUpdate:drawPlates }));
$('#mess-cal').onclick = mess;

/* ---------- nuancier ---------- */
const SWATCHES = [
  ['Bleu Majorelle','#3d4fc4'],['Indigo Chefchaouen','#5a86c9'],['Menthe de Meknès','#5c9247'],['Vert Zellige','#1f7a5a'],
  ['Safran de Taliouine','#e8a21c'],['Ocre de Marrakech','#c1742e'],['Terre de Fès','#8a4b2a'],['Rose de Kelâa','#d9708f'],
  ['Grenat du Souk','#7a1f3d'],['Violet Maghreb','#6c246f'],['Sable d’Erg Chebbi','#e3c08d'],['Nuit de l’Atlas','#1b2238'],
];
const fan = $('#fan');
const tint = (h, a) => { const [r,gg,b] = hex2rgb(h); return `rgb(${[r,gg,b].map(v => Math.round((v*a + (1-a))*255)).join(',')})`; };
SWATCHES.forEach(([name,hex],i) => {
  const [c,m,y,k] = toCmyk(hex).map(v => Math.round(v*100));
  const el = document.createElement('div'); el.className = 'swatch'; el.style.zIndex = i;
  el.dataset.cursor = hex;
  el.innerHTML = `<div class="chip" style="background:${hex}"></div><div class="chip" style="background:${tint(hex,.65)}"></div><div class="chip" style="background:${tint(hex,.35)}"></div>
    <div class="lbl"><b>${name}</b>MC ${String(101+i*7)} C<br>C${c} M${m} J${y} N${k}<br>${hex.toUpperCase()}</div><i class="hole"></i>`;
  fan.appendChild(el);
});
const sws = $$('.swatch');
const fanSet = p => { const e = gsap.parseEase('power3.out')(p); sws.forEach((s,i) => { s.style.transform = `rotate(${((i-(sws.length-1)/2)*11*e - 8*(1-e)).toFixed(2)}deg)`; }); };
fanSet(0);
ScrollTrigger.create({ trigger:'#nuancier', start:'top top', end:'bottom bottom', scrub:true, onUpdate:s => fanSet(Math.min(1, s.progress*1.6)) });

/* ---------- produits ---------- */
const PRODUCTS = [
  ['etiquettes','Étiquettes adhésives','Flexo','Agroalimentaire, cosmétique, pharma. En bobines, prêtes pour la pose.'],
  ['souple','Emballage souple','Flexo','Films, sachets, doypacks : barrière, brillance, tenue.'],
  ['carton','Cartonnage','Offset','Étuis et boîtes pliantes, du prototype à la série.'],
  ['sacs','Sacs & sachets','Flexo','Kraft, papier, plastique : votre marque en circulation.'],
  ['catalogues','Catalogues & brochures','Offset','Couleurs fidèles, piqûre ou dos carré collé.'],
  ['affiches','Affiches & PLV','Offset','Grands formats qui arrêtent le regard en magasin.'],
  ['papeterie','Papeterie d’entreprise','Offset','Cartes, en-têtes, enveloppes, chemises.'],
  ['menus','Packaging alimentaire','Flexo / Offset','Gobelets, boîtes, wraps : encres adaptées au contact alimentaire.'],
];
function drawProduct(ctx, type, w, h){
  const bg = ctx.createLinearGradient(0,0,w,h); bg.addColorStop(0,'#16161b'); bg.addColorStop(1,'#0b0b0d');
  ctx.fillStyle = bg; ctx.fillRect(0,0,w,h);
  const cx = w/2, cy = h*.42, s = w;
  ctx.save();
  // halo couleur
  const hg = ctx.createRadialGradient(cx,cy,0,cx,cy,s*.6);
  hg.addColorStop(0, PETAL_INKS[(type.length*3)%8]+'66'); hg.addColorStop(1,'#0000');
  ctx.fillStyle = hg; ctx.fillRect(0,0,w,h);
  const star = (x,y,r,rot=0) => drawStar(ctx,x,y,r,PETAL_INKS,rot);
  ctx.lineJoin = 'round';
  if(type === 'etiquettes'){
    ctx.fillStyle = '#f3f1ec'; ctx.beginPath(); ctx.arc(cx-s*.08,cy-s*.05,s*.28,0,7); ctx.fill();
    for(let r=s*.27;r>s*.08;r-=4){ ctx.strokeStyle='rgba(0,0,0,.07)'; ctx.beginPath(); ctx.arc(cx-s*.08,cy-s*.05,r,0,7); ctx.stroke(); }
    ctx.fillStyle = '#2b2b30'; ctx.beginPath(); ctx.arc(cx-s*.08,cy-s*.05,s*.08,0,7); ctx.fill();
    ctx.fillStyle = '#f3f1ec'; ctx.fillRect(cx+s*.2-s*.13, cy-s*.05, s*.26, h*.6);
    for(let i=0;i<3;i++){ const y = cy + s*.02 + i*s*.24; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(cx+s*.2-s*.11, y, s*.22, s*.2, 10); ctx.fill(); star(cx+s*.2, y+s*.1, s*.08, i); }
  } else if(type === 'souple'){
    ctx.fillStyle = BRAND.purple; ctx.beginPath(); ctx.moveTo(cx-s*.24,cy-s*.32); ctx.lineTo(cx+s*.24,cy-s*.32);
    ctx.quadraticCurveTo(cx+s*.3,cy+s*.1,cx+s*.26,cy+s*.42); ctx.quadraticCurveTo(cx,cy+s*.5,cx-s*.26,cy+s*.42);
    ctx.quadraticCurveTo(cx-s*.3,cy+s*.1,cx-s*.24,cy-s*.32); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx-s*.22,cy-s*.24); ctx.lineTo(cx+s*.22,cy-s*.24); ctx.stroke();
    const gl = ctx.createLinearGradient(cx-s*.24,0,cx+s*.24,0); gl.addColorStop(0,'rgba(255,255,255,0)'); gl.addColorStop(.3,'rgba(255,255,255,.25)'); gl.addColorStop(.4,'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(cx-s*.26,cy-s*.32,s*.52,s*.8);
    star(cx, cy+s*.08, s*.15);
  } else if(type === 'carton'){
    const a = s*.22, b = s*.13;
    const P = (x,y) => [cx + (x-y)*a*.9, cy + (x+y)*b*.9];
    const face = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach(([x,y],i) => i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.fill(); };
    const H = s*.36;
    const t0=P(-1,-1),t1=P(1,-1),t2=P(1,1),t3=P(-1,1);
    face([t3,t2,[t2[0],t2[1]+H],[t3[0],t3[1]+H]], BRAND.orange);
    face([t2,t1,[t1[0],t1[1]+H],[t2[0],t2[1]+H]], '#8f5222');
    face([t0,t1,t2,t3], '#e9a15a');
    star((t3[0]+t2[0])/2, (t3[1]+t2[1])/2+H/2, s*.09);
  } else if(type === 'sacs'){
    ctx.strokeStyle = '#c9a36b'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx,cy-s*.2,s*.12,Math.PI,0); ctx.stroke();
    ctx.fillStyle = '#c9a36b'; ctx.beginPath(); ctx.moveTo(cx-s*.26,cy-s*.2); ctx.lineTo(cx+s*.26,cy-s*.2); ctx.lineTo(cx+s*.3,cy+s*.45); ctx.lineTo(cx-s*.3,cy+s*.45); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(cx+s*.12,cy-s*.2,s*.06,s*.65);
    star(cx, cy+s*.1, s*.17);
  } else if(type === 'catalogues'){
    for(let i=4;i>=0;i--){ ctx.save(); ctx.translate(cx,cy+s*.05); ctx.rotate((i-2)*.12);
      ctx.fillStyle = i ? '#f3f1ec' : '#fff'; ctx.shadowColor='rgba(0,0,0,.4)'; ctx.shadowBlur=20;
      ctx.fillRect(-s*.2,-s*.28,s*.4,s*.56); ctx.shadowBlur=0;
      ctx.fillStyle = PETAL_INKS[i*2%8]; ctx.fillRect(-s*.2,-s*.28,s*.4,s*.25);
      if(!i){ star(0,-s*.155,s*.09); ctx.fillStyle='#222'; for(let l=0;l<5;l++) ctx.fillRect(-s*.16,s*.02+l*s*.045,s*(.32-l%2*.08),4); }
      ctx.restore(); }
  } else if(type === 'affiches'){
    ctx.save(); ctx.translate(cx,cy+s*.05); ctx.rotate(-.06);
    const pw = s*.5, ph = s*.7; const c2 = document.createElement('canvas'); c2.width = 400; c2.height = 560;
    drawPoster(c2.getContext('2d'),400,560); ctx.shadowColor='rgba(0,0,0,.5)'; ctx.shadowBlur=30;
    ctx.drawImage(c2,-pw/2,-ph/2,pw,ph); ctx.restore();
  } else if(type === 'papeterie'){
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(.08);
    ctx.fillStyle='#f3f1ec'; ctx.fillRect(-s*.3,-s*.2,s*.6,s*.4);
    ctx.fillStyle='#ddd8cc'; ctx.beginPath(); ctx.moveTo(-s*.3,-s*.2); ctx.lineTo(0,s*.03); ctx.lineTo(s*.3,-s*.2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(cx-s*.05,cy+s*.22); ctx.rotate(-.12);
    ctx.fillStyle='#fff'; ctx.shadowColor='rgba(0,0,0,.4)'; ctx.shadowBlur=18; ctx.fillRect(-s*.2,-s*.12,s*.4,s*.24); ctx.shadowBlur=0;
    star(-s*.12,0,s*.06); ctx.fillStyle='#222'; ctx.fillRect(-s*.03,-s*.03,s*.17,5); ctx.fillRect(-s*.03,s*.02,s*.12,3); ctx.restore();
  } else {
    ctx.fillStyle = '#f3f1ec';
    ctx.beginPath(); ctx.moveTo(cx-s*.17,cy-s*.2); ctx.lineTo(cx+s*.17,cy-s*.2); ctx.lineTo(cx+s*.13,cy+s*.42); ctx.lineTo(cx-s*.13,cy+s*.42); ctx.fill();
    ctx.fillStyle = BRAND.green; ctx.fillRect(cx-s*.19,cy-s*.25,s*.38,s*.06);
    ctx.fillStyle = BRAND.orange; ctx.fillRect(cx-s*.155,cy+s*.2,s*.31,s*.06);
    star(cx, cy+s*.05, s*.12);
  }
  ctx.restore();
}
const track = $('#track');
PRODUCTS.forEach(([type,name,tech,desc], i) => {
  const card = document.createElement('article'); card.className = 'card'; card.dataset.cursor = 'voir';
  card.innerHTML = `<canvas></canvas><div class="foil"></div><div class="meta"><span class="mono">${String(i+1).padStart(2,'0')} · ${tech}</span><h3>${name}</h3><p>${desc}</p></div>`;
  track.appendChild(card);
  const cv = card.querySelector('canvas');
  const paint = () => { const r = card.getBoundingClientRect(), d = Math.min(2, devicePixelRatio);
    cv.width = r.width*d; cv.height = r.height*d; const c = cv.getContext('2d'); c.scale(d,d); drawProduct(c,type,r.width,r.height); };
  paint(); document.fonts?.ready.then(paint);
  card.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect(), x = (e.clientX-r.left)/r.width, y = (e.clientY-r.top)/r.height;
    card.style.transform = `perspective(900px) rotateY(${(x-.5)*14}deg) rotateX(${(.5-y)*14}deg)`;
    card.style.setProperty('--fx', `${x*100}%`); card.style.setProperty('--fy', `${y*100}%`);
  });
  card.addEventListener('pointerleave', () => card.style.transform = '');
});
ScrollTrigger.create({ trigger:'#produits', start:'top top', end:'bottom bottom', scrub:true,
  onUpdate:s => { track.style.transform = `translateX(${-s.progress*Math.max(0, track.scrollWidth - innerWidth)}px)`; } });

/* ---------- marquee ---------- */
const mqWords = ['Flexographie','Offset','Étiquettes','Emballage souple','Cartonnage','Pantone','Sacs','Catalogues','Bon à tirer'];
$('.mq-inner').innerHTML = [...mqWords, ...mqWords].map(w => `<span>${w}</span><i>✳</i>`).join('');

/* ---------- éclaboussure d'encre (CTA) ---------- */
const sc = $('#splash'), sx = sc.getContext('2d');
let blobs = [];
function sizeSplash(){ const r = sc.getBoundingClientRect(); sc.width = r.width; sc.height = r.height; }
sizeSplash(); addEventListener('resize', sizeSplash);
function splash(x, y){
  const cols = [...PETAL_INKS, '#00aeef','#ec008c','#ffe600'];
  for(let i=0;i<34;i++){ const a = Math.random()*Math.PI*2, v = 4+Math.random()*16;
    blobs.push({ x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, r:6+Math.random()*30, c:cols[i%cols.length], life:1, pts:Array.from({length:9},()=>.75+Math.random()*.5) }); }
}
function drawSplash(){
  if(!blobs.length) return;
  sx.globalCompositeOperation = 'source-over';
  sx.fillStyle = 'rgba(10,10,12,.04)'; sx.fillRect(0,0,sc.width,sc.height);
  sx.globalCompositeOperation = 'screen';
  blobs.forEach(b => { b.x += b.vx; b.y += b.vy; b.vx *= .93; b.vy *= .93; b.r *= 1.012; b.life -= .008;
    sx.fillStyle = b.c; sx.globalAlpha = Math.max(0,b.life)*.85; sx.beginPath();
    b.pts.forEach((p,i) => { const a = i/b.pts.length*Math.PI*2; sx.lineTo(b.x+Math.cos(a)*b.r*p, b.y+Math.sin(a)*b.r*p); });
    sx.fill(); });
  sx.globalAlpha = 1;
  blobs = blobs.filter(b => b.life > 0);
  if(!blobs.length) sx.clearRect(0,0,sc.width,sc.height);
}
/* ---------- formulaire de devis (contact.php sur Hostinger) ---------- */
const qf = $('#quote-form'), qStatus = $('.q-status'), qSend = $('.q-send');
$('#print-btn').addEventListener('click', e => {
  const r = sc.getBoundingClientRect(); splash(e.clientX-r.left, e.clientY-r.top);
  qf.classList.add('open');
  setTimeout(() => { lenis ? lenis.scrollTo(qf, { offset:-140, duration:1.1 }) : qf.scrollIntoView({ behavior:'smooth', block:'center' }); }, 120);
  setTimeout(() => qf.querySelector('input[name="name"]').focus({ preventScroll:true }), 450);
});
const qMsg = (txt, ok) => { qStatus.innerHTML = txt; qStatus.className = 'q-status ' + (ok ? 'ok' : 'err'); };
const qFallback = `Envoi impossible pour le moment. Écrivez-nous à <a href="mailto:${CONFIG.email}">${CONFIG.email}</a> ou appelez le <a href="tel:${CONFIG.phone.replace(/\s/g,'')}">${CONFIG.phone}</a>.`;
qf.addEventListener('submit', async e => {
  e.preventDefault();
  const name = qf.elements.name.value.trim(), phone = qf.elements.phone.value.trim();
  qf.querySelectorAll('[required]').forEach(i => i.classList.toggle('bad', !i.value.trim()));
  if(!name || !phone){ qMsg('Merci d’indiquer votre nom et votre téléphone.', false); return; }
  const em = qf.elements.email; const emOk = !em.value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim());
  em.classList.toggle('bad', !emOk);
  if(!emOk){ qMsg('Cette adresse e-mail ne semble pas valide.', false); return; }
  qSend.disabled = true; const label = qSend.textContent; qSend.textContent = 'Envoi…'; qMsg('', true);
  try {
    const res = await fetch('contact.php', { method:'POST', body:new FormData(qf), headers:{ 'X-Requested-With':'XMLHttpRequest' } });
    const data = await res.json().catch(() => ({ ok:false }));
    if(data.ok){
      qMsg('Merci ! Votre demande est bien partie. Nous vous recontactons très vite.', true);
      qf.reset();
      const b = qSend.getBoundingClientRect(), r = sc.getBoundingClientRect();
      splash(b.left + b.width/2 - r.left, b.top + b.height/2 - r.top);
    } else qMsg(qFallback, false);
  } catch { qMsg(qFallback, false); }
  qSend.disabled = false; qSend.textContent = label;
});
$('#contact').addEventListener('pointerdown', e => { if(e.target.closest('button,a,form')) return; const r = sc.getBoundingClientRect(); splash(e.clientX-r.left, e.clientY-r.top); });

/* ---------- jauges : valeurs lissées, écrites ~8 fois/s ---------- */
const setText = (el, t) => { if(el.textContent !== t) el.textContent = t; };
const gs = { speed:320, reg:.015, regT:.015, regNext:0, write:0 };
function updateGauges(dt, boost){
  gs.speed += (320 + boost*120 - gs.speed) * Math.min(1, dt*3);
  gs.regNext -= dt;
  if(gs.regNext <= 0){ gs.regT = .01 + Math.random()*.02 + Math.min(.04, mis*.003); gs.regNext = .9; }
  gs.reg += (gs.regT - gs.reg) * Math.min(1, dt*2.5);
  gs.write -= dt;
  if(gs.write > 0) return;
  gs.write = .125;
  setText(g.speed, String(Math.round(gs.speed/5)*5).padStart(3,'0'));
  setText(g.reg, `±${gs.reg.toFixed(2)}`);
}

/* ---------- boucle principale ---------- */
let last = performance.now();
gsap.ticker.add(() => {
  const now = performance.now(), dt = Math.min(.05, (now-last)/1000); last = now;
  const y = lenis ? lenis.scroll : scrollY;
  const v = lenis ? lenis.velocity : (y-lastY); lastY = y;
  mis += (Math.min(16, Math.abs(v)*.5) - mis)*.12;
  document.documentElement.style.setProperty('--mx', `${mis.toFixed(2)}px`);
  if(hero){ hero.st.mis = mis*.7; hero.frame(dt); }
  if(loupe) loupe.frame(dt);
  if(scenes.flexo){ scenes.flexo.st.boost = Math.min(2.5, Math.abs(v)*.06); scenes.flexo.frame(dt);
    updateGauges(dt, scenes.flexo.st.boost); }
  if(scenes.offset) scenes.offset.frame(dt);
  cx += (tx-cx)*.22; cy += (ty-cy)*.22; cur.style.transform = `translate(${cx}px,${cy}px)`;
  drawSplash();
});

/* ---------- loader : calage des plaques ---------- */
const ld = $('#loader');
const pl = { c:$('.p-c'), m:$('.p-m'), y:$('.p-y'), k:$('.p-k') };
const off = { c:[-46,-30,-14], m:[40,-24,10], y:[8,44,-8], k:[-20,30,20] };
const prog = { p:0 };
const bars = $$('.ld-bar i'), pct = $('.ld-pct');
const tl = gsap.timeline();
tl.to(prog, { p:1, duration:reduce ? .3 : 2.1, ease:'power2.inOut', onUpdate:() => {
  const p = prog.p, e = 1 - Math.pow(1-p, 3);
  Object.entries(off).forEach(([k,[x,y,r]]) => pl[k].setAttribute('transform', `translate(${x*(1-e)} ${y*(1-e)}) rotate(${r*(1-e)})`));
  bars.forEach((b,i) => b.style.setProperty('--p', Math.min(1, Math.max(0, p*4 - i))));
  pct.textContent = String(Math.round(p*100)).padStart(3,'0');
}});
tl.call(() => { $('.ld-meta span').textContent = 'BON À TIRER ✓'; });
tl.to('.ld-star', { scale:1.12, duration:.25, ease:'power2.out' });
tl.to(ld, { clipPath:'inset(0 0 100% 0)', duration:1, ease:'expo.inOut' }, '+=.2');
tl.from('.mega', { yPercent:110, opacity:0, stagger:.1, duration:1.1, ease:'expo.out' }, '-=.55');
tl.from('.hero-inner .kicker, .hero-sub, .arab, .hero-hint', { opacity:0, y:20, stagger:.08, duration:.8 }, '-=.8');
tl.call(() => { ld.remove(); document.body.classList.remove('loading'); lenis?.start(); ScrollTrigger.refresh(); });

/* ---------- apparitions ---------- */
$$('.big, .loupe-head p, .calage-text p, .fan-head p').forEach(el => gsap.from(el, { y:50, opacity:0, duration:1, ease:'expo.out', scrollTrigger:{ trigger:el, start:'top 88%' } }));
