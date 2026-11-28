// Trang Quản lý Template (/templates) – theo docs/frontend/design/08-template-management.png
// và docs/backend/api-endpoints.md mục 4.
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Pencil,
  Trash2,
  Eye,
  FileText,
  Copy,
  Power,
  PowerOff,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../controllers/AuthContext";
import { canManageTemplates } from "../models/permissions";
import { SCOPES } from "../models/options";
import {
  listTemplates,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
} from "../services/templateService";
import { getErrorMessage } from "../services/authService";
import CreateButton from "../components/ui/CreateButton";
import PageHeader from "../components/ui/PageHeader";
import FilterBar from "../components/ui/FilterBar";
import FilterMenu from "../components/ui/FilterMenu";
import RowMenu from "../components/ui/RowMenu";
import IconButton from "../components/ui/IconButton";
import DataTable, { TableViewToggle } from "../components/ui/DataTable";
import StatusBadge from "../components/ui/StatusBadge";
import { parseQuery, buildQuery } from "../models/searchTags";
import { useTableView } from "../models/tableView";

// Tag của riêng trang Templates, dùng chung cho ô search và panel Filter.
const GROUPS = [
  {
    key: "scope",
    label: "Test scope",
    allLabel: "All scopes",
    options: SCOPES,
  },
  {
    key: "status",
    label: "Status",
    allLabel: "All status",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
];

const tplCode = (id) => `TPL-${String(id).padStart(4, "0")}`;

export default function Templates() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = canManageTemplates(user?.role);

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  // Bảng hay thẻ: trang giữ state vì nút nằm trên FilterBar, không nằm trong DataTable.
  // Màn hẹp thì tự chuyển dạng thẻ; `locked` = lúc đó, nút đổi dạng không còn nghĩa.
  const { view, setView: changeView, locked: narrow } = useTableView("templates");
  // Ô search là nguồn sự thật duy nhất: tag nằm trong chuỗi `q`, filter suy ra từ nó.
  const [q, setQ] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [toDelete, setToDelete] = useState(null);

  // Tag gợi ý trong ô search = chính các option của panel Filter bên cạnh.
  const { filters: parsed, text } = useMemo(() => parseQuery(q, GROUPS), [q]);
  // Giữ identity ổn định theo nội dung, nếu không mỗi ký tự gõ vào là một lần gọi lại API.
  const filterKey = JSON.stringify(parsed);
  const filters = useMemo(() => JSON.parse(filterKey), [filterKey]);
  const { scope: scopes, status: statuses } = filters;

  // GET /templates?q=&scope= (tìm sau 300ms ngừng gõ)
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // BACKEND-TODO: GET /templates chỉ nhận 1 scope / 1 status, nên chọn nhiều
        // giá trị thì lọc nốt ở client.
        const list = await listTemplates({
          q: text.trim() || undefined,
          scope: scopes.length === 1 ? scopes[0] : undefined,
          status: statuses.length === 1 ? statuses[0] : undefined,
        });
        if (!cancelled)
          setTemplates(
            list.filter(
              (t) =>
                (scopes.length === 0 || scopes.includes(t.scope)) &&
                (statuses.length === 0 || statuses.includes(t.status)),
            ),
          );
      } catch (err) {
        if (!cancelled)
          toast.error(getErrorMessage(err, "Cannot load templates."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, scopes, statuses, reloadKey]);

  const refresh = () => setReloadKey((k) => k + 1);

  const handleDelete = async () => {
    if (!canEdit) return toast.error("You do not have permission.");
    try {
      await deleteTemplate(toDelete.id); // DELETE /templates/:id (204)
      toast.success("Template deleted.");
      setToDelete(null);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "Cannot delete the template."));
    }
  };

  // Tắt tạm một template: không xoá, chỉ để nó không còn chọn được khi Run (issue #41 mục 2).
  const handleToggleStatus = async (t) => {
    if (!canEdit) return toast.error("You do not have permission.");
    const next = t.status === "inactive" ? "active" : "inactive";
    try {
      await updateTemplate(t.id, { ...t, status: next }); // PUT /templates/:id
      toast.success(
        next === "inactive" ? "Template deactivated." : "Template activated.",
      );
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "Cannot change the template status."));
    }
  };

  const handleDuplicate = async (t) => {
    if (!canEdit) return toast.error("You do not have permission.");
    try {
      await duplicateTemplate(t.id); // POST /templates/:id/duplicate (201)
      toast.success("Template duplicated.");
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "Cannot duplicate the template."));
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Test Case Template Management"
        description={
          canEdit
            ? "Create, organize, and reuse test configurations."
            : "You have read-only access to templates."
        }
        actions={canEdit && <CreateButton onClick={() => navigate("/templates/new")} />}
      />

      <FilterBar
        value={q}
        onChange={setQ}
        placeholder="Search templates by name, or pick a tag"
        onRefresh={refresh}
        loading={loading}
        tagGroups={GROUPS}
        trailing={
          !narrow && <TableViewToggle value={view} onChange={changeView} />
        }
      >
        <FilterMenu
          groups={GROUPS}
          value={filters}
          onChange={(next) => setQ(buildQuery(next, text, GROUPS))}
        />
      </FilterBar>

      {/* Table */}
      {/* Table */}
      <DataTable
        rows={templates}
        loading={loading}
        empty="No templates found."
        emptyIcon={FileText}
        maxHeight="450px"
        cards
        view={view}
        onViewChange={changeView}
        pageSize={10}
        rowClassName={(t) => (t.status === "inactive" ? "opacity-60" : "")}
        onRowClick={(t) => navigate(`/templates/${t.id}`)}
        rowKey={(t) => t.id}
        columns={[
          {
            key: "name",
            header: "Template name & description",
            card: "title",
            sortable: true,
            render: (t) => (
              <div className="group cursor-pointer">
                {/* 🌟 Dùng font-bold (hoặc font-semibold) và giữ group-hover để đổi màu tím */}
                <span className="font-bold text-gray-900 block group-hover:text-brand-600 transition-colors">
                  {t.name}
                </span>
                <p className="text-xs text-gray-500 truncate max-w-md mt-0.5">
                  {t.description || "No description"}
                </p>
                <p className="text-xs text-gray-500 font-mono mt-1">
                  ID: {tplCode(t.id)}
                  {t.status === "inactive" && (
                    <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-600 rounded font-sans">
                      Inactive
                    </span>
                  )}
                </p>
              </div>
            ),
          },
          {
            key: "scope",
            header: "Test scope",
            sortable: true,
            card: "badge",
            render: (t) => <StatusBadge status={t.scope} tone="brand" />,
          },
          {
            key: "createdBy",
            header: "Created by",
            sortable: true,
            className: "text-gray-600",
            render: (t) => `User #${t.createdBy}`,
          },
          {
            key: "updatedAt",
            header: "Last updated",
            sortable: true,
            className: "text-gray-600",
            render: (t) => t.updatedAt,
          },
          {
            key: "actions",
            header: "",
            align: "right",
            className: "whitespace-nowrap",
            render: (t) =>
              canEdit ? (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1"
                >
                  <IconButton
                    icon={Copy}
                    title="Duplicate"
                    onClick={() => handleDuplicate(t)}
                  />
                  <IconButton
                    icon={Pencil}
                    title="Edit"
                    onClick={() => navigate(`/templates/${t.id}/edit`)}
                  />
                  <RowMenu
                    items={[
                      {
                        label:
                          t.status === "inactive" ? "Activate" : "Deactivate",
                        icon: t.status === "inactive" ? PowerOff : Power,
                        onClick: () => handleToggleStatus(t),
                      },
                      {
                        label: "Delete",
                        icon: Trash2,
                        onClick: () => setToDelete(t),
                        danger: true,
                      },
                    ]}
                  />
                </div>
              ) : (
                <div onClick={(e) => e.stopPropagation()}>
                  <IconButton
                    icon={Eye}
                    title="View"
                    onClick={() => navigate(`/templates/${t.id}`)}
                  />
                </div>
              ),
          },
        ]}
      />

      {/* Modal: tạo / sửa / xem */}
      {/* Modal: xác nhận xóa */}
      {toDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold">Delete template?</h3>
            <p className="text-sm text-gray-600">
              <strong>{toDelete.name}</strong> will be deleted. Past runs keep
              their history.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setToDelete(null)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}