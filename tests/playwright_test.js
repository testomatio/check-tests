const jsParser = require('@babel/parser');
const tsParser = require('@typescript-eslint/typescript-estree');
const fs = require('fs');
const { expect } = require('chai');
const playwrightParser = require('../src/lib/frameworks/playwright');

let source;
let ast;

describe('playwright parser', () => {
  it('should parse basic playwright-js tests', () => {
    source = fs.readFileSync('./example/playwright/basic.js').toString();
    ast = jsParser.parse(source, { sourceType: 'unambiguous' });
    const tests = playwrightParser(ast, '', source);
    expect(tests[0]).to.include.key('code');
    expect(tests.length).to.equal(1);
    expect(tests[0].code).to.include("test('basic");
    expect(tests[0].name).to.equal('basic test');
  });

  it('should parse basic playwright-ts tests', () => {
    source = fs.readFileSync('./example/playwright/basic.ts').toString();
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
    const tests = playwrightParser(ast, '', source);
    expect(tests[0]).to.include.key('code');
    expect(tests.length).to.equal(1);
    expect(tests[0].code).to.include("test('basic");
    expect(tests[0].name).to.equal('basic test');
  });

  it('should parse multiple playwright-js tests', () => {
    source = fs.readFileSync('./example/playwright/multiple.js').toString();
    ast = jsParser.parse(source, { sourceType: 'unambiguous' });
    const tests = playwrightParser(ast, '', source);
    expect(tests[0]).to.include.key('code');
    expect(tests.length).to.equal(2);
    expect(tests[0].code).to.include("test('my test");
    expect(tests[0].name).to.equal('my test');
    expect(tests[0].suites.length).to.eql(1);
    expect(tests[0].suites[0]).to.eql('feature foo');
    expect(tests[1].suites[0]).to.eql('feature foo');
  });

  it('should parse multiple playwright-ts tests', () => {
    source = fs.readFileSync('./example/playwright/multiple.ts').toString();
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
    const tests = playwrightParser(ast, '', source);
    expect(tests[0]).to.include.key('code');
    expect(tests.length).to.equal(2);
    expect(tests[0].code).to.include("test('my test");
    expect(tests[0].name).to.equal('my test');
    expect(tests[0].suites.length).to.eql(1);
    expect(tests[0].suites[0]).to.eql('feature foo');
  });

  it('should update playwright suite if no suite set', () => {
    source = fs.readFileSync('./example/playwright/tags.js').toString();
    ast = jsParser.parse(source, { sourceType: 'unambiguous' });
    const tests = playwrightParser(ast, '', source);
    expect(tests[0]).to.include.key('code');
    expect(tests.length).to.equal(5);
    const lastTest = tests[tests.length - 1];
    expect(lastTest.suites.length).to.eql(0);
  });

  it('should parse playwright-js tests with annotation', () => {
    source = fs.readFileSync('./example/playwright/annotations.js').toString();
    ast = jsParser.parse(source, { sourceType: 'unambiguous' });
    const tests = playwrightParser(ast, '', source);

    expect(tests[1].code.trim()).to.equal("test.skip('my skip test @first', async ({ page }) => {".trim());
    expect(tests[1].name).to.equal('my skip test @first');
    expect(tests[1].suites.length).to.eql(1);
  });

  it('should parse playwright-js tests with annotation including fixme', () => {
    source = fs.readFileSync('./example/playwright/annotations.js').toString();
    ast = jsParser.parse(source, { sourceType: 'unambiguous' });
    const tests = playwrightParser(ast, '', source);

    expect(tests[2].code.trim()).to.equal("test.fixme('my fixme test @third', async ({ page }) => {".trim());
    expect(tests[2].name).to.equal('my fixme test @third');
    expect(tests[2].suites.length).to.eql(1);
  });

  it('should parse playwright-ts tests with annotations', () => {
    source = fs.readFileSync('./example/playwright/annotations.ts').toString();
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
    const tests = playwrightParser(ast, '', source);

    expect(tests[1].code).to.include("test.skip('my skip test @first");
    expect(tests[1].name).to.equal('my skip test @first');

    expect(tests[2].code).to.include("test.fixme('my fixme test @third");
    expect(tests[2].name).to.equal('my fixme test @third');
  });

  it('should parse playwright-js tests with skip() annotation for the description and test sections', () => {
    source = fs.readFileSync('./example/playwright/skip.js').toString();
    ast = jsParser.parse(source, { sourceType: 'unambiguous' });
    const tests = playwrightParser(ast, '', source);
    // Condition 1: test.describe.skip => all inner tests skipped
    expect(tests[0].skipped).to.be.true;
    expect(tests[1].skipped).to.be.true;
    expect(tests[2].skipped).to.be.true;
    // Condition 2: test.describe.skip + 1 inner skip => all inner tests skipped
    expect(tests[3].skipped).to.be.true;
    expect(tests[4].skipped).to.be.true;
    expect(tests[5].skipped).to.be.true;
    // Condition 3: 1 inner skip => only 1 skipped
    expect(tests[6].skipped).to.be.false;
    expect(tests[7].skipped).to.be.true;
    expect(tests[8].skipped).to.be.false;
  });

  it('should parse playwright-js tests with fixme() annotation for the description and test sections', () => {
    source = fs.readFileSync('./example/playwright/fixme.js').toString();
    ast = jsParser.parse(source, { sourceType: 'unambiguous' });
    const tests = playwrightParser(ast, '', source);
    // Condition 1: test.describe.fixme => all inner tests skipped
    expect(tests[0].skipped).to.be.true;
    expect(tests[1].skipped).to.be.true;
    expect(tests[2].skipped).to.be.true;
    // Condition 2: test.describe.fixme + 1 inner fixme + 1 inner skip => all inner tests skipped
    expect(tests[3].skipped).to.be.true;
    expect(tests[4].skipped).to.be.true;
    expect(tests[5].skipped).to.be.true;
    // Condition 3: 1 inner fixme => only 1 skipped
    expect(tests[6].skipped).to.be.false;
    expect(tests[7].skipped).to.be.true;
    expect(tests[8].skipped).to.be.false;
  });

  context('Parse Playwright hooks code', () => {
    let fileSource,
      fileAst;
    before(() => {
      fileSource = fs.readFileSync('./example/playwright/hooks.js').toString();
      fileAst = jsParser.parse(fileSource, { sourceType: 'unambiguous' });
    });

    it('should include beforeAll hook code', () => {
      const tests = playwrightParser(fileAst, '', fileSource);
      // first test
      expect(tests[0].code).to.include("test.beforeAll('run before', async () => {\n");
      expect(tests[0].code).to.include("console.log('Ran before');\n");
      expect(tests[0].code).to.include("await page.locator('#btnBeforeAll').click();\n");
      // second test 
      expect(tests[1].code).to.include("test.beforeAll('run before', async () => {\n");
      expect(tests[1].code).to.include("console.log('Ran before');\n");
      expect(tests[1].code).to.include("await page.locator('#btnBeforeAll').click();\n");
    });

    it('should include beforeEach hook code', () => {
      const tests = playwrightParser(fileAst, '', fileSource);
      // first test
      expect(tests[0].code).to.include("test.beforeEach(async ({ page }) => {\n");
      expect(tests[0].code).to.include("console.log('Ran beforeEach');\n");
      expect(tests[0].code).to.include("await page.locator('#btnBeforeEach').click();\n");
      // second test
      expect(tests[1].code).to.include("test.beforeEach(async ({ page }) => {\n");
      expect(tests[1].code).to.include("console.log('Ran beforeEach');\n");
      expect(tests[1].code).to.include("await page.locator('#btnBeforeEach').click();\n");
    });

    it('should include afterAll hook code', () => {
      const tests = playwrightParser(fileAst, '', fileSource);
      // first test
      expect(tests[0].code).to.include("test.afterAll(async () => {\n");
      expect(tests[0].code).to.include("console.log('Ran afterAll');\n");
      expect(tests[0].code).to.include("await page.locator('#btnafterAll').click();\n");
      // second test
      expect(tests[1].code).to.include("test.afterAll(async () => {\n");
      expect(tests[1].code).to.include("console.log('Ran afterAll');\n");
      expect(tests[1].code).to.include("await page.locator('#btnafterAll').click();\n");
    });
  });
});
