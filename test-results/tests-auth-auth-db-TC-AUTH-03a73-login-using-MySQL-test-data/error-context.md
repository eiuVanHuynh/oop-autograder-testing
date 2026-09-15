# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\auth\auth-db.spec.js >> TC-AUTH-005 - Invalid login using MySQL test data
- Location: tests\auth\auth-db.spec.js:8:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('IRN or password is wrong')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('IRN or password is wrong') with timeout 5000ms
  - waiting for getByText('IRN or password is wrong')

```

```yaml
- button "Light Mode"
- heading "Lab Management System" [level=1]
- paragraph: Sign in to your account
- text: Student Code or Lecturer Code
- textbox "e.g. 20521234": "20521234"
- text: Password
- textbox "Enter your password": wrong_password
- button "Toggle password visibility"
- checkbox "Remember me"
- text: Remember me
- button "Forgot password?"
- button "Signing in..." [disabled]
- text: or continue with
- iframe
- paragraph: Use your university email (@eiu.edu.vn) to access the system.
- text: Object-Oriented Programming
```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | const { query, closeDb } = require('../utils/db-client');
  3  | 
  4  | test.afterAll(async () => {
  5  |     await closeDb();
  6  | });
  7  | 
  8  | test('TC-AUTH-005 - Invalid login using MySQL test data', async ({ page }) => {
  9  | 
  10 |     // 1. Get test data from MySQL
  11 |     const rows = await query(`
  12 |         SELECT
  13 |             tc.test_id,
  14 |             tc.title,
  15 |             td.input_data,
  16 |             td.expected_output
  17 |         FROM test_cases tc
  18 |         JOIN test_data td
  19 |             ON tc.test_id = td.test_id
  20 |         WHERE tc.test_id = ?
  21 |     `, ['TC-AUTH-005']);
  22 | 
  23 |     expect(rows.length).toBe(1);
  24 | 
  25 |     // 2. Parse JSON data
  26 |     const inputData = JSON.parse(rows[0].input_data);
  27 |     const expectedOutput = JSON.parse(rows[0].expected_output);
  28 | 
  29 |     console.log('Test case:', rows[0].test_id);
  30 |     console.log('Input:', inputData);
  31 |     console.log('Expected:', expectedOutput);
  32 | 
  33 |     // 3. Monitor API requests
  34 |     page.on('request', request => {
  35 |         if (request.method() === 'POST') {
  36 |             console.log('POST:', request.url());
  37 |         }
  38 |     });
  39 | 
  40 |     // 4. Monitor API responses
  41 |     page.on('response', async response => {
  42 |         if (response.request().method() === 'POST') {
  43 |             console.log(
  44 |                 'RESPONSE:',
  45 |                 response.status(),
  46 |                 response.url()
  47 |             );
  48 |         }
  49 |     });
  50 | 
  51 |     // 5. Open website
  52 |     await page.goto('https://oop-autograder.vercel.app');
  53 | 
  54 |     // 6. Fill student code
  55 |     await page
  56 |         .getByPlaceholder('e.g. 20521234')
  57 |         .fill(inputData.username);
  58 | 
  59 |     // 7. Fill password
  60 |     await page
  61 |         .getByPlaceholder('Enter your password')
  62 |         .fill(inputData.password);
  63 | 
  64 |     // 8. Click Sign In
  65 |     await page.getByRole('button', { name: 'Sign In' }).click();
  66 | 
  67 |     // 9. Wait for API
  68 |     await page.waitForTimeout(5000);
  69 | 
  70 |     // 10. Show actual page
  71 |     console.log(
  72 |         'Page text after login:',
  73 |         await page.locator('body').innerText()
  74 |     );
  75 | 
  76 |     // 11. Verify expected error
  77 |     await expect(
  78 |         page.getByText(expectedOutput.message)
> 79 |     ).toBeVisible({ timeout: 5000 });
     |       ^ Error: expect(locator).toBeVisible() failed
  80 | });
```