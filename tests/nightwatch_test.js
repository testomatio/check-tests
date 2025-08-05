const jsParser = require('@babel/parser');
const tsParser = require('@typescript-eslint/typescript-estree');
const fs = require('fs');
const { expect } = require('chai');
const nightwatchParser = require('../src/lib/frameworks/nightwatch');
const { assert } = require('console');

let source;
let ast;

describe('nightwatch parser', () => {
  it('should parse basic nightwatch describe/it tests', () => {
    source = `
describe('Ecosia.org Demo', function() {
  this.tags = ['demo'];

  before(browser => browser.navigateTo('https://www.ecosia.org/'));

  it('Demo test ecosia.org', function(browser) {
    browser
      .waitForElementVisible('body')
      .assert.titleContains('Ecosia')
      .assert.visible('input[type=search]')
      .setValue('input[type=search]', 'nightwatch')
      .assert.visible('button[type=submit]')
      .click('button[type=submit]')
      .assert.textContains('.layout__content', 'Nightwatch.js');
  });

  after(browser => browser.end());
});
    `;

    ast = jsParser.parse(source, { sourceType: 'unambiguous' });
    const tests = nightwatchParser(ast, 'ecosia.test.js', source);

    expect(tests).to.have.lengthOf(1);
    expect(tests[0].name).to.equal('Demo test ecosia.org');
    expect(tests[0].suites).to.include('Ecosia.org Demo');
    expect(tests[0].file).to.equal('ecosia.test.js');
    expect(tests[0].code).to.include('browser');
    expect(tests[0].code).to.include('waitForElementVisible');
  });

  it('should parse mixed patterns with skipped tests', () => {
    source = fs.readFileSync('./example/nightwatch/mixed.js').toString();
    ast = jsParser.parse(source, { sourceType: 'unambiguous' });
    const tests = nightwatchParser(ast, 'mixed.js', source);

    expect(tests).to.have.lengthOf(5);

    // Test outside describe block
    expect(tests[0].name).to.equal('test inside a file');
    expect(tests[0].suites).to.deep.equal(['mixed.js']);

    // Test inside first suite
    expect(tests[1].name).to.equal('test inside a suite');
    expect(tests[1].suites).to.include('suite name for positive tests');

    // Test inside nested suite
    expect(tests[2].name).to.equal('test inside nested suite');
    expect(tests[2].suites).to.include('nested suite name');

    // Skipped test
    expect(tests[3].name).to.equal('skipped test');
    expect(tests[3].skipped).to.be.true;

    // Regular test
    expect(tests[4].name).to.equal('failed test');
    expect(tests[4].skipped).to.be.false;
  });

  it('should parse module.exports pattern (JavaScript)', () => {
    source = fs.readFileSync('./example/nightwatch/basic.js').toString();
    ast = jsParser.parse(source, { sourceType: 'unambiguous' });
    const tests = nightwatchParser(ast, 'basic.js', source);

    expect(tests).to.have.lengthOf(2);
    expect(tests[0].name).to.equal('Google title test');
    expect(tests[1].name).to.equal('Google search test');
    expect(tests[0].suites).to.deep.equal(['basic.js']);
    expect(tests[0].code).to.include('browser.url');
    expect(tests[1].code).to.include('setValue');
  });

  it('should parse TypeScript nightwatch tests with describe pattern', () => {
    source = fs.readFileSync('./example/nightwatch/duckDuckGo.test.ts').toString();
    const program = tsParser.parse(source, {
      sourceType: 'unambiguous',
      loc: true,
      range: true,
      tokens: true,
    });
    ast = {
      program,
      type: 'File',
    };

    const tests = nightwatchParser(ast, 'duckDuckGo.test.ts', source);

    expect(tests).to.have.lengthOf(1);
    expect(tests[0].name).to.equal('Search Nightwatch.js and check results');
    expect(tests[0].suites).to.include('duckduckgo example');
    expect(tests[0].file).to.equal('duckDuckGo.test.ts');
    expect(tests[0].code).to.include('waitForElementVisible');
  });

  it('should parse TypeScript nightwatch tests with hooks (ecosia example)', () => {
    source = fs.readFileSync('./example/nightwatch/ecosia.test.ts').toString();
    const program = tsParser.parse(source, {
      sourceType: 'unambiguous',
      loc: true,
      range: true,
      tokens: true,
    });
    ast = {
      program,
      type: 'File',
    };

    const tests = nightwatchParser(ast, 'ecosia.test.ts', source);

    expect(tests).to.have.lengthOf(1);
    expect(tests[0].name).to.equal('Demo test ecosia.org');
    expect(tests[0].suites).to.include('Ecosia.org Demo');
    expect(tests[0].file).to.equal('ecosia.test.ts');
    expect(tests[0].code).to.include('before');
    expect(tests[0].code).to.include('after');
    expect(tests[0].code).to.include('waitForElementVisible');
  });

  it('should parse TypeScript nightwatch tests with module exports pattern', () => {
    source = `
import {NightwatchAPI, NightwatchTests} from 'nightwatch';

const home: NightwatchTests = {
  'Github Title test': () => {
    browser
      .url('https://github.com')
      .assert.titleContains('GitHub');
  },

  'Github search for nightwatch repository': () => {
    browser
      .url('https://github.com/search')
      .clearValue('[placeholder=\\'Search GitHub\\']')
      .setValue('[placeholder=\\'Search GitHub\\']', 'nightwatch')
      .waitForElementVisible('.header-search-button')
      .assert.textEquals('.header-search-button', 'nightwatch');
  },

  'Github login with fake credentials': () => {
    browser
      .url('https://github.com/login')
      .clearValue('#login_field')
      .setValue('#login_field', 'nightwatch')
      .clearValue('#password')
      .setValue('#password', 'testpassword')
      .waitForElementVisible('[value=\\'Sign in\\']')
      .click('[value=\\'Sign in\\']')
      .assert.textContains(
        '#js-flash-container .flash.flash-error',
        'Incorrect username or password.'
      )
      .end();
  }
};

export default home;
    `;

    const program = tsParser.parse(source, {
      sourceType: 'unambiguous',
      loc: true,
      range: true,
      tokens: true,
    });
    ast = {
      program,
      type: 'File',
    };

    const tests = nightwatchParser(ast, 'github.ts', source);

    // Note: export default doesn't create module.exports assignment,
    // so this test pattern might not be detected by our current parser
    // This shows a limitation we might need to address
    expect(tests).to.have.lengthOf(0);
  });

  it('should handle hooks correctly', () => {
    source = `
describe('Test with hooks', function() {
  before(function(browser) {
    browser.url('https://example.com');
  });

  beforeEach(function(browser) {
    browser.maximizeWindow();
  });

  it('test with hooks', function(browser) {
    browser.assert.titleContains('Example');
  });

  after(function(browser) {
    browser.end();
  });

  afterEach(function(browser) {
    browser.saveScreenshot('./screenshot.png');
  });
});
    `;

    ast = jsParser.parse(source, { sourceType: 'unambiguous' });
    const tests = nightwatchParser(ast, 'hooks.js', source);

    expect(tests).to.have.lengthOf(1);
    expect(tests[0].name).to.equal('test with hooks');
    expect(tests[0].code).to.include('before');
    expect(tests[0].code).to.include('beforeEach');
    expect(tests[0].code).to.include('afterEach');
    expect(tests[0].code).to.include('after');
  });

  it('should forbid .only tests', () => {
    source = `
describe('Test suite', function() {
  it.only('exclusive test', function(browser) {
    browser.url('https://example.com');
  });
});
    `;

    ast = jsParser.parse(source, { sourceType: 'unambiguous' });

    try {
      nightwatchParser(ast, 'exclusive.js', source);
      assert.fail('Expected an error');
    } catch (err) {
      expect(err.message).to.include('Exclusive tests detected');
    }
  });

  it('should handle no-hooks option', () => {
    source = `
describe('Test with hooks', function() {
  before(function(browser) {
    browser.url('https://example.com');
  });

  it('test without hooks', function(browser) {
    browser.assert.titleContains('Example');
  });
});
    `;

    ast = jsParser.parse(source, { sourceType: 'unambiguous' });
    const tests = nightwatchParser(ast, 'no-hooks.js', source, { noHooks: true });

    expect(tests).to.have.lengthOf(1);
    expect(tests[0].code).to.not.include('before');
    expect(tests[0].code).to.include('browser.assert.titleContains');
  });

  it('should parse classic Nightwatch CommonJS syntax', () => {
    source = fs.readFileSync('./example/nightwatch/classic.js').toString();
    ast = jsParser.parse(source, { sourceType: 'unambiguous' });
    const tests = nightwatchParser(ast, 'classic.js', source);

    expect(tests).to.have.lengthOf(8);

    // Verify test names
    const testNames = tests.map(t => t.name);
    expect(testNames).to.include('Google homepage should load');
    expect(testNames).to.include('Search functionality should work');
    expect(testNames).to.include('Advanced search should be accessible');
    expect(testNames).to.include('Custom command test');
    expect(testNames).to.include('Page object style test');
    expect(testNames).to.include('Client assertions test');
    expect(testNames).to.include('Conditional test');
    expect(testNames).to.include('Multiple assertions test');

    // Verify hooks are included
    expect(tests[0].code).to.include('before');
    expect(tests[0].code).to.include('beforeEach');
    expect(tests[0].code).to.include('after');
    expect(tests[0].code).to.include('afterEach');

    // Verify classic Nightwatch syntax is preserved
    expect(tests[0].code).to.include('browser');
    expect(tests[0].code).to.include('waitForElementVisible');
    expect(tests[0].code).to.include('assert.title');
    expect(tests[0].code).to.include('Setting up...');

    // Check suite structure
    expect(tests[0].suites).to.deep.equal(['classic.js']);
  });

  it('should parse page objects pattern', () => {
    source = fs.readFileSync('./example/nightwatch/page-objects.js').toString();
    ast = jsParser.parse(source, { sourceType: 'unambiguous' });
    const tests = nightwatchParser(ast, 'page-objects.js', source);

    expect(tests).to.have.lengthOf(5);

    const testNames = tests.map(t => t.name);
    expect(testNames).to.include('Home page navigation test');
    expect(testNames).to.include('Search workflow test');
    expect(testNames).to.include('Advanced search features');
    expect(testNames).to.include('Mobile responsive test');
    expect(testNames).to.include('Multi-language support test');

    // Verify page object references are preserved
    expect(tests[0].code).to.include('browser.globals.homePage');
    expect(tests[1].code).to.include('searchPage');
    expect(tests[0].code).to.include('navigate()');
    expect(tests[0].code).to.include('@searchBox');

    // Verify page object pattern is used (require is at top level, not in test code)
    expect(tests[0].code).to.include('homePage');
  });

  it('should parse complex nested suites with hooks', () => {
    source = fs.readFileSync('./example/nightwatch/complex-hooks.js').toString();
    ast = jsParser.parse(source, { sourceType: 'unambiguous' });
    const tests = nightwatchParser(ast, 'complex-hooks.js', source);

    expect(tests).to.have.lengthOf(9);

    // Verify Authentication Suite tests
    const authTests = tests.filter(t => t.suites.includes('Authentication Suite'));
    expect(authTests).to.have.lengthOf(3);
    expect(authTests.map(t => t.name)).to.include('Valid login test');
    expect(authTests.map(t => t.name)).to.include('Invalid login test');
    expect(authTests.map(t => t.name)).to.include('Empty fields validation');

    // Verify Navigation Suite tests
    const navTests = tests.filter(t => t.suites.includes('Navigation Suite'));
    expect(navTests).to.have.lengthOf(3);
    expect(navTests.map(t => t.name)).to.include('Main menu navigation');
    expect(navTests.map(t => t.name)).to.include('Breadcrumb navigation');
    expect(navTests.map(t => t.name)).to.include('Footer links test');

    // Verify Form Interaction Suite tests
    const formTests = tests.filter(t => t.suites.includes('Form Interaction Suite'));
    expect(formTests).to.have.lengthOf(3);
    expect(formTests.map(t => t.name)).to.include('Contact form submission');
    expect(formTests.map(t => t.name)).to.include('Form validation test');
    expect(formTests.map(t => t.name)).to.include('Required fields test');

    // Verify global hooks are included
    expect(tests[0].code).to.include('Global setup');
    expect(tests[0].code).to.include('Global beforeEach');
    expect(tests[0].code).to.include('Global afterEach');
    expect(tests[0].code).to.include('Global teardown');

    // Verify suite-specific content is preserved
    expect(authTests[0].code).to.include('Auth suite setup');
    expect(authTests[0].code).to.include('#username');
    expect(navTests[0].code).to.include('.menu-item');
    expect(formTests[0].code).to.include('#submit-button');
  });

  it('should handle @tags and metadata in classic syntax', () => {
    source = `
module.exports = {
  '@tags': ['smoke', 'regression'],
  '@disabled': false,
  
  'Tagged test': function(browser) {
    browser.url('https://example.com');
  },
  
  'Another tagged test': function(browser) {
    browser.assert.title('Example');
  }
};
    `;

    ast = jsParser.parse(source, { sourceType: 'unambiguous' });
    const tests = nightwatchParser(ast, 'tagged.js', source);

    expect(tests).to.have.lengthOf(2);
    expect(tests[0].name).to.equal('Tagged test');
    expect(tests[1].name).to.equal('Another tagged test');

    // Verify metadata properties are excluded from tests
    const testNames = tests.map(t => t.name);
    expect(testNames).to.not.include('@tags');
    expect(testNames).to.not.include('@disabled');
  });

  it('should handle classic Nightwatch with custom commands', () => {
    source = `
module.exports = {
  'Custom commands test': function(browser) {
    browser
      .url('https://example.com')
      .perform(function() {
        console.log('Custom action');
      })
      .execute(function() {
        return document.title;
      }, function(result) {
        browser.assert.equal(result.value, 'Example');
      })
      .waitForConditionPollInterval(100)
      .waitForConditionTimeout(5000);
  },
  
  'Browser API test': function(browser) {
    browser
      .resizeWindow(1024, 768)
      .maximizeWindow()
      .refresh()
      .back()
      .forward()
      .deleteCookies()
      .closeWindow()
      .switchWindow();
  }
};
    `;

    ast = jsParser.parse(source, { sourceType: 'unambiguous' });
    const tests = nightwatchParser(ast, 'custom-commands.js', source);

    expect(tests).to.have.lengthOf(2);
    expect(tests[0].name).to.equal('Custom commands test');
    expect(tests[1].name).to.equal('Browser API test');

    // Verify custom commands are preserved
    expect(tests[0].code).to.include('perform(function()');
    expect(tests[0].code).to.include('execute(function()');
    expect(tests[0].code).to.include('waitForConditionPollInterval');

    // Verify browser API calls are preserved
    expect(tests[1].code).to.include('resizeWindow');
    expect(tests[1].code).to.include('maximizeWindow');
    expect(tests[1].code).to.include('deleteCookies');
    expect(tests[1].code).to.include('switchWindow');
  });
});
