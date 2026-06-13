import { test, expect } from '@playwright/test';

test('plain test', async () => {
  await expect(true).toBe(true);
});

// .fail marks a test as expected to fail, but it still runs => not skipped
test.fail('expected to fail test', async () => {
  await expect(true).toBe(false);
});

// .slow triples the timeout, but the test still runs => not skipped
test.slow('slow test', async () => {
  await expect(true).toBe(true);
});

// .todo => skipped test
test.todo('todo test');

// runtime forms without a title declare no separate test
test('runtime annotations have no title', async () => {
  test.fail();
  test.skip();
  test.slow();
  await expect(true).toBe(true);
});

// .fail inside a skipped suite => skipped (suite wins)
test.describe.skip('skipped suite', () => {
  test.fail('fail inside skipped suite', async () => {
    await expect(true).toBe(false);
  });
});
