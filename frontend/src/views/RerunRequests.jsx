// Hàng đợi yêu cầu chạy lại (/rerun-requests) — issue #97.
// Re-run request queue (/rerun-requests) — issue #97.
//
// Một trang cho cả hai phía, vì GET /rerun-requests mở cho mọi người đã đăng nhập:
//  - Dev: xem yêu cầu mình đã gửi và nó được duyệt chưa (nút xin nằm ở trang báo cáo /runs/:id)
//  - Admin/Tester: dấu ✓ / ✗ để duyệt, cả hai đều hỏi lại trước khi ghi
//  - Admin: yêu cầu đã quyết định rồi vẫn sửa được trạng thái (duyệt nhầm, hoặc duyệt mà chưa
//    kịp chạy test) bằng nút bút chì -> PATCH /rerun-requests/:id
//
// Duyệt KHÔNG chạy test và KHÔNG chuyển trang: backend chỉ ghi quyết định. Sang trang Run Test
// với config của run cũ là việc của nút con mắt.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { RotateCcw, RefreshCw, Check, X, Eye, Pencil } from "lucide-react";
import { useAuth } from "../controllers/AuthContext";
import { canDecideRerun, canResetRerunStatus } from "../models/permissions";
import {
  listRerunRequests,
  decideRerunRequest,
  setRerunRequestStatus,
} from "../services/rerunRequestService";
import { getErrorMessage } from "../services/authService";
import DataTable from "../components/ui/DataTable";
import StatusBadge from "../components/ui/StatusBadge";
import IconButton from "../components/ui/IconButton";
import PageHeader from "../components/ui/PageHeader";

const STATUSES = ["PENDING", "APPROVED", "REJECTED"];

export default function RerunRequests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mayDecide = canDecideRerun(user?.role);
  const mayReset = canResetRerunStatus(user?.role);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Hộp xác nhận: { req, action: 'approve' | 'reject' | 'edit' }. Mọi thao tác GHI đều đi qua đây,
  // kể cả Approve — bấm nhầm một dòng trong bảng là chuyện quá dễ.
  const [dialog, setDialog] = useState(null);
  const [nextStatus, setNextStatus] = useState("PENDING");

  const load = () => {
    setLoading(true);
    listRerunRequests()
      .then(setRequests)
      .catch((e) => toast.error(getErrorMessage(e, "Cannot load re-run requests.")))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const ask = (req, action) => {
    setNextStatus(action === "edit" ? req.status : "PENDING");
    setDialog({ req, action });
  };

  // Chạy sau khi người dùng xác nhận trong hộp thoại. Không chuyển trang: muốn sang Run Test thì
  // bấm con mắt.
  const confirm = async () => {
    const { req, action } = dialog;
    setSaving(true);
    try {
      const updated =
        action === "edit"
          ? await setRerunRequestStatus(req.id, nextStatus)
          : await decideRerunRequest(req.id, action);
      setRequests((list) => list.map((r) => (r.id === updated.id ? updated : r)));
      setDialog(null);
      toast.success(`Request #${req.id} is now ${updated.status}.`);
    } catch (e) {
      // 409 = người khác vừa quyết định trước, hoặc run đó đã có một yêu cầu khác đang chờ.
      toast.error(getErrorMessage(e, "Could not save the change."));
      if (e?.response?.status === 409) {
        setDialog(null);
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  // Sang trang Run Test với config của run cũ. Duyệt xong KHÔNG tự chạy, nên đây là bước người
  // duyệt tự làm. Run cũ không lưu config thì form để trống và họ tự chọn template.
  const openRunTest = (req) => {
    // Trang Run Test chỉ chạy được theo TEMPLATE. Run cũ không lưu config, hoặc lưu config kiểu
    // { testIds: [...] } (chạy theo danh sách case, không qua template), thì form sẽ trống —
    // nói ra ở đây, vì sang bên kia người duyệt chỉ thấy một cái form trắng không rõ vì sao.
    if (!req.prefill?.templateId) {
      toast.error(`Run #${req.runId} was not started from a template — pick one yourself.`);
    }
    navigate("/tests/new", { state: { prefill: req.prefill, fromRequestId: req.id } });
  };

  const dialogText = () => {
    const { req, action } = dialog;
    if (action === "approve")
      return `Approve request #${req.id} for run ${req.runName}? This records the decision only — the test does not start until someone presses Run Test.`;
    if (action === "reject") return `Reject request #${req.id} for run ${req.runName}?`;
    return `Request #${req.id} is ${req.status}. Setting it back to PENDING puts it in the queue again and clears who decided it.`;
  };

  return (
    <div className="page">
      <PageHeader
        title="Re-run Requests"
        description={
          mayDecide
            ? "Developers ask here when a run needs to be executed again. Approving records the decision; the eye icon opens Run Test with the original configuration."
            : "Re-runs you asked for, and whether a reviewer has approved them yet."
        }
      />

      <DataTable
        rows={requests}
        loading={loading}
        empty="No re-run request yet."
        emptyIcon={RotateCcw}
        pageSize={10}
        rowKey={(req) => req.id}
        onRowClick={(req) => navigate(`/runs/${req.runId}`)}
        toolbar={
          <div className="flex w-full items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <RotateCcw size={18} className="text-brand-600" /> Requests
            </h3>
            {/* Hàng đợi: một yêu cầu mới (hoặc quyết định của người khác) chỉ hiện ra khi tải lại. */}
            <IconButton icon={RefreshCw} title="Reload" onClick={load} disabled={loading} />
          </div>
        }
        columns={[
          {
            key: "status",
            header: "Status",
            sortable: true,
            width: "130px",
            render: (req) => <StatusBadge status={req.status} />,
          },
          {
            key: "runName",
            header: "Run",
            sortable: true,
            width: "30%",
            render: (req) => (
              <div>
                <p className="font-semibold text-gray-900">{req.runName}</p>
                <p className="text-xs text-gray-500 font-mono">#{req.runId}</p>
              </div>
            ),
          },
          {
            key: "reason",
            header: "Reason",
            className: "text-xs text-gray-600",
            render: (req) => req.reason || <span className="text-gray-400">—</span>,
          },
          {
            key: "requestedBy",
            header: "Asked by",
            sortable: true,
            width: "150px",
            className: "text-xs text-gray-600",
            render: (req) => (
              <div>
                <p>{req.requestedBy}</p>
                <p className="text-gray-400">{req.createdAt}</p>
              </div>
            ),
          },
          {
            key: "decidedBy",
            header: "Decided by",
            width: "150px",
            className: "text-xs text-gray-600",
            render: (req) =>
              req.decidedBy ? (
                <div>
                  <p>{req.decidedBy}</p>
                  <p className="text-gray-400">{req.decidedAt}</p>
                </div>
              ) : (
                <span className="text-gray-400">—</span>
              ),
          },
          {
            key: "actions",
            header: "",
            align: "right",
            width: "130px",
            render: (req) => (
              <div className="flex items-center justify-end">
                {/* Đang chờ: duyệt / từ chối / sang Run Test. Đã quyết định: chỉ Admin sửa lại
                    trạng thái được (backend trả 403 với Tester và Dev). */}
                {req.status === "PENDING" && mayDecide && (
                  <>
                    <IconButton icon={Check} title="Approve" onClick={() => ask(req, "approve")} />
                    <IconButton icon={X} title="Reject" danger onClick={() => ask(req, "reject")} />
                  </>
                )}
                {/* Con mắt ở lại cả khi ĐÃ duyệt: duyệt rồi mới sang Run Test là đúng thứ tự, mà
                    duyệt xong dòng thành APPROVED — con mắt chỉ ở dòng PENDING thì mất luôn đường
                    đi. REJECTED thì không còn gì để chạy. */}
                {req.status !== "REJECTED" && mayDecide && (
                  <IconButton icon={Eye} title="Open Run Test" onClick={() => openRunTest(req)} />
                )}
                {req.status !== "PENDING" && mayReset && (
                  <IconButton icon={Pencil} title="Change status" onClick={() => ask(req, "edit")} />
                )}
              </div>
            ),
          },
        ]}
      />

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold text-gray-900">
              {dialog.action === "edit" ? "Change status" : "Please confirm"}
            </h3>
            <p className="mt-1 text-sm text-gray-600">{dialogText()}</p>

            {dialog.action === "edit" && (
              <select
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value)}
                className="mt-3 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDialog(null)}
                className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={saving || (dialog.action === "edit" && nextStatus === dialog.req.status)}
                className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
