// Thứ tự chạy các test case của một template (issue #67).
//
// target_json.testIds là một mảng CÓ THỨ TỰ: backend giữ nguyên thứ tự đó khi dựng kế hoạch
// chạy (CatalogRepository.findReadyCodesByTcCodes sắp theo array_position, không theo tc_code),
// nên đừng sort lại ở bất cứ đâu trên FE. Form Templates lưu danh sách này dưới dạng chuỗi
// "TC-01, TC-02" nên hai hàm dưới là chỗ duy nhất đọc/ghi thứ tự đó.

// Bỏ mã trùng: danh sách này được render với key={code}, và một template cũ trong DB có thể
// chứa cùng một mã hai lần — khi đó React dựng lại sai dòng và nút lên/xuống đổi chỗ dòng khác.
// Backend cũng chỉ chạy mỗi mã một lần (TestIdsTargetStrategy lọc qua Set).
export const splitCodes = (value) => [
  ...new Set(
    String(value ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean),
  ),
];

export const joinCodes = (codes) => codes.join(", ");

// Đổi chỗ phần tử `from` với phần tử `to`. Ra ngoài mảng thì trả về chính mảng cũ,
// để nút ↑ ở dòng đầu / ↓ ở dòng cuối không làm gì cả.
export const moveAt = (list, from, to) => {
  if (to < 0 || to >= list.length || from < 0 || from >= list.length) return list;
  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
};
