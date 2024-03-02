import { test } from '@playwright/test';

test('test with no tags', async () => {
  // test code
});

test(
  'test with single tag',
  {
    tag: '@smoke',
  },
  async () => {
    // test code
  },
);

test(
  'test with multiple tags',
  {
    tag: ['@smoke', '@regression'],
  },
  async () => {
    // test code
  },
);

test(
  'test with multiple tags on multiple lines',
  {
    tag: [
      '@smoke',
      '@regression',
      '@windows'
    ],
  },
  async () => {
    // test code
  },
);
