# Studio Của Khang

Ứng dụng web cài được (PWA) gồm 4 công cụ, chạy hoàn toàn trên máy (không có máy chủ):

1. **Chỉnh Ảnh** – kiểu Lightroom: Ánh sáng, Màu, Trộn màu HSL 8 dải, Phân tách màu 3 vòng, Đường cong RGB/R/G/B, Hiệu ứng (Texture, Clarity, Dehaze, tối góc, hạt film), Chi tiết (làm nét, giảm nhiễu), Cắt & Xoay; 51 công thức màu có sẵn; nhập preset Lightroom `.xmp` và LUT `.cube`; xuất JPEG/PNG độ phân giải gốc.
2. **Chỉnh Video** – cùng bộ chỉnh màu & công thức, cắt đoạn, tốc độ 0.5×–2×, cắt khung/xoay, tắt tiếng, nhạc nền; xuất MP4 ngay trên máy (WebCodecs + mp4-muxer, dự phòng MediaRecorder).
3. **Chỉnh Mặt** – làm đẹp kiểu FaceApp: mịn da (giữ kết cấu), sáng/trắng da, xóa quầng thâm, xóa mụn (tự động + chạm), thon mặt, V-line, mắt to, mũi, miệng, cười nhẹ, trán, trắng răng, mắt sáng; trang điểm (son lì/bóng, má hồng, mày, phấn mắt, eyeliner, mi, tạo khối/bắt sáng); nét nam (jawline, mày dày, râu lấm tấm/quai nón, da nâu, giảm dầu, contour); 10 kiểu nữ + 8 kiểu nam có thanh mức độ; tự gợi ý bộ kiểu Nữ/Nam (đổi bằng một chạm); nhiều khuôn mặt – chạm để chọn; so sánh giữ/chia đôi; hoàn tác; xuất độ phân giải gốc; chuyển qua lại với Chỉnh Ảnh.
4. **Ghép Mặt** – mở https://yosimura99.github.io/doi-mat/ toàn màn hình.

Mở trên iPhone bằng Safari → Chia sẻ → “Thêm vào MH chính”.

Thư viện: [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) (MIT) trong `vendor/`; [@vladmandic/face-api](https://github.com/vladmandic/face-api) (MIT, mô hình age-gender) trong `vendor/faceapi/`; MediaPipe Face Landmarker (Apache-2.0) – mô hình `models/face_landmarker.task`, thư viện `@mediapipe/tasks-vision@0.10.21` tải từ jsDelivr lần đầu rồi được service worker lưu đệm.
