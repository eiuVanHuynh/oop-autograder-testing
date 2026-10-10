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
    password,
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
  await page.goto("https://oop-autograder.vercel.app");

  // 6. Fill student code
  await page.getByPlaceholder("e.g. 20521234").fill(username);

  // 7. Fill password
  await page.getByPlaceholder("Enter your password").fill(password);

  // 8. Click Sign In
  await page.getByRole("button", { name: "Sign In" }).click();

  // 9. Wait for API
  await page.waitForTimeout(5000);

  // 10. Show actual page
  console.log("Page text after login:", await page.locator("body").innerText());

  // 11. Verify expected error
  await expect(page.getByText(expectedMessage)).toBeVisible({
    timeout: 5000,
  });
});