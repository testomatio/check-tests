import { test as base } from '@playwright/test';

const testFixture = base.extend<{ someFixture: any }>({
  someFixture: async ({}, use) => {
    await use({ name: 'custom fixture name' });
  },
});

testFixture('plain alias test', async ({ someFixture }) => {
  console.warn(someFixture.name);
});

testFixture.skip('skipped alias test', async ({ someFixture }) => {
  console.warn(someFixture.name);
});

testFixture.fixme('fixme alias test', async ({ someFixture }) => {
  console.warn(someFixture.name);
});

testFixture.fail('failing alias test', async ({ someFixture }) => {
  console.warn(someFixture.name);
});

testFixture.slow('slow alias test', async ({ someFixture }) => {
  console.warn(someFixture.name);
});

testFixture.todo('todo alias test');

testFixture.describe('alias suite', () => {
  testFixture.fixme('fixme test inside alias suite', async ({ someFixture }) => {
    console.warn(someFixture.name);
  });
});
