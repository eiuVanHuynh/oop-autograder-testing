NGÔN NGỮ: ENGLISH

1. field_name trong Test_Data phải:
- viết thường
- nhiều từ nối bằng _
- không dấu

ví dụ : user_name, password, full_name, email, student_id, course_name

2. action trong Test_Steps phải: 
- viết in hoa hết

*ví dụ: 
action = NAVIGATE
action = FILL
action = CLICK
action = VERIFY
action = UPLOAD

3. target_element của Test_Steps
Cách ghi type và value:
- type phải viết lowercase và dùng đúng tên đã quy định: text, placeholder, testid.
- value viết đúng giá trị thực tế cần tìm, giữ nguyên nội dung của element/placeholder/testid.
Ví dụ: text=Login, placeholder=Username, testid=login-button.

Định dạng:
- Luôn dùng dạng type=value.
- Không dùng type: value, type-value hoặc chỉ ghi value.

Ví dụ hợp lệ:
text=Login
placeholder=Username
testid=login-button

4. Cách tham chiếu dữ liệu bí mật
Cách ghi tên biến:
- Tên biến môi trường viết CHỮ IN HOA.
- Các từ được nối bằng dấu _.

Ví dụ:
TEST_PASSWORD
API_KEY
GOOGLE_CLIENT_SECRET
Định dạng tham chiếu:

Dùng dạng:
- env:TÊN_BIẾN
- env: phải viết chữ thường.
- TÊN_BIẾN viết CHỮ IN HOA + _.

Cách lưu trong DB:
Chỉ lưu tên biến tham chiếu, không lưu giá trị bí mật thật.

Ví dụ:

field_name = password
value = env:TEST_PASSWORD
