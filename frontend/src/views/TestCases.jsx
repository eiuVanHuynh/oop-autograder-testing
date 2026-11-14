// Trang Test Cases (/testcases) – danh sách: liệt kê, lọc, xem chi tiết, deprecate,
// và thêm case vào template (issue #41).
// Tạo / sửa / nhân bản đều dùng chung views/TestCaseForm.jsx, không còn modal riêng ở đây.
import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, X, Pencil, Archive, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../controllers/AuthContext";
import { canManageCases } from "../models/permissions";
import { CASE_TYPES, CASE_STATUSES } from "../models/options";
import {
  listCases,
  listSuites,
  getCase,
  deprecateCase,
} from "../services/catalogService";
import { parseQuery, buildQuery } from "../models/searchTags";
import { getTableView, setTableView } from "../models/tableView";
import { listTemplates, updateTemplate } from "../services/templateService";
import { getErrorMessage } from "../services/authService";
import FilterBar from "../components/ui/FilterBar";
import FilterMenu from "../components/ui/FilterMenu";
import RowMenu from "../components/ui/RowMenu";
import CreateButton from "../components/ui/CreateButton";
import IconButton from "../components/ui/IconButton";
import DataTable, { TableViewToggle } from "../components/ui/DataTable";
import StatusBadge from "../components/ui/StatusBadge";

const inputCls =
  "w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1";

export default function TestCases() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = canManageCases(user?.role);

  const [cases, setCases] = useState([]);
  const [suites, setSuites] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  // Bảng hay thẻ: trang giữ state vì nút nằm trên FilterBar, không nằm trong DataTable.
  const [view, setView] = useState(() => getTableView("testcases"));
  const changeView = (v) => {
    setView(v);
    setTableView("testcases", v);
  };
  // Ô search là nguồn sự thật duy nhất: tag nằm trong chuỗi `q`, filter suy ra từ nó.
  const [q, setQ] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [detail, setDetail] = useState(null); // null = đóng modal xem
  const [toRetire, setToRetire] = useState(null); // null = đóng modal xác nhận deprecate
  const [sel, setSel] = useState([]); // tc_code đang tick, để thêm vào template
  const [addTo, setAddTo] = useState(""); // id template đang chọn ở thanh "Add to template"

  useEffect(() => {
    listSuites()
      .then(setSuites)
      .catch((e) => toast.error(getErrorMessage(e, "Cannot load suites.")));
    // Dùng cho "Used in templates" và "Add to template" – lọc ở client, API chưa có endpoint riêng.
    listTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, [reloadKey]);

  // Tag gợi ý trong ô search = chính các option của panel Filter bên cạnh.
  const groups = useMemo(
    () => [
      {
        key: "suite",
        label: "Suite",
        allLabel: "All suites",
        options: suites.map((s) => ({ value: String(s.id), label: s.name })),
      },
      {
        key: "status",
        label: "Status",
        allLabel: "All status",
        options: CASE_STATUSES,
      },
      {
        key: "type",
        label: "Type",
        allLabel: "All types",
        options: CASE_TYPES,
      },
    ],
    [suites],
  );

  // Giữ identity của `filters` ổn định theo nội dung, nếu không mỗi lần gõ free text
  // là một lần gọi lại /catalog/cases.
  const { filters: parsed, text } = useMemo(
    () => parseQuery(q, groups),
    [q, groups],
  );
  const filterKey = JSON.stringify(parsed);
  const filters = useMemo(() => JSON.parse(filterKey), [filterKey]);
  const { suite: fSuite, status: fStatus, type: fType } = filters;

  // GET /catalog/cases?suite=&status=&type=  (text và trường hợp chọn nhiều giá trị thì lọc ở client)
  useEffect(() => {
    let off = false;
    setLoading(true);
    const one = (a) => (a.length === 1 ? a[0] : undefined);
    listCases({ suite: one(fSuite), status: one(fStatus), type: one(fType) })
      .then(
        (l) =>
          !off &&
          setCases(
            l.filter(
              (c) =>
                (fSuite.length === 0 || fSuite.includes(String(c.suiteId))) &&
                (fStatus.length === 0 || fStatus.includes(c.status)) &&
                (fType.length === 0 || fType.includes(c.type)),
            ),
          ),
      )
      .catch(
        (e) =>
          !off && toast.error(getErrorMessage(e, "Cannot load test cases.")),
      )
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, [fSuite, fStatus, fType, reloadKey]);

  const shown = useMemo(() => {
    const k = text.trim().toLowerCase();
    return k
      ? cases.filter(
          (c) =>
            c.code.toLowerCase().includes(k) ||
            c.title.toLowerCase().includes(k),
        )
      : cases;
  }, [cases, text]);

  // Template trỏ tới cả một suite thì không thêm lẻ từng case được.
  const addableTemplates = useMemo(
    () => templates.filter((t) => !t.suiteId),
    [templates],
  );
  const usedIn = (code) =>
    templates.filter((t) => t.targetTestIds?.includes(code));

  const refresh = () => {
    setSel([]);
    setReloadKey((k) => k + 1);
  };

  const openDetail = async (c) => {
    try {
      setDetail(await getCase(c.id));
    } catch (e) {
      // GET /catalog/cases/:id
      toast.error(getErrorMessage(e, "Cannot load detail."));
    }
  };

  // Không có DELETE /catalog/cases/:id — và cũng không nên có: lịch sử chạy trỏ vào case.
  // "Bỏ" một case = đưa về deprecated, runner sẽ không nhận nữa.
  const handleRetire = async () => {
    if (!canEdit) return toast.error("You do not have permission.");
    try {
      await deprecateCase(toRetire.id); // PUT /catalog/cases/:id
      toast.success(`${toRetire.code} deprecated.`);
      setToRetire(null);
      setDetail(null);
      refresh();
    } catch (e) {
      toast.error(getErrorMessage(e, "Cannot deprecate the test case."));
    }
  };

  // Thêm các case đang tick vào target_json.testIds của một template có sẵn.
  const handleAddToTemplate = async () => {
    if (!canEdit) return toast.error("You do not have permission.");
    const tpl = templates.find((t) => String(t.id) === String(addTo));
    if (!tpl) return toast.error("Pick a template.");
    const merged = [...new Set([...(tpl.targetTestIds || []), ...sel])];
    try {
      await updateTemplate(tpl.id, { ...tpl, targetTestIds: merged }); // PUT /templates/:id
      toast.success(`Added ${sel.length} test case(s) to ${tpl.name}.`);
      setAddTo("");
      refresh();
    } catch (e) {
      toast.error(getErrorMessage(e, "Cannot update the template."));
    }
  };

  const toggleSel = (code) =>
    setSel((s) =>
      s.includes(code) ? s.filter((c) => c !== code) : [...s, code],
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Test Case Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {canEdit
              ? "Declare, reuse, and retire the test cases a template can run."
              : "You have read-only access to test cases."}
          </p>
        </div>
        {canEdit && <CreateButton onClick={() => navigate("/testcases/new")} />}
      </div>

      <FilterBar
        value={q}
        onChange={setQ}
        placeholder="Search code / title, or pick a tag"
        onRefresh={refresh}
        loading={loading}
        tagGroups={groups}
        trailing={<TableViewToggle value={view} onChange={changeView} />}
      >
        <FilterMenu
          groups={groups}
          value={filters}
          onChange={(next) => setQ(buildQuery(next, text, groups))}
        />
      </FilterBar>

      {/* Thanh thao tác hàng loạt – dùng lại case cho template có sẵn */}
      {canEdit && sel.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-brand-50 border border-brand-200 rounded-xl px-4 py-2 text-sm">
          <span className="font-medium">{sel.length} selected</span>
          <select
            className={`${inputCls} w-auto`}
            value={addTo}
            onChange={(e) => setAddTo(e.target.value)}
          >
            <option value="">— choose a template —</option>
            {addableTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddToTemplate}
            disabled={!addTo}
            className="px-3 py-1.5 bg-brand-600 text-white rounded-xl disabled:opacity-50"
          >
            Add to template
          </button>
          <button
            onClick={() => setSel([])}
            className="text-gray-500 hover:text-gray-800"
          >
            Clear
          </button>
          {addableTemplates.length === 0 && (
            <span className="text-xs text-gray-500">
              No template takes individual test cases (suite-based templates are
              excluded).
            </span>
          )}
        </div>
      )}

      <DataTable
        rows={shown}
        loading={loading}
        empty="No test cases."
        cards
        view={view}
        onViewChange={changeView}
        pageSize={15}
        onRowClick={(c) => navigate(`/testcases/${c.id}/edit`)}
        rowKey={(c) => c.id}
        columns={[
          ...(canEdit
            ? [
                {
                  key: "sel",
                  header: "",
                  card: "footer",
                  width: "2rem",
                  render: (c) => (
                    <input
                      type="checkbox"
                      checked={sel.includes(c.code)}
                      onChange={() => toggleSel(c.code)}
                    />
                  ),
                },
              ]
            : []),
          {
            key: "code",
            header: "Code",
            className: "font-mono text-xs",
            sortable: true,
            render: (c) => c.code,
          },
          {
            key: "title",
            header: "Title",
            card: "title",
            sortable: true,
            render: (c) => (
              <div className="group cursor-pointer">
                <span className="group-hover:text-brand-600 transition-colors font-medium text-gray-900 block">
                  {c.title}
                </span>
              </div>
            ),
          },
          {
            key: "spec",
            header: "Spec",
            sortable: true,
            className: "text-xs text-gray-500",
            render: (c) => c.specCode,
          },
          {
            key: "type",
            header: "Type",
            sortable: true,
            render: (c) => c.type,
          },
          {
            key: "priority",
            header: "Priority",
            sortable: true,
            card: "badge",
            render: (c) => <StatusBadge status={c.priority} />,
          },
          {
            key: "status",
            header: "Status",
            sortable: true,
            card: "badge",
            render: (c) => <StatusBadge status={c.status} />,
          },
          {
            key: "usedIn",
            header: "Used in",
            sortable: true,
            className: "text-xs text-gray-500",
            render: (c) => usedIn(c.code).length || "—",
          },
          {
            key: "actions",
            header: "",
            align: "right",
            className: "whitespace-nowrap",
            render: (c) =>
              canEdit ? (
                <>
                  {/* Người sửa cũng cần xem nhanh steps + "Used in templates" mà không mở trang sửa. */}
                  <IconButton
                    icon={Eye}
                    title="View"
                    onClick={() => openDetail(c)}
                  />
                  <IconButton
                    icon={Pencil}
                    title="Edit"
                    onClick={() => navigate(`/testcases/${c.id}/edit`)}
                  />
                  <IconButton
                    icon={Copy}
                    title="Nhân bản (copy steps sang case mới)"
                    onClick={() => navigate(`/testcases/new?from=${c.id}`)}
                  />
                  {c.status !== "deprecated" && (
                    <RowMenu
                      items={[
                        {
                          label: "Deprecate",
                          icon: Archive,
                          onClick: () => setToRetire(c),
                          danger: true,
                        },
                      ]}
                    />
                  )}
                </>
              ) : (
                <IconButton
                  icon={Eye}
                  title="View"
                  onClick={() => openDetail(c)}
                />
              ),
          },
        ]}
      />

      {/* Modal xem chi tiết */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {detail.code} – {detail.title}
              </h3>
              <button
                onClick={() => setDetail(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm">
              <b>Expected:</b> {detail.expectedResult}
            </p>
            {detail.preconditions && (
              <p className="text-sm">
                <b>Preconditions:</b> {detail.preconditions}
              </p>
            )}
            <p className="text-sm text-gray-500">
              {detail.type} · {detail.priority} · {detail.status}
            </p>
            <ol className="list-decimal pl-5 text-sm space-y-1">
              {detail.steps.length === 0 && (
                <li className="list-none text-gray-400">No steps.</li>
              )}
              {detail.steps.map((s) => (
                <li key={s.order}>
                  {s.action}
                  {s.target && (
                    <span className="text-gray-400"> → {s.target}</span>
                  )}
                  {s.field && (
                    <span className="text-brand-600 font-mono">
                      {" "}
                      ← data.{s.field}
                    </span>
                  )}
                  {s.expected && (
                    <span className="text-gray-500">
                      {" "}
                      (expect: {s.expected})
                    </span>
                  )}
                </li>
              ))}
            </ol>

            <div className="border-t border-gray-100 pt-3">
              <p className={labelCls}>Used in templates</p>
              {usedIn(detail.code).length === 0 ? (
                <p className="text-sm text-gray-400">
                  Not used by any template yet.
                </p>
              ) : (
                <ul className="text-sm space-y-0.5">
                  {usedIn(detail.code).map((t) => (
                    <li key={t.id}>
                      <Link
                        to="/templates"
                        className="text-brand-600 hover:underline"
                      >
                        {t.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận deprecate */}
      {toRetire && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-3">
            <h3 className="text-lg font-bold">Deprecate {toRetire.code}?</h3>
            <p className="text-sm text-gray-600">
              Case vẫn còn trong lịch sử chạy nhưng sẽ không được đưa vào run
              nữa. Mở lại bằng cách sửa case rồi bấm "Save & mark ready".
            </p>
            {usedIn(toRetire.code).length > 0 && (
              <p className="text-sm text-orange-700">
                Still referenced by {usedIn(toRetire.code).length} template(s).
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setToRetire(null)}
                className="px-3 py-2 text-sm rounded-xl border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRetire}
                className="px-3 py-2 text-sm rounded-xl bg-red-600 text-white"
              >
                Deprecate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
