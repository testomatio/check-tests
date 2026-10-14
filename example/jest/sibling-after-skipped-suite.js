describe.skip('skipped suite', () => {
  test('inside skipped suite', () => {});
});

// these are siblings declared AFTER the skipped suite closed - they must not inherit skipped
test('sibling after skipped suite', () => {});

test.skip('skipped sibling after skipped suite', () => {});
