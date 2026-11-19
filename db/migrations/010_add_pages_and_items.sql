-- 1. Thêm dữ liệu mẫu vào bảng pages (Các trang web)
INSERT INTO pages (title, url_path, use_status) VALUES
('Trang Đăng Nhập', '/login', 'active'),
('Trang Dashboard', '/dashboard', 'active'),
('Trang Báo Cáo Thống Kê', '/reports', 'draft');

-- 2. Thêm dữ liệu mẫu vào bảng items (Các thành phần UI)
INSERT INTO items (name, tag_type, selector, use_status) VALUES
('Tiêu đề', 'h1', 'h1.title', 'active'),
('Nút Đăng Nhập', 'button', 'button#login-btn', 'active'),
('Ô nhập Email', 'input', 'input[name="email"]', 'active'),
('Nút Đăng Xuất', 'button', 'button.logout-btn', 'active'),
('Bảng danh sách user', 'table', 'table.user-table', 'inactive');

-- 3. Liên kết Page và Item (Bảng page_items - quan hệ *-*)
-- Trang Đăng Nhập (page_id = 1) sẽ chứa: Ô nhập Email (item_id = 3), Nút Đăng Nhập (item_id = 2)
-- Trang Dashboard (page_id = 2) sẽ chứa: Tiêu đề (item_id = 1), Nút Đăng Xuất (item_id = 4), Bảng user (item_id = 5)
INSERT INTO page_items (page_id, item_id) VALUES
(1, 2), -- Login có Nút Đăng Nhập
(1, 3), -- Login có Ô nhập Email
(2, 1), -- Dashboard có Tiêu đề
(2, 4), -- Dashboard có Nút Đăng Xuất
(2, 5); -- Dashboard có Bảng danh sách user