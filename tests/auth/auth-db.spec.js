const { test, expect } = require("@playwright/test");
const { query, closeDb } = require("../utils/db-client");

test.afterAll(async () => {
  await closeDb();
});

test("TC-AUTH-005 - Invalid login using MySQL test data", async ({ page }) => {
  // 1. Get test data from MySQL
  const rows = await query(
    `
        SELECT
            tc.test_id,
            tc.title,
            td.input_data,
            td.expected_output
        FROM test_cases tc
        JOIN test_data td
            ON tc.test_id = td.test_id
        WHERE tc.test_id = ?
    `,
    ["TC-AUTH-005"],
  );

  expect(rows.length).toBe(1);

  // 2. Parse JSON data
  const inputData = JSON.parse(rows[0].input_data);
  const expectedOutput = JSON.parse(rows[0].expected_output);

  console.log("Test case:", rows[0].test_id);
  console.log("Input:", inputData);
  console.log("Expected:", expectedOutput);

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
  await expect(page.getByText(expectedOutput.message)).toBeVisible({
    timeout: 5000,
  });
});
