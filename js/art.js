// Étoile Maghreb Color (8 branches) + affiche générée pour la trame et les feuilles offset.

export const BRAND = {
  green:'#5c9247', orange:'#c1742e', purple:'#6c246f', blue:'#63a0d7',
};
// Huit encres, une par pointe (sens horaire depuis le haut-gauche), d'après le logo :
// vert (2 pointes), orange (2), violet (2), bleu (2).
export const PETAL_INKS = ['#4d7a3f','#5c9247','#c9792f','#b8622c','#6c246f','#5a1f5d','#6dacdf','#5e99d1'];

// Géométrie : ruban en étoile à 8 pointes (étoile extérieure 100/57, découpe intérieure 40/26).
const RO = 100, RC = 57, IO = 40, IC = 26;
const P = (r, deg) => { const a = deg*Math.PI/180; return [r*Math.sin(a), -r*Math.cos(a)]; };
const f = (p) => p.map(v => v.toFixed(2)).join(' ');
const ang = (k) => -45 + k*45; // pointe k
/** Une pointe complète du ruban (pour plaques & masques). */
export function petalPath(k){
  const a = ang(k);
  return `M${f(P(RC,a-22.5))} L${f(P(RO,a))} L${f(P(RC,a+22.5))} L${f(P(IC,a+22.5))} L${f(P(IO,a))} L${f(P(IC,a-22.5))} Z`;
}
/** Demi-pointe : side 0 = face claire, 1 = face sombre (pli du ruban). */
export function halfPath(k, side){
  const a = ang(k), b = side ? a+22.5 : a-22.5;
  return `M${f(P(RO,a))} L${f(P(RC,b))} L${f(P(IC,b))} L${f(P(IO,a))} Z`;
}
export const PETAL_D = petalPath(1); // compat
const shade = (hex, t) => { const n = parseInt(hex.slice(1),16); const c = [n>>16,(n>>8)&255,n&255].map(v => Math.round(t>0 ? v+(255-v)*t : v*(1+t)));
  return '#'+c.map(v => v.toString(16).padStart(2,'0')).join(''); };

export function starSVG(colors = PETAL_INKS, extra = ''){
  const parts = colors.map((c,k) => `<path d="${halfPath(k,0)}" fill="${shade(c,.12)}"/><path d="${halfPath(k,1)}" fill="${shade(c,-.12)}" stroke="${shade(c,-.12)}" stroke-width=".6"/>`).join('');
  return `<svg viewBox="-104 -104 208 208" ${extra}>${parts}</svg>`;
}
export function plainStar(){ return Array.from({length:8}, (_,k) => `<path d="${petalPath(k)}"/>`).join(''); }

export function drawStar(ctx, x, y, r, colors = PETAL_INKS, rot = 0){
  ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.scale(r/100, r/100);
  colors.forEach((c,k) => {
    ctx.fillStyle = shade(c,.12); ctx.fill(new Path2D(halfPath(k,0)));
    ctx.fillStyle = shade(c,-.12); ctx.fill(new Path2D(halfPath(k,1)));
    ctx.strokeStyle = shade(c,-.12); ctx.lineWidth = .6; ctx.stroke(new Path2D(halfPath(k,1)));
  });
  ctx.restore();
}

// Zellige : étoile à 8 pointes (deux carrés superposés)
function zStar(ctx, x, y, r){
  ctx.beginPath();
  for(let i=0;i<16;i++){ const a = i*Math.PI/8 - Math.PI/2; const rr = i%2 ? r*.62 : r;
    ctx.lineTo(x+Math.cos(a)*rr, y+Math.sin(a)*rr); }
  ctx.closePath();
}

/** Affiche « Maghreb Color » : dégradé couchant + zellige + étoile + typo. */
export function drawPoster(ctx, w, h, opts = {}){
  const g = ctx.createLinearGradient(0,0,w,h);
  g.addColorStop(0,'#f6c453'); g.addColorStop(.35,'#e2742f'); g.addColorStop(.7,'#7a2a7e'); g.addColorStop(1,'#1e3f78');
  ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
  // soleil
  const s = Math.min(w,h);
  const rg = ctx.createRadialGradient(w*.72,h*.36,0,w*.72,h*.36,s*.42);
  rg.addColorStop(0,'rgba(255,240,180,.95)'); rg.addColorStop(.5,'rgba(255,190,90,.45)'); rg.addColorStop(1,'rgba(255,190,90,0)');
  ctx.fillStyle = rg; ctx.fillRect(0,0,w,h);
  // zellige
  const cell = s*.12;
  const cols = ['#5c9247','#63a0d7','#f2eee5','#c1742e','#6c246f','#1d2f5c'];
  ctx.save(); ctx.globalAlpha = .82;
  for(let y=-1, row=0; y*cell < h*.55+cell; y++, row++){
    for(let x=-1; x*cell < w+cell; x++){
      const cx = x*cell + (row%2 ? cell/2 : 0), cy = h - y*cell*.9 - cell*.3;
      const k = Math.abs((x*7 + y*13)) % cols.length;
      ctx.fillStyle = cols[k]; zStar(ctx, cx, cy, cell*.5); ctx.fill();
      ctx.fillStyle = cols[(k+3)%cols.length]; zStar(ctx, cx, cy, cell*.22); ctx.fill();
    }
  }
  ctx.restore();
  // fondu vers le haut du zellige
  const fg = ctx.createLinearGradient(0,h*.35,0,h*.62);
  fg.addColorStop(0,'rgba(226,116,47,1)'); fg.addColorStop(1,'rgba(226,116,47,0)');
  // arches
  ctx.fillStyle = 'rgba(20,16,30,.88)';
  const aw = w*.12;
  for(let i=0;i<4;i++){
    const ax = w*.06 + i*aw*1.25, ay = h*.62, ah = h*.3;
    ctx.beginPath(); ctx.moveTo(ax, ay+ah); ctx.lineTo(ax, ay);
    ctx.quadraticCurveTo(ax, ay-aw*.6, ax+aw/2, ay-aw*.9);
    ctx.quadraticCurveTo(ax+aw, ay-aw*.6, ax+aw, ay); ctx.lineTo(ax+aw, ay+ah); ctx.closePath();
    ctx.globalAlpha = .25 + i*.1; ctx.fill();
  }
  ctx.globalAlpha = 1;
  // étoile
  drawStar(ctx, w*.72, h*.36, s*.26, PETAL_INKS, opts.rot||0);
  // typo
  ctx.fillStyle = '#111';
  ctx.font = `900 ${Math.round(s*.13)}px Unbounded, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText('MAGHREB', w*.05, h*.06);
  ctx.fillStyle = '#fff';
  ctx.fillText('COLOR', w*.05, h*.06 + s*.13);
  ctx.font = `600 ${Math.round(s*.028)}px "JetBrains Mono", monospace`;
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.fillText('FLEXO · OFFSET · MAROC', w*.055, h*.06 + s*.29);
  ctx.font = `700 ${Math.round(s*.07)}px "Reem Kufi", sans-serif`;
  ctx.textAlign = 'right'; ctx.fillStyle = '#fff';
  ctx.fillText('مغرب كولور', w*.95, h*.84);
  ctx.textAlign = 'left';
  // gamme de contrôle
  const bh = Math.max(6, h*.025), seq = ['#00aeef','#ec008c','#ffe600','#111','#5c9247','#c1742e','#6c246f','#63a0d7'];
  for(let i=0;i<24;i++){ ctx.fillStyle = seq[i%seq.length]; ctx.globalAlpha = 1 - (Math.floor(i/8))*.3; ctx.fillRect(i*w/24, h-bh, w/24+1, bh); }
  ctx.globalAlpha = 1;
}
