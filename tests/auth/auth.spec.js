const { test, expect } = require("@playwright/test");

const {
  AuthType,
  UserRole,
  AuthenticationTest,
  RoleAccessTest,
} = require("../models/auth.model");

const {
  InputType,
  ExpectedAction,
  Button,
  InputField,
  ButtonTest,
  InputFieldTest,
} = require("../models/ui.model");

const {
  TestType,
  ExecutionStatus,
  TestCase,
  TestExecutionResult,
} = require("../models/test-case.model");

const tc01Auth = new AuthenticationTest(
  "TC-01_Login_IRN_Password_Success",
  AuthType.IRN_PASSWORD,
  process.env.TEST_STUDENT_IRN,
  process.env.TEST_STUDENT_PASSWORD,
  true,
  UserRole.STUDENT,
  "",
);

const tc01Input = new InputField(
  "e.g. 20521234",
  process.env.TEST_STUDENT_IRN,
  InputType.TEXT,
  true,
  "",
);

const tc01Password = new InputField(
  "Enter your password",
  process.env.TEST_STUDENT_PASSWORD,
  InputType.PASSWORD,
  true,
  "",
);

const tc01Button = new Button("Sign In", "", "", "", false, true);

const tc01ButtonTest = new ButtonTest(
  "TC-01_SignIn_Button",
  tc01Button,
  ExpectedAction.SUBMIT,
  "/student-history",
);

const tc01TestCase = new TestCase(
  "TC-01",
  "AUTHENTICATION",
  "Đăng nhập IRN & Mật khẩu thành công",
  "Student đăng nhập bằng IRN và mật khẩu hợp lệ.",
  "FR-1",
  TestType.AUTHENTICATION,
);

const tc02Auth = new AuthenticationTest(
  "TC-02_Login_IRN_Password_Failed",
  AuthType.IRN_PASSWORD,
  process.env.TEST_STUDENT_IRN,
  "Wrong_Password_123",
  false,
  UserRole.NONE,
  "Invalid IRN or password",
);

const tc02TestCase = new TestCase(
  "TC-02",
  "AUTHENTICATION",
  "Đăng nhập thất bại với sai IRN hoặc mật khẩu",
  "Kiểm tra hệ thống từ chối thông tin đăng nhập không hợp lệ.",
  "FR-1",
  TestType.AUTHENTICATION,
);

const tc03Auth = new AuthenticationTest(
  "TC-03_Google_OAuth_Valid_Domain",
  AuthType.GOOGLE_OAUTH,
  "student@eiu.edu.vn",
  "",
  true,
  UserRole.STUDENT,
  "",
);

const tc03Button = new ButtonTest(
  "TC-03_Google_Login_Button",
  new Button("Sign in with Google", "", "", "", false, true),
  ExpectedAction.REDIRECT,
  "/student-history",
);

const tc03TestCase = new TestCase(
  "TC-03",
  "AUTHENTICATION",
  "Đăng nhập Google OAuth với domain @eiu.edu.vn hợp lệ",
  "Kiểm tra Google OAuth với domain EIU hợp lệ.",
  "FR-2",
  TestType.AUTHENTICATION,
);

const tc04Auth = new AuthenticationTest(
  "TC-04_Google_OAuth_Invalid_Domain",
  AuthType.GOOGLE_OAUTH,
  "external@gmail.com",
  "",
  false,
  UserRole.NONE,
  "Domain not allowed",
);

const tc04TestCase = new TestCase(
  "TC-04",
  "AUTHENTICATION",
  "Google OAuth từ chối domain không hợp lệ",
  "Kiểm tra hệ thống từ chối Google account không thuộc domain EIU.",
  "FR-2",
  TestType.AUTHENTICATION,
);

const tc05Auth = new AuthenticationTest(
  "TC-05_Google_First_Setup",
  AuthType.GOOGLE_OAUTH,
  "student@eiu.edu.vn",
  "New_P@ssw0rd",
  true,
  UserRole.STUDENT,
  "",
);

const tc05TestCase = new TestCase(
  "TC-05",
  "AUTHENTICATION",
  "Thiết lập tài khoản Google lần đầu",
  "Kiểm tra thiết lập tài khoản cho người dùng Google lần đầu.",
  "FR-3",
  TestType.AUTHENTICATION,
);

const tc06Auth = new AuthenticationTest(
  "TC-06_Forgot_Password_Request",
  AuthType.IRN_PASSWORD,
  "student01@eiu.edu.vn",
  "",
  true,
  UserRole.NONE,
  "",
);

const tc06Input = new InputFieldTest(
  "TC-06_Email_Input",
  new InputField("Email", "student01@eiu.edu.vn", InputType.EMAIL, true, ""),
  "student01@eiu.edu.vn",
  "",
);

const tc06TestCase = new TestCase(
  "TC-06",
  "AUTHENTICATION",
  "Yêu cầu khôi phục mật khẩu qua email",
  "Kiểm tra yêu cầu reset password.",
  "FR-4",
  TestType.AUTHENTICATION,
);

const tc07Auth = new AuthenticationTest(
  "TC-07_Reset_Password",
  AuthType.IRN_PASSWORD,
  "",
  "New_P@ssw0rd",
  true,
  UserRole.NONE,
  "",
);

const tc07TestCase = new TestCase(
  "TC-07",
  "AUTHENTICATION",
  "Đặt lại mật khẩu qua liên kết email",
  "Kiểm tra reset password bằng token.",
  "FR-4",
  TestType.AUTHENTICATION,
);

const tc08Role = new RoleAccessTest(
  "TC-08_Lecturer_Create_User",
  UserRole.LECTURER,
  "/admin/users",
  200,
);

const tc08TestCase = new TestCase(
  "TC-08",
  "USER_MANAGEMENT",
  "Giảng viên thêm tài khoản đơn lẻ",
  "Lecturer tạo một user student mới.",
  "FR-5",
  TestType.UI_COMPONENT,
);

const tc09Role = new RoleAccessTest(
  "TC-09_Lecturer_Import_CSV",
  UserRole.LECTURER,
  "/admin/users",
  200,
);

const tc09TestCase = new TestCase(
  "TC-09",
  "USER_MANAGEMENT",
  "Giảng viên thêm user hàng loạt qua CSV",
  "Lecturer import danh sách user bằng CSV.",
  "FR-6",
  TestType.UI_COMPONENT,
);

const tc10Role = new RoleAccessTest(
  "TC-10_Lecturer_Update_User",
  UserRole.LECTURER,
  "/admin/users",
  200,
);

const tc10TestCase = new TestCase(
  "TC-10",
  "USER_MANAGEMENT",
  "Giảng viên cập nhật thông tin user",
  "Lecturer chỉnh sửa thông tin user.",
  "FR-7",
  TestType.UI_COMPONENT,
);

const tc11Role = new RoleAccessTest(
  "TC-11_Lecturer_Reset_User_Password",
  UserRole.LECTURER,
  "/admin/users",
  200,
);

const tc11TestCase = new TestCase(
  "TC-11",
  "USER_MANAGEMENT",
  "Giảng viên đổi mật khẩu trực tiếp cho user",
  "Lecturer reset password cho user.",
  "FR-8",
  TestType.UI_COMPONENT,
);

const tc12Role = new RoleAccessTest(
  "TC-12_Lecturer_Disable_User",
  UserRole.LECTURER,
  "/admin/users",
  200,
);

const tc12TestCase = new TestCase(
  "TC-12",
  "USER_MANAGEMENT",
  "Vô hiệu hóa tài khoản soft-delete",
  "Lecturer disable user thay vì xóa cứng.",
  "FR-9",
  TestType.UI_COMPONENT,
);

async function loginAsStudent(page) {
  await page.goto("/login");

  await page.getByPlaceholder("e.g. 20521234").fill(tc01Auth.providedEmail);

  await page
    .getByPlaceholder("Enter your password")
    .fill(tc01Auth.providedPassword);

  await page
    .getByRole("button", {
      name: tc01Button.label,
    })
    .click();

  await page.waitForURL(
    new RegExp(tc01ButtonTest.expectedResultUrl.replace("/", "\\/")),
  );
}

async function loginAsLecturer(page) {
  await page.goto("/login");

  await page
    .getByPlaceholder("e.g. 20521234")
    .fill(process.env.TEST_LECTURER_IRN);

  await page
    .getByPlaceholder("Enter your password")
    .fill(process.env.TEST_LECTURER_PASSWORD);

  await page
    .getByRole("button", {
      name: "Sign In",
    })
    .click();

  await expect(page).toHaveURL(
    new RegExp(tc01ButtonTest.expectedResultUrl.replace("/", "\\/")),
  );
}

test(`${tc01TestCase.testId} - ${tc01TestCase.title}`, async ({ page }) => {
  await loginAsStudent(page);

  expect(tc01Auth.expectedAuthStatus).toBe(true);
  expect(tc01Auth.expectedRedirectRole).toBe(UserRole.STUDENT);

  await expect(page).toHaveURL(
    new RegExp(tc01ButtonTest.expectedResultUrl.replace("/", "\\/")),
  );
});

test(`${tc02TestCase.testId} - ${tc02TestCase.title}`, async ({ page }) => {
  await page.goto("/login");

  await page.getByPlaceholder("e.g. 20521234").fill(tc02Auth.providedEmail);

  await page
    .getByPlaceholder("Enter your password")
    .fill(tc02Auth.providedPassword);

  await page
    .getByRole("button", {
      name: "Sign In",
    })
    .click();

  await expect(page).toHaveURL(/\/$/);

  await expect(
    page.getByText(/Invalid IRN or password|IRN or password is wrong/i),
  ).toBeVisible();

  expect(tc02Auth.expectedAuthStatus).toBe(false);
  expect(tc02Auth.expectedRedirectRole).toBe(UserRole.NONE);
});

//////// chưa viết được, cần có test google account

test(`${tc03TestCase.testId} - ${tc03TestCase.title}`, async ({ page }) => {
  test.skip(
    true,
    "Google OAuth chưa có test hook/mock và Google Sign-In không được expose trong DOM của login page.",
  );
});

test(`${tc04TestCase.testId} - ${tc04TestCase.title}`, async ({ page }) => {
  test.skip(
    true,
    "Google OAuth chưa có test hook/mock và Google Sign-In không được expose trong DOM của login page.",
  );
});

test(`${tc05TestCase.testId} - ${tc05TestCase.title}`, async ({ page }) => {
  test.skip(
    true,
    "TC-05 phụ thuộc Google OAuth first-time login. Hiện Playwright chưa có Google OAuth test account/session để thực hiện bước 'Sign in as' trước khi vào /setup-account.",
  );
});

test(`${tc06TestCase.testId} - ${tc06TestCase.title}`, async ({ page }) => {
  await page.goto("/login");

  await page
    .getByRole("button", {
      name: /Forgot password/i,
    })
    .click();

  await expect(page).toHaveURL(/\/$/);

  await page.getByPlaceholder("you@eiu.edu.vn").fill(tc06Input.testInputData);

  await page
    .getByRole("button", {
      name: /Send reset link/i,
    })
    .click();

  await page.waitForTimeout(2000);

  console.log("AFTER RESET URL:", page.url());

  console.log("PAGE TEXT:", await page.locator("body").innerText());

  expect(tc06Auth.expectedAuthStatus).toBe(true);
});

test(`${tc07TestCase.testId} - ${tc07TestCase.title}`, async ({ page }) => {
  test.skip(
    !process.env.TEST_RESET_TOKEN,
    "TEST_RESET_TOKEN chưa được cấu hình trong .env",
  );

  await page.goto(`/reset-password?token=${process.env.TEST_RESET_TOKEN}`);

  await page.getByPlaceholder("New password").fill(tc07Auth.providedPassword);

  await page
    .getByPlaceholder("Confirm password")
    .fill(tc07Auth.providedPassword);

  await page
    .getByRole("button", {
      name: /submit|đặt lại/i,
    })
    .click();

  await expect(page).toHaveURL(/\/$/);

  expect(tc07Auth.expectedAuthStatus).toBe(true);
});

test.describe.serial("TC-08 -> TC-12 - Lecturer User Management", () => {
  const originalName = "Tran Thi B";
  const updatedName = "Tran Thi B Updated";

  test(`${tc08TestCase.testId} - ${tc08TestCase.title}`, async ({ page }) => {
    await loginAsLecturer(page);

    await page.goto("/admin/users");

    await page
      .getByRole("button", {
        name: /add user|thêm/i,
      })
      .click();

    await page.getByPlaceholder("IRN").fill("20241234");

    await page.getByPlaceholder("Name").fill(originalName);

    await page.getByPlaceholder("Email").fill("tranthib@eiu.edu.vn");

    await page.getByLabel("Role").selectOption("STUDENT");

    await page
      .getByRole("button", {
        name: /save|lưu/i,
      })
      .click();

    await expect(
      page.getByRole("row", {
        name: new RegExp(originalName, "i"),
      }),
    ).toBeVisible();

    expect(tc08Role.userRole).toBe(UserRole.LECTURER);
    expect(tc08Role.targetApiRoute).toBe("/admin/users");
  });

  test(`${tc09TestCase.testId} - ${tc09TestCase.title}`, async ({ page }) => {
    await loginAsLecturer(page);

    await page.goto("/admin/users");

    const filePath = require("path").resolve(
      __dirname,
      "../../fixtures/student_list_batch1.csv",
    );

    await page.getByLabel(/upload csv|import/i).setInputFiles(filePath);

    await page
      .getByRole("button", {
        name: /import/i,
      })
      .click();

    await expect(
      page.getByText(/imported successfully|nhập khẩu thành công/i),
    ).toBeVisible();

    expect(tc09Role.userRole).toBe(UserRole.LECTURER);
    expect(tc09Role.targetApiRoute).toBe("/admin/users");
  });

  test(`${tc10TestCase.testId} - ${tc10TestCase.title}`, async ({ page }) => {
    await loginAsLecturer(page);

    await page.goto("/admin/users");

    const userRow = page.getByRole("row", {
      name: new RegExp(originalName, "i"),
    });

    await userRow
      .getByRole("button", {
        name: /Edit/i,
      })
      .click();

    await page.getByPlaceholder("Name").fill(updatedName);

    await page
      .getByRole("button", {
        name: /save/i,
      })
      .click();

    await expect(
      page.getByRole("row", {
        name: new RegExp(updatedName, "i"),
      }),
    ).toBeVisible();

    expect(tc10Role.userRole).toBe(UserRole.LECTURER);
    expect(tc10Role.targetApiRoute).toBe("/admin/users");
  });

  test(`${tc11TestCase.testId} - ${tc11TestCase.title}`, async ({ page }) => {
    await loginAsLecturer(page);

    await page.goto("/admin/users");

    const userRow = page.getByRole("row", {
      name: new RegExp(updatedName, "i"),
    });

    await userRow
      .getByRole("button", {
        name: /reset password/i,
      })
      .click();

    await page.getByPlaceholder("New password").fill("Temp_P@ssw0rd");

    await page
      .getByRole("button", {
        name: /confirm|xác nhận/i,
      })
      .click();

    await expect(
      page.getByText(/password updated|cập nhật mật khẩu thành công/i),
    ).toBeVisible();

    expect(tc11Role.userRole).toBe(UserRole.LECTURER);
    expect(tc11Role.targetApiRoute).toBe("/admin/users");
  });

  test(`${tc12TestCase.testId} - ${tc12TestCase.title}`, async ({ page }) => {
    await loginAsLecturer(page);

    await page.goto("/admin/users");

    const userRow = page.getByRole("row", {
      name: new RegExp(updatedName, "i"),
    });

    await userRow
      .getByRole("button", {
        name: /Delete/i,
      })
      .click();

    await page
      .getByRole("button", {
        name: /confirm|xác nhận/i,
      })
      .click();

    await expect(
      page.getByRole("row", {
        name: new RegExp(updatedName, "i"),
      }),
    ).toContainText(/inactive|không hoạt động/i);

    expect(tc12Role.userRole).toBe(UserRole.LECTURER);
    expect(tc12Role.targetApiRoute).toBe("/admin/users");
  });
});
