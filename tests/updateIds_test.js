/* eslint-disable no-template-curly-in-string */
const { expect } = require('chai');
const path = require('path');
const mock = require('mock-fs');
const fs = require('fs');
const { updateIds, cleanIds } = require('../src/updateIds');
const Analyzer = require('../src/analyzer');

describe('update ids', () => {
  afterEach(() => mock.restore());

  describe('update-ids', () => {
    it('should update id by title', () => {
      const analyzer = new Analyzer('codeceptjs', 'virtual_dir');

      const idMap = {
        tests: {
          'simple test': '@T1d6a52b9',
        },
        suites: {
          'simple suite': '@Sf3d245a7',
        },
      };

      mock({
        virtual_dir: {
          'test.js': `
          Feature('simple suite')
          
          Scenario('simple test', async (I, TodosPage) => {
          })        
          `,
        },
      });

      analyzer.analyze('test.js');

      updateIds(analyzer.rawTests, idMap, 'virtual_dir');

      const updatedFile = fs.readFileSync('virtual_dir/test.js').toString();
      expect(updatedFile).to.include("Feature('simple suite @Sf3d245a7')");
      expect(updatedFile).to.include("Scenario('simple test @T1d6a52b9'");
    });

    it('should update id with tags by title', () => {
      const analyzer = new Analyzer('codeceptjs', 'virtual_dir');

      const idMap = {
        tests: {
          'simple test': '@T1d6a52b9',
          'simple suite#simple other test': '@T1d6a52b1',
        },
        suites: {
          'simple suite': '@Sf3d245a7',
        },
      };

      mock({
        virtual_dir: {
          'test.js': `
          Feature('simple suite @dev')

          Scenario('simple test @prod', async (I, TodosPage) => {
          })

          Scenario('simple other test @prod', async (I, TodosPage) => {
          })
          `,
        },
      });

      analyzer.analyze('test.js');

      updateIds(analyzer.rawTests, idMap, 'virtual_dir');

      const updatedFile = fs.readFileSync('virtual_dir/test.js').toString();
      expect(updatedFile).to.include("Feature('simple suite @dev @Sf3d245a7')");
      expect(updatedFile).to.include("Scenario('simple test @prod @T1d6a52b9'");
      expect(updatedFile).to.include("Scenario('simple other test @prod @T1d6a52b1'");
    });

    it('updates ids from server', () => {
      const analyzer = new Analyzer('codeceptjs', 'virtual_dir');

      const idMap = {
        tests: {
          'simple suite#simple test': '@T1d6a52b9',
        },
        suites: {
          'simple suite': '@Sf3d245a7',
        },
      };

      mock({
        virtual_dir: {
          'test.js': `
          Feature('simple suite')
          
          Scenario('simple test', async (I, TodosPage) => {
          })        
          `,
        },
      });

      analyzer.analyze('test.js');

      updateIds(analyzer.rawTests, idMap, 'virtual_dir');

      const updatedFile = fs.readFileSync('virtual_dir/test.js').toString();
      expect(updatedFile).to.include("Feature('simple suite @Sf3d245a7')");
      expect(updatedFile).to.include("Scenario('simple test @T1d6a52b9'");
    });

    it('ignore duplicates for ids from server', () => {
      const analyzer = new Analyzer('codeceptjs', 'virtual_dir');

      const idMap = {
        tests: {
          'simple suite#simple test': '@T09132a21',
        },
        suites: {
          'simple suite': '@S09132a21',
        },
      };

      mock({
        virtual_dir: {
          'test.js': `
          Feature('simple suite @Sf3d245a7')
          
          Scenario('simple test @T1d6a52b9', async (I, TodosPage) => {
          })        
          `,
        },
      });

      analyzer.analyze('test.js');

      updateIds(analyzer.rawTests, idMap, 'virtual_dir');

      const updatedFile = fs.readFileSync('virtual_dir/test.js').toString();
      expect(updatedFile).to.include("Feature('simple suite @Sf3d245a7')");
      expect(updatedFile).to.include("Scenario('simple test @T1d6a52b9'");
    });

    it('should not update other strings in file', () => {
      const analyzer = new Analyzer('codeceptjs', 'virtual_dir');

      const idMap = {
        tests: {
          'simple suite#simple test': '@T09132a21',
        },
        suites: {
          'simple suite': '@S09132a21',
        },
      };

      mock({
        virtual_dir: {
          'test.js': `
          const layer = 'simple suite';

          Feature('simple suite')
          
          Scenario('simple test', async (I, TodosPage) => {
          })        
          `,
        },
      });

      analyzer.analyze('test.js');

      updateIds(analyzer.rawTests, idMap, 'virtual_dir');

      const updatedFile = fs.readFileSync('virtual_dir/test.js').toString();
      expect(updatedFile).to.include("Feature('simple suite @S09132a21')");
      expect(updatedFile).to.include("const layer = 'simple suite';");
    });

    it('allows multi-line titles', () => {
      const analyzer = new Analyzer('codeceptjs', 'virtual_dir');

      const idMap = {
        tests: {
          'simple suite#simple test': '@T1d6a52b9',
        },
        suites: {
          'simple suite': '@Sf3d245a7',
        },
      };

      mock({
        virtual_dir: {
          'test.js': `
          Feature('simple suite')
          
          Scenario(
            'simple test', 
            async (I, TodosPage) => {
            })        
            `,
        },
      });

      analyzer.analyze('test.js');

      updateIds(analyzer.rawTests, idMap, 'virtual_dir');

      const updatedFile = fs.readFileSync('virtual_dir/test.js').toString();
      expect(updatedFile).to.include("Feature('simple suite @Sf3d245a7')");
      expect(updatedFile).to.include("'simple test @T1d6a52b9'");
    });

    it('respects string literals', () => {
      const idMap = {
        tests: {
          'simple suite#simple test': '@T1d6a52b9',
        },
        suites: {
          'simple suite': '@Sf3d245a7',
        },
      };

      const analyzer = new Analyzer('codeceptjs', 'virtual_dir2');
      mock({
        virtual_dir2: {
          'test.js': '\nFeature(`simple suite`)\n\nScenario(`simple test`, async ({ I }) => { I.doSomething() });',
        },
      });

      analyzer.analyze('test.js');

      updateIds(analyzer.rawTests, idMap, 'virtual_dir2');

      const updatedFile = fs.readFileSync('virtual_dir2/test.js', 'utf-8').toString();
      expect(updatedFile).to.include('Feature(`simple suite @Sf3d245a7`)');
      expect(updatedFile).to.include('Scenario(`simple test @T1d6a52b9`');
    });

    it('respects variables in string literals', () => {
      const idMap = {
        tests: {
          'simple suite#simple ${data} test': '@T1d6a52b9',
        },
        suites: {
          'simple suite': '@Sf3d245a7',
        },
      };

      const analyzer = new Analyzer('codeceptjs', 'virtual_dir');
      mock({
        virtual_dir: {
          'test.js':
            '\nFeature(`simple suite`)\nconst data = 1;\nScenario(`simple ${data} test`, async ({ I }) => { I.doSomething() });',
        },
      });

      analyzer.analyze('test.js');

      updateIds(analyzer.rawTests, idMap, 'virtual_dir');

      const updatedFile = fs.readFileSync('virtual_dir/test.js', 'utf-8').toString();
      expect(updatedFile).to.include('Feature(`simple suite @Sf3d245a7`)');
      expect(updatedFile).to.include('Scenario(`simple ${data} test @T1d6a52b9`');
    });

    it('respects variables in string literals and JSON report mode', () => {
      const idMap = {
        tests: {
          "simple suite#simple ${data} test | { 'user': 'bob' }": '@T1d6a52b9',
        },
        suites: {
          'simple suite': '@Sf3d245a7',
        },
      };

      const analyzer = new Analyzer('codeceptjs', 'virtual_dir');
      mock({
        virtual_dir: {
          'test.js':
            "\nFeature(`simple suite`)\nconst data = 1;\nScenario(`simple ${data} test | { 'user': 'bob' }`, async ({ I }) => { I.doSomething() });",
        },
      });

      analyzer.analyze('test.js');

      updateIds(analyzer.rawTests, idMap, 'virtual_dir');

      const updatedFile = fs.readFileSync('virtual_dir/test.js', 'utf-8').toString();
      expect(updatedFile).to.include('Feature(`simple suite @Sf3d245a7`)');
      expect(updatedFile).to.include("Scenario(`simple ${data} test @T1d6a52b9 | { 'user': 'bob' }`");
    });

    it('respects variables in string literals in double param and JSON report mode', () => {
      const idMap = {
        tests: {
          "simple suite#simple ${data} and ${data2} test | { 'user': 'bob' }": '@T1d6a52b9',
        },
        suites: {
          'simple suite': '@Sf3d245a7',
        },
      };

      const analyzer = new Analyzer('codeceptjs', 'virtual_dir');
      mock({
        virtual_dir: {
          'test.js':
            "\nFeature(`simple suite`)\nconst data = 1;\n[].each((data2) => Scenario(`simple ${data} and ${data2} test | { 'user': 'bob' }`, async ({ I }) => { I.doSomething() }));",
        },
      });

      analyzer.analyze('test.js');

      updateIds(analyzer.rawTests, idMap, 'virtual_dir');

      const updatedFile = fs.readFileSync('virtual_dir/test.js', 'utf-8').toString();
      expect(updatedFile).to.include('Feature(`simple suite @Sf3d245a7`)');
      expect(updatedFile).to.include("Scenario(`simple ${data} and ${data2} test @T1d6a52b9 | { 'user': 'bob' }`");
    });

    it('works ok with empty files', () => {
      const idMap = {
        tests: {
          "simple suite#simple   test | { 'user': 'bob' }": '@T1d6a52b9',
        },
        suites: {
          'simple suite': '@Sf3d245a7',
        },
      };

      const analyzer = new Analyzer('codeceptjs', 'virtual_dir');
      mock({
        virtual_dir: {
          'test.js': '\n// here was a test',
        },
      });

      updateIds(analyzer.rawTests, idMap, 'virtual_dir');

      const updatedFile = fs.readFileSync('virtual_dir/test.js', 'utf-8').toString();
      expect(updatedFile).to.include('// here was a test');
    });

    it('supports typescript', () => {
      const analyzer = new Analyzer('cypress.io', 'virtual_dir');
      analyzer.withTypeScript();
      require('@babel/core');

      const idMap = {
        tests: {
          'simple suite#simple test': '@T1d6a52b9',
        },
        suites: {
          'simple suite': '@Sf3d245a7',
        },
      };

      mock({
        node_modules: mock.load(path.resolve(__dirname, '../node_modules')),
        virtual_dir: {
          'test.ts': `
          describe("simple suite", function () {
            let ctx: TestBankAccountsCtx = {};
          
            beforeEach(function () {
              cy.task("db:seed");
            });
          
            it("simple test", function () {
              const { id: userId } = ctx.authenticatedUser!;
              cy.request("GET", \`\${apiBankAccounts}\`).then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body.results[0].userId).to.eq(userId);
              });
            });
          });`,
        },
      });

      analyzer.analyze('test.ts');
      updateIds(analyzer.rawTests, idMap, 'virtual_dir', { typescript: true });

      const updatedFile = fs.readFileSync('virtual_dir/test.ts').toString();
      expect(updatedFile).to.include('simple test @T1d6a52b9');
      expect(updatedFile).to.include('simple suite @Sf3d245a7');
    });

    it('supports typescript with types', () => {
      const analyzer = new Analyzer('cypress.io', 'virtual_dir');
      analyzer.withTypeScript();
      require('@babel/core');

      const idMap = {
        tests: {
          'simple suite#simple test': '@T1d6a52b9',
        },
        suites: {
          'simple suite': '@Sf3d245a7',
        },
      };

      mock({
        node_modules: mock.load(path.resolve(__dirname, '../node_modules')),
        virtual_dir: {
          'test.ts': `
          describe("simple suite", function () {
            let ctx: TestBankAccountsCtx = {};
          
            it("simple test", function () {
              const user: string = "user";
            });
          });`,
        },
      });

      analyzer.analyze('test.ts');
      updateIds(analyzer.rawTests, idMap, 'virtual_dir', { typescript: true });

      const updatedFile = fs.readFileSync('virtual_dir/test.ts').toString();
      expect(updatedFile).to.include('simple test @T1d6a52b9');
      expect(updatedFile).to.include('simple suite @Sf3d245a7');
      expect(updatedFile).to.include('const user: string = "user";');
      expect(updatedFile).to.include('ctx: TestBankAccountsCtx = {}');
    });
  });

  describe('clean-ids', () => {
    it('cleans up ids from strings', () => {
      const idMap = {
        tests: {
          'simple  test': '@T1d6a52b9',
        },
        suites: {
          'simple suite': '@Sf3d245a7',
        },
      };

      const analyzer = new Analyzer('codeceptjs', 'virtual_dir');
      mock({
        virtual_dir: {
          'test.js':
            "\nFeature('simple suite @Sf3d245a7')\nconst data = 1;\nScenario('simple test @T1d6a52b9', async ({ I }) => { I.doSomething() });",
        },
      });

      analyzer.analyze('test.js');

      cleanIds(analyzer.rawTests, idMap, 'virtual_dir');

      const updatedFile = fs.readFileSync('virtual_dir/test.js', 'utf-8').toString();
      expect(updatedFile).to.include("Feature('simple suite')");
      expect(updatedFile).to.include("Scenario('simple test'");
    });

    it('cleans up ids from string literals', () => {
      const idMap = {
        tests: {
          'simple  test': '@T1d6a52b9',
        },
        suites: {
          'simple suite': '@Sf3d245a7',
        },
      };

      const analyzer = new Analyzer('codeceptjs', 'virtual_dir');
      mock({
        virtual_dir: {
          'test.js':
            '\nFeature(`simple suite @Sf3d245a7`)\nconst data = 1;\nScenario(`simple ${data} test @T1d6a52b9`, async ({ I }) => { I.doSomething() });',
        },
      });

      analyzer.analyze('test.js');

      cleanIds(analyzer.rawTests, idMap, 'virtual_dir');

      const updatedFile = fs.readFileSync('virtual_dir/test.js', 'utf-8').toString();
      expect(updatedFile).to.include('Feature(`simple suite`)');
      expect(updatedFile).to.include('Scenario(`simple ${data} test`');
    });

    it('unsafely cleans up ids from string literals', () => {
      const analyzer = new Analyzer('codeceptjs', 'virtual_dir');
      mock({
        virtual_dir: {
          'test.js':
            '\nFeature(`simple suite @Sf3d245a7`)\nconst data = 1;\nScenario(`simple ${data} test @T1d6a52b9`, async ({ I }) => { I.doSomething() });',
        },
      });

      analyzer.analyze('test.js');

      cleanIds(analyzer.rawTests, {}, 'virtual_dir', { dangerous: true });

      const updatedFile = fs.readFileSync('virtual_dir/test.js', 'utf-8').toString();
      expect(updatedFile).to.include('Feature(`simple suite`)');
      expect(updatedFile).to.include('Scenario(`simple ${data} test`');
    });

    it('can remove ids from typescript', () => {
      let analyzer = new Analyzer('cypress.io', 'virtual_dir');
      analyzer.withTypeScript();
      require('@babel/core');

      const mockConfig = {
        node_modules: mock.load(path.resolve(__dirname, '../node_modules')),
        virtual_dir: {
          'test.ts': `describe("simple suite @Sf3d245a7", function () {
            beforeEach(function () {
              cy.task("db:seed");
              cy.server();
            });
            it("simple test @T1d6a52b9", function () {
              cy.visit("/personal");
              cy.location("pathname").should("equal", "/signin");
              cy.percySnapshot("Redirect to SignIn");
            });
          })`,
        },
      };

      // unsafe clean
      mock(mockConfig);

      analyzer.analyze('test.ts');
      cleanIds(analyzer.rawTests, {}, 'virtual_dir', {
        dangerous: true,
        typescript: true,
      });

      let updatedFile = fs.readFileSync('virtual_dir/test.ts', 'utf-8').toString();

      expect(updatedFile).to.include('describe("simple suite"');
      expect(updatedFile).to.include('it("simple test"');
      expect(updatedFile).not.to.include('@T1d6a52b9');

      analyzer = new Analyzer('cypress.io', 'virtual_dir');
      analyzer.withTypeScript();
      // save clean
      mock(mockConfig);

      const idMap = {
        tests: {
          'simple suite#simple test': '@T1d6a52b9',
        },
        suites: {
          'simple suite': '@Sf3d245a7',
        },
      };

      analyzer.analyze('test.ts');
      cleanIds(analyzer.rawTests, idMap, 'virtual_dir', {
        dangerous: false,
        typescript: true,
      });

      updatedFile = fs.readFileSync('virtual_dir/test.ts', 'utf-8').toString();

      expect(updatedFile).to.include('describe("simple suite"');
      expect(updatedFile).to.include('it("simple test"');
      expect(updatedFile).not.to.include('@T1d6a52b9');
    });
  });

  describe('[Playwright examples] lines processing', () => {
    it('[ts file]: the same import name as suite name', () => {
      const analyzer = new Analyzer('playwright', 'virtual_dir');
      analyzer.withTypeScript();
      require('@babel/core');

      const idMap = {
        tests: {
          'test case #1': '@T1d6a52b9',
        },
        suites: {
          Example: '@Sf3d245a7',
        },
      };

      mock({
        node_modules: mock.load(path.resolve(__dirname, '../node_modules')),
        virtual_dir: {
          'test.ts': `
          import { test, page } from '@playwright/test';
          import Example from '@src/Example';

          const userId = 1;

          test.describe('Example', () => {          
            test('test case #1', async ({ page }) => {
              const opts = {"a": 1, "b": 2};

              await test.step('[Check 1] Open page and confirm title', async () => {
                await page.goto("https://todomvc.com/examples/vanilla-es6/");
              });
            });
          });`,
        },
      });

      analyzer.analyze('test.ts');
      updateIds(analyzer.rawTests, idMap, 'virtual_dir', { typescript: true });

      const updatedFile = fs.readFileSync('virtual_dir/test.ts', 'utf-8').toString();

      expect(updatedFile).to.include("import { test, page } from '@playwright/test';");
      expect(updatedFile).to.include("import Example from '@src/Example';");
      expect(updatedFile).to.include("test.describe('Example @Sf3d245a7'");
      expect(updatedFile).to.include('test case #1 @T1d6a52b9');
    });

    it('[ts file]: test file without imports should update only suite & test name', () => {
      const analyzer = new Analyzer('playwright', 'virtual_dir');
      analyzer.withTypeScript();
      require('@babel/core');

      const idMap = {
        tests: {
          'test case #1.1': '@T1d6a52b911',
        },
        suites: {
          Example: '@Sf3d245a7',
        },
      };

      mock({
        node_modules: mock.load(path.resolve(__dirname, '../node_modules')),
        virtual_dir: {
          'test.ts': `
          const suite = "test";

          test.describe('Example', () => {          
            test('test case #1.1', async ({ page }) => {
              let myVar = "msg";

              await test.step('[Check 1] Open page and confirm title', async () => {
                await page.goto("https://todomvc.com/examples/vanilla-es6/");
              });
            });
          });`,
        },
      });

      analyzer.analyze('test.ts');
      updateIds(analyzer.rawTests, idMap, 'virtual_dir', { typescript: true });

      const updatedFile = fs.readFileSync('virtual_dir/test.ts', 'utf-8').toString();

      expect(updatedFile).to.include("test.describe('Example @Sf3d245a7'");
      expect(updatedFile).to.include('test case #1.1 @T1d6a52b911');
    });

    it('[js file]: the same require name as suite name', () => {
      const analyzer = new Analyzer('playwright', 'virtual_dir');

      const idMap = {
        tests: {
          'test case #2': '@T1d6a52b11',
        },
        suites: {
          Example1: '@Sf3d245a71',
        },
      };

      mock({
        virtual_dir: {
          'test.js': `
          const { test, expect } = require('@playwright/test');
          const Example2 = require('@src/Example1');
          var Example1 = require('@src/lib/Example2');

          test.describe('Example1', () => {          
            test('test case #2', async ({ page }) => {

              await test.step('[Check 1] Open page and confirm title', async () => {
                await page.goto("https://todomvc.com/examples/vanilla-es6/");
              });
            });
          });
          let msg = "some test case message";
          `,
        },
      });

      analyzer.analyze('test.js');

      updateIds(analyzer.rawTests, idMap, 'virtual_dir');

      const updatedFile = fs.readFileSync('virtual_dir/test.js').toString();
      expect(updatedFile).to.include("var Example1 = require('@src/lib/Example2');");
      expect(updatedFile).to.include("test.describe('Example1 @Sf3d245a71'");
      expect(updatedFile).to.include('test case #2 @T1d6a52b11');
    });
  });
});
