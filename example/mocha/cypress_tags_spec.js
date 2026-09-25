/// <reference types="Cypress" />

const TestTypes = {
  regression: '@regression',
  smoke: '@smoke',
};

const Services = {
  integrations: 'integrations',
};

describe(
  'Ability to Edit and Delete Assets',
  {
    tags: [TestTypes.regression, Services.integrations, '@multiTenant', 'v8'],
  },
  () => {
    beforeEach(() => {
      cy.visit('http://localhost:8080/assets');
    });

    it('edits an asset', () => {
      cy.get('.edit').click();
    });

    it('deletes an asset', { tags: ['@slow', `nightly`] }, () => {
      cy.get('.delete').click();
    });

    describe('nested suite', { tags: 'wip' }, () => {
      it('inherits tags from all parent suites', () => {
        cy.get('.nested').click();
      });
    });
  },
);

describe('Suite without tags', () => {
  it('has no tags', () => {
    cy.visit('http://localhost:8080');
  });

  it.skip('skipped test with own tags', { tags: '@quarantine' }, () => {
    cy.visit('http://localhost:8080');
  });
});
