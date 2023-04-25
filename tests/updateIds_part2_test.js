/* eslint-disable no-template-curly-in-string */
const { expect } = require('chai');
const path = require('path');
const mock = require('mock-fs');
const fs = require('fs');
const { updateIds, cleanIds } = require('../src/updateIds');
const Analyzer = require('../src/analyzer');

describe('update ids tests(part 2)', () => {
  afterEach(() => mock.restore());
 
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

  describe('[Playwright examples] groups of nested suites', () => {
    it('[ts file]: one inner suites', () => {
      const analyzer = new Analyzer('playwright', 'virtual_dir');
      analyzer.withTypeScript();
      require('@babel/core');

      const idMap = {
        tests: {
          'test case_1': '@T16a52b91',
        },
        suites: {
          'main suite 0': '@Sf3245a70',
          'inner suite1': '@Sf3246a71',
        },
      };

      mock({
        node_modules: mock.load(path.resolve(__dirname, '../node_modules')),
        virtual_dir: {
          'test.ts': `
          import { test, Page } from '@playwright/test';
          const URL = "https://todomvc.com/examples/vanilla-es6/";

          test.describe('main suite 0', () => {
            test.describe('inner suite1', () => {
              test.beforeAll(async () => {
                console.log("Before All");
              });
              test('test case_1', async ({ page }) => {
                const opts = {"a": 1, "b": 2};
  
                await test.step('[Check 1] Open page and confirm title', async () => {
                  await page.goto(URL);
                });
              });
            });
          });`,
        },
      });

      analyzer.analyze('test.ts');
      updateIds(analyzer.rawTests, idMap, 'virtual_dir', { typescript: true });

      const updatedFile = fs.readFileSync('virtual_dir/test.ts', 'utf-8').toString();
      
      //suite titles updates
      expect(updatedFile).to.include("test.describe('main suite 0 @Sf3245a70',");
      expect(updatedFile).to.include("test.describe('inner suite1 @Sf3246a71',");
      //test titles updates
      expect(updatedFile).to.include("test('test case_1 @T16a52b91',");
    });

    it('[ts file]: inner-inner suites', () => {
      const analyzer = new Analyzer('playwright', 'virtual_dir');
      analyzer.withTypeScript();
      require('@babel/core');

      const idMap = {
        tests: {
          'test case_1': '@T16a52b91',
          'test case_1.1': '@T16a52b911',
          'test case_2': '@T16a52b92',
        },
        suites: {
          'main suite': '@Sf3245a70',
          'inner suite1': '@Sf3246a71',
          'inner suite-1.1': '@Sf3246a711',
          'inner suite2': '@Sf3245a72',
        },
      };

      mock({
        node_modules: mock.load(path.resolve(__dirname, '../node_modules')),
        virtual_dir: {
          'test.ts': `
          import { test, Page } from '@playwright/test';
          const URL = "https://todomvc.com/examples/vanilla-es6/";

          test.describe('main suite', () => {
            test.describe('inner suite1', () => {
              test.beforeAll(async () => {
                console.log("Before All");
              });
              test('test case_1', async ({ page }) => {
                const opts = {"a": 1, "b": 2};
  
                await test.step('[Check 1] Open page and confirm title', async () => {
                  await page.goto(URL);
                });
              });
              test.describe('inner suite-1.1', () => {
                test('test case_1.1', async ({ page }) => {
          
                  await test.step('[Check 1.1] Open page and confirm title', async () => {
                    await page.goto(URL);
                  });
                });
              });
            });
            test.describe('inner suite2', () => {
              test.beforeEach(async () => {
                console.log("Before Each");
              });
              test('test case_2', async ({ page }) => {  
                await test.step('[Check 1] Open page and confirm title', async () => {
                  await page.goto(URL);
                });
              });
            });     
          });`,
        },
      });

      analyzer.analyze('test.ts');
      updateIds(analyzer.rawTests, idMap, 'virtual_dir', { typescript: true });

      const updatedFile = fs.readFileSync('virtual_dir/test.ts', 'utf-8').toString();

      //suite titles updates
      expect(updatedFile).to.include("test.describe('main suite @Sf3245a70',");
      expect(updatedFile).to.include("test.describe('inner suite1 @Sf3246a71',");
      expect(updatedFile).to.include("test.describe('inner suite-1.1 @Sf3246a711',");
      expect(updatedFile).to.include("test.describe('inner suite2 @Sf3245a72',");
      //test titles updates
      expect(updatedFile).to.include("test('test case_1 @T16a52b91', async ({ page })");
      expect(updatedFile).to.include("test('test case_1.1 @T16a52b911',");
      expect(updatedFile).to.include("test('test case_2 @T16a52b92'");
    });

    it('can remove ids from suites(inner nested case)', () => {
      let analyzer = new Analyzer('playwright', 'virtual_dir');
      analyzer.withTypeScript();
      require('@babel/core');

      const mockConfig = {
        node_modules: mock.load(path.resolve(__dirname, '../node_modules')),
        virtual_dir: {
          'test.ts': `
          import { test, Page } from '@playwright/test';
          const URL = "https://todomvc.com/examples/vanilla-es6/";

          test.describe('main suite @Sf3245a70', () => {
            test.describe('inner suite @Sf3246a71', () => {
              test.beforeAll(async () => {
                console.log("Before All");
              });
              test('test case @T16a52b91', async ({ page }) => {
                const opts = {"a": 1, "b": 2};
  
                await test.step('[Check 1] Open page and confirm title', async () => {
                  await page.goto(URL);
                });
              });
            });
          });`,
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

      analyzer = new Analyzer('playwright', 'virtual_dir');
      analyzer.withTypeScript();
      // save clean
      mock(mockConfig);

      const idMap = {
        tests: {
          'test case': '@T16a52b91',
        },
        suites: {
          'main suite': '@Sf3245a70',
          'inner suite': '@Sf3246a71',
        },
      };

      analyzer.analyze('test.ts');
      cleanIds(analyzer.rawTests, idMap, 'virtual_dir', {
        dangerous: false,
        typescript: true,
      });

      updatedFile = fs.readFileSync('virtual_dir/test.ts', 'utf-8').toString();

      expect(updatedFile).to.include("test.describe('main suite'");
      expect(updatedFile).to.include("test.describe('inner suite'");
      expect(updatedFile).not.to.include("@Sf3245a70");
      expect(updatedFile).not.to.include("@Sf3246a71");
      expect(updatedFile).not.to.include("@T16a52b91");
    });
  });
});
