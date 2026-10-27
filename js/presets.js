/* Công thức có sẵn – tham số mặc định & bộ preset tích hợp */
(function () {
  'use strict';
  const S = (window.S = window.S || {});
  const BANDS = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'];
  S.BANDS = BANDS;
  S.BAND_VI = ['Đỏ', 'Cam', 'Vàng', 'Lục', 'Ngọc', 'Lam', 'Tím', 'Hồng sen'];
  S.BAND_COLORS = ['#e5483f', '#f08a2c', '#e8cf35', '#4cb84a', '#3cc6c6', '#3b6ee8', '#8a4fe0', '#d94fb8'];
  const ID = () => [[0, 0], [255, 255]];
  function defaults() {
    return {
      exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
      temp: 0, tint: 0, vibrance: 0, saturation: 0,
      hslH: [0, 0, 0, 0, 0, 0, 0, 0], hslS: [0, 0, 0, 0, 0, 0, 0, 0], hslL: [0, 0, 0, 0, 0, 0, 0, 0],
      gsH: 220, gsS: 0, gsL: 0, gmH: 40, gmS: 0, gmL: 0, ghH: 45, ghS: 0, ghL: 0, gBlend: 50, gBalance: 0,
      curve: { rgb: ID(), r: ID(), g: ID(), b: ID() },
      texture: 0, clarity: 0, dehaze: 0, vignette: 0, vigMid: 50, grain: 0, grainSize: 25,
      sharpen: 0, nr: 0, lut: null, lutAmount: 100,
      rot90: 0, straighten: 0, flipH: false, flipV: false, crop: { x: 0, y: 0, w: 1, h: 1 }, aspect: 'free'
    };
  }
  S.defaults = defaults;
  S.GEO_KEYS = ['rot90', 'straighten', 'flipH', 'flipV', 'crop', 'aspect'];
  S.clone = o => JSON.parse(JSON.stringify(o));

  // build a full param object from compact spec: h:{band:[hue,sat,lum]}, c:{rgb:[..],r:..}
  function build(spec) {
    const p = defaults();
    for (const k in spec) {
      if (k === 'h') {
        for (const b in spec.h) { const i = BANDS.indexOf(b); const v = spec.h[b]; p.hslH[i] = v[0] || 0; p.hslS[i] = v[1] || 0; p.hslL[i] = v[2] || 0; }
      } else if (k === 'c') {
        for (const ch in spec.c) p.curve[ch] = spec.c[ch];
      } else p[k] = spec[k];
    }
    return p;
  }
  S.buildParams = build;

  const CATS = [
    ['bright', 'Trong trẻo / Sáng'], ['film', 'Film'], ['stock', 'Film Kodak · Fuji'], ['vsco', 'Kiểu VSCO'], ['vintage', 'Vintage / Retro'], ['moody', 'Moody tối'],
    ['cine', 'Điện ảnh / Teal & Orange'], ['bw', 'Đen trắng'], ['pastel', 'Pastel'], ['korea', 'Hàn Quốc'],
    ['japan', 'Nhật Bản'], ['sunset', 'Hoàng hôn / Giờ vàng'], ['night', 'Đêm / Neon'], ['coffee', 'Cà phê / Nâu'],
    ['sea', 'Biển / Xanh'], ['portrait', 'Chân dung da đẹp'], ['land', 'Phong cảnh'], ['food', 'Đồ ăn'],
    ['hdr', 'HDR'], ['matte', 'Matte'], ['cross', 'Cross-process']
  ];
  S.PRESET_CATS = CATS;

  const L = [
    // Trong trẻo / sáng
    ['bright', 'Trong trẻo', { exposure: 0.35, contrast: -10, highlights: -30, shadows: 30, whites: 10, blacks: 5, temp: -4, vibrance: 15, saturation: -5, clarity: -5, c: { rgb: [[0, 8], [128, 136], [255, 252]] } }],
    ['bright', 'Sáng mềm', { exposure: 0.45, contrast: -20, highlights: -40, shadows: 35, whites: 5, blacks: 15, temp: 4, vibrance: 5, saturation: -10, clarity: -10, gmH: 40, gmS: 6, c: { rgb: [[0, 20], [255, 250]] } }],
    ['bright', 'Nắng sớm', { exposure: 0.25, temp: 12, tint: 4, highlights: -25, shadows: 20, vibrance: 15, ghH: 45, ghS: 20, gsH: 210, gsS: 8, c: { rgb: [[0, 10], [255, 255]] } }],
    ['bright', 'Trắng tinh khôi', { exposure: 0.5, contrast: -5, highlights: -20, shadows: 25, whites: 20, temp: -8, saturation: -20, vibrance: 5, h: { orange: [0, -10, 0] }, c: { rgb: [[0, 12], [255, 255]] } }],
    // Film
    ['film', 'Film ấm da đẹp', { temp: 8, contrast: -8, highlights: -20, shadows: 15, saturation: -8, vibrance: 10, h: { red: [0, -5, 0], orange: [-4, -8, 4], green: [-25, -20, 0], blue: [0, -15, 0] }, c: { rgb: [[0, 18], [64, 66], [192, 196], [255, 245]] }, gsH: 200, gsS: 8, ghH: 45, ghS: 12, grain: 18 }],
    ['film', 'Film xanh lục', { temp: -4, tint: -4, contrast: 10, saturation: -5, h: { green: [15, -10, 0], blue: [-8, 10, 0], orange: [0, -5, 0] }, c: { rgb: [[0, 12], [60, 55], [190, 200], [255, 248]], r: [[0, 0], [255, 250]], g: [[0, 8], [255, 255]], b: [[0, 15], [255, 240]] }, gsH: 170, gsS: 10, grain: 15 }],
    ['film', 'Film hạt thô', { contrast: 15, saturation: -15, vibrance: 5, c: { rgb: [[0, 25], [70, 65], [180, 190], [255, 240]] }, grain: 45, grainSize: 45, vignette: -15, ghH: 40, ghS: 10 }],
    ['film', 'Film phai màu', { contrast: -25, saturation: -20, temp: 5, c: { rgb: [[0, 35], [128, 130], [255, 230]] }, gsH: 220, gsS: 12, ghH: 40, ghS: 10, grain: 20 }],
    ['film', 'Film thập niên 80', { contrast: 20, saturation: 5, vibrance: 10, temp: 4, h: { red: [0, 10, 0], blue: [0, 15, -15] }, c: { rgb: [[0, 5], [64, 55], [192, 200], [255, 250]] }, grain: 15 }],
    // Vintage
    ['vintage', 'Retro 70s', { temp: 20, tint: 6, contrast: -10, saturation: -15, c: { rgb: [[0, 20], [255, 240]], r: [[0, 25], [255, 255]], g: [[0, 10], [255, 240]], b: [[0, 40], [255, 200]] }, grain: 25, vignette: -20 }],
    ['vintage', 'Ảnh lấy liền', { exposure: 0.2, contrast: -15, highlights: -20, saturation: -10, c: { rgb: [[0, 30], [128, 135], [255, 235]], b: [[0, 20], [255, 230]] }, gsH: 180, gsS: 15, ghH: 50, ghS: 15, vignette: -18, grain: 15 }],
    ['vintage', 'Sepia cổ điển', { saturation: -100, contrast: 10, gsH: 30, gsS: 35, ghH: 45, ghS: 25, c: { rgb: [[0, 20], [255, 240]] }, grain: 20, vignette: -20 }],
    ['vintage', 'Hoài niệm', { temp: 10, saturation: -25, contrast: -10, h: { green: [0, -30, 0] }, c: { rgb: [[0, 28], [255, 238]] }, gmH: 35, gmS: 12, vignette: -12, grain: 12 }],
    // Moody
    ['moody', 'Moody tối', { exposure: -0.3, contrast: 20, highlights: -40, shadows: -10, blacks: -15, saturation: -20, vibrance: -5, clarity: 10, h: { green: [0, -40, -20], blue: [0, -30, 0], orange: [0, 0, 5] }, c: { rgb: [[0, 15], [60, 45], [190, 190], [255, 235]] }, gsH: 200, gsS: 15, vignette: -30 }],
    ['moody', 'Xanh rêu u buồn', { exposure: -0.2, contrast: 10, temp: -5, saturation: -15, h: { green: [-30, -35, -25], yellow: [-15, -30, 0], aqua: [-20, 0, 0] }, c: { rgb: [[0, 20], [255, 235]] }, gsH: 160, gsS: 15, ghH: 45, ghS: 10, vignette: -25 }],
    ['moody', 'Mưa buồn', { exposure: -0.15, temp: -15, saturation: -35, contrast: -5, dehaze: -10, c: { rgb: [[0, 25], [128, 120], [255, 235]], b: [[0, 10], [255, 255]] }, gsH: 220, gsS: 15, vignette: -15 }],
    // Cinematic
    ['cine', 'Teal & Orange', { contrast: 15, highlights: -20, shadows: 10, saturation: -5, h: { orange: [0, 10, 0], yellow: [-15, 0, 0], green: [40, -10, 0], aqua: [10, 15, 0], blue: [-15, 0, 0] }, gsH: 190, gsS: 30, ghH: 35, ghS: 25, gBalance: -10, vignette: -15, c: { rgb: [[0, 8], [64, 55], [192, 200], [255, 250]] } }],
    ['cine', 'Điện ảnh lạnh', { temp: -15, tint: -5, contrast: 15, saturation: -20, clarity: 10, gsH: 200, gsS: 25, ghH: 190, ghS: 8, c: { rgb: [[0, 15], [64, 58], [255, 240]] }, vignette: -20 }],
    ['cine', 'Bom tấn', { contrast: 25, highlights: -30, shadows: 15, clarity: 15, dehaze: 10, saturation: -10, vibrance: 10, gsH: 185, gsS: 35, ghH: 30, ghS: 30, vignette: -25, c: { rgb: [[0, 5], [255, 245]] } }],
    // B&W
    ['bw', 'Đen trắng cổ điển', { saturation: -100, contrast: 15, h: { red: [0, 0, 10], orange: [0, 0, 10], blue: [0, 0, -15] }, c: { rgb: [[0, 8], [64, 58], [192, 198], [255, 250]] }, grain: 10 }],
    ['bw', 'Đen trắng tương phản', { saturation: -100, contrast: 45, clarity: 25, blacks: -20, whites: 15, h: { blue: [0, 0, -30], orange: [0, 0, 15] }, vignette: -20 }],
    ['bw', 'Đen trắng mềm', { saturation: -100, contrast: -15, highlights: -20, shadows: 20, h: { orange: [0, 0, 20], red: [0, 0, 10] }, c: { rgb: [[0, 30], [255, 245]] } }],
    ['bw', 'Đen trắng film hạt', { saturation: -100, contrast: 25, h: { yellow: [0, 0, 10] }, c: { rgb: [[0, 15], [64, 50], [192, 205], [255, 245]] }, grain: 50, grainSize: 40, vignette: -25 }],
    ['bw', 'Đen trắng ánh bạc', { saturation: -100, contrast: 20, gsH: 215, gsS: 18, ghH: 40, ghS: 6, c: { rgb: [[0, 10], [255, 248]] } }],
    // Pastel
    ['pastel', 'Pastel hồng', { exposure: 0.3, contrast: -25, highlights: -20, shadows: 25, saturation: -20, vibrance: 10, tint: 8, h: { orange: [0, 0, 8] }, c: { rgb: [[0, 30], [255, 250]], r: [[0, 10], [255, 255]] }, gmH: 330, gmS: 10, ghH: 340, ghS: 12 }],
    ['pastel', 'Pastel kẹo ngọt', { exposure: 0.3, contrast: -20, saturation: -15, h: { blue: [0, -10, 15], green: [0, 0, 15] }, c: { rgb: [[0, 35], [255, 248]] }, gsH: 260, gsS: 15, ghH: 50, ghS: 12 }],
    ['pastel', 'Pastel bạc hà', { exposure: 0.25, contrast: -20, temp: -6, tint: -6, saturation: -15, h: { green: [20, 0, 15] }, c: { rgb: [[0, 30], [255, 250]] }, gsH: 160, gsS: 15, ghH: 60, ghS: 8 }],
    // Korea
    ['korea', 'Hàn Quốc da hồng', { exposure: 0.3, contrast: -10, highlights: -25, shadows: 20, temp: -3, tint: 8, vibrance: 5, saturation: -5, clarity: -15, texture: -10, h: { orange: [-8, -12, 15], red: [0, -10, 8], yellow: [0, -20, 0], green: [0, -20, 10] }, c: { rgb: [[0, 12], [255, 252]] }, ghH: 345, ghS: 10 }],
    ['korea', 'Hàn Quốc trong veo', { exposure: 0.35, contrast: -5, highlights: -30, shadows: 20, temp: -8, tint: 4, vibrance: 10, saturation: -10, clarity: -10, h: { orange: [0, -10, 12], blue: [0, -10, 10] }, c: { rgb: [[0, 10], [255, 255]] }, ghH: 200, ghS: 6 }],
    // Japan
    ['japan', 'Nhật xanh phai', { exposure: 0.2, contrast: -20, temp: -5, tint: -8, saturation: -20, h: { green: [20, -15, 10], orange: [0, -10, 5], blue: [-10, 0, 0] }, c: { rgb: [[0, 35], [128, 132], [255, 240]], g: [[0, 10], [255, 255]] }, gsH: 160, gsS: 15, ghH: 60, ghS: 6 }],
    ['japan', 'Nhật mùa hè', { exposure: 0.3, contrast: -10, highlights: -25, shadows: 15, temp: -3, vibrance: 15, saturation: -10, h: { green: [10, 0, 0], blue: [0, -5, 15] }, c: { rgb: [[0, 22], [255, 250]] }, gsH: 190, gsS: 10 }],
    // Sunset
    ['sunset', 'Giờ vàng', { temp: 25, tint: 5, exposure: 0.1, highlights: -20, shadows: 10, vibrance: 20, h: { orange: [0, 15, 0], yellow: [0, 10, 10] }, ghH: 40, ghS: 22, gsH: 20, gsS: 10, c: { rgb: [[0, 8], [255, 250]] }, vignette: -12 }],
    ['sunset', 'Hoàng hôn rực', { temp: 20, tint: 10, contrast: 15, highlights: -30, vibrance: 25, saturation: 5, dehaze: 10, h: { red: [5, 15, 0], orange: [0, 20, 0], purple: [10, 0, 0], magenta: [0, 10, 0] }, ghH: 25, ghS: 25, gsH: 280, gsS: 15, vignette: -20 }],
    // Night
    ['night', 'Neon đêm', { temp: -10, tint: 10, contrast: 20, highlights: -20, shadows: 10, blacks: -10, vibrance: 20, saturation: 5, clarity: 10, h: { blue: [10, 20, 0], purple: [0, 25, 0], magenta: [0, 25, 0], orange: [-5, 10, 0] }, gsH: 250, gsS: 25, ghH: 320, ghS: 15, vignette: -20 }],
    ['night', 'Thành phố đêm', { temp: -12, contrast: 15, highlights: -35, shadows: 15, blacks: -10, saturation: -10, dehaze: 8, h: { orange: [0, 15, 0], yellow: [-20, 0, 0], green: [0, -50, 0], blue: [0, 15, 0] }, gsH: 200, gsS: 25, ghH: 35, ghS: 15 }],
    // Coffee
    ['coffee', 'Cà phê sữa', { temp: 15, tint: 3, contrast: -5, saturation: -25, vibrance: 5, h: { green: [0, -40, 0], blue: [0, -40, 0], orange: [-5, 0, 0] }, c: { rgb: [[0, 20], [255, 240]] }, gmH: 30, gmS: 15, gsH: 25, gsS: 10, ghH: 45, ghS: 10, grain: 10 }],
    ['coffee', 'Nâu gỗ', { temp: 12, contrast: 15, exposure: -0.1, saturation: -15, clarity: 10, h: { green: [-30, -50, 0], blue: [0, -50, 0], orange: [0, 0, -5] }, c: { rgb: [[0, 15], [64, 58], [255, 235]] }, gsH: 20, gsS: 20, ghH: 40, ghS: 15, vignette: -20 }],
    // Sea
    ['sea', 'Biển xanh', { temp: -5, exposure: 0.2, highlights: -25, shadows: 15, vibrance: 25, dehaze: 10, h: { aqua: [0, 20, 5], blue: [-5, 20, -5] }, c: { rgb: [[0, 5], [255, 252]] }, ghH: 50, ghS: 6 }],
    ['sea', 'Nhiệt đới', { temp: 4, contrast: 10, vibrance: 30, saturation: 5, clarity: 10, dehaze: 8, h: { green: [10, 15, 0], aqua: [-5, 25, 0], blue: [0, 15, 0] }, ghH: 45, ghS: 12 }],
    // Portrait
    ['portrait', 'Da đẹp tự nhiên', { exposure: 0.15, contrast: -5, highlights: -15, shadows: 15, temp: 3, vibrance: 5, texture: -20, clarity: -10, h: { orange: [0, -10, 10], red: [0, -5, 5] }, c: { rgb: [[0, 5], [255, 255]] } }],
    ['portrait', 'Da sáng mịn', { exposure: 0.3, contrast: -10, highlights: -20, shadows: 25, whites: 5, temp: 2, tint: 3, texture: -35, clarity: -15, nr: 20, h: { orange: [-3, -15, 18] }, c: { rgb: [[0, 10], [255, 255]] }, ghH: 30, ghS: 6 }],
    // Landscape
    ['land', 'Phong cảnh rực rỡ', { contrast: 15, highlights: -40, shadows: 30, whites: 10, blacks: -10, vibrance: 30, clarity: 20, dehaze: 15, sharpen: 30, h: { green: [0, 10, -5], blue: [0, 15, -15] } }],
    ['land', 'Núi rừng', { temp: -3, contrast: 10, highlights: -30, shadows: 20, vibrance: 15, saturation: -5, clarity: 15, dehaze: 20, h: { green: [-15, -10, -15], yellow: [-10, -15, 0] }, gsH: 190, gsS: 10, ghH: 45, ghS: 8 }],
    // Food
    ['food', 'Đồ ăn ngon', { exposure: 0.2, temp: 8, contrast: 10, highlights: -20, shadows: 15, vibrance: 25, saturation: 5, clarity: 10, texture: 15, sharpen: 25, h: { red: [0, 10, 0], orange: [0, 10, 5], yellow: [0, 10, 0] } }],
    ['food', 'Bánh ngọt', { exposure: 0.3, temp: 6, contrast: -10, shadows: 15, vibrance: 10, saturation: -5, texture: 5, h: { orange: [0, 0, 10] }, c: { rgb: [[0, 15], [255, 252]] }, ghH: 40, ghS: 10 }],
    // HDR
    ['hdr', 'HDR tự nhiên', { highlights: -60, shadows: 50, whites: 10, blacks: -15, clarity: 25, texture: 15, vibrance: 15, dehaze: 10 }],
    ['hdr', 'HDR mạnh', { exposure: 0.15, highlights: -75, shadows: 60, whites: 15, blacks: -20, clarity: 38, texture: 20, dehaze: 15, vibrance: 18, saturation: -5, vignette: -12, sharpen: 25 }],
    // Matte
    ['matte', 'Matte mềm', { contrast: -10, saturation: -10, c: { rgb: [[0, 40], [64, 70], [192, 190], [255, 235]] }, gsH: 210, gsS: 8 }],
    ['matte', 'Matte xanh', { temp: -6, saturation: -15, c: { rgb: [[0, 40], [255, 235]], b: [[0, 15], [255, 245]] }, gsH: 200, gsS: 18, ghH: 40, ghS: 8 }],
    // Cross
    ['cross', 'Cross-process', { contrast: 20, saturation: 5, c: { r: [[0, 0], [64, 50], [192, 210], [255, 255]], g: [[0, 0], [64, 60], [192, 205], [255, 250]], b: [[0, 40], [255, 200]] }, ghH: 55, ghS: 10, vignette: -15 }],
    ['cross', 'Cross xanh vàng', { contrast: 15, saturation: -5, c: { r: [[0, 10], [128, 120], [255, 240]], g: [[0, 0], [64, 70], [255, 255]], b: [[0, 50], [128, 120], [255, 190]] } }],
    /* ===== Bổ sung v3: công thức lấy từ thông số được chia sẻ miễn phí trên mạng =====
       Nguồn: OpenFilmStocks (MIT, github.com/eliseomartelli/OpenFilmStocks) – HSL & đường cong giữ nguyên,
       tương phản/đen được quy đổi cho ảnh JPEG; presetlab.live (Classic Chrome); mô tả preset miễn phí của VSCO
       (vsco.co journal); legendarypresets.com (A6); jennywuphotography.com (M5); begincamera.com (Portra/Velvia/Tri-X/fade);
       theeditingstudio.co (Portra, sáng thoáng, giờ vàng); presetpedia.com (Hàn, Nhật, đồ ăn); halation.page (Nhật komorebi);
       gradecolor.com (teal & orange); christ1027.pixnet.net & bloggertoraja.com (công thức Hàn); lightroomtutorials.com (Masashi Wakui). */
    // Film Kodak · Fuji – OpenFilmStocks
    ['stock', 'Kodak Portra 160', { contrast: 18, blacks: 15, saturation: -9, vibrance: -5, h: { red: [3, -14, -9], orange: [9, -22, 6], yellow: [15, -20, 10], green: [25, -17, 23], aqua: [19, 0, 10], blue: [4, -1, -4], purple: [-6, -49, 0], magenta: [-5, -36, 0] }, c: { rgb: [[0, 0], [30, 13], [66, 51], [132, 122], [206, 209], [255, 243]] } }],
    ['stock', 'Kodak Portra 400', { contrast: 18, blacks: 15, vibrance: -5, h: { red: [10, -15, 10], orange: [-5, -20, 30], yellow: [15, -15, 0], green: [25, -40, 15], blue: [-15, -15, 30], purple: [-5, -20, 20], magenta: [0, 0, 10] }, c: { rgb: [[0, 0], [18, 6], [33, 15], [69, 51], [199, 195], [255, 255]] }, grain: 12 }],
    ['stock', 'Kodak Portra 800', { contrast: 20, blacks: 15, saturation: -5, vibrance: 2, tint: -3, sharpen: 25, h: { red: [10, -20, -5], orange: [-5, -15, 15], yellow: [10, -25, 24], green: [40, -40, -7], aqua: [10, -5, -6], blue: [-10, -20, -25], purple: [-5, -60, -10], magenta: [0, -15, -10] }, c: { rgb: [[0, 0], [26, 14], [41, 28], [72, 63], [129, 130], [255, 250]] }, grain: 18 }],
    ['stock', 'Kodak Ektar 100', { contrast: 18, blacks: 12, saturation: 5, vibrance: -6, h: { red: [15, -25, -15], orange: [0, -25, -5], yellow: [0, -25, -5], green: [25, -45, -10], aqua: [5, -15, -10], blue: [5, -30, -10], purple: [-15, -20, 10], magenta: [15, -30, 0] }, c: { rgb: [[0, 0], [50, 42], [127, 135], [210, 217], [254, 249]] } }],
    ['stock', 'Kodak Gold 200', { contrast: 15, blacks: 12, saturation: -5, vibrance: -5, temp: 6, h: { red: [25, -35, -10], orange: [-5, -25, -5], yellow: [-5, -30, 10], green: [25, -65, -5], aqua: [0, -10, 0], blue: [0, -45, -15], purple: [5, -40, 10], magenta: [0, -60, 0] }, c: { rgb: [[0, 0], [45, 28], [83, 76], [127, 129], [185, 190], [255, 254]] }, grain: 15 }],
    ['stock', 'Fuji Pro 400H', { contrast: 20, blacks: 15, saturation: -10, vibrance: -6, h: { red: [6, -10, 0], orange: [9, -20, 0], yellow: [25, -30, 30], green: [50, -50, 30], aqua: [5, 8, 15], blue: [-10, 5, 20], purple: [20, -10, 20], magenta: [-25, -40, 15] }, c: { rgb: [[0, 0], [32, 14], [67, 53], [130, 131], [255, 255]] } }],
    ['stock', 'Fuji Pro 160NS', { contrast: 18, blacks: 15, saturation: -4, vibrance: -9, tint: -3, h: { red: [10, -28, -7], orange: [5, -5, 13], yellow: [12, -15, 35], green: [33, -20, 62], aqua: [2, -21, 60], blue: [2, 5, 28], purple: [-4, -14, 18], magenta: [12, -27, -14] }, c: { rgb: [[0, 0], [23, 9], [51, 33], [129, 116], [209, 203], [255, 247]] } }],
    ['stock', 'Fuji Superia 100', { contrast: 14, blacks: 12, saturation: -4, tint: -6, h: { red: [-20, -23, -7], orange: [-10, 10, 13], yellow: [5, 0, 35], green: [0, 15, 50], aqua: [-10, 0, 30], blue: [-5, -10, -20], purple: [0, 10, 18], magenta: [-5, -20, -14] }, c: { rgb: [[0, 5], [34, 23], [62, 55], [133, 122], [209, 203], [255, 247]] } }],
    ['stock', 'Fuji Natura 1600', { contrast: 20, blacks: 12, saturation: -10, vibrance: -5, tint: -3, sharpen: 30, h: { red: [-19, -36, -17], orange: [-11, -30, -4], yellow: [-9, -56, 5], green: [8, -37, 1], aqua: [0, -28, -5], blue: [17, -49, 5], purple: [-19, -60, 3], magenta: [-17, -60, 15] }, c: { rgb: [[0, 2], [56, 43], [130, 127], [178, 185], [255, 250]] }, grain: 25 }],
    // Classic Chrome – thông số đo của presetlab.live
    ['stock', 'Fuji Classic Chrome', { contrast: -20, highlights: -8, shadows: 8, whites: -5, blacks: 5, vibrance: -20, sharpen: 30, h: { red: [5, -30, 0], orange: [0, -12, 5], yellow: [0, -12, 0], green: [-10, -22, 0], aqua: [-8, -15, 0], blue: [10, -15, 0], purple: [0, -8, 0], magenta: [0, -8, 0] }, gsH: 195, gsS: 10, ghH: 38, ghS: 4, gBalance: -10 }],
    // Portra 400 mềm – theeditingstudio.co + begincamera.com
    ['stock', 'Portra 400 mềm', { exposure: 0.4, contrast: -15, highlights: -30, shadows: 30, whites: -15, blacks: 20, texture: 8, clarity: -8, saturation: -3, temp: 4, h: { red: [8, 0, 0], orange: [6, 8, 12], yellow: [6, -3, 0], green: [12, -12, -5], blue: [0, -25, -10] }, c: { rgb: [[0, 15], [64, 66], [192, 196], [255, 250]] }, gsH: 35, gsS: 12, grain: 22, grainSize: 30 }],
    ['stock', 'Fuji Velvia 50', { temp: -2, contrast: 20, highlights: -20, clarity: 10, vibrance: 20, h: { blue: [0, 15, 0], green: [0, 20, 0] }, grain: 10 }],
    ['stock', 'CineStill 800T', { exposure: 0.3, temp: -22, tint: 4, contrast: 15, highlights: -25, shadows: 15, whites: 10, blacks: -20, h: { red: [0, 10, 0], orange: [-5, 0, 5], blue: [0, -10, 0] }, c: { rgb: [[0, 14], [64, 58], [192, 200], [255, 252]] }, gsH: 190, gsS: 10, ghH: 20, ghS: 18, grain: 25, grainSize: 25 }],
    // Kiểu VSCO – dựa trên mô tả chính thức của VSCO + công thức A6/M5 công khai
    ['vsco', 'Kiểu A6', { contrast: -12, blacks: 30, clarity: 20, saturation: -8, h: { green: [0, -12, 0], aqua: [0, -10, 0] }, gsH: 200, gsS: 12, gsL: -5, c: { rgb: [[0, 10], [255, 252]] } }],
    ['vsco', 'Kiểu M5', { exposure: 0.15, temp: 8, saturation: -15, vibrance: -10, h: { red: [12, -10, 0], orange: [0, -10, 10], yellow: [0, -10, 0], green: [-15, -10, 0] }, c: { rgb: [[0, 30], [64, 62], [192, 198], [255, 232]], r: [[0, 0], [64, 60], [192, 198], [255, 255]], g: [[0, 0], [64, 62], [192, 196], [255, 255]] }, gsH: 50, gsS: 15, ghH: 185, ghS: 6, grain: 20, grainSize: 18 }],
    ['vsco', 'Kiểu C1', { exposure: 0.3, contrast: 20, vibrance: 15, h: { orange: [0, -5, 8] }, gsH: 175, gsS: 18, ghH: 345, ghS: 15, c: { rgb: [[0, 6], [64, 60], [192, 202], [255, 255]] } }],
    ['vsco', 'Kiểu T1', { contrast: 25, whites: 15, blacks: -10, saturation: -25, c: { rgb: [[0, 32], [40, 36], [128, 128], [220, 232], [255, 245]] }, gsH: 210, gsS: 6 }],
    ['vsco', 'Kiểu G3', { exposure: 0.1, contrast: 5, temp: 3, h: { orange: [0, -5, 8], green: [-8, -25, -10], aqua: [0, -15, 0], blue: [-8, -25, -5] }, c: { rgb: [[0, 10], [255, 252]] } }],
    ['vsco', 'Kiểu M3', { exposure: -0.1, temp: 6, saturation: -20, contrast: -5, h: { green: [-10, -30, 0], blue: [-10, -35, 10] }, c: { rgb: [[0, 30], [255, 240]] }, gsH: 45, gsS: 22, ghH: 200, ghS: 12 }],
    ['vsco', 'Kiểu F2', { exposure: -0.05, temp: -8, saturation: -15, highlights: -10, c: { rgb: [[0, 38], [128, 126], [255, 242]], b: [[0, 18], [255, 250]] }, gsH: 215, gsS: 15, ghH: 210, ghS: 6 }],
    ['vsco', 'Kiểu P5', { exposure: 0.1, contrast: -5, tint: -10, h: { red: [0, 25, 0], blue: [-20, 10, 10] }, c: { rgb: [[0, 25], [255, 242]], g: [[0, 10], [255, 250]], b: [[0, 20], [255, 235]] }, gsH: 170, gsS: 25, ghH: 165, ghS: 12, vignette: -10 }],
    ['vsco', 'Kiểu B1', { saturation: -100, contrast: 15, c: { rgb: [[0, 14], [64, 60], [192, 198], [255, 252]] }, grain: 8 }],
    ['vsco', 'Kiểu B5', { saturation: -100, exposure: -0.15, contrast: 40, shadows: -20, blacks: -15, clarity: 20, h: { blue: [0, 0, -20], orange: [0, 0, 8] } }],
    ['vsco', 'Kiểu X1', { saturation: -100, contrast: 22, clarity: 10, exposure: 0.12, c: { rgb: [[0, 30], [64, 66], [192, 202], [255, 244]] }, grain: 22, vignette: -18 }],
    // Đen trắng – OpenFilmStocks & begincamera
    ['bw', 'Kodak Tri-X 400', { saturation: -100, contrast: 25, clarity: 15, shadows: -15, whites: 10, h: { red: [0, 0, -5], yellow: [0, 0, -5], green: [0, 0, -20], aqua: [0, 0, 15], purple: [0, 0, 35], magenta: [0, 0, 10] }, c: { rgb: [[0, 0], [52, 50], [124, 146], [214, 218], [255, 255]] }, grain: 35, grainSize: 35 }],
    ['bw', 'Kodak T-MAX 3200', { saturation: -100, contrast: 15, clarity: -5, dehaze: -10, sharpen: 40, h: { red: [0, 0, 15], orange: [0, 0, 15], yellow: [0, 0, 10], aqua: [0, 0, -10], blue: [0, 0, -10], purple: [0, 0, -5] }, c: { rgb: [[0, 22], [36, 48], [67, 80], [196, 199], [255, 255]] }, grain: 45, grainSize: 45 }],
    ['bw', 'Ilford Delta 3200', { saturation: -100, contrast: 20, highlights: -20, h: { red: [0, 0, 20], yellow: [0, 0, -10], green: [0, 0, -30], aqua: [0, 0, -30], blue: [0, 0, 14], purple: [0, 0, 20] }, c: { rgb: [[19, 5], [128, 140], [199, 210], [255, 242]] }, grain: 40, grainSize: 40 }],
    ['bw', 'Ilford Pan F', { saturation: -100, contrast: 22, highlights: -15, whites: 5, h: { red: [0, 0, -15], orange: [0, 0, -30], yellow: [0, 0, -40], green: [0, 0, -35], blue: [0, 0, 10], purple: [0, 0, 35], magenta: [0, 0, 10] }, c: { rgb: [[0, 0], [64, 62], [190, 205], [255, 255]] }, grain: 6 }],
    // Hàn Quốc
    ['korea', 'Hàn Quốc sáng thoáng', { exposure: 0.4, contrast: -12, highlights: -35, shadows: 30, whites: 20, blacks: 8, temp: -15, tint: 5, vibrance: -12, saturation: -8, texture: -10, clarity: -18, dehaze: -4, vignette: -8, nr: 20, h: { red: [3, -10, 6], orange: [5, -12, 10], yellow: [5, -15, 8], green: [5, -18, 5], aqua: [0, -20, 8], blue: [10, -22, 8], purple: [0, -12, 4], magenta: [5, -14, 5] }, c: { rgb: [[0, 12], [64, 70], [192, 200], [255, 250]] }, gsH: 210, gsS: 5, ghH: 30, ghS: 3 }],
    ['korea', 'Hàn Quốc kem sữa', { exposure: 0.11, contrast: -23, highlights: -45, shadows: 21, whites: -80, blacks: 25, temp: 17, tint: -10, vibrance: 46, saturation: -23, sharpen: 19, h: { red: [18, 70, -33], orange: [0, -7, 23], yellow: [-75, -42, -25], green: [-100, 29, 5], blue: [61, -80, -90], purple: [29, -44, -43], magenta: [7, 0, 0] } }],
    ['korea', 'Hàn Quốc ngọt', { exposure: 0.35, contrast: -18, highlights: -50, shadows: 35, whites: -10, blacks: 15, temp: 12, tint: -9, vibrance: -14, saturation: -8, vignette: -13, sharpen: 10, nr: 11, h: { red: [10, 27, 22], orange: [12, 16, 32], yellow: [-30, 55, 15], green: [11, -41, 95], aqua: [-52, 45, 29], blue: [-34, -24, 39], purple: [0, -100, 0], magenta: [0, -100, 0] } }],
    ['korea', 'Hàn Quốc pastel', { exposure: 0.35, contrast: 15, highlights: -55, shadows: 40, whites: -45, blacks: 12, temp: 10, vibrance: 25, saturation: -20, texture: 12, clarity: -12, dehaze: 8, sharpen: 14, nr: 35, h: { red: [-14, 28, 14], orange: [-10, 14, 18], yellow: [-50, -60, 0], green: [-50, 30, 24], aqua: [50, -50, 0], blue: [12, 25, 20], purple: [0, -100, 0], magenta: [0, -100, 0] } }],
    ['korea', 'Seoul đường phố', { exposure: 0.15, contrast: 20, highlights: -22, shadows: 15, whites: 12, blacks: -12, temp: 5, tint: 3, vibrance: 20, texture: 18, clarity: 15, dehaze: 10, vignette: -8, grain: 6, grainSize: 10, sharpen: 35, nr: 15, h: { red: [3, 8, 5], orange: [5, 5, 8], yellow: [5, 8, 5], green: [8, 12, 3], aqua: [5, 10, 0], blue: [8, 15, 0] }, c: { rgb: [[0, 5], [64, 62], [192, 198], [255, 248]] }, gsH: 210, gsS: 6, gmH: 35, gmS: 5, ghH: 40, ghS: 4 }],
    // Nhật Bản
    ['japan', 'Nhật komorebi', { exposure: 0.26, contrast: -14, shadows: 18, blacks: 10, temp: -8, tint: -6, saturation: -8, c: { rgb: [[0, 20], [64, 70], [255, 252]] } }],
    ['japan', 'Nhật film hoài cổ', { exposure: 0.15, contrast: 10, highlights: -25, shadows: 20, whites: -5, blacks: 15, temp: 18, tint: 6, vibrance: -15, saturation: -10, clarity: -8, vignette: -20, grain: 45, grainSize: 35, sharpen: 25, nr: 10, h: { red: [5, -10, 0], orange: [-8, 15, 0], yellow: [10, 0, 0], green: [-15, -20, 0], blue: [0, -15, 0] }, c: { rgb: [[0, 18], [64, 72], [192, 188], [255, 243]] } }],
    // Đêm – kiểu Masashi Wakui (chỉ dùng đường cong)
    ['night', 'Tokyo đêm (Wakui)', { contrast: 10, vibrance: 10, c: { rgb: [[0, 30], [255, 255]], g: [[0, 0], [255, 232]], b: [[0, 0], [255, 208]] } }],
    // Điện ảnh
    ['cine', 'Teal & Orange chuẩn', { contrast: 10, h: { orange: [5, -10, 8], green: [30, -20, 0], blue: [-15, 0, 0] }, gsH: 200, gsS: 22, ghH: 40, ghS: 20, gBlend: 55 }],
    // Giờ vàng
    ['sunset', 'Giờ vàng mềm', { exposure: 0.2, contrast: 14, highlights: -35, shadows: 38, whites: 18, blacks: -12, temp: 10, tint: 8, h: { orange: [0, 12, 12], yellow: [0, 8, 0], green: [0, -12, 0], blue: [0, -18, 0] }, gsH: 30, gsS: 18, ghH: 40, ghS: 25 }],
    // Đồ ăn
    ['food', 'Đồ ăn bắt mắt', { exposure: 0.25, contrast: 16, highlights: -35, shadows: 32, whites: 22, blacks: -10, texture: 14, clarity: 14, dehaze: 4, vibrance: 24, h: { orange: [0, 34, 14], red: [0, 28, 8] } }],
    // Sáng thoáng
    ['bright', 'Sáng & thoáng', { exposure: 0.45, contrast: -25, highlights: -32, shadows: 22, whites: -15, blacks: 20, texture: -8, clarity: -10, vibrance: -3, saturation: -3, h: { green: [0, -12, 0], blue: [0, -18, 0], aqua: [0, -10, 0], orange: [0, 0, 12], yellow: [0, 0, 8] }, c: { rgb: [[0, 14], [255, 248]] }, grain: 10 }],
    // Matte film
    ['matte', 'Matte film', { blacks: 18, shadows: 15, contrast: -8, saturation: -8, c: { rgb: [[0, 32], [255, 250]] }, grain: 20, grainSize: 25 }]
  ];
  S.BUILTIN = L.map((x, i) => ({ id: 'b' + i, cat: x[0], name: x[1], params: build(x[2]), builtin: true }));

  // blend from neutral to preset by amount (0..1); keep current geometry
  S.mixPreset = function (preset, amount, current) {
    const d = defaults(), p = preset.params, out = defaults();
    const a = Math.max(0, Math.min(1, amount));
    for (const k in d) {
      if (S.GEO_KEYS.includes(k)) { out[k] = S.clone(current[k]); continue; }
      const dv = d[k], pv = p[k] === undefined ? dv : p[k];
      if (typeof dv === 'number') {
        if (/H$/.test(k) && k.length === 3) out[k] = pv; // grading hue
        else out[k] = dv + (pv - dv) * a;
      } else if (Array.isArray(dv)) out[k] = dv.map((v, i) => v + ((pv[i] || 0) - v) * a);
      else if (k === 'curve') {
        out.curve = {};
        for (const ch of ['rgb', 'r', 'g', 'b']) {
          const pts = (pv && pv[ch]) || [[0, 0], [255, 255]];
          out.curve[ch] = pts.map(q => [q[0], q[0] + (q[1] - q[0]) * a]);
        }
      } else out[k] = pv;
    }
    out.lut = p.lut || null;
    out.lutAmount = p.lut ? (p.lutAmount ?? 100) * a : 100;
    return out;
  };
})();
