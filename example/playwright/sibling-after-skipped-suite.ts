import { test, expect } from '@playwright/test';

test.describe.skip('skipped suite', () => {
  test('inside skipped suite', async () => {
    await expect(true).toBe(true);
  });
});

// these are siblings declared AFTER the skipped suite closed - they must not inherit skipped
test('sibling after skipped suite', async () => {
  await expect(true).toBe(true);
});

test.fail('failing sibling after skipped suite', async () => {
  await expect(true).toBe(false);
});
