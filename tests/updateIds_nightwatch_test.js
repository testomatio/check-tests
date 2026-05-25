const { expect } = require('chai');
const fs = require('fs');
const { updateIds, cleanIds } = require('../src/updateIds');
const Analyzer = require('../src/analyzer');

describe('update ids for nightwatch', () => {
  before(() => {
    if (!fs.existsSync('virtual_dir')) fs.mkdirSync('virtual_dir');
  });

  describe('classical nightwatch format', () => {
    it('should update ids in classical nightwatch syntax', () => {
      const analyzer = new Analyzer('nightwatch', 'virtual_dir');

      const idMap = {
        tests: {
          'Google title test': '@T12345678',
          'Google search test': '@T87654321',
        },
        suites: {
          'Classical Test': '@S11111111',
        },
      };

      fs.writeFileSync(
        './virtual_dir/classical_test.js',
        `module.exports = {
  'Google title test': function (browser) {
    browser.url('https://google.com/ncr').assert.titleEquals('Google');
  },
  
  'Google search test': function (browser) {
    browser
      .setValue('textarea[name=q]', 'nightwatchjs')
      .waitForElementVisible('#main')
      .assert.textContains('#main', 'Nightwatch.js');
  },
};`,
      );

      analyzer.analyze('classical_test.js');

      expect(analyzer.rawTests).to.have.lengthOf(1);
      expect(analyzer.rawTests[0]).to.have.lengthOf(2);

      // Verify updatePoints are set correctly
      expect(analyzer.rawTests[0][0].updatePoint).to.be.an('object');
      expect(analyzer.rawTests[0][0].updatePoint.line).to.be.a('number');
      expect(analyzer.rawTests[0][0].updatePoint.column).to.be.a('number');

      updateIds(analyzer.rawTests, idMap, 'virtual_dir');

      const updatedFile = fs.readFileSync('virtual_dir/classical_test.js').toString();
      expect(updatedFile).to.include("'Google title test @T12345678':");
      expect(updatedFile).to.include("'Google search test @T87654321':");
    });

    it('should update ids in classical nightwatch with ESM syntax', () => {
      const analyzer = new Analyzer('nightwatch', 'virtual_dir');

      const idMap = {
        tests: {
          'Homepage test': '@T99999999',
          'Search test': '@T88888888',
        },
        suites: {
          'Esm Test': '@S77777777',
        },
      };

      fs.writeFileSync(
        './virtual_dir/esm_test.mjs',
        `export default {
  'Homepage test': function (browser) {
    browser.url('https://google.com').assert.title('Google');
  },
  
  'Search test': function (browser) {
    browser.setValue('input[name=q]', 'test');
  },
};`,
      );

      analyzer.analyze('esm_test.mjs');

      expect(analyzer.rawTests).to.have.lengthOf(1);
      expect(analyzer.rawTests[0]).to.have.lengthOf(2);

      updateIds(analyzer.rawTests, idMap, 'virtual_dir');

      const updatedFile = fs.readFileSync('virtual_dir/esm_test.mjs').toString();
      expect(updatedFile).to.include("'Homepage test @T99999999':");
      expect(updatedFile).to.include("'Search test @T88888888':");
    });
  });

  describe('describe/it nightwatch format', () => {
    it('should update ids in describe/it nightwatch syntax', () => {
      const analyzer = new Analyzer('nightwatch', 'virtual_dir');

      const idMap = {
        tests: {
          'should load homepage': '@T11111111',
          'should perform search': '@T22222222',
        },
        suites: {
          'Google Tests': '@S33333333',
        },
      };

      fs.writeFileSync(
        './virtual_dir/describe_test.js',
        `describe('Google Tests', function() {
  it('should load homepage', function(browser) {
    browser.url('https://google.com').assert.title('Google');
  });
  
  it('should perform search', function(browser) {
    browser.setValue('input[name=q]', 'nightwatch');
  });
});`,
      );

      analyzer.analyze('describe_test.js');

      expect(analyzer.rawTests).to.have.lengthOf(1);
      expect(analyzer.rawTests[0]).to.have.lengthOf(2);

      updateIds(analyzer.rawTests, idMap, 'virtual_dir');

      const updatedFile = fs.readFileSync('virtual_dir/describe_test.js').toString();
      expect(updatedFile).to.include("describe('Google Tests @S33333333'");
      expect(updatedFile).to.include("it('should load homepage @T11111111'");
      expect(updatedFile).to.include("it('should perform search @T22222222'");
    });
  });

  describe('clean ids', () => {
    it('should clean ids from classical nightwatch syntax', () => {
      const analyzer = new Analyzer('nightwatch', 'virtual_dir');

      fs.writeFileSync(
        './virtual_dir/clean_test.js',
        `module.exports = {
  'Test with ID @T12345678': function (browser) {
    browser.url('https://example.com');
  },
  
  'Another test @T87654321': function (browser) {
    browser.assert.title('Example');
  },
};`,
      );

      analyzer.analyze('clean_test.js');

      cleanIds(analyzer.rawTests, {}, 'virtual_dir', { dangerous: true });

      const cleanedFile = fs.readFileSync('virtual_dir/clean_test.js').toString();
      expect(cleanedFile).to.include("'Test with ID':");
      expect(cleanedFile).to.include("'Another test':");
      expect(cleanedFile).to.not.include('@T12345678');
      expect(cleanedFile).to.not.include('@T87654321');
    });

    it('should clean ids from describe/it nightwatch syntax', () => {
      const analyzer = new Analyzer('nightwatch', 'virtual_dir');

      fs.writeFileSync(
        './virtual_dir/clean_describe.js',
        `describe('Suite with ID @S33333333', function() {
  it('test with ID @T11111111', function(browser) {
    browser.url('https://example.com');
  });
});`,
      );

      analyzer.analyze('clean_describe.js');

      cleanIds(analyzer.rawTests, {}, 'virtual_dir', { dangerous: true });

      const cleanedFile = fs.readFileSync('virtual_dir/clean_describe.js').toString();
      expect(cleanedFile).to.include("describe('Suite with ID'");
      expect(cleanedFile).to.include("it('test with ID'");
      expect(cleanedFile).to.not.include('@S33333333');
      expect(cleanedFile).to.not.include('@T11111111');
    });
  });
});
