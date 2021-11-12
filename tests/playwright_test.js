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

  it('should parse multiple playwright-js tests', () => {
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
    expect(tests[1].suites[0]).to.eql('feature foo');
  });
});
