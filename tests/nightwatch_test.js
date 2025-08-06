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
    expect(tests[0].suites).to.deep.equal(['Mixed']);

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
    expect(tests[0].suites).to.deep.equal(['Basic']);
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

    // TypeScript export default pattern is now supported
    expect(tests).to.have.lengthOf(3);
    expect(tests[0].name).to.equal('Github Title test');
    expect(tests[1].name).to.equal('Github search for nightwatch repository');
    expect(tests[2].name).to.equal('Github login with fake credentials');
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
    expect(tests[0].suites).to.deep.equal(['Classic']);
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

  it('should parse complex classical Nightwatch tests with hooks', () => {
    source = fs.readFileSync('./example/nightwatch/complex-hooks.js').toString();
    ast = jsParser.parse(source, { sourceType: 'unambiguous' });
    const tests = nightwatchParser(ast, 'complex-hooks.js', source);

    expect(tests).to.have.lengthOf(9);

    // Verify test names (no nested suites since Nightwatch doesn't support them)
    const testNames = tests.map(t => t.name);
    expect(testNames).to.include('Valid login test');
    expect(testNames).to.include('Invalid login test');
    expect(testNames).to.include('Empty login fields validation');
    expect(testNames).to.include('Main menu navigation test');
    expect(testNames).to.include('Breadcrumb navigation test');
    expect(testNames).to.include('Footer links navigation test');
    expect(testNames).to.include('Contact form submission test');
    expect(testNames).to.include('Form validation error test');
    expect(testNames).to.include('Required form fields test');

    // Verify all tests are in the same file suite (no nested suites)
    tests.forEach(test => {
      expect(test.suites).to.deep.equal(['Complex Hooks']);
    });

    // Verify global hooks are included
    expect(tests[0].code).to.include('Global setup');
    expect(tests[0].code).to.include('Global beforeEach');
    expect(tests[0].code).to.include('Global afterEach');
    expect(tests[0].code).to.include('Global teardown');

    // Verify each test includes its specific functionality
    const loginTest = tests.find(t => t.name === 'Valid login test');
    expect(loginTest.code).to.include('#username');
    expect(loginTest.code).to.include('#password');

    const navTest = tests.find(t => t.name === 'Main menu navigation test');
    expect(navTest.code).to.include('.menu-item');

    const formTest = tests.find(t => t.name === 'Contact form submission test');
    expect(formTest.code).to.include('#submit-button');
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

  it('should parse classic Nightwatch ESM syntax', () => {
    source = fs.readFileSync('./example/nightwatch/classic-esm.mjs').toString();
    ast = jsParser.parse(source, { sourceType: 'module', allowImportExportEverywhere: true });
    const tests = nightwatchParser(ast, 'classic-esm.mjs', source);

    expect(tests).to.have.lengthOf(7);

    // Verify test names
    const testNames = tests.map(t => t.name);
    expect(testNames).to.include('Google homepage should load');
    expect(testNames).to.include('Search functionality should work');
    expect(testNames).to.include('Advanced search should be accessible');
    expect(testNames).to.include('Custom command test');
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
    expect(tests[0].suites).to.deep.equal(['Classic Esm']);

    // Verify ESM format works correctly
    expect(tests[0].file).to.equal('classic-esm.mjs');
  });

  it('should parse TypeScript Nightwatch export default pattern', () => {
    source = `
import {NightwatchAPI, NightwatchTests} from 'nightwatch';

const home: NightwatchTests = {
  'Github Title test': () => {
    browser
      .url('https://github.com')
      .assert.titleContains('GitHub');
  },

  'Github search test': () => {
    browser
      .url('https://github.com/search')
      .setValue('[placeholder="Search GitHub"]', 'nightwatch')
      .perform(function(this: NightwatchAPI) {
        const actions = this.actions({async: true});
        return actions.keyDown(this.Keys['ENTER']).keyUp(this.Keys['ENTER']);
      })
      .waitForElementVisible('.header-search-button')
      .assert.textEquals('.header-search-button', 'nightwatch');
  }
};

export default home;
    `;

    const program = tsParser.parse(source, {
      sourceType: 'module',
      loc: true,
      range: true,
      tokens: true,
    });
    ast = {
      program,
      type: 'File',
    };

    const tests = nightwatchParser(ast, 'github.test.ts', source);

    expect(tests).to.have.lengthOf(2);
    expect(tests[0].name).to.equal('Github Title test');
    expect(tests[1].name).to.equal('Github search test');
    expect(tests[0].suites).to.deep.equal(['Github Test']);

    // Verify TypeScript arrow function syntax is preserved
    expect(tests[0].code).to.include('() => {');
    expect(tests[1].code).to.include('this: NightwatchAPI');
    expect(tests[1].code).to.include('actions({async: true})');
  });
});
