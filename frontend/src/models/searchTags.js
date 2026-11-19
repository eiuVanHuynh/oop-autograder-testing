// Ô tìm kiếm là nguồn sự thật duy nhất: token nào khớp label của một option trong
// `groups` thì là TAG (tick vào filter), phần còn lại là free text.
// Nhờ vậy ô search và panel Filter đồng bộ hai chiều mà không cần state thứ hai.
//
//   q = "ready API login form"
//   → filters = { status: ["ready"], type: ["api"] }, text = "login form"
//
// options: mảng chuỗi, hoặc mảng { value, label } — cùng hợp đồng với FilterMenu.
export const toOption = (o) =>
  typeof o === "object" ? o : { value: o, label: o };

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Phẳng hoá groups, label DÀI TRƯỚC để "Testing Sandbox" ăn trước "Testing".
const flatOptions = (groups) =>
  groups
    .flatMap((g) =>
      (g.options || [])
        .map(toOption)
        .map((o) => ({ ...o, key: g.key, groupLabel: g.label })),
    )
    .sort((a, b) => String(b.label).length - String(a.label).length);

const emptyFilters = (groups) =>
  Object.fromEntries(groups.map((g) => [g.key, []]));

export function parseQuery(q, groups) {
  const filters = emptyFilters(groups);
  let text = String(q ?? "");
  for (const o of flatOptions(groups)) {
    // Biên từ bằng khoảng trắng/đầu/cuối chuỗi: label nhiều từ vẫn khớp nguyên cụm.
    const re = new RegExp(`(?:^|\\s)${escapeRe(String(o.label))}(?=\\s|$)`, "i");
    if (re.test(text)) {
      if (!filters[o.key].includes(o.value)) filters[o.key].push(o.value);
      text = text.replace(re, " ");
    }
  }
  // Giữ nguyên MỘT dấu cách cuối: nó là người dùng đang gõ dở cụm nhiều từ.
  return { filters, text: text.replace(/\s+/g, " ").trimStart() };
}

export function buildQuery(filters, text, groups) {
  const labels = groups.flatMap((g) =>
    (g.options || [])
      .map(toOption)
      .filter((o) => (filters?.[g.key] || []).includes(o.value))
      .map((o) => o.label),
  );
  const head = labels.join(" ");
  const t = String(text ?? "");
  if (!head) return t;
  return t.trim() ? `${head} ${t.trimStart()}` : head;
}

// Các tag ĐANG tick, kèm label để vẽ chip trong ô search.
export const pickedTags = (filters, groups) =>
  groups.flatMap((g) =>
    (g.options || [])
      .map(toOption)
      .filter((o) => (filters?.[g.key] || []).includes(o.value))
      .map((o) => ({ ...o, key: g.key, groupLabel: g.label })),
  );

// Gợi ý cho dropdown: option CHƯA tick, label chứa từ cuối đang gõ. Rỗng thì gợi tất cả.
export function suggestTags(text, filters, groups, limit = 8) {
  const frag = String(text ?? "")
    .trim()
    .split(/\s+/)
    .pop()
    .toLowerCase();
  return flatOptions(groups)
    .filter(
      (o) =>
        !(filters?.[o.key] || []).includes(o.value) &&
        (!frag || String(o.label).toLowerCase().includes(frag)),
    )
    .sort((a, b) => String(a.label).length - String(b.label).length)
    .slice(0, limit);
}

// Bỏ từ cuối của free text nếu nó chỉ là phần đang gõ dở của tag vừa chọn.
export const textAfterPick = (text, label) => {
  const words = String(text ?? "").trim().split(/\s+/).filter(Boolean);
  const last = words[words.length - 1];
  return last && String(label).toLowerCase().includes(last.toLowerCase())
    ? words.slice(0, -1).join(" ")
    : words.join(" ");
};
