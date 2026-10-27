/* Nhập preset Lightroom (.xmp) và LUT 3D (.cube) */
(function () {
  'use strict';
  const S = (window.S = window.S || {});
  const BANDS_XMP = ['Red', 'Orange', 'Yellow', 'Green', 'Aqua', 'Blue', 'Purple', 'Magenta'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function readXmpFields(text) {
    const f = {};
    let m;
    const reAttr = /crs:(\w+)\s*=\s*"([^"]*)"/g;
    while ((m = reAttr.exec(text))) f[m[1]] = m[2];
    const reEl = /<crs:(\w+)>([^<]*)<\/crs:\1>/g;
    while ((m = reEl.exec(text))) f[m[1]] = m[2].trim();
    const reSeq = /<crs:(\w+)>\s*<rdf:(?:Seq|Alt|Bag)>([\s\S]*?)<\/rdf:(?:Seq|Alt|Bag)>\s*<\/crs:\1>/g;
    while ((m = reSeq.exec(text))) {
      const items = [];
      const reLi = /<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/g; let k;
      while ((k = reLi.exec(m[2]))) items.push(k[1].trim());
      f[m[1]] = items;
    }
    return f;
  }

  function parseXMP(text, fileName) {
    if (!/crs:|camera-raw-settings/i.test(text)) throw new Error('Tệp XMP không chứa thông số Lightroom (crs:).');
    const f = readXmpFields(text);
    const p = S.defaults();
    const num = (k, d = 0) => (f[k] !== undefined && f[k] !== '' && !isNaN(parseFloat(f[k])) ? parseFloat(f[k]) : d);
    const has = k => f[k] !== undefined && f[k] !== '';
    let used = 0;
    const set = (key, val, lo = -100, hi = 100) => { p[key] = clamp(val, lo, hi); used++; };
    if (has('Exposure2012')) set('exposure', num('Exposure2012'), -5, 5); else if (has('Exposure')) set('exposure', num('Exposure'), -5, 5);
    if (has('Contrast2012')) set('contrast', num('Contrast2012')); else if (has('Contrast')) set('contrast', (num('Contrast') - 25) * 0.8);
    if (has('Highlights2012')) set('highlights', num('Highlights2012')); else if (has('HighlightRecovery')) set('highlights', -num('HighlightRecovery'));
    if (has('Shadows2012')) set('shadows', num('Shadows2012')); else if (has('FillLight')) set('shadows', num('FillLight'));
    if (has('Whites2012')) set('whites', num('Whites2012'));
    if (has('Blacks2012')) set('blacks', num('Blacks2012'));
    if (has('IncrementalTemperature')) set('temp', num('IncrementalTemperature'));
    else if (has('Temperature')) set('temp', Math.log2(num('Temperature', 5500) / 5500) * 110);
    if (has('IncrementalTint')) set('tint', num('IncrementalTint'));
    else if (has('Tint')) set('tint', num('Tint') * 0.66);
    if (has('Vibrance')) set('vibrance', num('Vibrance'));
    if (has('Saturation')) set('saturation', num('Saturation'));
    if (has('Clarity2012')) set('clarity', num('Clarity2012')); else if (has('Clarity')) set('clarity', num('Clarity'));
    if (has('Dehaze')) set('dehaze', num('Dehaze'));
    if (has('Texture')) set('texture', num('Texture'));
    BANDS_XMP.forEach((b, i) => {
      if (has('HueAdjustment' + b)) { p.hslH[i] = clamp(num('HueAdjustment' + b), -100, 100); used++; }
      if (has('SaturationAdjustment' + b)) { p.hslS[i] = clamp(num('SaturationAdjustment' + b), -100, 100); used++; }
      if (has('LuminanceAdjustment' + b)) { p.hslL[i] = clamp(num('LuminanceAdjustment' + b), -100, 100); used++; }
    });
    // Black & white
    const gray = /true/i.test(f.ConvertToGrayscale || '');
    if (gray) {
      p.saturation = -100; used++;
      BANDS_XMP.forEach((b, i) => { if (has('GrayMixer' + b)) p.hslL[i] = clamp(num('GrayMixer' + b) * 0.6, -100, 100); });
    }
    // Split toning (older) then Color Grade (newer, overrides)
    if (has('SplitToningShadowHue')) { p.gsH = num('SplitToningShadowHue'); p.gsS = num('SplitToningShadowSaturation'); used++; }
    if (has('SplitToningHighlightHue')) { p.ghH = num('SplitToningHighlightHue'); p.ghS = num('SplitToningHighlightSaturation'); used++; }
    if (has('SplitToningBalance')) p.gBalance = clamp(num('SplitToningBalance'), -100, 100);
    const cg = (pre, key) => {
      if (has('ColorGrade' + pre + 'Hue') || has('ColorGrade' + pre + 'Sat')) {
        p[key + 'H'] = num('ColorGrade' + pre + 'Hue', p[key + 'H']);
        p[key + 'S'] = num('ColorGrade' + pre + 'Sat', p[key + 'S']);
        p[key + 'L'] = clamp(num('ColorGrade' + pre + 'Lum', 0), -100, 100);
        used++;
      }
    };
    cg('Shadow', 'gs'); cg('Midtone', 'gm'); cg('Highlight', 'gh');
    if (p.gmS === 0 && num('ColorGradeGlobalSat') > 0) { p.gmH = num('ColorGradeGlobalHue'); p.gmS = num('ColorGradeGlobalSat') * 0.8; p.gmL = num('ColorGradeGlobalLum'); }
    if (has('ColorGradeBlending')) p.gBlend = clamp(num('ColorGradeBlending'), 0, 100);
    // Tone curves
    const pts = arr => {
      if (!Array.isArray(arr)) return null;
      const out = arr.map(s => s.split(',').map(v => parseFloat(v))).filter(q => q.length === 2 && !isNaN(q[0]) && !isNaN(q[1]))
        .map(q => [clamp(q[0], 0, 255), clamp(q[1], 0, 255)]);
      return out.length >= 2 ? out : null;
    };
    const tc = [['ToneCurvePV2012', 'rgb'], ['ToneCurvePV2012Red', 'r'], ['ToneCurvePV2012Green', 'g'], ['ToneCurvePV2012Blue', 'b']];
    for (const [k, ch] of tc) { const q = pts(f[k]); if (q) { p.curve[ch] = q; used++; } }
    if (!f.ToneCurvePV2012 && pts(f.ToneCurve)) p.curve.rgb = pts(f.ToneCurve);
    // Parametric curve (approximate via sliders)
    if (has('ParametricShadows')) { p.shadows = clamp(p.shadows + num('ParametricShadows') * 0.3, -100, 100); }
    if (has('ParametricHighlights')) { p.highlights = clamp(p.highlights + num('ParametricHighlights') * 0.3, -100, 100); }
    if (has('ParametricDarks')) { p.blacks = clamp(p.blacks + num('ParametricDarks') * 0.25, -100, 100); }
    if (has('ParametricLights')) { p.whites = clamp(p.whites + num('ParametricLights') * 0.25, -100, 100); }
    // Effects
    if (has('PostCropVignetteAmount')) set('vignette', num('PostCropVignetteAmount'));
    if (has('PostCropVignetteMidpoint')) p.vigMid = clamp(num('PostCropVignetteMidpoint', 50), 0, 100);
    if (has('GrainAmount')) set('grain', num('GrainAmount'), 0, 100);
    if (has('GrainSize')) p.grainSize = clamp(num('GrainSize', 25), 0, 100);
    if (has('Sharpness')) set('sharpen', num('Sharpness') / 150 * 100, 0, 100);
    if (has('LuminanceSmoothing')) set('nr', num('LuminanceSmoothing'), 0, 100);
    if (!used) throw new Error('Không tìm thấy thông số chỉnh màu nào trong tệp XMP.');
    let name = '';
    if (Array.isArray(f.Name)) name = f.Name[0]; else if (f.Name) name = f.Name;
    if (!name) name = (fileName || 'Preset XMP').replace(/\.xmp$/i, '');
    name = name.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    return { name, params: p, fields: used };
  }
  S.parseXMP = parseXMP;

  function parseCUBE(text, fileName) {
    let size = 0, title = '';
    let dmin = [0, 0, 0], dmax = [1, 1, 1];
    const vals = [];
    const lines = text.split(/\r?\n/);
    for (let raw of lines) {
      const line = raw.trim();
      if (!line || line[0] === '#') continue;
      if (/^TITLE/i.test(line)) { title = line.replace(/^TITLE\s*/i, '').replace(/^"|"$/g, ''); continue; }
      if (/^LUT_1D_SIZE/i.test(line)) throw new Error('Chỉ hỗ trợ LUT 3D (LUT_3D_SIZE), tệp này là LUT 1D.');
      if (/^LUT_3D_SIZE/i.test(line)) { size = parseInt(line.split(/\s+/)[1], 10); continue; }
      if (/^DOMAIN_MIN/i.test(line)) { dmin = line.split(/\s+/).slice(1, 4).map(Number); continue; }
      if (/^DOMAIN_MAX/i.test(line)) { dmax = line.split(/\s+/).slice(1, 4).map(Number); continue; }
      if (/^[A-Z_]/i.test(line)) continue;
      const parts = line.split(/\s+/);
      if (parts.length >= 3) vals.push(+parts[0], +parts[1], +parts[2]);
    }
    if (!size || size < 2 || size > 128) throw new Error('Tệp .cube thiếu LUT_3D_SIZE hợp lệ.');
    if (vals.length < size * size * size * 3) throw new Error('Tệp .cube thiếu dữ liệu (' + vals.length / 3 + '/' + size ** 3 + ' điểm).');
    const data = new Float32Array(size * size * size * 3);
    for (let i = 0; i < data.length; i++) {
      const c = i % 3;
      data[i] = (vals[i] - dmin[c]) / ((dmax[c] - dmin[c]) || 1);
    }
    return { name: title || (fileName || 'LUT').replace(/\.cube$/i, ''), size, data };
  }
  S.parseCUBE = parseCUBE;
})();
