#!/usr/bin/env bash
# Dung database local tu so khong: nap schema roi nap tai khoan DEV de dang nhap.
# Chay lai duoc nhieu lan (schema dung IF NOT EXISTS, seed dung WHERE NOT EXISTS).
# KHONG dung tren production.
#
#   ./db/seed-dev-users.sh
#   DATABASE_URL='postgresql://user:pass@localhost:5432/test_automation_db' ./db/seed-dev-users.sh
#
# Huong dan day du: db/SETUP-LOCAL.md
# Tai khoan va mat khau: dau file db/migrations/007_seed_users.sql
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/backend/.env"

die() { echo "LOI: $1" >&2; exit 1; }

command -v psql >/dev/null \
  || die "chua co lenh psql. Arch: sudo pacman -S postgresql | Ubuntu/WSL: sudo apt install postgresql-client | macOS: brew install libpq"

# Uu tien bien moi truong; khong co thi doc tu backend/.env.
# Lay DONG DAU TIEN va bo dau nhay bao quanh neu co ("..." hoac '...').
if [[ -z "${DATABASE_URL:-}" ]]; then
  [[ -f "$ENV_FILE" ]] || die "khong thay $ENV_FILE. Tao file do voi dong DATABASE_URL=..., hoac chay: DATABASE_URL='postgresql://...' $0"
  DATABASE_URL="$(sed -n 's/^DATABASE_URL=//p' "$ENV_FILE" | head -1)"
  DATABASE_URL="${DATABASE_URL%$'\r'}"          # file soan tren Windows
  DATABASE_URL="${DATABASE_URL%\"}"; DATABASE_URL="${DATABASE_URL#\"}"
  DATABASE_URL="${DATABASE_URL%\'}"; DATABASE_URL="${DATABASE_URL#\'}"
fi
[[ -n "$DATABASE_URL" ]] || die "DATABASE_URL rong. Khai trong $ENV_FILE hoac dat bien moi truong."

# Kiem tra ket noi truoc, de bao loi ro thay vi de psql nem ra giua chung.
psql "$DATABASE_URL" -tAc 'SELECT 1' >/dev/null 2>&1 \
  || die "khong ket noi duoc toi database.
  - Postgres da chay chua?   sudo systemctl start postgresql
  - Da tao database va user chua? Xem db/SETUP-LOCAL.md muc 1
  - DATABASE_URL co dung khong? (dang postgresql://user:pass@host:5432/ten_db)"

run() {
  echo "-> $1"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$ROOT/$1"
}

run db/schema/test_automation_db_schema.sql
run db/migrations/007_seed_users.sql
run db/migrations/008_templates_and_run_config.sql
run db/migrations/009_seed_sample_template.sql

echo
psql "$DATABASE_URL" -c "SELECT user_id, email, user_role, user_status FROM users ORDER BY user_id"
echo "Xong. Mat khau cua cac tai khoan tren: xem db/migrations/007_seed_users.sql"
