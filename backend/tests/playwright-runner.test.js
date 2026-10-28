const test = require('node:test');
const assert = require('node:assert');
const { toLocator, fillValueFor } = require('../src/services/runner/PlaywrightRunner');

// page giả: mỗi hàm trả nhãn để biết toLocator gọi đúng engine nào.
const page = {
  getByPlaceholder: (v) => ({ by: 'placeholder', v }),
  getByText: (v) => ({ by: 'text', v }),
  getByRole: (v) => ({ by: 'role', v }),
  locator: (v) => ({ by: 'css', v }),
};

test('toLocator phân giải đúng prefix', () => {
  assert.deepEqual(toLocator(page, 'placeholder=Enter your password'), { by: 'placeholder', v: 'Enter your password' });
  assert.deepEqual(toLocator(page, 'text=Sign In'), { by: 'text', v: 'Sign In' });
  assert.deepEqual(toLocator(page, 'role=button'), { by: 'role', v: 'button' });
  assert.deepEqual(toLocator(page, '#login'), { by: 'css', v: '#login' }); // không prefix → CSS
});

test('fillValueFor đoán username/password theo placeholder', () => {
  const creds = { username: 'u1', password: 'p1' };
  assert.equal(fillValueFor('placeholder=Enter your password', creds), 'p1');
  assert.equal(fillValueFor('placeholder=e.g. 20521234', creds), 'u1');
});
