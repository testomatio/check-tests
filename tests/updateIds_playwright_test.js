/* eslint-disable no-template-curly-in-string */
const { expect } = require('chai');
const path = require('path');
const mock = require('mock-fs');
const fs = require('fs');
const { updateIds } = require('../src/updateIds');
const Analyzer = require('../src/analyzer');

describe('update ids tests(playwright adapter)', () => {
  afterEach(() => mock.restore());

  describe('[Playwright examples] lines processing', () => {
    it('[ts file]: the same import name as suite name', () => {
      const analyzer = new Analyzer('playwright', 'virtual_dir');
      analyzer.withTypeScript();
      require('@babel/core');

      const idMap = {
        tests: {
          'Example test case #1': '@T1d6a52b9',
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
            test('Example test case #1', async ({ page }) => {
              const opts = {"a": 1, "b": 2};

              await test.step('[Check 1] Open Example page and confirm title', async () => {
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
      expect(updatedFile).to.include("test('Example test case #1 @T1d6a52b9'");
      expect(updatedFile).to.include("test.step('[Check 1] Open Example page and confirm title'");
    });

    it('[ts file]: test file without imports should update only suite & test name', () => {
      const analyzer = new Analyzer('playwright', 'virtual_dir');
      analyzer.withTypeScript();
      require('@babel/core');

      const idMap = {
        tests: {
          'Example test case #1.1': '@T1d6a52b911',
        },
        suites: {
          Example: '@Sf3d245a7',
        },
      };

      mock({
        node_modules: mock.load(path.resolve(__dirname, '../node_modules')),
        virtual_dir: {
          'test.ts': `
          let Example = 'test';

          test.describe('Example', () => {          
            test('Example test case #1.1', async ({ page }) => {
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

      expect(updatedFile).to.include("let Example = 'test';");
      expect(updatedFile).to.include("test.describe('Example @Sf3d245a7'");
      expect(updatedFile).to.include("test('Example test case #1.1 @T1d6a52b911'");
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
          let str = "some test case message";
          `,
        },
      });

      analyzer.analyze('test.js');

      updateIds(analyzer.rawTests, idMap, 'virtual_dir');

      const updatedFile = fs.readFileSync('virtual_dir/test.js').toString();

      expect(updatedFile).to.include("const Example2 = require('@src/Example1')");
      expect(updatedFile).to.include("var Example1 = require('@src/lib/Example2');");
      expect(updatedFile).to.include("test.describe('Example1 @Sf3d245a71'");
      expect(updatedFile).to.include("test('test case #2 @T1d6a52b11'");
      expect(updatedFile).to.include('let str = "some test case message";');
    });

    it('[js file]: suite name as a new line', () => {
      const analyzer = new Analyzer('playwright', 'virtual_dir');

      const idMap = {
        tests: {
          'test case #3': '@T1d6a52b119',
        },
        suites: {
          'suite name': '@Sf3d245a719',
        },
      };

      mock({
        virtual_dir: {
          'test.js': `
          const { test, expect } = require('@playwright/test');

          test.describe(
            'suite name',
            () => {          
            test('test case #3', async ({ page }) => {

              await test.step('[Check 1] Open page and confirm title', async () => {
                await page.goto("https://todomvc.com/examples/vanilla-es6/");
              });
            });
          });
          `,
        },
      });

      analyzer.analyze('test.js');

      updateIds(analyzer.rawTests, idMap, 'virtual_dir');

      const updatedFile = fs.readFileSync('virtual_dir/test.js').toString();

      expect(updatedFile).to.include("const { test, expect } = require('@playwright/test');");
      expect(updatedFile).to.include('test.describe(');
      expect(updatedFile).to.include("'suite name @Sf3d245a719',");
      expect(updatedFile).to.include("test('test case #3 @T1d6a52b119', async ({ page }) => {");
    });
  });
});
