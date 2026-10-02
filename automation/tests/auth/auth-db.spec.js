const { test, expect } = require("@playwright/test");
const { query, closeDb } = require("../utils/db-client");

const TC_CODE = "TC-AUTH-005";

test.afterAll(async () => {
  await closeDb();
});

test("TC-AUTH-005 - Invalid login using MySQL test data", async ({ page }) => {
  // 1. Lấy dữ liệu nhập từ Test_Data (mỗi dòng = một field)
  const dataRows = await query(
    `
      SELECT
        td.field_name,
        td.\`value\`
      FROM Test_Cases tc
      JOIN Test_Data td
        ON tc.test_id = td.test_id
      WHERE tc.tc_code = ?
    `,
    [TC_CODE],
  );

  const inputData = {};
  for (const row of dataRows) {
    inputData[row.field_name] = row.value;
  }

  expect(inputData.username).toBeTruthy();
  expect(inputData.password).toBeTruthy();

  // 2. Lấy thông báo lỗi mong đợi từ bước VERIFY cuối cùng (target dạng "text=...")
  const stepRows = await query(
    `
      SELECT ts.target
      FROM Test_Steps ts
      JOIN Test_Cases tc
        ON ts.test_id = tc.test_id
      WHERE tc.tc_code = ?
        AND ts.action = 'VERIFY'
        AND ts.target LIKE 'text=%'
      ORDER BY ts.step_order DESC
      LIMIT 1
    `,
    [TC_CODE],
  );

  expect(stepRows.length).toBe(1);
  const expectedMessage = stepRows[0].target.replace(/^text=/, "");

  console.log("Test case:", TC_CODE);
  console.log("Input:", inputData);
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
  await page.getByPlaceholder("e.g. 20521234").fill(inputData.username);

  // 7. Fill password
  await page.getByPlaceholder("Enter your password").fill(inputData.password);

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