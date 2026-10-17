# Explain – `docs/parallel/`

**Nội dung:** tài liệu cho **hướng tiếp cận song song** của đồ án – giải *cùng bài toán* nhưng do AI agent tư vấn công nghệ và viết code, để cuối kỳ **so sánh hai hướng**.

> ⚠️ Thư mục này **không mô tả repo hiện tại**. Nó là brief dùng cho một **repo khác**. Đừng làm theo nó khi code trong repo này.

## File trong thư mục

| File | Là gì |
| --- | --- |
| [`AGENT_BRIEF.md`](./AGENT_BRIEF.md) | Toàn bộ chỉ dẫn cho AI agent: bài toán, quy trình bắt buộc, lộ trình P0–P6, quy tắc làm việc, mẫu báo cáo so sánh |

## Dùng thế nào

Copy `AGENT_BRIEF.md` sang repo mới và đổi tên thành `CLAUDE.md` (hoặc `AGENTS.md`).

Repo mới sẽ tự sinh thêm: `PROPOSAL.md` · `DECISIONS.md` · `PLAN.md` · `METRICS.md` · `COMPARISON.md`.

## Ranh giới với repo này

- ✔ Được **đọc** repo này để hiểu bài toán và rút kinh nghiệm.
- ✘ **Không copy code.**
- ✔ Ngoại lệ duy nhất: dữ liệu đầu vào cho test (`automation/fixtures/`) và **danh sách kịch bản kiểm thử** (nội dung nghiệp vụ, không phải code) – dùng lại để hai bên test cùng một thứ.

## Giá trị với repo hiện tại

Mục 3 của `AGENT_BRIEF.md` – *"Kinh nghiệm từ dự án gốc"* – là bản tổng kết **8 vấn đề có thật** của repo này, viết ngắn gọn và thẳng thắn:

1. "Chạy test" mơ hồ – form nhập chữ tự do nhưng chỉ chạy được test viết sẵn.
2. "Template" không trỏ tới thứ gì chạy được (chỉ là chữ, lưu ở localStorage).
3. Dữ liệu test case trùng ở 2 nơi (file SQL và code test).
4. Hằng số lệch giữa các phần (`PASSED`/`passed`, vai trò `dev`, seed không khớp schema).
5. Serverless không chạy được trình duyệt test và không giữ realtime lâu.
6. Log CI trên repo public ai cũng đọc được.
7. Frontend làm trước bằng dữ liệu giả, không theo hợp đồng API.
8. Chưa có luồng chạy thông đầu–cuối trong khi nhiều trang đã xong.

**Đáng đọc ngay cả khi bạn chỉ làm repo này** – đây là danh sách nợ kỹ thuật cần trả.

## Quy tắc bảo trì

- Cập nhật mục 3 khi repo này sửa được một vấn đề, hoặc khi phát hiện vấn đề mới.
- Không trộn tài liệu của hai hướng vào nhau; mọi thứ thuộc hướng song song đều nằm trong thư mục này.
