# Work Log

## 23/08/2026

### Phân tích tổng quan dự án

- Đã quét cấu trúc workspace và xác định code chính nằm trong thư mục `BankingSystem`.
- Xác định dự án dùng Hardhat, Solidity, React/Vite và ethers.
- Phân tích các smart contract chính:
  - `MockUSDC`: token ERC-20 giả lập USDC với 6 decimals.
  - `SavingCore`: quản lý plan gửi tiết kiệm, deposit certificate dạng ERC-721, rút tiền, rút sớm, gia hạn thủ công và auto-renew.
  - `VaultManager`: quản lý quỹ trả lãi, fee receiver, pause/unpause và quyền chi trả lãi.
- Đánh giá luồng nghiệp vụ:
  - User gửi principal vào `SavingCore`.
  - Lãi được giữ trong `VaultManager`.
  - Mỗi khoản gửi được đại diện bằng một NFT certificate.
  - Admin có quyền tạo/sửa plan, fund vault, rút free liquidity và pause hệ thống.
- Kiểm tra test hiện có và xác nhận `npm test` chạy thành công với 17 test passing.

### Làm lại frontend theo hướng sản phẩm thật

- Làm lại layout frontend từ dạng demo dashboard sang giao diện giống sản phẩm fintech/Web3 banking.
- Thêm sidebar, header, dashboard overview, bảng Earn Markets, trang Earn Products, Portfolio và Operations.
- Giữ nguyên logic kết nối MetaMask và các hàm gọi smart contract.
- Loại bỏ các ký tự icon bị lỗi encoding trong giao diện.
- Build frontend thành công sau khi chỉnh UI.

### Cấu hình chạy dự án đơn giản hơn

- Thêm script `dev` vào `BankingSystem/package.json`.
- Từ thư mục `D:\Blockchain\final\BankingSystem` có thể chạy:

```powershell
npm run dev
```

- Script này sẽ tự chạy frontend Vite trong thư mục `frontend`.

### Sửa warning Vite CJS deprecated

- Đổi `frontend/vite.config.js` sang `frontend/vite.config.mjs`.
- Xóa file config `.js` cũ.
- Build lại và xác nhận warning CJS deprecated không còn xuất hiện.

### Đổi phong cách giao diện sang sky blue và trắng

- Đổi theme chính sang màu sky blue + trắng.
- Thêm nền Web3 dạng lưới sáng, glow xanh và hiệu ứng glassmorphism.
- Chỉnh sidebar sang phong cách sáng, cố định ở desktop.
- Thêm hiệu ứng hover 3D cho card, table, plan, portfolio và admin panel.
- Thêm animation trượt vào màn hình cho các thành phần chính.

### Tạo landing page riêng trước khi vào app

- Tách màn giới thiệu thành landing screen riêng.
- Khi mở web, người dùng thấy landing trước.
- Sau khi bấm nút `Start Banking` mới vào dashboard chính.
- Landing có:
  - nền sky/white Web3
  - chữ giới thiệu ấn tượng
  - nút bắt đầu
  - hiệu ứng mây, orbit, đồng xu ngân hàng và tương tác chuột

### Tích hợp Three.js cho landing 3D thật

- Cài package `three` vào frontend.
- Tạo scene WebGL bằng Three.js trực tiếp trong React.
- Landing hiện có:
  - đồng xu 3D thật
  - platform/ngân hàng 3D
  - mây 3D
  - particle/star field
  - ánh sáng xanh sky
  - parallax theo chuột
  - click scene hoặc nút `Toggle 3D Coin` để đồng xu xoay nhanh
- Build frontend thành công sau khi tích hợp Three.js.
- Ghi nhận warning bundle lớn do Three.js làm tăng kích thước file JS; đây không phải lỗi và có thể tối ưu sau bằng lazy loading/dynamic import.

### Tạo prompt chuẩn cho các session sau

- Đã viết lại `docs/PROMPT_TEMPLATE.md` thành prompt riêng cho dự án Blockchain Savings System / Nebula Earn.
- Prompt mới mô tả rõ:
  - bối cảnh sản phẩm
  - stack hiện tại
  - cách chạy dự án
  - quy trình kiểm tra Git trước khi code
  - quy trình kiểm tra sau khi code
  - yêu cầu cập nhật `docs/Work_Log.md`
  - quy tắc commit/Git
  - phong cách frontend Web3 banking mong muốn
- Đồng thời sửa lại `docs/Work_Log.md` để nội dung tiếng Việt hiển thị đúng encoding.
