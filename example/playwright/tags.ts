import { test } from '@playwright/test';

test('test with no @T401dbf63 tags', async () => {
  // test code
});

test('test with single tag on the same line @T4ebd80b8', { tag: '@smoke' },
  async () => {
    // test code
  },
);

test('test with single tag and opening brace on the same line @T3e062645', {
  tag: '@smoke',
},
  async () => {
    // test code
  },
);

test('test with single tag and opening tag brace on next line @T62a0d144',
  {
    tag: '@smoke',
  },
  async () => {
    // test code
  },
);

test('test with multiple tags @T4511b34c', {
  tag: ['@smoke', '@regression'],
},
  async () => {
    // test code
  },
);

test('test with multiple tags on multiple lines @T50c73c45', {
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
