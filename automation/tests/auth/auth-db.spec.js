const { test, expect } = require("@playwright/test");
const { loadTestCase } = require("../utils/test-case-loader");
const { closeDb } = require("../utils/db-client");

const TC_CODE = "TC-AUTH-005";

test.afterAll(async () => {
  await closeDb();
});

test("TC-AUTH-005 - Invalid login using MySQL test data", async ({ page }) => {
  // 1. Lấy toàn bộ dữ liệu của test case từ DB
  const tc = await loadTestCase(TC_CODE);

  const username = tc.getData("username");
  const password = tc.getData("password");

  expect(username).toBeTruthy();
  expect(password).toBeTruthy();

  // 2. Lấy thông báo lỗi mong đợi từ bước VERIFY cuối cùng
  const verifySteps = tc.steps.filter(
    (step) =>
      step.action === "VERIFY" &&
      step.target &&
      step.target.startsWith("text="),
  );

  expect(verifySteps.length).toBeGreaterThan(0);

  const expectedMessage = verifySteps[verifySteps.length - 1].target.replace(
    /^text=/,
    "",
  );

  console.log("Test case:", TC_CODE);
  console.log("Input:", {
    username,
  });
  console.log("Expected message:", expectedMessage);

  // 3. Monitor API requests
  page.on("request", (request) => {
    if (request.method() === "POST") {
      console.log("POST:", request.url());
    }
  });

  // 4. Monitor API responses
  page.on("response", async (response) => {
    if (response.url().includes("/api/auth/login")) {
      console.log("LOGIN STATUS:", response.status());

      try {
        console.log("LOGIN RESPONSE:", await response.text());
      } catch (error) {
        console.log("Cannot read login response");
      }
    }
  });

  // 5. Open website
  await page.goto("/login");

  // 6. Fill student code
  await page.getByPlaceholder("e.g. 20521234").fill(username);

  // 7. Fill password
  await page.getByPlaceholder("Enter your password").fill(password);

  // 8. Chờ response đăng nhập; đồng thời ghi nhận request thực tế
  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/login") &&
      response.request().method() === "POST",
    { timeout: 60000 },
  );

  await page
    .getByRole("button", {
      name: /Sign In|Signing in/i,
    })
    .click();

  let loginResponse;

  try {
    loginResponse = await loginResponsePromise;
  } catch (error) {
    console.error("Không nhận được login response trong 60 giây.");
    console.error("Current URL:", page.url());
    console.error(
      "Page text:",
      (await page.locator("body").innerText()).slice(0, 1500),
    );
    throw error;
  }

  console.log("LOGIN STATUS:", loginResponse.status());
  console.log("LOGIN RESPONSE:", await loginResponse.text());

  // 9. Kiểm tra thông báo lỗi

  // Kiểm tra API
  expect(loginResponse.status()).toBe(401);

  const responseBody = await loginResponse.json();
  expect(responseBody.message).toBe("Invalid IRN or password");

  // Kiểm tra thông báo thực tế trên giao diện
  await expect(page.getByText(expectedMessage, { exact: true })).toBeVisible({
    timeout: 15000,
  });
});
