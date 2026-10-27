# Studio Của Khang

Ứng dụng web cài được (PWA) gồm 3 công cụ, chạy hoàn toàn trên máy (không có máy chủ):

1. **Chỉnh Ảnh** – kiểu Lightroom: Ánh sáng, Màu, Trộn màu HSL 8 dải, Phân tách màu 3 vòng, Đường cong RGB/R/G/B, Hiệu ứng (Texture, Clarity, Dehaze, tối góc, hạt film), Chi tiết (làm nét, giảm nhiễu), Cắt & Xoay; 51 công thức màu có sẵn; nhập preset Lightroom `.xmp` và LUT `.cube`; xuất JPEG/PNG độ phân giải gốc.
2. **Chỉnh Video** – cùng bộ chỉnh màu & công thức, cắt đoạn, tốc độ 0.5×–2×, cắt khung/xoay, tắt tiếng, nhạc nền; xuất MP4 ngay trên máy (WebCodecs + mp4-muxer, dự phòng MediaRecorder).
3. **Ghép Mặt** – mở https://yosimura99.github.io/doi-mat/ toàn màn hình.

Mở trên iPhone bằng Safari → Chia sẻ → “Thêm vào MH chính”.

Thư viện: [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) (MIT) trong `vendor/`.
