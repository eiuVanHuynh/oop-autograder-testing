const { test, expect } = require("@playwright/test");
const { loadTestCase } = require("../utils/test-case-loader");
const { closeDb } = require("../utils/db-client");
test.afterAll(async () => {
  await closeDb();
});
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

const tc01Button = new Button("Sign In", "", "", "", false, true);

const tc01TestCase = new TestCase(
  "TC-01",
  "AUTHENTICATION",
  "Đăng nhập IRN & Mật khẩu thành công",
  "Student đăng nhập bằng IRN và mật khẩu hợp lệ.",
  "FR-1",
  TestType.AUTHENTICATION,
);
tc01TestCase.preconditions =
  "Tài khoản Student chưa thuộc lớp nào trong quarter hiện tại.";

const tc02TestCase = new TestCase(
  "TC-02",
  "AUTHENTICATION",
  "Đăng nhập thất bại với sai IRN hoặc mật khẩu",
  "Kiểm tra hệ thống từ chối thông tin đăng nhập không hợp lệ.",
  "FR-1",
  TestType.AUTHENTICATION,
);

const tc03TestCase = new TestCase(
  "TC-03",
  "AUTHENTICATION",
  "Đăng nhập Google OAuth với domain @eiu.edu.vn hợp lệ",
  "Kiểm tra Google OAuth với domain EIU hợp lệ.",
  "FR-2",
  TestType.AUTHENTICATION,
);

const tc04TestCase = new TestCase(
  "TC-04",
  "AUTHENTICATION",
  "Google OAuth từ chối domain không hợp lệ",
  "Kiểm tra hệ thống từ chối Google account không thuộc domain EIU.",
  "FR-2",
  TestType.AUTHENTICATION,
);

const tc05TestCase = new TestCase(
  "TC-05",
  "AUTHENTICATION",
  "Thiết lập tài khoản Google lần đầu",
  "Kiểm tra thiết lập tài khoản cho người dùng Google lần đầu.",
  "FR-3",
  TestType.AUTHENTICATION,
);

const tc06TestCase = new TestCase(
  "TC-06",
  "AUTHENTICATION",
  "Yêu cầu khôi phục mật khẩu qua email",
  "Kiểm tra yêu cầu reset password.",
  "FR-4",
  TestType.AUTHENTICATION,
);

const tc07TestCase = new TestCase(
  "TC-07",
  "AUTHENTICATION",
  "Đặt lại mật khẩu qua liên kết email",
  "Kiểm tra reset password bằng token.",
  "FR-4",
  TestType.AUTHENTICATION,
);

const tc08TestCase = new TestCase(
  "TC-08",
  "USER_MANAGEMENT",
  "Giảng viên thêm tài khoản đơn lẻ",
  "Lecturer tạo một user student mới.",
  "FR-5",
  TestType.UI_COMPONENT,
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
  "/lecturer-users",
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
  "/lecturer-users",
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
  "/lecturer-users",
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

const tc31Role = new RoleAccessTest(
  "TC-31_Student_Access_Lecturer_Route",
  UserRole.STUDENT,
  "/lecturer-users",
  403,
);

const tc31TestCase = new TestCase(
  "TC-31",
  "USER_MANAGEMENT",
  "Kiểm soát truy cập phân quyền theo Role",
  "Student đăng nhập và cố truy cập route dành riêng cho Lecturer.",
  "FR-9",
  TestType.AUTHENTICATION,
);

tc31TestCase.preconditions =
  "Tài khoản Student đăng nhập thành công và có session/token hợp lệ.";

test(`${tc01TestCase.testId} - ${tc01TestCase.title}`, async ({ page }) => {
  const tc = await loadTestCase("TC-01");

  await page.goto("/login");

  await page.getByPlaceholder("e.g. 20521234").fill(tc.getData("username"));

  await page
    .getByPlaceholder("Enter your password")
    .fill(tc.getData("password"));

  const signInButton = page.getByRole("button", {
    name: "Sign In",
  });

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/login") &&
        response.request().method() === "POST",
    ),
    signInButton.click(),
  ]);

  await expect(page).toHaveURL(new RegExp(tc.getData("expected_url")));
});

test(`${tc02TestCase.testId} - ${tc02TestCase.title}`, async ({ page }) => {
  const tc = await loadTestCase("TC-02");

  await page.goto("/login");

  await page.getByPlaceholder("e.g. 20521234").fill(tc.getData("username"));

  await page
    .getByPlaceholder("Enter your password")
    .fill(tc.getData("password"));

  const [response] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/api/auth/login") && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Sign In" }).click(),
  ]);

  expect(response.ok()).toBe(false);

  await expect(
    page.getByText(new RegExp(tc.getData("expected_message"), "i")),
  ).toBeVisible({ timeout: 15000 });
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
  const tc = await loadTestCase("TC-06");

  await page.goto("/login");

  const forgotPasswordButton = page.locator("button.forgot-link");
  const emailInput = page.getByPlaceholder("you@eiu.edu.vn");

  await expect(forgotPasswordButton).toBeVisible({ timeout: 15000 });
  await expect(forgotPasswordButton).toBeEnabled();
  await page
    .locator("iframe")
    .first()
    .waitFor({ state: "attached", timeout: 10000 })
    .catch(() => {});

  await expect(async () => {
    if (!(await emailInput.isVisible())) {
      await forgotPasswordButton.click();
    }
    await expect(emailInput).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 30000, intervals: [500, 1000, 2000] });

  await emailInput.fill(tc.getData("email"));

  const sendResetLinkButton = page.getByRole("button", {
    name: /Send reset link/i,
  });

  await expect(sendResetLinkButton).toBeVisible({ timeout: 10000 });
  await sendResetLinkButton.click();

  await expect(
    page.getByText(new RegExp(tc.getData("expected_message"), "i")),
  ).toBeVisible({ timeout: 15000 });
});

test(`${tc07TestCase.testId} - ${tc07TestCase.title}`, async ({ page }) => {
  test.skip(!process.env.TEST_RESET_TOKEN, "TEST_RESET_TOKEN chưa được cấu hình trong .env");
  const tc = await loadTestCase("TC-07");
  const pwd = tc.getData("new_password");

  await page.goto(`/reset-password?token=${tc.getData("reset_token")}`);
  await page.getByPlaceholder("New password").fill(pwd);
  await page.getByPlaceholder("Confirm password").fill(pwd);
  await page.getByRole("button", { name: /submit|đặt lại/i }).click();
  await expect(page).toHaveURL(new RegExp(`${tc.getData("expected_url")}$`));
});

test(`${tc09TestCase.testId} - ${tc09TestCase.title}`, async ({ page }) => {
  test.skip(
    true,
    "BLOCKED: Chức năng tạo user hàng loạt bằng CSV chưa được development implement. CSV import hiện tại chỉ dùng để thêm các student đã tồn tại vào Quarter.",
  );
});

test.describe.serial("TC-08 -> TC-12 - Lecturer User Management", () => {
  const testUser = {
    runId: Date.now().toString().slice(-6),
    newIrn: null,
    originalName: null,
    updatedName: null,
    newEmail: null,
  };

  test(`${tc08TestCase.testId} - ${tc08TestCase.title}`, async ({ page }) => {
    const tc = await loadTestCase("TC-08");

    const irnPrefix = String(tc.getData("irn_prefix"));
    const fullNamePrefix = String(tc.getData("full_name_prefix"));
    const emailPrefix = String(tc.getData("email_prefix"));
    const emailDomain = String(tc.getData("email_domain"));

    testUser.newIrn = `${irnPrefix}${testUser.runId}`;
    testUser.originalName = `${fullNamePrefix} ${testUser.runId}`;
    testUser.newEmail = `${emailPrefix}${testUser.runId}${emailDomain}`;

    await page.goto("/login");
    await page
      .getByPlaceholder("e.g. 20521234")
      .fill(tc.getData("lecturer_username"));

    await page
      .getByPlaceholder("Enter your password")
      .fill(tc.getData("lecturer_password"));

    await page
      .getByRole("button", {
        name: "Sign In",
      })
      .click();

    await expect(page).toHaveURL(/\/lecturer-dashboard/);
    await page.goto("/lecturer-users");
    await page
      .getByRole("button", {
        name: "Add User",
      })
      .click();

    await page
      .getByRole("checkbox", {
        name: tc.getData("role"),
      })
      .check();

    await page.getByPlaceholder("e.g. 2052123456").fill(testUser.newIrn);
    await page.getByPlaceholder("Enter full name").fill(testUser.originalName);
    await page.getByPlaceholder("user@eiu.edu.vn").fill(testUser.newEmail);
    await page
      .getByPlaceholder("Enter password")
      .fill(tc.getData("user_password"));

    await page
      .getByRole("button", {
        name: "Create User",
      })
      .click();

    // Verify the created user
    const searchBox = page.getByPlaceholder(/Search by IRN/i);

    await searchBox.fill(testUser.newIrn);

    const createdUserRow = page.getByRole("row", {
      name: new RegExp(testUser.originalName, "i"),
    });

    await expect(createdUserRow).toBeVisible();

    // Verify runtime data was generated
    expect(testUser.newIrn).toBeTruthy();
    expect(testUser.originalName).toBeTruthy();
    expect(testUser.newEmail).toBeTruthy();
  });

  test(`${tc10TestCase.testId} - ${tc10TestCase.title}`, async ({ page }) => {
    const tc = await loadTestCase("TC-10");
    const nameSuffix = String(tc.getData("name_suffix"));
    testUser.updatedName = `${testUser.originalName}${nameSuffix}`;

    await page.goto("/login");
    await page
      .getByPlaceholder("e.g. 20521234")
      .fill(tc.getData("lecturer_username"));
    await page
      .getByPlaceholder("Enter your password")
      .fill(tc.getData("lecturer_password"));

    await page
      .getByRole("button", {
        name: "Sign In",
      })
      .click();

    await expect(page).toHaveURL(/\/lecturer-dashboard/);
    await page.goto("/lecturer-users");

    const searchBox = page.getByPlaceholder(/Search by IRN, name or email/i);
    await searchBox.fill(testUser.newIrn);

    const userRow = page.getByRole("row", {
      name: new RegExp(testUser.originalName, "i"),
    });
    await expect(userRow).toBeVisible();

    const actionButtons = userRow.getByRole("button");
    await expect(actionButtons).toHaveCount(3);
    await actionButtons.nth(0).click();

    const editNameInput = page.getByPlaceholder("Enter full name");
    await expect(editNameInput).toBeVisible();
    await editNameInput.fill(testUser.updatedName);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(editNameInput).toBeHidden();

    // Reload and verify updated data
    await page.reload();

    await page
      .getByPlaceholder(/Search by IRN, name or email/i)
      .fill(testUser.newIrn);

    const updatedUserRow = page.getByRole("row", {
      name: new RegExp(testUser.updatedName, "i"),
    });

    await expect(updatedUserRow).toBeVisible();

    expect(tc10Role.userRole).toBe(UserRole.LECTURER);
    expect(tc10Role.targetApiRoute).toBe("/lecturer-users");
  });

  test(`${tc11TestCase.testId} - ${tc11TestCase.title}`, async ({ page }) => {
    const tc = await loadTestCase("TC-11");
    await page.goto("/login");

    await page
      .getByPlaceholder("e.g. 20521234")
      .fill(tc.getData("lecturer_username"));

    await page
      .getByPlaceholder("Enter your password")
      .fill(tc.getData("lecturer_password"));

    await page
      .getByRole("button", {
        name: "Sign In",
      })
      .click();

    await expect(page).toHaveURL(/\/lecturer-dashboard/);
    await page.goto("/lecturer-users");

    const searchBox = page.getByPlaceholder(/Search by IRN, name or email/i);

    await searchBox.fill(testUser.newIrn);

    const userRow = page.getByRole("row", {
      name: new RegExp(testUser.updatedName, "i"),
    });

    await expect(userRow).toBeVisible();

    const actionButtons = userRow.getByRole("button");

    await expect(actionButtons).toHaveCount(3);

    await actionButtons.nth(0).click();
    const passwordInput = page.getByPlaceholder(
      "Leave blank to keep current password",
    );
    await expect(passwordInput).toBeVisible();
    const newPassword = tc.getData("new_password");
    expect(newPassword).toBeTruthy();
    await passwordInput.fill(newPassword);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(passwordInput).toBeHidden();
    expect(tc11Role.userRole).toBe(UserRole.LECTURER);
    expect(tc11Role.targetApiRoute).toBe("/lecturer-users");
  });

  test(`${tc12TestCase.testId} - ${tc12TestCase.title}`, async ({ page }) => {
    const tc = await loadTestCase("TC-12");

    await page.goto("/login");
    await page
      .getByPlaceholder("e.g. 20521234")
      .fill(tc.getData("lecturer_username"));
    await page
      .getByPlaceholder("Enter your password")
      .fill(tc.getData("lecturer_password"));
    await page
      .getByRole("button", {
        name: "Sign In",
      })
      .click();
    await expect(page).toHaveURL(/\/lecturer-dashboard/);
    await page.goto("/lecturer-users");

    const searchBox = page.getByPlaceholder(/Search by IRN, name or email/i);
    await searchBox.fill(testUser.newIrn);

    const userRow = page.getByRole("row", {
      name: new RegExp(testUser.updatedName, "i"),
    });

    await expect(userRow).toBeVisible();
    const suspendButton = userRow.getByRole("button", {
      name: "Suspend student",
    });
    await expect(suspendButton).toBeVisible();
    await expect(suspendButton).toBeEnabled();
    await suspendButton.click();

    const suspendConfirmButton = page.getByRole("button", {
      name: "Suspend",
      exact: true,
    });

    await expect(suspendConfirmButton).toBeVisible();
    await expect(suspendConfirmButton).toBeEnabled();
    await suspendConfirmButton.click();

    // Verify soft-delete / suspend state
    const disabledUserRow = page.getByRole("row", {
      name: new RegExp(testUser.updatedName, "i"),
    });

    await expect(disabledUserRow).toBeVisible();
    await expect(disabledUserRow).toContainText(tc.getData("expected_status"));

    expect(tc12Role.userRole).toBe(UserRole.LECTURER);
    expect(tc12Role.targetApiRoute).toBe("/lecturer-users");
  });
});

test(`${tc31TestCase.testId} - ${tc31TestCase.title}`, async ({ page }) => {
  const tc = await loadTestCase("TC-31");

  await page.goto("/login");
  await page.getByPlaceholder("e.g. 20521234").fill(tc.getData("username"));
  await page
    .getByPlaceholder("Enter your password")
    .fill(tc.getData("password"));

  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(new RegExp(tc.getData("expected_url")));
  await page.goto(tc.getData("forbidden_route"));
  await expect(page).toHaveURL(new RegExp(tc.getData("expected_url")));
});
