const { expect } = require('chai');
const { replaceAtPoint, getAllSuiteTags } = require('../src/lib/utils');

describe('util functions', () => {
  it('#replaceAtPoint', () => {
    subject = replaceAtPoint(
      `
Feature

Scenario()
`,
      { line: 4, column: 9 },
      'hello',
    );

    expect(subject).to.equal(`
Feature

Scenario(hello)
`);
  });

  describe('#getAllSuiteTags', () => {
    it('should return empty array when no suites provided', () => {
      const result = getAllSuiteTags([]);
      expect(result).to.be.an('array');
      expect(result).to.have.length(0);
    });

    it('should return empty array when suites have no tags', () => {
      const suites = [{ tags: [] }, { tags: undefined }, { tags: null }, {}];
      const result = getAllSuiteTags(suites);
      expect(result).to.be.an('array');
      expect(result).to.have.length(0);
    });

    it('should collect tags from a single suite', () => {
      const suites = [{ tags: ['smoke', 'regression'] }];
      const result = getAllSuiteTags(suites);
      expect(result).to.be.an('array');
      expect(result).to.have.length(2);
      expect(result).to.have.members(['smoke', 'regression']);
    });

    it('should collect tags from multiple suites', () => {
      const suites = [{ tags: ['smoke'] }, { tags: ['regression', 'api'] }, { tags: ['critical'] }];
      const result = getAllSuiteTags(suites);
      expect(result).to.be.an('array');
      expect(result).to.have.length(4);
      expect(result).to.have.members(['smoke', 'regression', 'api', 'critical']);
    });

    it('should handle mixed suites with and without tags', () => {
      const suites = [{ tags: ['smoke'] }, {}, { tags: ['regression'] }, { tags: undefined }, { tags: ['api'] }];
      const result = getAllSuiteTags(suites);
      expect(result).to.be.an('array');
      expect(result).to.have.length(3);
      expect(result).to.have.members(['smoke', 'regression', 'api']);
    });

    it('should not modify original suites array', () => {
      const suites = [{ tags: ['smoke'] }, { tags: ['regression'] }];
      const originalSuites = JSON.parse(JSON.stringify(suites));

      getAllSuiteTags(suites);

      expect(suites).to.deep.equal(originalSuites);
    });
  });
});
