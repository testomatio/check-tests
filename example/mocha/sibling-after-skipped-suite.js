describe.skip('skipped suite', () => {
  it('inside skipped suite', () => {});
});

// these are siblings declared AFTER the skipped suite closed - they must not inherit skipped
it('sibling after skipped suite', () => {});

xit('xit sibling after skipped suite', () => {});
