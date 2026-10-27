/* Studio Của Khang – kiểu chỉnh mặt có sẵn (nữ / nam) */
(function () {
  'use strict';
  const S = (window.S = window.S || {});
  S.faceDefaults = () => ({
    smooth: 0, bright: 0, white: 0, dark: 0, acne: 0, slim: 0, vline: 0, eyes: 0, noseSlim: 0, noseLift: 0, mouth: 0, smile: 0, forehead: 0, teeth: 0, eyeBright: 0,
    lip: 0, lipColor: '#c2414f', lipFinish: 'matte', blush: 0, blushColor: '#ec8a8f', brow: 0, browColor: '#3e2c24', shadow: 0, shadowColor: '#a8735a', liner: 0, lashes: 0, contour: 0, highlight: 0,
    jaw: 0, browThick: 0, beard: 0, beardStyle: 'stubble', beardColor: '#241b16', tan: 0, oil: 0, sharp: 0
  });
  S.FACE_NUM_KEYS = Object.keys(S.faceDefaults()).filter(k => typeof S.faceDefaults()[k] === 'number');
  S.FACE_PRESETS = {
    f: [
      { id: 'f_nat', name: 'Tự nhiên', p: { smooth: 35, acne: 55, dark: 35, bright: 12, eyeBright: 18, teeth: 25, lip: 22, lipColor: '#c4646a', lipFinish: 'gloss', blush: 14, blushColor: '#f09a8c', brow: 14, slim: 10, eyes: 8 } },
      { id: 'f_kr', name: 'Trong trẻo Hàn Quốc', p: { smooth: 55, white: 30, bright: 22, dark: 50, acne: 65, lip: 48, lipColor: '#e0525e', lipFinish: 'gloss', blush: 26, blushColor: '#f7a1a8', brow: 18, browColor: '#5a4036', eyes: 14, slim: 18, vline: 15, eyeBright: 28, highlight: 22, lashes: 18, noseSlim: 10, teeth: 30 } },
      { id: 'f_sweet', name: 'Ngọt ngào', p: { smooth: 45, bright: 18, acne: 55, dark: 40, lip: 52, lipColor: '#e8697d', lipFinish: 'gloss', blush: 38, blushColor: '#f78ca0', shadow: 30, shadowColor: '#d9919a', lashes: 32, liner: 18, eyes: 16, smile: 30, eyeBright: 24, brow: 15 } },
      { id: 'f_red', name: 'Sang trọng đỏ', p: { smooth: 45, acne: 60, dark: 50, lip: 85, lipColor: '#a3172a', lipFinish: 'matte', liner: 58, lashes: 48, shadow: 26, shadowColor: '#8a5a48', contour: 35, highlight: 28, brow: 34, blush: 14, blushColor: '#d77a6d', slim: 14, noseSlim: 14 } },
      { id: 'f_smokey', name: 'Smokey', p: { smooth: 40, acne: 55, dark: 50, shadow: 90, shadowColor: '#3d3337', liner: 70, lashes: 60, lip: 42, lipColor: '#9b5a5a', lipFinish: 'matte', contour: 40, highlight: 24, brow: 34, browColor: '#2e2420' } },
      { id: 'f_pastel', name: 'Pastel', p: { smooth: 50, acne: 60, dark: 45, white: 22, bright: 22, lip: 55, lipColor: '#f08aa0', lipFinish: 'gloss', blush: 42, blushColor: '#ffb3c1', shadow: 40, shadowColor: '#e3a3c6', lashes: 24, highlight: 28, eyes: 12, brow: 12, browColor: '#6a4e40' } },
      { id: 'f_party', name: 'Tiệc tối', p: { smooth: 50, acne: 60, dark: 50, lip: 75, lipColor: '#b22d4a', lipFinish: 'gloss', shadow: 55, shadowColor: '#7a4a3a', liner: 62, lashes: 65, contour: 45, highlight: 45, blush: 24, blushColor: '#d9776a', brow: 34, eyes: 14, slim: 14 } },
      { id: 'f_bride', name: 'Cô dâu', p: { smooth: 58, bright: 24, white: 18, acne: 75, dark: 60, lip: 55, lipColor: '#d4566a', lipFinish: 'gloss', blush: 30, blushColor: '#f29a9a', shadow: 30, shadowColor: '#c99a7e', liner: 34, lashes: 45, highlight: 34, contour: 18, eyeBright: 30, teeth: 40, brow: 24 } },
      { id: 'f_douyin', name: 'Douyin / Trung Quốc', p: { smooth: 65, white: 38, bright: 24, acne: 75, dark: 55, lip: 65, lipColor: '#d8314a', lipFinish: 'gloss', blush: 34, blushColor: '#f58c99', shadow: 40, shadowColor: '#d68a7e', liner: 44, lashes: 55, eyes: 24, slim: 30, vline: 30, noseSlim: 25, noseLift: 20, mouth: -10, highlight: 34, eyeBright: 34, teeth: 30 } },
      { id: 'f_vline', name: 'Mặt V-line', p: { slim: 45, vline: 55, smooth: 30, acne: 40, eyes: 10, noseSlim: 15, contour: 24 } },
    ],
    m: [
      { id: 'm_nat', name: 'Tự nhiên nam', p: { smooth: 25, acne: 45, dark: 30, oil: 30, eyeBright: 14, teeth: 20, brow: 8 } },
      { id: 'm_clean', name: 'Da sạch', p: { smooth: 45, acne: 85, dark: 55, oil: 60, bright: 10, teeth: 30, eyeBright: 18 } },
      { id: 'm_jaw', name: 'Nam tính góc cạnh', p: { jaw: 55, sharp: 40, contour: 45, browThick: 30, smooth: 20, acne: 40, oil: 40, noseSlim: 10 } },
      { id: 'm_stubble', name: 'Râu lấm tấm', p: { beard: 55, beardStyle: 'stubble', jaw: 20, smooth: 15, oil: 30, sharp: 15 } },
      { id: 'm_full', name: 'Râu quai nón', p: { beard: 70, beardStyle: 'full', jaw: 25, browThick: 20, sharp: 20, oil: 25 } },
      { id: 'm_kr', name: 'Hàn Quốc nam', p: { smooth: 50, white: 24, bright: 18, acne: 75, dark: 50, oil: 50, slim: 15, vline: 10, eyes: 8, brow: 24, browColor: '#2f2622', teeth: 30, lip: 12, lipColor: '#c07070', lipFinish: 'gloss' } },
      { id: 'm_tan', name: 'Da nâu thể thao', p: { tan: 55, sharp: 30, contour: 35, oil: 45, jaw: 25, smooth: 20, acne: 40, highlight: 15 } },
      { id: 'm_gent', name: 'Lịch lãm', p: { smooth: 35, acne: 60, dark: 45, oil: 50, browThick: 24, jaw: 25, contour: 30, sharp: 25, teeth: 30, beard: 25, beardStyle: 'stubble' } },
    ]
  };
  /** Trộn kiểu có sẵn với cường độ amt (0..100) */
  S.faceMix = (preset, amt) => {
    const d = S.faceDefaults(), o = S.faceDefaults(); const k = amt / 100;
    for (const key in preset.p) { const v = preset.p[key]; o[key] = typeof v === 'number' ? Math.round(d[key] + (v - d[key]) * k) : v; }
    return o;
  };
})();
