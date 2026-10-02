const { test: base, expect } = require('@playwright/test');

async function loginViaUI(page, irn, password, expectedDashboard) {
  await page.goto('/login');

  await page.getByPlaceholder('e.g. 20521234').fill(irn);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.waitForURL(expectedDashboard);
}

const test = base.extend({
  studentPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await loginViaUI(
      page,
      process.env.TEST_STUDENT_IRN,
      process.env.TEST_STUDENT_PASSWORD,
      /\/student-dashboard/
    );

    await use(page);
    await context.close();
  },

  lecturerPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await loginViaUI(
      page,
      process.env.TEST_LECTURER_IRN,
      process.env.TEST_LECTURER_PASSWORD,
      /\/lecturer-dashboard/
    );

    await use(page);
    await context.close();
  },
});

module.exports = {
  test,
  expect,
};