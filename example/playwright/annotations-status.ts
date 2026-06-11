import { test, expect } from '@playwright/test';

test('plain test', async () => {
  await expect(true).toBe(true);
});

// .fail marks a test as expected to fail, but it still runs => not skipped
test.fail('expected to fail test', async () => {
  await expect(true).toBe(false);
});

// .todo => skipped test
test.todo('todo test');

// runtime forms without a title declare no separate test
test('runtime annotations have no title', async () => {
  test.fail();
  test.skip();
  await expect(true).toBe(true);
});

// .fail inside a skipped suite => skipped (suite wins)
test.describe.skip('skipped suite', () => {
  test.fail('fail inside skipped suite', async () => {
    await expect(true).toBe(false);
  });
});
