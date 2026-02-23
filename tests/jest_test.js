const parser = require('@babel/parser');
const fs = require('fs');
const { expect } = require('chai');
const jestParser = require('../src/lib/frameworks/jest');

let source;
let ast;

describe('jest parser', () => {
  context('jest tests', () => {
    before(() => {
      source = fs.readFileSync('./example/jest/vue.spec.js').toString();
      ast = parser.parse(source);
    });

    it('should parse jest file', () => {
      const tests = jestParser(ast);

      const actualTests = tests.filter(t => !t.skipped).map(t => t.name);
      const skippedTests = tests.filter(t => t.skipped).map(t => t.name);

      expect(actualTests).to.include('base');
      expect(actualTests).to.include('history mode');
      expect(actualTests).to.include('file should exist');
      expect(actualTests).to.include('%i file should exist (it.each)');

      expect(skippedTests).to.include('skip: use with Babel (test)');
      expect(skippedTests).to.include('skip: use with Babel (it)');
      expect(skippedTests).to.include('skip: %i file should exist (it.each)');
      expect(skippedTests).to.include('skip: %i file should exist (test.each)');

      expect(actualTests).to.have.lengthOf(4);
      expect(skippedTests).to.have.lengthOf(4);
    });

    it('should include code', () => {
      const tests = jestParser(ast, '', source);
      expect(tests[0]).to.include.key('code');
      expect(tests[0].code).to.include("test('base'");
    });
  });

  context('exclusive tests', () => {
    before(() => {
      source = fs.readFileSync('./example/jest/vue.spec.only.js').toString();
      ast = parser.parse(source);
    });

    it('should throw an error if a file contains .only', () => {
      const parse = () => jestParser(ast);

      expect(parse).to.throw(
        'Exclusive tests detected. `.only` call found in ' + ':1\n' + 'Remove `.only` to restore test checks',
      );
    });
  });

  context('hooks tests - default opts', () => {
    before(() => {
      source = fs.readFileSync('./example/jest/hooks.spec.js').toString();
      ast = parser.parse(source);
    });

    it('should include beforeAll hook code', () => {
      const tests = jestParser(ast, '', source);
      // first test
      expect(tests[0].code).to.include('beforeAll(() => {');
      expect(tests[0].code).to.include("console.log('Ran beforeAll');");
      expect(tests[0].code).to.include('expect(foods[1]).toBeTruthy();');
      // second test
      expect(tests[1].code).to.include('beforeAll(() => {');
      expect(tests[1].code).to.include("console.log('Ran beforeAll');");
      expect(tests[1].code).to.include('expect(foods[1]).toBeTruthy();');
    });

    it('should include beforeEach hook code', () => {
      const tests = jestParser(ast, '', source);
      // first test
      expect(tests[0].code).to.include('beforeEach(() => {');
      expect(tests[0].code).to.include("console.log('Ran beforeEach');");
      expect(tests[0].code).to.include('expect(foods[2]).toBeTruthy();');
      // second test
      expect(tests[1].code).to.include('beforeEach(() => {');
      expect(tests[1].code).to.include("console.log('Ran beforeEach');");
      expect(tests[1].code).to.include('expect(foods[2]).toBeTruthy();');
    });

    it('should include afterAll hook code', () => {
      const tests = jestParser(ast, '', source);
      // first test
      expect(tests[0].code).to.include('afterAll(() => {');
      expect(tests[0].code).to.include("console.log('Ran afterAll');");
      expect(tests[0].code).to.include('expect(foods[0]).toBeTruthy();');
      // second test
      expect(tests[1].code).to.include('afterAll(() => {');
      expect(tests[1].code).to.include("console.log('Ran afterAll');");
      expect(tests[1].code).to.include('expect(foods[0]).toBeTruthy();');
    });
  });

  context('[opts.noHooks = true] hooks tests', () => {
    let fileSource, fileAst;

    before(() => {
      fileSource = fs.readFileSync('./example/jest/hooks.spec.js').toString();
      fileAst = parser.parse(source);
    });

    it('should exclude beforeAll hook code', () => {
      const tests = jestParser(fileAst, '', fileSource, { noHooks: true });
      // first test
      expect(tests[0].code).to.not.include('beforeAll(() => {');
      expect(tests[0].code).to.include("test('Vienna <3 veal', async () => {");
      // second test
      expect(tests[1].code).to.not.include('before(() => {');
      expect(tests[1].code).to.include("test('San Juan <3 plantains', async () => {");
    });

    it('should exclude beforeEach hook code', () => {
      const tests = jestParser(fileAst, '', fileSource, { noHooks: true });
      // first test
      expect(tests[0].code).to.not.include('beforeEach(() => {');
      // second test
      expect(tests[1].code).to.not.include('beforeEach(() => {');
    });

    it('should exclude after hook code', () => {
      const tests = jestParser(fileAst, '', fileSource, { noHooks: true });
      // first test
      expect(tests[0].code).to.not.include('afterAll(() => {');
      // second test
      expect(tests[1].code).to.not.include('afterAll(() => {');
    });
  });

  context('test with --line-numbers option', () => {
    let fileSource, fileAst;

    before(() => {
      fileSource = fs.readFileSync('./example/jest/hooks.spec.js').toString();
      fileAst = parser.parse(source);
    });

    it('[lineNumbers=true opts] each section should include line-number as part of code section', () => {
      const tests = jestParser(fileAst, '', fileSource, { lineNumbers: true });
      // first test only
      expect(tests[0].code).to.include("14:     test('Vienna <3 veal', async () => {");
      expect(tests[0].code).to.include('15:         const { foods, pkg } = await generateWithPlugin({');
      // by default hooks include line number too
      expect(tests[0].code).to.include('9:     beforeEach(() => {');
      expect(tests[0].code).to.include('4:     beforeAll(() => {');
      expect(tests[0].code).to.include('30:     afterAll(() => {');
      // second test
      expect(tests[1].code).to.include("24:     test('San Juan <3 plantains', async () => {");
    });

    it('[no SET the lineNumbers opts] should exclude line-number', () => {
      const tests = jestParser(fileAst, '', fileSource);
      // first test only
      expect(tests[0].code).to.not.include("14:     test('Vienna <3 veal', async () => {");
      // no lines
      expect(tests[0].code).to.include("test('Vienna <3 veal', async () => {");
    });

    // multiple options
    it('[noHooks=true + lineNumbers=true opts] line-number as part of code section', () => {
      const tests = jestParser(fileAst, '', fileSource, { lineNumbers: true, noHooks: true });
      // first test only
      expect(tests[0].code).to.include("14:     test('Vienna <3 veal', async () => {");
      // no includes hook code
      expect(tests[0].code).to.not.include('4:     beforeAll(() => {');
    });
  });

  context('jest concurrent', () => {
    let fileSource, fileAst;

    before(() => {
      fileSource = fs.readFileSync('./example/jest/jest-concurrent.js').toString();
      fileAst = parser.parse(fileSource);
    });

    it('shuld parse it.concurrent', () => {
      const tests = jestParser(fileAst, '', fileSource, { lineNumbers: true });
      expect(tests[0].name).to.equal('it concurrent');
      expect(tests[0].code).to.include("it.concurrent('it concurrent', () => {});");
    });

    it('should parse test.concurrent', () => {
      const tests = jestParser(fileAst, '', fileSource, { lineNumbers: true });
      expect(tests[1].name).to.equal('test concurrent');
      expect(tests[1].code).to.include("test.concurrent('test concurrent', () => {});");
    });
  });

  context('ES2023 Explicit Resource Management tests', () => {
    let ermSource, ermAst;

    before(() => {
      ermSource = fs.readFileSync('./example/jest/erm.spec.ts').toString();
      // Parse with explicitResourceManagement plugin to support using keyword
      ermAst = parser.parse(ermSource, {
        sourceType: 'unambiguous',
        plugins: ['typescript', 'explicitResourceManagement'],
      });
    });

    it('should parse jest file with using keyword without errors', () => {
      expect(() => {
        jestParser(ermAst, 'example/jest/erm.spec.ts', ermSource);
      }).to.not.throw();
    });

    it('should find test with using declaration', () => {
      const tests = jestParser(ermAst, 'example/jest/erm.spec.ts', ermSource);

      expect(tests).to.have.lengthOf(1);
      expect(tests[0].name).to.equal('using works');
      expect(tests[0].suites).to.deep.equal(['ERM']);
    });

    it('should include code with using keyword', () => {
      const tests = jestParser(ermAst, 'example/jest/erm.spec.ts', ermSource);

      expect(tests[0].code).to.include('using r = getResource();');
      expect(tests[0].code).to.include('expect(1).toBe(1);');
      // [Symbol.dispose] is in the getResource function outside the test, so check source
      expect(ermSource).to.include('[Symbol.dispose]');
    });
  });
});
