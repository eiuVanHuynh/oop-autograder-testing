// Yêu cầu chạy lại (SRS mục 4: Dev chỉ xem và REQUEST chạy lại — issue #97).
//   POST /runs/:id/rerun-requests        -> Dev xin chạy lại một lần chạy cũ
//   GET  /rerun-requests                 -> hàng đợi, ai đăng nhập cũng xem được
//   POST /rerun-requests/:id/approve     -> Admin/Tester đồng ý
//   POST /rerun-requests/:id/reject      -> Admin/Tester từ chối
//
// Duyệt KHÔNG tự chạy test: backend chỉ ghi quyết định rồi trả kèm config của run cũ, nên nơi gọi
// mở trang Run Test với template điền sẵn (xem views/RerunRequests.jsx).
import API from '../models/api';

const unwrap = (r) => r?.data?.data ?? r?.data;
const rows = (p) => (Array.isArray(p) ? p : Array.isArray(p?.data) ? p.data : []);

const pad = (n) => String(n).padStart(2, '0');
const fmt = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? ''
    : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// runConfig là config_json của run CŨ: { templateId, testIds, env, timeout, grep }.
// Đây là thứ trang Run Test cần để điền sẵn; run cũ không có config thì prefill là null và
// người duyệt phải tự chọn template (không bịa ra giá trị mặc định).
// `status` backend trả chữ HOA (toApi) cho khớp StatusBadge.
export const toRerunRequest = (row = {}) => ({
  id: String(row.requestId ?? row.request_id),
  runId: String(row.runId ?? row.run_id),
  runName: row.runName || `Run #${row.runId ?? row.run_id}`,
  environment: row.environment || '—',
  status: String(row.status ?? 'PENDING').toUpperCase(),
  reason: row.reason || '',
  requestedBy: row.requesterName || '—',
  decidedBy: row.deciderName || '',
  createdAt: fmt(row.createdAt),
  decidedAt: fmt(row.decidedAt),
  prefill: row.runConfig
    ? {
        templateId: row.runConfig.templateId ?? null,
        env: row.runConfig.env ?? null,
        timeoutMs: row.runConfig.timeout ?? null,
      }
    : null,
});

// 404 nếu run không có, 409 nếu run này đã có một yêu cầu đang chờ duyệt.
export const requestRerun = async (runId, reason) =>
  toRerunRequest(
    unwrap(
      await API.post(`/runs/${runId}/rerun-requests`, reason?.trim() ? { reason: reason.trim() } : {}),
    ),
  );

// status (tuỳ chọn): PENDING | APPROVED | REJECTED.
export const listRerunRequests = async (params = {}) =>
  rows(unwrap(await API.get('/rerun-requests', { params }))).map(toRerunRequest);

// 409 nếu yêu cầu đã được duyệt/từ chối rồi (có người khác bấm trước).
export const decideRerunRequest = async (id, decision) =>
  toRerunRequest(unwrap(await API.post(`/rerun-requests/${id}/${decision}`)));

// PATCH /rerun-requests/:id — CHỈ Admin: đặt lại trạng thái, kể cả quay về PENDING khi đã duyệt
// mà chưa kịp chạy test. 403 với Tester/Dev, 409 nếu run đó đã có một yêu cầu khác đang chờ.
export const setRerunRequestStatus = async (id, status) =>
  toRerunRequest(unwrap(await API.patch(`/rerun-requests/${id}`, { status })));
