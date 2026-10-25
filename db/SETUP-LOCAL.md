# Dựng database local để chạy back-end

Database của dự án là **PostgreSQL** (theo SRS mục 4, đích cuối là Supabase).
Nếu bạn từng cài MySQL cho dự án này thì không dùng nữa.

Làm một lần duy nhất cho mục 1–2, sau đó chỉ cần mục 3.

---

## 1. Cài và khởi động PostgreSQL

| Hệ điều hành | Lệnh |
|---|---|
| Arch / Omarchy | `sudo pacman -S postgresql` |
| Ubuntu / WSL | `sudo apt install postgresql` |
| macOS | `brew install postgresql@16` |
| Windows | Tải installer ở postgresql.org, **hoặc** dùng WSL rồi theo hàng Ubuntu |

Arch cần khởi tạo cluster lần đầu (Ubuntu/macOS/Windows thì installer làm sẵn):

```bash
sudo -iu postgres initdb --locale=C.UTF-8 --encoding=UTF8 -D /var/lib/postgres/data
```

Khởi động:

```bash
sudo systemctl start postgresql      # Linux/WSL
sudo systemctl enable postgresql     # tuỳ chọn: tự chạy khi khởi động máy
```

## 2. Tạo user và database

Đặt `<mật-khẩu>` tuỳ bạn, lát nữa khai lại trong `.env`:

```bash
sudo -u postgres psql \
  -c "CREATE ROLE root LOGIN PASSWORD '<mật-khẩu>'" \
  -c "CREATE DATABASE test_automation_db OWNER root"
```

Rồi tạo `backend/.env` (file này **không** commit lên git):

```
DATABASE_URL=postgresql://root:<mật-khẩu>@localhost:5432/test_automation_db
JWT_SECRET=<chuỗi-ngẫu-nhiên-bất-kỳ-dài>
```

Sinh nhanh một `JWT_SECRET`: `openssl rand -base64 32`

## 3. Nạp bảng và tài khoản

```bash
cd backend && npm install && cd ..
./db/seed-dev-users.sh
```

Script sẽ nạp `db/schema/test_automation_db_schema.sql` (10 bảng) rồi
`db/migrations/007_seed_users.sql` (5 tài khoản), sau đó in bảng user ra.
Chạy lại bao nhiêu lần cũng được — không nhân bản dữ liệu.

Trỏ sang database khác mà không sửa `.env`:

```bash
DATABASE_URL='postgresql://...' ./db/seed-dev-users.sh
```

**Windows:** chạy trong **Git Bash** hoặc **WSL**, không chạy được trong
CMD/PowerShell. Hoặc mở `db/schema/...sql` rồi `db/migrations/007_seed_users.sql`
trong DBeaver và Execute Script (Alt+X) theo đúng thứ tự đó.

## 4. Chạy back-end

```bash
cd backend && npm run dev     # http://localhost:5000/api
```

Thử đăng nhập (mật khẩu xem ở đầu `db/migrations/007_seed_users.sql`):

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@eiu.edu.vn","password":"Test@1234"}'
```

Phải trả `200` kèm `token` và `user`. Các mã lỗi còn lại:
`401` sai mật khẩu hoặc email không tồn tại · `423` tài khoản bị khoá
(`locked@eiu.edu.vn`) · `400` thiếu trường.

## 5. Xem dữ liệu trực tiếp

```bash
psql "$(sed -n 's/^DATABASE_URL=//p' backend/.env)"
```

Trong psql: `\dt` liệt kê bảng · `\d users` xem cấu trúc một bảng ·
`\x` bật hiển thị dọc · `\q` thoát.

GUI thì DBeaver hoặc pgAdmin, nối bằng: host `localhost`, port `5432`,
database `test_automation_db`, user và mật khẩu như trong `.env`.

---

## Gặp lỗi

| Thông báo | Nguyên nhân |
|---|---|
| `khong co lenh psql` | Chưa cài PostgreSQL client — xem mục 1 |
| `khong ket noi duoc toi database` | Postgres chưa chạy, hoặc chưa tạo user/database (mục 2), hoặc `DATABASE_URL` sai |
| `relation "users" does not exist` | Chưa nạp schema — chạy `./db/seed-dev-users.sh` |
| `Cannot find module 'pg'` | Chưa `npm install` trong `backend/` |
| `EADDRINUSE :::5000` | Đã có tiến trình chiếm cổng 5000: `pkill -f "node src/server.js"` |

## Những chỗ còn là MySQL

`db/seed/seed.sql`, `db/migrations/002` và `006` vẫn là cú pháp MySQL,
chưa nạp được vào Postgres. `automation/tests/utils/db-client.js` vẫn dùng
`mysql2` và cổng 3306 nên automation chưa chạy với database này.
