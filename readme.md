# Hướng Dẫn Cài Đặt Tiện Ích Hola Anisong Sub-Ser

<a href="https://release-assets.githubusercontent.com/github-production-release-asset/1312554733/03df081c-eaa3-4428-8346-2f269a1a87fb?sp=r&sv=2018-11-09&sr=b&spr=https&se=2026-11-08T03%3A58%3A54Z&rscd=attachment%3B+filename%3Dhola-anisong-subser-v1.1.0.zip&rsct=application%2Foctet-stream&skoid=96c2d410-5711-43a1-aedd-ab1947aa7ab0&sktid=398a6654-997b-47e9-b12b-9515b896b4de&skt=2026-11-08T02%3A58%3A06Z&ske=2026-11-08T03%3A58%3A54Z&sks=b&skv=2018-11-09&sig=WXzF4XKmNjoosEi7k925tIGJsa27IknWw%2BcAVuHZbnQ%3D&jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmVsZWFzZS1hc3NldHMuZ2l0aHVidXNlcmNvbnRlbnQuY29tIiwia2V5Ijoia2V5MSIsImV4cCI6MTc5NDEwODIxMiwibmJmIjoxNzk0MTA3OTEyLCJwYXRoIjoicmVsZWFzZWFzc2V0cHJvZHVjdGlvbi5ibG9iLmNvcmUud2luZG93cy5uZXQifQ.irvxdduAKmEMkJvWIWiYPmaHqkFFRHJF2hKVRcN7Mos&response-content-disposition=attachment%3B%20filename%3Dhola-anisong-subser-v1.1.0.zip&response-content-type=application%2Foctet-stream">Nhấn để tải xuống phiên bản v1.1</a><br>
Tiện ích này không được đăng tải lên Chrome Web Store công khai. Hỗ trợ các trình duyệt trên máy tính (hiện tại mới thử nghiệm được trên Windows nhưng về lí thuyết có thể chạy trên cả Linux và MacOS).

---

## Cách 1: Cài đặt Tự Động (Dùng cho Windows)

1. Giải nén file nén `.zip` vừa tải về vào một thư mục bất kì.
![](./pics/2026-11-08%2010-35-15.mp4_snapshot_00.56.441.png)
![](./pics/2026-11-08%2010-35-15.mp4_snapshot_01.02.572.png)
2. Click đúp chuột vào file **`install.bat`**.
3. Cửa sổ cài đặt sẽ hiện ra:
   - Các file sẽ tự động được copy vào thư mục an toàn của hệ thống: `%LOCALAPPDATA%\HolaAnisongSubSer`.
   - Đường dẫn này sẽ tự động được sao chép vào bộ nhớ tạm (Clipboard).
   - Nhập số tương ứng với trình duyệt bạn muốn mở (1: Chrome, 2: Edge, 3: Brave, 4: Cốc Cốc).
   ![](./pics/image1.png)
4. Trên trang tiện ích của trình duyệt vừa mở ra:
   - Bật công tắc **"Chế độ cho nhà phát triển"** (Developer Mode) ở góc trên bên phải.
   ![](./pics/2026-11-08%2010-35-15.mp4_snapshot_01.18.117.png)
   ![](./pics/2026-11-08%2010-35-15.mp4_snapshot_01.20.301.png)
   ![](./pics/2026-11-08%2010-35-15.mp4_snapshot_01.24.794.png)
   
   - Bấm nút **"Tải tiện ích đã giải nén"** (Load unpacked) ở góc trên bên trái.
   ![](./pics/2026-11-08%2010-35-15.mp4_snapshot_01.27.891.png)
   - Hộp thoại chọn thư mục xuất hiện -> Ấn tổ hợp phím **`Ctrl + V`** (để dán đường dẫn đã tự động copy sẵn) -> Bấm **Select Folder** (Chọn thư mục).
   ![](./pics/2026-11-08%2010-35-15.mp4_snapshot_01.34.700.png)

---

## Cách 2: Cài đặt Thủ Công (Cho mọi hệ điều hành: Windows, macOS, Linux)

1. Tải về và giải nén thư mục tiện ích vào một vị trí an toàn trên máy.
   > *Lưu ý: Không nên để ở thư mục Downloads hoặc Màn hình chính Desktop nếu bạn thường xuyên dọn dẹp file. Vì nếu xoá thư mục này thì tiện ích trên trình duyệt sẽ ngừng hoạt động.*
2. Mở trình duyệt và truy cập trang quản trị tiện ích:
   - **Google Chrome:** `chrome://extensions/`
   - **Microsoft Edge:** `edge://extensions/`
   - **Brave Browser:** `brave://extensions/`
   - **Cốc Cốc:** `coccoc://extensions/`
3. Gạt bật **"Chế độ cho nhà phát triển"** (*Developer mode*).
4. Bấm nút **"Tải tiện ích đã giải nén"** (*Load unpacked*).
5. Chọn đúng thư mục chứa tiện ích (thư mục có chứa file `manifest.json`).
6. Bấm **Select Folder**.

---

## Cách Cập Nhật Khi Có Phiên Bản Mới

Khi tiện ích thông báo có phiên bản mới:
1. Tải bản `.zip` mới về máy và giải nén.
2. Chạy file **`install.bat`** (nếu dùng Windows) hoặc ghi đè các file mới vào thư mục cũ.
3. Mở lại trang `chrome://extensions/` và bấm nút Tải lại tại ô tiện ích.