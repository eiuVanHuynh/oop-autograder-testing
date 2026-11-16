// Bảng danh sách dùng chung: khung thẻ trắng + thead dính + trạng thái loading/rỗng
// + phân trang, và tuỳ chọn xem dạng thẻ (như Notion/Obsidian).
// Shared list table: white card frame, sticky head, loading/empty states, pagination,
// plus an optional card view.
//
//   <DataTable columns={[{ key, header, render, className, align, card }]} rows={shown} ... />
//
// `card` nói cột đó nằm đâu trong THẺ (chế độ cards), bảng không đổi:
//   "title"  tiêu đề thẻ, chữ to, không nhãn       "badge"  nhãn trạng thái, góc trên phải
//   "meta"   (mặc định) cặp nhãn/giá trị, lưới 2 cột
//   "footer" dồn xuống chân thẻ                    "hide"   không hiện trong thẻ
// Không khai gì thì cột đầu tiên làm tiêu đề, cột không có header xuống chân thẻ.
//
// Trang gọi vẫn truyền TOÀN BỘ rows đã lọc; DataTable tự cắt theo pageSize.
import { useMemo, useState } from "react";
import {
  LayoutGrid,
  Table2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Pagination from "./Pagination";
import SegmentedControl from "./SegmentedControl";
import { getTableView, setTableView } from "../../models/tableView";
const ALIGN = { right: "text-right", center: "text-center", left: "text-left" };

const VIEW_OPTIONS = [
  { value: "table", label: <Table2 size={14} /> },
  { value: "cards", label: <LayoutGrid size={14} /> },
];

// Nút đổi bảng ↔ thẻ. Trang nào có FilterBar thì đặt nút VÀO ĐÓ (cùng nhóm với Refresh /
// Filter / Search) thay vì để DataTable tự vẽ một dải riêng chỉ chứa hai cái nút.
export function TableViewToggle({ value, onChange }) {
  return (
    <SegmentedControl
      options={VIEW_OPTIONS}
      value={value}
      onChange={onChange}
      columns={2}
    />
  );
}

export default function DataTable({
  columns,
  rows,
  rowKey = (row) => row.id,
  rowClassName,
  onRowClick,
  loading = false,
  empty = "No data.",
  emptyIcon: EmptyIcon,
  maxHeight,
  pageSize,
  cards = false, // bật chế độ thẻ, thẻ dựng tự động từ `columns`
  view: viewProp, // truyền cặp view/onViewChange = trang tự giữ state và tự vẽ
  onViewChange, //   nút (xem TableViewToggle); DataTable thôi vẽ dải riêng
  renderCard, // tự vẽ thẻ riêng (ghi đè thẻ mặc định)
  cardMinWidth = "17rem", // thẻ tự xuống dòng theo bề rộng khung chứa, không theo viewport
  viewKey,
  className = "",
  toolbar,
}) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: null, dir: "asc" });
  const canCards = cards || !!renderCard;
  const controlled = onViewChange !== undefined;
  const [ownView, setOwnView] = useState(() =>
    canCards ? getTableView(viewKey) : "table",
  );
  const view = controlled ? viewProp : ownView;

  // Lọc/tìm kiếm đổi danh sách -> quay về trang 1, nếu không sẽ thấy trang trống.
  // Chỉnh state ngay trong lúc render (cách React khuyến nghị) thay vì useEffect.
  // So theo ĐỘ DÀI, không theo identity: trang gọi có thể truyền mảng mới mỗi lần render
  // (vd Dashboard dùng runs.slice) -> so identity sẽ setState mãi và treo vòng render.
  // Lọc mà không đổi số dòng thì giữ nguyên trang; safePage bên dưới vẫn chặn trang vượt.
  const [prevLen, setPrevLen] = useState(rows.length);
  if (prevLen !== rows.length) {
    setPrevLen(rows.length);
    setPage(1);
  }
  const handleSort = (col) => {
    if (!col.sortable && !col.sortValue) return;
    setSort((prev) => {
      if (prev.key !== col.key) return { key: col.key, dir: "asc" };
      if (prev.dir === "asc") return { key: col.key, dir: "desc" };
      return { key: null, dir: "asc" }; // Click lần 3: reset về mặc định
    });
    setPage(1); // Đổi thứ tự sort thì quay về trang 1
  };
  const sortedRows = useMemo(() => {
    if (!sort.key) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;

    const getVal = col.sortValue ?? ((row) => row[col.key]);

    return [...rows].sort((a, b) => {
      const valA = getVal(a) ?? "";
      const valB = getVal(b) ?? "";

      let cmp = 0;
      if (typeof valA === "number" && typeof valB === "number") {
        cmp = valA - valB;
      } else {
        cmp = String(valA).localeCompare(String(valB), undefined, {
          numeric: true,
        });
      }
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, columns, sort]);

  const pageCount = pageSize
    ? Math.max(1, Math.ceil(sortedRows.length / pageSize))
    : 1;
  const safePage = Math.min(page, pageCount);
  const shown = useMemo(
    () =>
      pageSize
        ? sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize)
        : sortedRows,
    [sortedRows, pageSize, safePage],
  );

  const changeView = (next) => {
    setOwnView(next);
    setTableView(viewKey, next);
  };

  const isEmpty = !loading && sortedRows.length === 0;

  // Vai trò của từng cột trong thẻ. Mặc định: cột đầu làm tiêu đề, cột không header (checkbox,
  // nút hành động) xuống chân thẻ, còn lại là meta.
  const shownCols = columns.filter((c) => c.card !== "hide");
  const titleCol =
    shownCols.find((c) => c.card === "title") ??
    shownCols.find((c) => c.header && !c.card);
  const badgeCols = shownCols.filter((c) => c.card === "badge");
  const footCols = shownCols.filter((c) => c.card === "footer" || !c.header);
  const metaCols = shownCols.filter(
    (c) => c !== titleCol && !badgeCols.includes(c) && !footCols.includes(c),
  );

  const defaultCard = (row) => (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm">
      {/* Badge đứng riêng một hàng trên tiêu đề: để chung hàng thì tiêu đề dài bị ép
          thành cột chữ hẹp. Cùng khuôn với thẻ của History. */}
      {badgeCols.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {badgeCols.map((col) => (
            <div key={col.key}>{col.render(row)}</div>
          ))}
        </div>
      )}
      {titleCol && (
        <div className="min-w-0 break-words text-sm font-semibold text-gray-900">
          {titleCol.render(row)}
        </div>
      )}

      {metaCols.length > 0 && (
        <dl className="m-0 mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
          {metaCols.map((col) => (
            <div key={col.key} className="min-w-0">
              <dt className="m-0 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {col.header}
              </dt>
              <dd className="m-0 min-w-0 break-words text-sm text-gray-700">
                {col.render(row)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {footCols.length > 0 && (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-1 border-t border-gray-100 pt-2 [&>*:only-child]:ml-auto">
          {footCols.map((col) => (
            <div key={col.key}>{col.render(row)}</div>
          ))}
        </div>
      )}
    </div>
  );
  const card = renderCard ?? defaultCard;

  const body = isEmpty ? (
    <div className="text-center py-14 text-gray-400">
      {EmptyIcon && <EmptyIcon size={40} className="mx-auto mb-2 opacity-40" />}
      <p className="text-sm">{empty}</p>
    </div>
  ) : loading && sortedRows.length === 0 ? (
    <p className="px-5 py-8 text-center text-sm text-gray-400">Loading…</p>
  ) : view === "cards" && canCards ? (
    <div
      className="grid gap-3 p-4"
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(min(${cardMinWidth}, 100%), 1fr))`,
      }}
    >
      {shown.map((row) => (
        <div
          key={rowKey(row)}
          className="min-w-0"
          onClick={onRowClick ? () => onRowClick(row) : undefined}
        >
          {card(row)}
        </div>
      ))}
    </div>
  ) : (
    <table className="w-full text-sm border-collapse">
      <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0 z-10 shadow-sm">
        <tr>
          {columns.map((col) => {
            const isSortable = Boolean(col.sortable || col.sortValue);
            const isActive = sort.key === col.key;

            return (
              <th
                key={col.key}
                onClick={isSortable ? () => handleSort(col) : undefined}
                className={`px-5 py-3 font-semibold select-none ${ALIGN[col.align] ?? "text-left"} ${
                  isSortable
                    ? "cursor-pointer hover:text-brand-600 transition-colors"
                    : ""
                } ${col.headClassName ?? ""}`}
                style={col.width ? { width: col.width } : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {isSortable &&
                    (isActive ? (
                      sort.dir === "asc" ? (
                        <ArrowUp size={13} className="text-brand-600" />
                      ) : (
                        <ArrowDown size={13} className="text-brand-600" />
                      )
                    ) : (
                      <ArrowUpDown size={13} className="opacity-30" />
                    ))}
                </span>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {shown.map((row) => (
          <tr
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`group hover:bg-gray-50 ${onRowClick ? "cursor-pointer" : ""} ${
              rowClassName ? rowClassName(row) : ""
            }`}
          >
            {columns.map((col) => (
              <td
                key={col.key}
                className={`px-5 py-3 ${ALIGN[col.align] ?? ""} ${col.className ?? ""}`}
              >
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}
    >
      {(toolbar || (canCards && !controlled && !isEmpty)) && (
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100">
          <div className="min-w-0">{toolbar}</div>
          {canCards && !controlled && !isEmpty && (
            <TableViewToggle value={view} onChange={changeView} />
          )}
        </div>
      )}

      {/* key = chế độ xem + trang: đổi bảng/thẻ hay lật trang thì hoạt ảnh chạy lại.
          Hoạt ảnh đặt lên chính khung cuộn, không lên nội dung bên trong: đặt bên trong thì
          đoạn lệch phải sinh thanh cuộn ngang, còn ở đây thẻ ngoài đã overflow-hidden. */}
      <div
        key={`${view}-${safePage}`}
        className="overflow-auto animate-panel-in"
        style={maxHeight ? { maxHeight } : undefined}
      >
        {body}
      </div>

      {pageSize && sortedRows.length > 0 && (
        <Pagination
          page={safePage}
          pageCount={pageCount}
          total={sortedRows.length}
          onChange={setPage}
        />
      )}
    </div>
  );
}
