fixture `Getting Started`
    .page `http://devexpress.github.io/testcafe/example`;

test('Add dev name success', async t => {
    await t
        .typeText('#developer-name', 'John Smith')
        .click('#submit-button');
});


test('Add dev name failed', async t => {
  await t
      .typeText('#developer-name', 'John Smith')
      .click('#submit-button1');
});

test.skip('Skipped test', () => {});
