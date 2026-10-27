/* Studio Của Khang – bộ dựng "Chỉnh Mặt" bằng WebGL: làm mịn da, trang điểm, nét nam, biến dạng gương mặt theo điểm mốc.
   Thứ tự: (1) làm đẹp + trang điểm trên ảnh gốc (mặt nạ theo điểm mốc), (2) biến dạng cục bộ (liquify) cho mọi khuôn mặt. */
(function () {
  'use strict';
  const S = (window.S = window.S || {});

  /* ---------------- chỉ số điểm mốc MediaPipe (478) ---------------- */
  const L = {
    oval: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
    jawR: [234, 93, 132, 58, 172, 136, 150, 149, 176, 148], jawL: [454, 323, 361, 288, 397, 365, 379, 378, 400, 377],
    eyeR: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
    eyeL: [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466],
    upR: [133, 173, 157, 158, 159, 160, 161, 246, 33], upL: [362, 398, 384, 385, 386, 387, 388, 466, 263],
    loR: [133, 155, 154, 153, 145, 144, 163, 7, 33], loL: [362, 382, 381, 380, 374, 373, 390, 249, 263],
    browR: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46], browL: [300, 293, 334, 296, 336, 285, 295, 282, 283, 276],
    browLoR: [55, 65, 52, 53, 46], browLoL: [285, 295, 282, 283, 276],
    lipO: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146],
    lipI: [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95],
  };
  S.FACE_IDX = L;

  /* ---------------- hình học khuôn mặt ---------------- */
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y }), add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  const mul = (a, k) => ({ x: a.x * k, y: a.y * k }), dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const nrm = a => { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; };
  const dot = (a, b) => a.x * b.x + a.y * b.y;
  function geom(P) {
    const fw = dist(P[234], P[454]), fh = dist(P[10], P[152]);
    const ux = nrm(sub(P[454], P[234]));
    let uy = { x: -ux.y, y: ux.x }; if (dot(uy, sub(P[152], P[10])) < 0) uy = mul(uy, -1);
    const mid = P[168];
    const c = lerp(P[10], P[152], 0.5);
    return { fw, fh, ux, uy, mid, c, ang: Math.atan2(ux.y, ux.x) };
  }
  S.faceGeom = geom;
  const side = (g, q) => Math.sign(dot(sub(q, g.mid), g.ux)) || 1; // +1: bên trái ảnh nhìn từ người xem bên phải

  /* ---------------- biến dạng (liquify) ---------------- */
  // op: [cx, cy, r, type(0=dịch,1=phóng), vx, vy, s, faceIdx]
  function warpOps(P, p, fi) {
    const g = geom(P), ops = [];
    const T = (q, v, r) => { if (Math.hypot(v.x, v.y) > 0.01) ops.push([q.x, q.y, r, 0, v.x, v.y, 0, fi]); };
    const Sc = (q, s, r) => { if (Math.abs(s) > 1e-4) ops.push([q.x, q.y, r, 1, 0, 0, s, fi]); };
    const inward = q => mul(g.ux, -side(g, q));
    const a = k => (p[k] || 0) / 100;
    const fw = g.fw, fh = g.fh;
    // Thon mặt
    if (a('slim')) {
      const W = [[93, 323, 0.35], [132, 361, 0.7], [58, 288, 0.9], [172, 397, 1], [136, 365, 0.9], [150, 379, 0.7], [149, 378, 0.45]];
      for (const [i, j, w] of W) for (const k of [i, j]) T(P[k], add(mul(inward(P[k]), a('slim') * 0.042 * fw * w), mul(g.uy, -a('slim') * 0.008 * fw * w)), 0.24 * fw);
    }
    // Cằm V-line
    if (a('vline')) {
      const W = [[172, 397, 0.45], [136, 365, 0.8], [150, 379, 1], [149, 378, 0.9], [176, 400, 0.6], [148, 377, 0.35]];
      for (const [i, j, w] of W) for (const k of [i, j]) T(P[k], add(mul(inward(P[k]), a('vline') * 0.04 * fw * w), mul(g.uy, a('vline') * 0.006 * fw * w)), 0.2 * fw);
      T(P[152], mul(g.uy, a('vline') * 0.022 * fh), 0.2 * fw);
    }
    // Jawline góc cạnh (nam)
    if (a('jaw')) {
      const W = [[58, 288, 0.55], [172, 397, 1], [136, 365, 0.85], [150, 379, 0.45]];
      for (const [i, j, w] of W) for (const k of [i, j]) T(P[k], add(mul(inward(P[k]), -a('jaw') * 0.034 * fw * w), mul(g.uy, a('jaw') * 0.008 * fw * w)), 0.2 * fw);
      T(P[152], mul(g.uy, a('jaw') * 0.01 * fh), 0.18 * fw);
      for (const k of [148, 377]) T(P[k], mul(inward(P[k]), -a('jaw') * 0.014 * fw), 0.15 * fw);
    }
    // Mắt to
    if (a('eyes')) {
      for (const [ic, o, i] of [[468, 33, 133], [473, 263, 362]]) {
        const ew = dist(P[o], P[i]); const ctr = P[ic] ? lerp(lerp(P[o], P[i], 0.5), P[ic], 0.5) : lerp(P[o], P[i], 0.5);
        Sc(ctr, a('eyes') * 0.2, ew * 1.05);
      }
    }
    // Thu nhỏ mũi
    if (a('noseSlim')) {
      const half = dist(P[98], P[327]) / 2;
      for (const k of [98, 327]) T(P[k], mul(inward(P[k]), a('noseSlim') * 0.24 * half), half * 1.15);
      for (const k of [129, 358]) T(P[k], mul(inward(P[k]), a('noseSlim') * 0.12 * half), half * 0.9);
    }
    // Nâng mũi (nâng chóp mũi, mũi gọn hơn)
    if (a('noseLift')) {
      const nl = dist(P[168], P[2]);
      T(P[4], mul(g.uy, -a('noseLift') * 0.06 * nl), 0.42 * nl);
      T(P[2], mul(g.uy, -a('noseLift') * 0.04 * nl), 0.35 * nl);
    }
    // Miệng nhỏ / to
    if (a('mouth')) {
      const mw = dist(P[61], P[291]);
      Sc(lerp(P[13], P[14], 0.5), a('mouth') * 0.15, mw * 0.78);
    }
    // Cười nhẹ – nâng khóe miệng
    if (a('smile')) {
      const mw = dist(P[61], P[291]);
      for (const k of [61, 291]) T(P[k], add(mul(g.uy, -a('smile') * 0.055 * mw), mul(inward(P[k]), -a('smile') * 0.02 * mw)), 0.34 * mw);
    }
    // Trán
    if (a('forehead')) {
      for (const [k, w] of [[10, 1], [109, 0.8], [338, 0.8], [67, 0.55], [297, 0.55]]) T(P[k], mul(g.uy, -a('forehead') * 0.045 * fh * w), 0.3 * fw);
    }
    return ops;
  }
  S.faceWarpOps = warpOps;

  /* ---------------- shader ---------------- */
  const VS = `attribute vec2 aPos; varying vec2 vUv; uniform float uFlip;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos.x, aPos.y*uFlip, 0.0, 1.0); }`;
  const HEAD = `precision highp float; varying vec2 vUv;
float lum(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
vec3 ycc(vec3 c){ float y=dot(c,vec3(0.299,0.587,0.114)); return vec3(y,(c.b-y)*0.564+0.5,(c.r-y)*0.713+0.5); }
vec3 screen(vec3 a, vec3 b){ return 1.0-(1.0-a)*(1.0-b); }
vec3 softL(vec3 a, vec3 b){ return mix(2.0*a*b + a*a*(1.0-2.0*b), sqrt(max(a,0.0))*(2.0*b-1.0) + 2.0*a*(1.0-b), step(0.5,b)); }
`;
  // Cắt vùng mặt / thu nhỏ (4 điểm lấy mẫu)
  const FS_CROP = HEAD + `uniform sampler2D uSrc; uniform vec4 uRect; uniform vec2 uTexel;
void main(){ vec2 p = uRect.xy + vUv*uRect.zw; vec2 o = uTexel*0.5;
 vec3 c = texture2D(uSrc,p+vec2(-o.x,-o.y)).rgb+texture2D(uSrc,p+vec2(o.x,-o.y)).rgb+texture2D(uSrc,p+vec2(-o.x,o.y)).rgb+texture2D(uSrc,p+vec2(o.x,o.y)).rgb;
 gl_FragColor = vec4(c*0.25,1.0); }`;
  const FS_GAUSS = HEAD + `uniform sampler2D uSrc; uniform vec2 uDir; uniform float uSig;
void main(){ vec3 s = vec3(0.0); float ws = 0.0;
 for(int i=-6;i<=6;i++){ float x = float(i)*uSig*0.5; float w = exp(-0.5*float(i*i)*0.25); s += texture2D(uSrc, vUv + uDir*x).rgb*w; ws += w; }
 gl_FragColor = vec4(s/ws, 1.0); }`;
  // Làm mịn giữ cạnh (bilateral, 40 điểm xoắn ốc)
  const FS_BILAT = HEAD + `uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uRad; uniform float uSigR; uniform vec2 uOff[40];
void main(){ vec3 c0 = texture2D(uSrc,vUv).rgb; vec3 s = c0; float ws = 1.0; float k = -0.5/(uSigR*uSigR);
 for(int i=0;i<40;i++){ vec2 o = uOff[i]; vec3 c = texture2D(uSrc, vUv + o*uRad*uTexel).rgb; vec3 d = c-c0;
   float w = exp(k*dot(d,d) - 1.6*dot(o,o)); s += c*w; ws += w; }
 gl_FragColor = vec4(s/ws,1.0); }`;
  // Bản đồ mụn/đốm tối nhỏ: tối hơn vùng xung quanh hoặc đỏ hơn
  const FS_SPOT = HEAD + `uniform sampler2D uR0; uniform sampler2D uR2; uniform vec2 uTexel;
void main(){ vec2 o = uTexel;
 vec3 c = (texture2D(uR0,vUv).rgb*2.0 + texture2D(uR0,vUv+vec2(o.x,0.0)).rgb + texture2D(uR0,vUv-vec2(o.x,0.0)).rgb + texture2D(uR0,vUv+vec2(0.0,o.y)).rgb + texture2D(uR0,vUv-vec2(0.0,o.y)).rgb)/6.0;
 vec3 b = texture2D(uR2,vUv).rgb; vec3 qc = ycc(c), qb = ycc(b);
 float dark = (qb.x - qc.x)/max(qb.x,0.08); float red = (qc.z - qb.z)*4.0;
 float s = smoothstep(0.045, 0.14, dark + max(red,0.0)*0.5) * smoothstep(0.08, 0.18, qc.x);
 s *= 1.0 - smoothstep(0.35, 0.6, dark); // bỏ qua chỗ rất tối (lỗ mũi, tóc)
 gl_FragColor = vec4(vec3(s),1.0); }`;
  const FS_DILATE = HEAD + `uniform sampler2D uSrc; uniform vec2 uTexel;
void main(){ float m = 0.0; for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float w = 1.0 - 0.12*float(i*i+j*j); m = max(m, texture2D(uSrc, vUv + vec2(float(i),float(j))*uTexel).r*w); }
 gl_FragColor = vec4(vec3(m),1.0); }`;

  const FS_COMP = HEAD + `
uniform sampler2D uSrc, uR0, uR1, uR2, uR3, uSP, uM1, uM2, uM3, uM4;
uniform vec4 uRoi; uniform vec2 uFull; uniform vec2 uRoiTexel;
uniform vec2 uSkinCC; uniform vec2 uSkinSD; uniform float uSkinY;
uniform vec2 uRefR, uRefL; uniform float uMidX;
uniform float uSmooth, uBright, uWhite, uDark, uAcne, uTeeth, uEyeB, uTan, uOil, uSharp, uContour, uHigh;
uniform vec3 uLipCol; uniform float uLip, uGloss, uLipL;
uniform vec3 uBlushCol; uniform float uBlush; uniform vec3 uBrowCol; uniform float uBrow, uBrowThick;
uniform vec3 uShadowCol; uniform float uShadow, uLiner, uLash;
uniform float uBeard, uBeardFull; uniform vec3 uBeardCol; uniform float uCellPx; uniform vec2 uFaceC; uniform float uAng;
vec3 hash3(vec2 p){ vec3 q = fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973)); q += dot(q, q.yxz+33.33); return fract((q.xxy+q.yxx)*q.zyx); }
float segd(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*h); }
float hairs(vec2 p, float dens, float len, float wid, float aa, float seed){
 vec2 ip = floor(p); float v = 0.0;
 for(int j=-2;j<=1;j++) for(int i=-1;i<=1;i++){
   vec2 cell = ip + vec2(float(i),float(j)); vec3 h = hash3(cell + seed*17.0);
   if(h.z < dens){
     vec2 c0 = cell + h.xy; float an = (h.x-0.5)*1.1 + (h.y-0.5)*0.4; vec2 d = vec2(sin(an), cos(an));
     float l = len*(0.6+0.8*fract(h.z*7.31));
     float dd = segd(p, c0 - d*l*0.5, c0 + d*l*0.5);
     v = max(v, (1.0 - smoothstep(wid*0.5 - aa*0.5, wid*0.5 + aa*0.5, dd)) * (0.55 + 0.45*fract(h.x*13.7)));
   }
 }
 return v;
}
void main(){
 vec2 uv = vUv; vec3 o = texture2D(uSrc, uv).rgb;
 vec2 r = (uv - uRoi.xy)/uRoi.zw;
 if(r.x<0.0||r.y<0.0||r.x>1.0||r.y>1.0){ gl_FragColor = vec4(o,1.0); return; }
 vec4 m1 = texture2D(uM1,r), m2 = texture2D(uM2,r), m3 = texture2D(uM3,r), m4 = texture2D(uM4,r);
 vec3 r1 = texture2D(uR1,r).rgb, r2 = texture2D(uR2,r).rgb, r3 = texture2D(uR3,r).rgb;
 vec2 tf = 1.0/uFull;
 vec3 sb = (texture2D(uSrc,uv+vec2(tf.x,0.0)).rgb + texture2D(uSrc,uv-vec2(tf.x,0.0)).rgb + texture2D(uSrc,uv+vec2(0.0,tf.y)).rgb + texture2D(uSrc,uv-vec2(0.0,tf.y)).rgb)*0.25;
 vec3 r0 = texture2D(uR0,r).rgb;
 vec3 det = o - mix(sb, r0, 0.5);               // vân da / chi tiết nhỏ
 vec3 q = ycc(o); vec2 dz = (q.yz - uSkinCC)/uSkinSD;
 float skinP = (1.0 - smoothstep(1.8, 3.6, length(dz))) * smoothstep(uSkinY*0.25, uSkinY*0.55, q.x);
 float tight = m1.r*skinP, broad = m1.g*mix(1.0, skinP, 0.85);
 vec3 c = o;
 // làm mịn da: bilateral + giữ lại vân da
 if(uSmooth>0.0){ vec3 sm = r1 + det*mix(0.62, 0.34, uSmooth); c = mix(c, sm, clamp(tight*uSmooth*0.95,0.0,1.0)); }
 // xóa mụn (tự động + chấm tay)
 float hl = max(texture2D(uSP,r).r*uAcne*tight, m4.a);
 if(hl>0.0){ vec3 hc = mix(r2, r3, m4.a) + det*0.45; c = mix(c, hc, clamp(hl,0.0,1.0)); }
 // quầng thâm: chuyển màu tần số thấp của gò má lên vùng dưới mắt
 if(uDark>0.0){ vec3 ref = texture2D(uR3, mix(uRefR, uRefL, step(uMidX, r.x))).rgb; vec3 dl = ref - r3*0.5 - r2*0.5; dl = max(dl, vec3(-0.015)); c += dl*m1.b*uDark*0.9*mix(1.0, skinP, 0.5); }
 // giảm bóng dầu
 if(uOil>0.0){ float sp = smoothstep(0.02, 0.10, lum(c)-lum(r2)) * smoothstep(0.42, 0.75, lum(c)); c = mix(c, r2 + det*0.5, sp*uOil*0.85*tight); }
 // tông da: sáng / trắng / nâu
 if(uBright>0.0) c = mix(c, screen(c, c*0.85), broad*uBright*0.5);
 if(uWhite>0.0){ float l = lum(c); vec3 w = mix(vec3(l), c, 0.72)*1.05 + vec3(0.012,0.004,0.014); c = mix(c, w, broad*uWhite*0.75); }
 if(uTan>0.0){ vec3 t = c*vec3(0.88,0.74,0.60); float l = lum(t); t = mix(vec3(l), t, 1.12); c = mix(c, t, broad*uTan*0.7); }
 // khối nét / sắc nét (nam)
 if(uSharp>0.0) c += (c - r2)*uSharp*0.45*m1.g;
 // răng trắng
 if(uTeeth>0.0){ float l = lum(c); float mx = max(c.r,max(c.g,c.b)), mn = min(c.r,min(c.g,c.b)); float sat = (mx-mn)/max(mx,0.01);
   float w = m2.g*smoothstep(0.18,0.42,l)*(1.0-smoothstep(0.35,0.62,sat)); vec3 t = min(vec3(1.0), mix(vec3(l), c, 0.3)*1.12 + vec3(0.0,0.005,0.02)); c = mix(c, t, w*uTeeth); }
 // mắt sáng
 if(uEyeB>0.0){ vec3 e = c + (c - r2)*0.55 + 0.03; float l = lum(c); float mx = max(c.r,max(c.g,c.b)), mn = min(c.r,min(c.g,c.b)); float ws = smoothstep(0.38,0.7,l)*(1.0-smoothstep(0.2,0.45,(mx-mn)/max(mx,0.01)));
   e = mix(e, vec3(lum(e))*1.04, ws*0.5); c = mix(c, e, m2.b*uEyeB*0.75); }
 // tạo khối & bắt sáng
 if(uContour>0.0) c = mix(c, c*vec3(0.80,0.69,0.62), clamp(m4.r*uContour*0.75,0.0,1.0));
 if(uHigh>0.0) c = mix(c, screen(c, vec3(1.0,0.96,0.9)*0.42), m4.g*uHigh*0.75);
 // má hồng
 if(uBlush>0.0){ vec3 b = mix(softL(c, uBlushCol), c*uBlushCol*1.35, 0.35); c = mix(c, b, m1.a*uBlush*0.6); }
 // phấn mắt
 if(uShadow>0.0){ vec3 b = mix(c*uShadowCol*1.25, softL(c, uShadowCol), 0.45); c = mix(c, b, clamp(m3.r*uShadow*0.9,0.0,1.0)); }
 // lông mày
 if(uBrow>0.0 || uBrowThick>0.0){
   float bm = max(m2.a*uBrow, m4.b*uBrowThick);
   vec2 fp = (uv*uFull - uFaceC); fp = vec2(cos(uAng)*fp.x + sin(uAng)*fp.y, -sin(uAng)*fp.x + cos(uAng)*fp.y)/(uCellPx*0.8);
   float hn = hairs(vec2(fp.y, fp.x)*vec2(1.0,1.0), 0.75, 2.2, 0.3, 0.9/(uCellPx*0.8), 3.0);
   float tex = mix(0.55, 1.0, hn);
   c = mix(c, c*uBrowCol*1.15, clamp(bm*tex*0.75,0.0,1.0)); }
 // râu
 if(uBeard>0.0){
   float bm = m3.a; float dens = clamp(bm*uBeard*1.15, 0.0, 1.0);
   vec2 fp = (uv*uFull - uFaceC); fp = vec2(cos(uAng)*fp.x + sin(uAng)*fp.y, -sin(uAng)*fp.x + cos(uAng)*fp.y)/uCellPx;
   float aa = 1.0/uCellPx; float len = mix(0.85, 2.8, uBeardFull); float wid = mix(0.34, 0.27, uBeardFull);
   float h1 = hairs(fp, 0.85, len, wid, aa, 1.0);
   float h2 = hairs(fp*1.41 + 5.3, 0.85, len, wid, aa*1.41, 2.0);
   float h3 = hairs(fp*0.79 + 11.7, 0.8, len*0.9, wid, aa*0.79, 3.0);
   float hh = max(max(h1, h2*0.9), h3*0.8);
   float patch = 0.75 + 0.5*(hash3(floor(fp/7.0)).x*0.5 + hash3(floor(fp/3.0)+9.0).y*0.5); dens = clamp(dens*patch, 0.0, 1.0);
   float baseA = dens*mix(0.38, 0.5, uBeardFull);
   c = mix(c, c*mix(vec3(0.8,0.8,0.84), vec3(0.62,0.6,0.62), uBeardFull), baseA);
   c = mix(c, uBeardCol*(0.75+0.5*lum(o)), baseA*0.25*uBeardFull);
   vec3 hc = mix(uBeardCol, c*0.42, 0.35);
   c = mix(c, hc, clamp(hh*dens*mix(0.62, 0.9, uBeardFull), 0.0, 1.0)); }
 // kẻ mắt & mi
 if(uLiner>0.0) c = mix(c, c*0.12 + 0.01, m3.g*uLiner*0.92);
 if(uLash>0.0) c = mix(c, c*0.1, m3.b*uLash*0.9);
 // son môi
 if(uLip>0.0){
   float l = lum(c); float sh = l/max(uLipL,0.04);
   vec3 t = uLipCol*clamp(sh, 0.0, 1.6);
   vec3 matte = uLipCol*clamp(mix(1.0, sh, 0.55), 0.0, 1.2);
   t = mix(matte, t, uGloss);
   float spec = smoothstep(1.08, 1.6, sh);
   t += vec3(1.0,0.97,0.97)*spec*0.32*uGloss + uGloss*0.015;
   t = mix(t, c*uLipCol*1.6, 0.25);
   c = mix(c, t, clamp(m2.r*uLip*0.88,0.0,1.0)); }
 gl_FragColor = vec4(clamp(c,0.0,1.0),1.0);
}`;
  const MAXOPS = 64;
  const FS_WARP = HEAD + `
uniform sampler2D uSrc, uOrig; uniform vec2 uSize; uniform vec4 uA[${MAXOPS}]; uniform vec4 uB[${MAXOPS}]; uniform int uN;
uniform vec4 uFE[4]; uniform vec2 uFA[4]; uniform float uSplit; uniform float uFlipY; uniform vec4 uView;
void main(){
 vec2 uv = uView.xy + vUv*uView.zw; if(uFlipY>0.5) uv.y = uView.y + (1.0-vUv.y)*uView.w;
 if(uv.x < uSplit){ gl_FragColor = vec4(texture2D(uOrig, uv).rgb,1.0); return; }
 vec2 px = uv*uSize; vec2 d = vec2(0.0);
 for(int i=0;i<${MAXOPS};i++){ if(i>=uN) break; vec4 a = uA[i]; vec4 b = uB[i];
   vec2 rr = px - a.xy; float t = dot(rr,rr)/(a.z*a.z);
   if(t<1.0){
     int fi = int(b.w+0.5); vec4 fe = uFE[0]; vec2 fa = uFA[0];
     if(fi==1){ fe=uFE[1]; fa=uFA[1]; } else if(fi==2){ fe=uFE[2]; fa=uFA[2]; } else if(fi==3){ fe=uFE[3]; fa=uFA[3]; }
     vec2 e = px - fe.xy; e = vec2(fa.x*e.x + fa.y*e.y, -fa.y*e.x + fa.x*e.y); float ed = length(e/fe.zw);
     float prot = 1.0 - smoothstep(1.0, 1.32, ed);   // bảo vệ nền: không kéo phần xa khuôn mặt
     float w = 1.0-t; w *= w*prot;
     if(a.w<0.5) d += b.xy*w; else d += rr*(b.z*w); }
 }
 gl_FragColor = vec4(texture2D(uSrc, (px - d)/uSize).rgb, 1.0);
}`;

  function compile(gl, type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Shader: ' + gl.getShaderInfoLog(s)); return s; }
  function program(gl, fs) {
    const p = gl.createProgram(); gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Link: ' + gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); const nm = info.name.replace(/\[0\]$/, ''); u[nm] = gl.getUniformLocation(p, info.name); }
    return { p, u };
  }
  // offsets xoắn ốc (golden angle) cho bilateral
  const SPIRAL = new Float32Array(80);
  for (let i = 0; i < 40; i++) { const rr = Math.sqrt((i + 0.5) / 40), an = i * 2.399963; SPIRAL[i * 2] = Math.cos(an) * rr; SPIRAL[i * 2 + 1] = Math.sin(an) * rr; }

  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

  /* ---------------- mặt nạ vẽ bằng canvas 2D ---------------- */
  function buildMasks(P, roi, MW, MH, heals, imgW, imgH) {
    const g = geom(P);
    const sx = MW / roi.w, sy = MH / roi.h;
    const Q = i => ({ x: (P[i].x - roi.x) * sx, y: (P[i].y - roi.y) * sy });
    const QP = p => ({ x: (p.x - roi.x) * sx, y: (p.y - roi.y) * sy });
    const F = g.fw * sx;
    const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH;
    const x = cv.getContext('2d', { willReadFrequently: true });
    const OFF = MW + MH + 400;
    const path = pts => { x.beginPath(); pts.forEach((p, k) => k ? x.lineTo(p.x - OFF, p.y) : x.moveTo(p.x - OFF, p.y)); x.closePath(); };
    const smoothPath = pts => { // đường cong khép kín mượt qua các điểm
      x.beginPath(); const n = pts.length;
      for (let k = 0; k < n; k++) { const a = pts[k], b = pts[(k + 1) % n]; const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; if (!k) x.moveTo(m.x - OFF, m.y); else x.quadraticCurveTo(a.x - OFF, a.y, m.x - OFF, m.y); }
      const a = pts[0], b = pts[1]; x.quadraticCurveTo(a.x - OFF, a.y, (a.x + b.x) / 2 - OFF, (a.y + b.y) / 2); x.closePath();
    };
    const style = (blur, alpha, op) => { x.globalCompositeOperation = op || 'lighter'; x.shadowOffsetX = OFF; x.shadowOffsetY = 0; x.shadowBlur = Math.max(0.5, blur); x.shadowColor = `rgba(255,255,255,${alpha == null ? 1 : alpha})`; x.fillStyle = '#fff'; x.strokeStyle = '#fff'; };
    const fill = (pts, blur, alpha, op, smooth) => { style(blur, alpha, op); (smooth ? smoothPath : path)(pts); x.fill(); };
    const stroke = (pts, w, blur, alpha, op, closed) => { style(blur, alpha, op); x.lineWidth = w; x.lineJoin = 'round'; x.lineCap = 'round'; x.beginPath(); pts.forEach((p, k) => k ? x.lineTo(p.x - OFF, p.y) : x.moveTo(p.x - OFF, p.y)); if (closed) x.closePath(); x.stroke(); };
    const ellipse = (c, rx, ry, rot, blur, alpha, op) => { style(blur, alpha, op); x.beginPath(); x.ellipse(c.x - OFF, c.y, Math.max(0.5, rx), Math.max(0.5, ry), rot, 0, Math.PI * 2); x.fill(); };
    const clear = () => { x.globalCompositeOperation = 'source-over'; x.shadowColor = 'transparent'; x.fillStyle = '#000'; x.fillRect(0, 0, MW, MH); };
    const grab = () => { const d = x.getImageData(0, 0, MW, MH).data; const o = new Uint8Array(MW * MH); for (let i = 0, j = 0; i < o.length; i++, j += 4) o[i] = d[j]; return o; };
    const ang = g.ang;
    const ux = g.ux, uy = g.uy;
    const offs = (p, k) => ({ x: p.x + uy.x * k, y: p.y + uy.y * k }); // dịch theo hướng xuống của mặt
    const ch = [];
    const eyes = blurK => { for (const e of [L.eyeR, L.eyeL]) { fill(e.map(Q), F * blurK, 1, 'destination-out'); stroke(e.map(Q), F * 0.05, F * blurK, 1, 'destination-out', true); } };
    const brows = (w, blurK) => { for (const b of [L.browR, L.browL]) { fill(b.map(Q), F * blurK, 1, 'destination-out'); stroke(b.map(Q), F * w, F * blurK, 1, 'destination-out', true); } };
    const lipsOut = (w, blurK) => { fill(L.lipO.map(Q), F * blurK, 1, 'destination-out'); stroke(L.lipO.map(Q), F * w, F * blurK, 1, 'destination-out', true); };
    const nostrils = () => { const c = lerp(Q(2), lerp(Q(98), Q(327), 0.5), 0.4); ellipse(c, dist(Q(98), Q(327)) * 0.52, F * 0.05, ang, F * 0.03, 1, 'destination-out'); };
    // M1.r – da (chặt)
    clear(); fill(L.oval.map(Q), F * 0.04, 1, 'lighter', true); eyes(0.02); brows(0.03, 0.02); lipsOut(0.025, 0.012); nostrils(); ch.push(grab());
    // M1.g – da rộng (mặt + cổ)
    clear(); fill(L.oval.map(Q), F * 0.12, 1, 'lighter', true); stroke(L.oval.map(Q), F * 0.12, F * 0.1, 1, 'lighter', true);
    { const jaw = [...L.jawR.slice(2).map(Q), ...L.jawL.slice(2).reverse().map(Q)]; const neck = jaw.concat(jaw.slice().reverse().map(p => offs(p, F * 0.75))); fill(neck, F * 0.18, 1); }
    eyes(0.012); brows(0.01, 0.015); lipsOut(0.005, 0.01); ch.push(grab());
    // M1.b – dưới mắt
    clear();
    for (const lo of [L.loR, L.loL]) { const pts = lo.map(Q); const low = pts.slice().reverse().map((p, k, arr) => { const t = k / (arr.length - 1); const bulge = Math.sin(t * Math.PI); return offs(p, F * (0.035 + 0.075 * bulge)); }); fill(pts.concat(low), F * 0.035, 0.95); }
    eyes(0.006); ch.push(grab());
    // M1.a – má hồng
    clear();
    for (const [eo, mc, ear] of [[145, 61, 234], [374, 291, 454]]) { let c = lerp(Q(eo), Q(mc), 0.42); c = lerp(c, Q(ear), 0.22); ellipse(c, F * 0.13, F * 0.085, ang + (eo === 145 ? 0.35 : -0.35), F * 0.09, 0.9); }
    ch.push(grab());
    // M2.r – môi
    clear(); fill(L.lipO.map(Q), F * 0.006, 1, 'lighter', true); fill(L.lipI.map(Q), F * 0.005, 1, 'destination-out', true);
    stroke(L.lipO.map(Q), F * 0.004, F * 0.004, 1, 'destination-out', true); ch.push(grab());
    // M2.g – trong miệng (răng)
    clear(); fill(L.lipI.map(Q), F * 0.006, 1, 'lighter', true); stroke(L.lipI.map(Q), F * 0.008, F * 0.004, 1, 'destination-out', true); ch.push(grab());
    // M2.b – mắt
    clear(); for (const e of [L.eyeR, L.eyeL]) fill(e.map(Q), F * 0.006, 1, 'lighter', true);
    for (const e of [L.eyeR, L.eyeL]) stroke(e.map(Q), F * 0.006, F * 0.003, 1, 'destination-out', true); ch.push(grab());
    // M2.a – lông mày
    clear(); for (const b of [L.browR, L.browL]) fill(b.map(Q), F * 0.012, 0.95, 'lighter', true); ch.push(grab());
    // M3.r – phấn mắt
    clear();
    for (const [up, bl, outer] of [[L.upR, L.browLoR, 33], [L.upL, L.browLoL, 263]]) {
      const lid = up.map(Q);
      const brow = bl.map(Q); // từ trong ra ngoài
      const topPts = [];
      for (let k = lid.length - 1; k >= 0; k--) { const t = k / (lid.length - 1); const bp = brow[Math.min(brow.length - 1, Math.round(t * (brow.length - 1)))]; topPts.push(lerp(lid[k], bp, 0.58 + 0.12 * t)); }
      const ext = add(Q(outer), mul(nrm(sub(Q(outer), lid[0])), F * 0.035));
      fill(lid.concat([ext]).concat(topPts), F * 0.03, 1);
      stroke(lid.map(p => offs(p, -F * 0.012)), F * 0.035, F * 0.02, 0.6); // đậm hơn sát mí
    }
    eyes(0.004); ch.push(grab());
    // M3.g – kẻ mắt (đường mí trên + đuôi)
    clear();
    for (const [up, outer, inner] of [[L.upR, 33, 133], [L.upL, 263, 362]]) {
      const lid = up.map(Q).map(p => offs(p, -F * 0.003));
      const dir = nrm(sub(Q(outer), Q(inner)));
      const wingDir = nrm(add(dir, mul(uy, -0.45)));
      const wing = add(Q(outer), mul(wingDir, F * 0.045));
      for (let k = 0; k < lid.length - 1; k++) { const t = k / (lid.length - 1); stroke([lid[k], lid[k + 1]], F * (0.004 + 0.009 * t), F * 0.003, 0.95); }
      const tipBase = lid[lid.length - 1];
      fill([offs(tipBase, -F * 0.006), wing, offs(tipBase, F * 0.003)], F * 0.003, 0.95);
    }
    ch.push(grab());
    // M3.b – mi
    clear();
    for (const [up, outer, inner] of [[L.upR, 33, 133], [L.upL, 263, 362]]) {
      const lid = up.map(Q); const dir = nrm(sub(Q(outer), Q(inner)));
      for (let k = 0; k < lid.length - 1; k++) {
        for (let s = 0; s < 3; s++) {
          const t = (k + s / 3) / (lid.length - 1); if (t < 0.12) continue;
          const p = lerp(lid[k], lid[k + 1], s / 3);
          const n = nrm(add(mul(uy, -1), mul(dir, 0.25 + 0.9 * t * t)));
          const len = F * (0.012 + 0.022 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.85));
          const q2 = add(p, mul(n, len)); const mid = add(lerp(p, q2, 0.5), mul(dir, len * 0.15));
          style(F * 0.003, 0.55); x.lineWidth = Math.max(0.8, F * 0.004); x.lineCap = 'round'; x.beginPath(); x.moveTo(p.x - OFF, p.y); x.quadraticCurveTo(mid.x - OFF, mid.y, q2.x - OFF, q2.y); x.stroke();
        }
      }
      stroke(lid.slice(1).map(p => offs(p, -F * 0.002)), F * 0.009, F * 0.004, 0.95);
    }
    eyes(0.002); ch.push(grab());
    // M3.a – vùng râu
    clear();
    {
      const up = (p, k) => offs(p, -F * k);
      const cheekR = up(lerp(Q(61), Q(132), 0.5), 0.02), cheekL = up(lerp(Q(291), Q(361), 0.5), 0.02);
      const must = lerp(Q(2), Q(0), 0.4);
      const poly = [Q(132), cheekR, lerp(Q(61), Q(98), 0.55), lerp(Q(98), must, 0.6), must, lerp(Q(327), must, 0.6), lerp(Q(291), Q(327), 0.55), cheekL, Q(361), ...[288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58].map(Q)];
      fill(poly, F * 0.07, 1, 'lighter', true);
      const jaw = [132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361].map(Q);
      stroke(jaw.map(p => offs(p, F * 0.02)), F * 0.07, F * 0.05, 0.85);
      lipsOut(0.018, 0.012);
      fill(L.lipO.map(Q), F * 0.02, 0.4, 'lighter', true); // ria phủ nhẹ mép môi trên
      fill(L.lipO.map(Q), F * 0.016, 1, 'destination-out', true);
    }
    ch.push(grab());
    // M4.r – tạo khối
    clear();
    for (const [ear, mc, br, al] of [[132, 61, 55, 98], [361, 291, 285, 327]]) {
      const a = lerp(Q(ear), Q(234 === ear ? 234 : ear), 0); const c = lerp(Q(ear), Q(mc), 0.33);
      const dir = sub(Q(mc), Q(ear)); ellipse(lerp(c, Q(ear === 132 ? 234 : 454), 0.15), F * 0.17, F * 0.045, Math.atan2(dir.y, dir.x) - (ear === 132 ? 0.25 : -0.25), F * 0.07, 0.85);
      stroke([lerp(Q(br), Q(al), 0.18), lerp(Q(br), Q(al), 0.82)].map(p => add(p, mul(ux, (ear === 132 ? 1 : -1) * F * 0.012))), F * 0.02, F * 0.025, 0.55);
    }
    stroke([132, 58, 172, 136, 150].map(Q).map(p => add(p, mul(ux, F * 0.02))), F * 0.06, F * 0.05, 0.6);
    stroke([361, 288, 397, 365, 379].map(Q).map(p => add(p, mul(ux, -F * 0.02))), F * 0.06, F * 0.05, 0.6);
    for (const k of [54, 284]) ellipse(Q(k), F * 0.09, F * 0.06, ang, F * 0.07, 0.5);
    eyes(0.01); lipsOut(0.01, 0.01); ch.push(grab());
    // M4.g – bắt sáng
    clear();
    stroke([lerp(Q(168), Q(6), 0.3), Q(197), Q(195), lerp(Q(5), Q(4), 0.4)], F * 0.026, F * 0.025, 0.75);
    ellipse(lerp(Q(151), Q(9), 0.3), F * 0.12, F * 0.065, ang, F * 0.07, 0.7);
    for (const [k, s] of [[116, 1], [345, -1]]) ellipse(lerp(Q(k), Q(k === 116 ? 50 : 280), 0.25), F * 0.08, F * 0.03, ang + s * 0.45, F * 0.04, 0.7);
    ellipse(lerp(Q(152), Q(17), 0.45), F * 0.05, F * 0.03, ang, F * 0.03, 0.55);
    ellipse(lerp(Q(0), Q(164), 0.55), F * 0.025, F * 0.012, ang, F * 0.012, 0.5);
    eyes(0.006); ch.push(grab());
    // M4.b – lông mày dày (nam)
    clear();
    for (const b of [L.browR, L.browL]) { const pts = b.map(Q); fill(pts, F * 0.012, 0.9, 'lighter', true); stroke(pts, F * 0.022, F * 0.014, 0.85, 'lighter', true); }
    eyes(0.004); ch.push(grab());
    // M4.a – chấm xóa mụn
    clear();
    for (const hp of heals || []) { const c = QP({ x: hp.x * imgW, y: hp.y * imgH }); const rr = hp.r * g.fw * sx; ellipse(c, rr, rr, 0, rr * 0.6, 1); }
    ch.push(grab());
    // đóng gói 4 kênh / texture
    const tex = [];
    for (let t = 0; t < 4; t++) {
      const d = new Uint8Array(MW * MH * 4);
      for (let c = 0; c < 4; c++) { const s = ch[t * 4 + c]; for (let i = 0, j = c; i < s.length; i++, j += 4) d[j] = s[i]; }
      tex.push(d);
    }
    return tex;
  }

  /* ---------------- bộ dựng ---------------- */
  class FaceFX {
    constructor(canvas) {
      this.canvas = canvas;
      const attrs = { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false, alpha: false };
      let gl = canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs);
      if (!gl) throw new Error('WebGL');
      this.gl = gl; this.webgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
      this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      this.P = { crop: program(gl, FS_CROP), gauss: program(gl, FS_GAUSS), bilat: program(gl, FS_BILAT), spot: program(gl, FS_SPOT), dil: program(gl, FS_DILATE), comp: program(gl, FS_COMP), warp: program(gl, FS_WARP) };
      this.faces = []; this.src = null; this.full = [null, null];
    }
    tex(w, h, data, linear = true) {
      const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linear ? gl.LINEAR : gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, linear ? gl.LINEAR : gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      if (data && data.nodeType !== undefined || (data && (data instanceof HTMLCanvasElement || (typeof ImageBitmap !== 'undefined' && data instanceof ImageBitmap) || data instanceof HTMLImageElement))) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data || null);
      return { t, w, h, fb: null };
    }
    fbo(T) { const gl = this.gl; if (!T.fb) { T.fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, T.fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, T.t, 0); } else gl.bindFramebuffer(gl.FRAMEBUFFER, T.fb); return T.fb; }
    free(T) { if (!T) return; const gl = this.gl; gl.deleteTexture(T.t); if (T.fb) gl.deleteFramebuffer(T.fb); }
    run(prog, target, unis, texs) {
      const gl = this.gl, P = this.P[prog]; gl.useProgram(P.p);
      if (target) { this.fbo(target); gl.viewport(0, 0, target.w, target.h); } else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.canvas.width, this.canvas.height); }
      gl.uniform1f(P.u.uFlip, 1);
      let unit = 0;
      for (const k in texs || {}) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, texs[k].t); if (P.u[k]) gl.uniform1i(P.u[k], unit); unit++; }
      for (const k in unis) {
        const loc = P.u[k]; if (!loc) continue; const v = unis[k];
        if (typeof v === 'number') gl.uniform1f(loc, v);
        else if (v.int) gl.uniform1i(loc, v.int[0]);
        else if (v.v4) gl.uniform4fv(loc, v.v4);
        else if (v.v2) gl.uniform2fv(loc, v.v2);
        else if (v.length === 2) gl.uniform2fv(loc, v); else if (v.length === 3) gl.uniform3fv(loc, v); else if (v.length === 4) gl.uniform4fv(loc, v);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    /** Đặt ảnh nguồn (canvas). */
    setImage(canvas) {
      this.dispose(true);
      this.W = canvas.width; this.H = canvas.height;
      this.src = this.tex(this.W, this.H, canvas);
      this.full = [this.tex(this.W, this.H), this.tex(this.W, this.H)];
      this.canvas.width = this.W; this.canvas.height = this.H;
    }
    /** faces: [{pts (pixel), heals}] – chuẩn bị bộ đệm cho từng mặt. */
    setFaces(faces, opt = {}) {
      for (const f of this.faces) this.freeFace(f);
      this.faces = faces.map(f => this.prepFace(f.pts, f.heals || [], opt));
    }
    updateHeals(i, heals) { const f = this.faces[i]; if (!f) return; f.healN = heals.length; const masks = buildMasks(f.pts, f.roi, f.MW, f.MH, heals, this.W, this.H); const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, f.M[3].t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, f.MW, f.MH, 0, gl.RGBA, gl.UNSIGNED_BYTE, masks[3]); }
    freeFace(f) { for (const k of ['R0', 'R1', 'R2', 'R3', 'SP']) this.free(f[k]); (f.M || []).forEach(m => this.free(m)); }
    prepFace(pts, heals, opt) {
      const g = geom(pts), W = this.W, H = this.H;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
      const roi = {}; roi.x = Math.max(0, Math.floor(x0 - 0.3 * g.fw)); roi.y = Math.max(0, Math.floor(y0 - 0.22 * g.fh)); roi.w = Math.min(W, Math.ceil(x1 + 0.3 * g.fw)) - roi.x; roi.h = Math.min(H, Math.ceil(y1 + 0.6 * g.fh)) - roi.y;
      const maxR = opt.maxRoi || 1024;
      const sc = Math.min(1, maxR / Math.max(roi.w, roi.h));
      const rw = Math.max(8, Math.round(roi.w * sc)), rh = Math.max(8, Math.round(roi.h * sc));
      const fwR = g.fw * sc;
      const rect = [roi.x / W, roi.y / H, roi.w / W, roi.h / H];
      const R0 = this.tex(rw, rh), R1 = this.tex(rw, rh), T1 = this.tex(rw, rh);
      this.run('crop', R0, { uRect: rect, uTexel: [1 / W * Math.max(1, 1 / sc) * 0.5, 1 / H * Math.max(1, 1 / sc) * 0.5] }, { uSrc: this.src });
      // bilateral 2 lượt (bán kính theo cỡ mặt)
      this.run('bilat', T1, { uTexel: [1 / rw, 1 / rh], uRad: Math.max(2, fwR * 0.028), uSigR: 0.075, uOff: { v2: SPIRAL } }, { uSrc: R0 });
      this.run('bilat', R1, { uTexel: [1 / rw, 1 / rh], uRad: Math.max(1.5, fwR * 0.016), uSigR: 0.06, uOff: { v2: SPIRAL } }, { uSrc: T1 });
      this.free(T1);
      const blur = (src, dw, dh, sigPx) => {
        const A = this.tex(dw, dh), B = this.tex(dw, dh);
        this.run('crop', A, { uRect: [0, 0, 1, 1], uTexel: [1 / src.w * (src.w / dw) * 0.5, 1 / src.h * (src.h / dh) * 0.5] }, { uSrc: src });
        this.run('gauss', B, { uDir: [1 / dw, 0], uSig: sigPx }, { uSrc: A });
        this.run('gauss', A, { uDir: [0, 1 / dh], uSig: sigPx }, { uSrc: B });
        this.free(B); return A;
      };
      const q4w = Math.max(4, Math.round(rw / 4)), q4h = Math.max(4, Math.round(rh / 4));
      const R2 = blur(R0, q4w, q4h, Math.max(1, fwR * 0.028 / 4));
      const R3 = blur(R2, Math.max(4, Math.round(rw / 8)), Math.max(4, Math.round(rh / 8)), Math.max(1, fwR * 0.06 / 8));
      const hw = Math.max(4, Math.round(rw / 2)), hh = Math.max(4, Math.round(rh / 2));
      const SPa = this.tex(hw, hh), SP = this.tex(hw, hh);
      this.run('spot', SPa, { uTexel: [1 / rw, 1 / rh] }, { uR0: R0, uR2: R2 });
      this.run('dil', SP, { uTexel: [Math.max(1, fwR * 0.004) / hw, Math.max(1, fwR * 0.004) / hh] }, { uSrc: SPa });
      this.free(SPa);
      // mặt nạ
      const ms = Math.min(1, (opt.maxMask || 768) / Math.max(roi.w, roi.h));
      const MW = Math.max(8, Math.round(roi.w * ms)), MH = Math.max(8, Math.round(roi.h * ms));
      const masks = buildMasks(pts, roi, MW, MH, heals, W, H);
      const M = masks.map(d => this.tex(MW, MH, d));
      // thống kê màu da (gò má, trán, sống mũi) từ R0
      const stat = this.skinStats(R0, pts, roi, rw, rh);
      const toR = p => [(p.x - roi.x) / roi.w, (p.y - roi.y) / roi.h];
      const refR = toR(lerp(lerp(pts[118], pts[101], 0.5), pts[50], 0.3)), refL = toR(lerp(lerp(pts[347], pts[330], 0.5), pts[280], 0.3));
      return { healN: heals.length, pts, g, roi, rect, rw, rh, R0, R1, R2, R3, SP, M, MW, MH, stat, refR, refL, midX: toR(pts[168])[0] };
    }
    skinStats(R0, pts, roi, rw, rh) {
      const gl = this.gl; this.fbo(R0);
      const px = new Uint8Array(rw * rh * 4); gl.readPixels(0, 0, rw, rh, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const sample = (idx) => { const out = []; for (const i of idx) { const p = pts[i]; const x = Math.round((p.x - roi.x) / roi.w * (rw - 1)), y = Math.round((p.y - roi.y) / roi.h * (rh - 1)); for (let dy = -2; dy <= 2; dy += 2) for (let dx = -2; dx <= 2; dx += 2) { const xx = Math.min(rw - 1, Math.max(0, x + dx)), yy = Math.min(rh - 1, Math.max(0, y + dy)); const o = (yy * rw + xx) * 4; out.push([px[o] / 255, px[o + 1] / 255, px[o + 2] / 255]); } } return out; };
      const sk = sample([50, 101, 118, 123, 147, 187, 205, 36, 280, 330, 347, 352, 376, 411, 425, 266, 151, 9, 108, 337, 6, 197, 195, 199, 175, 18]);
      const ycc = c => { const y = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; return [y, (c[2] - y) * 0.564 + 0.5, (c[0] - y) * 0.713 + 0.5]; };
      const q = sk.map(ycc).sort((a, b) => a[0] - b[0]);
      const core = q.slice(Math.floor(q.length * 0.15), Math.ceil(q.length * 0.9)); // bỏ chỗ quá tối/sáng
      const m = [0, 0, 0]; core.forEach(v => { m[0] += v[0]; m[1] += v[1]; m[2] += v[2]; }); m.forEach((v, i) => m[i] = v / core.length);
      const sd = [0, 0]; core.forEach(v => { sd[0] += (v[1] - m[1]) ** 2; sd[1] += (v[2] - m[2]) ** 2; });
      const lip = sample([0, 17, 13, 14, 37, 267, 84, 314, 82, 312, 87, 317]).map(c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]).sort((a, b) => a - b);
      return { y: m[0], cc: [m[1], m[2]], sd: [Math.max(0.014, Math.sqrt(sd[0] / core.length)), Math.max(0.014, Math.sqrt(sd[1] / core.length))], lipL: lip[Math.floor(lip.length * 0.6)] };
    }
    /** state: { faces: [params] }, opt: { split (0..1 – trái là ảnh gốc), target: null|'fbo', view:[x,y,w,h] } */
    render(params, opt = {}) {
      const gl = this.gl; if (!this.src) return null;
      let cur = this.src, k = 0;
      const ops = [];
      const fe = new Float32Array(16), fa = new Float32Array(8);
      this.faces.forEach((f, i) => {
        const p = params[i]; if (!p) return;
        if (hasLook(p) || f.healN) { const out = this.full[k]; k ^= 1; this.composite(f, p, cur, out); cur = out; }
        if (i < 4) {
          const wo = warpOps(f.pts, p, i); for (const o of wo) if (ops.length < MAXOPS) ops.push(o);
          fe.set([f.g.c.x, f.g.c.y + 0.04 * f.g.fh, f.g.fw * 0.56, f.g.fh * 0.62], i * 4); fa.set([Math.cos(f.g.ang), Math.sin(f.g.ang)], i * 2);
        }
      });
      const A = new Float32Array(MAXOPS * 4), B = new Float32Array(MAXOPS * 4);
      ops.forEach((o, i) => { A.set([o[0], o[1], o[2], o[3]], i * 4); B.set([o[4], o[5], o[6], o[7]], i * 4); });
      let target = null;
      if (opt.target === 'fbo') { target = this.full[k]; }
      const view = opt.view || [0, 0, 1, 1];
      this.run('warp', target, { uSize: [this.W, this.H], uA: { v4: A }, uB: { v4: B }, uN: { int: [ops.length] }, uFE: { v4: fe }, uFA: { v2: fa }, uSplit: opt.split || 0, uFlipY: target ? 0 : 1, uView: view }, { uSrc: cur, uOrig: this.src });
      return target;
    }
    composite(f, p, src, out) {
      const a = k => Math.max(0, (p[k] || 0) / 100);
      const s = f.stat;
      this.run('comp', out, {
        uRoi: f.rect, uFull: [this.W, this.H], uRoiTexel: [1 / f.rw, 1 / f.rh],
        uSkinCC: s.cc, uSkinSD: s.sd, uSkinY: s.y, uRefR: f.refR, uRefL: f.refL, uMidX: f.midX,
        uSmooth: a('smooth'), uBright: a('bright'), uWhite: a('white'), uDark: a('dark'), uAcne: a('acne') * 1.0, uTeeth: a('teeth'), uEyeB: a('eyeBright'), uTan: a('tan'), uOil: a('oil'), uSharp: a('sharp'),
        uContour: a('contour'), uHigh: a('highlight'),
        uLipCol: hex(p.lipColor || '#c0392b'), uLip: a('lip'), uGloss: p.lipFinish === 'gloss' ? 1 : 0, uLipL: s.lipL,
        uBlushCol: hex(p.blushColor || '#f08080'), uBlush: a('blush'), uBrowCol: hex(p.browColor || '#4a3428'), uBrow: a('brow'), uBrowThick: a('browThick'),
        uShadowCol: hex(p.shadowColor || '#b07a5a'), uShadow: a('shadow'), uLiner: a('liner'), uLash: a('lashes'),
        uBeard: a('beard'), uBeardFull: p.beardStyle === 'full' ? 1 : 0, uBeardCol: hex(p.beardColor || '#2a211c'), uCellPx: Math.max(p.beardStyle === 'full' ? 4.5 : 3.6, f.g.fw * (p.beardStyle === 'full' ? 0.012 : 0.0095)), uFaceC: [f.g.c.x, f.g.c.y], uAng: f.g.ang
      }, { uSrc: src, uR0: f.R0, uR1: f.R1, uR2: f.R2, uR3: f.R3, uSP: f.SP, uM1: f.M[0], uM2: f.M[1], uM3: f.M[2], uM4: f.M[3] });
    }
    /** Đọc kết quả ra canvas 2D (dùng cho xuất ảnh / ảnh nhỏ). */
    readTo(params, rect) {
      const T = this.render(params, { target: 'fbo' });
      const gl = this.gl; this.fbo(T);
      const r = rect || { x: 0, y: 0, w: this.W, h: this.H };
      const px = new Uint8ClampedArray(r.w * r.h * 4);
      gl.readPixels(r.x, r.y, r.w, r.h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const c = document.createElement('canvas'); c.width = r.w; c.height = r.h;
      c.getContext('2d').putImageData(new ImageData(px, r.w, r.h), 0, 0);
      return c;
    }
    dispose(keepCtx) {
      for (const f of this.faces) this.freeFace(f); this.faces = [];
      this.free(this.src); this.full.forEach(t => this.free(t)); this.src = null; this.full = [null, null];
      if (!keepCtx) { const ext = this.gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); }
    }
  }
  const LOOK_KEYS = ['smooth', 'bright', 'white', 'dark', 'acne', 'teeth', 'eyeBright', 'tan', 'oil', 'sharp', 'contour', 'highlight', 'lip', 'blush', 'brow', 'browThick', 'shadow', 'liner', 'lashes', 'beard'];
  function hasLook(p) { return LOOK_KEYS.some(k => (p[k] || 0) > 0) || false; }
  S.FaceFX = FaceFX; S._faceMasks = buildMasks;
  S.FACE_LOOK_KEYS = LOOK_KEYS;
})();
