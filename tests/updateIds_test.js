/* eslint-disable no-template-curly-in-string */
const { expect } = require('chai');
const fs = require('fs');
const { updateIds, cleanIds } = require('../src/updateIds');
const Analyzer = require('../src/analyzer');

describe('update ids', () => {
  before(() => {
    if (!fs.existsSync('virtual_dir')) fs.mkdirSync('virtual_dir');
  });

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

      fs.writeFileSync(
        './virtual_dir/test.js',
        `
          Feature('simple suite')
          
          Scenario('simple test', async (I, TodosPage) => {
          })        
          `,
      );

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

      fs.writeFileSync(
        './virtual_dir/test.js',
        `
          Feature('simple suite @dev')

          Scenario('simple test @prod', async (I, TodosPage) => {
          })

          Scenario('simple other test @prod', async (I, TodosPage) => {
          })
          `,
      );

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

      fs.writeFileSync(
        './virtual_dir/test.js',
        `
          Feature('simple suite')
          
          Scenario('simple test', async (I, TodosPage) => {
          })        
          `,
      );

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

      fs.writeFileSync(
        './virtual_dir/test.js',
        `
        Feature('simple suite @Sf3d245a7')
        
        Scenario('simple test @T1d6a52b9', async (I, TodosPage) => {
        })        
        `,
      );

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

      fs.writeFileSync(
        './virtual_dir/test.js',
        `
          const layer = 'simple suite';

          Feature('simple suite')
          
          Scenario('simple test', async (I, TodosPage) => {
          })        
          `,
      );

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

      fs.writeFileSync(
        './virtual_dir/test.js',
        `
          Feature('simple suite')
          
          Scenario(
            'simple test', 
            async (I, TodosPage) => {
            })        
            `,
      );

      analyzer.analyze('test.js');

      updateIds(analyzer.rawTests, idMap, 'virtual_dir');

      const updatedFile = fs.readFileSync('virtual_dir/test.js').toString();
      expect(updatedFile).to.include("Feature('simple suite @Sf3d245a7')");
      expect(updatedFile).to.include("'simple test @T1d6a52b9'");
    });

    it('respects string literals', () => {
      if (!fs.existsSync('virtual_dir2')) fs.mkdirSync('virtual_dir2');

      const idMap = {
        tests: {
          'simple suite#simple test': '@T1d6a52b9',
        },
        suites: {
          'simple suite': '@Sf3d245a7',
        },
      };

      const analyzer = new Analyzer('codeceptjs', 'virtual_dir2');
      fs.writeFileSync(
        './virtual_dir2/test.js',
        '\nFeature(`simple suite`)\n\nScenario(`simple test`, async ({ I }) => { I.doSomething() });',
      );

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
      fs.writeFileSync(
        './virtual_dir/test.js',
        '\nFeature(`simple suite`)\nconst data = 1;\nScenario(`simple ${data} test`, async ({ I }) => { I.doSomething() });',
      );

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
      fs.writeFileSync(
        './virtual_dir/test.js',
        "\nFeature(`simple suite`)\nconst data = 1;\nScenario(`simple ${data} test | { 'user': 'bob' }`, async ({ I }) => { I.doSomething() });",
      );

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
      fs.writeFileSync(
        './virtual_dir/test.js',
        "\nFeature(`simple suite`)\nconst data = 1;\n[].each((data2) => Scenario(`simple ${data} and ${data2} test | { 'user': 'bob' }`, async ({ I }) => { I.doSomething() }));",
      );

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
      fs.writeFileSync('./virtual_dir/test.js', '\n// here was a test');

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

      fs.writeFileSync(
        './virtual_dir/test.ts',
        `
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
      );

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

      fs.writeFileSync(
        './virtual_dir/test.ts',
        `
          describe("simple suite", function () {
            let ctx: TestBankAccountsCtx = {};
          
            it("simple test", function () {
              const user: string = "user";
            });
          });`,
      );

      analyzer.analyze('test.ts');
      updateIds(analyzer.rawTests, idMap, 'virtual_dir', { typescript: true });

      const updatedFile = fs.readFileSync('virtual_dir/test.ts').toString();
      expect(updatedFile).to.include('simple test @T1d6a52b9');
      expect(updatedFile).to.include('simple suite @Sf3d245a7');
      expect(updatedFile).to.include('const user: string = "user";');
      expect(updatedFile).to.include('ctx: TestBankAccountsCtx = {}');
    });

    it('should not reformat the Array code with --typescript option', () => {
      const analyzer = new Analyzer('jest', 'virtual_dir');
      analyzer.withTypeScript();
      require('@babel/core');

      const idMap = {
        tests: {
          'simple test': '@T1d6a52b9',
        },
        suites: {
          'simple suite': '@Sf3d245a1',
        },
      };

      fs.writeFileSync(
        './virtual_dir/test.ts',
        `
        const isEven = (n: number): boolean => n % 2 === 0;
    
        const cases: Array<[number, boolean]> = [
          [10, true],
          [11, true],
          [12, false]
        ];
    
        describe("simple suite", function () {
        
          it("simple test", function () {
          cases.forEach(el => {
            expect(isEven(el[0])).toBe(el[1]);
          });
          });
        });`,
      );

      analyzer.analyze('test.ts');
      updateIds(analyzer.rawTests, idMap, 'virtual_dir', { typescript: true });

      const updatedFile = fs.readFileSync('virtual_dir/test.ts').toString();

      expect(updatedFile).to.include('const cases: Array<[number, boolean]> = [\n');
      expect(updatedFile).to.include('[10, true],\n');
      expect(updatedFile).to.include('[11, true],\n');
      expect(updatedFile).to.include('[12, false]\n');
      expect(updatedFile).to.include('];\n');

      expect(updatedFile).to.include('simple suite @Sf3d245a1');
      expect(updatedFile).to.include('simple test @T1d6a52b9');
    });

    it('should update nested scenarios', () => {
      const analyzer1 = new Analyzer('mocha', 'virtual_dir');
      const analyzer2 = new Analyzer('mocha', 'virtual_dir');

      const idMap1 = {
        tests: {
          'test1.js#Login API by username#Login API should give valid response': '@T2d6a52b9',
          'test1.js#Create API test cases#Create API test cases': '@T9ca4cb86',
          'test1.js#Delete API test cases#Create API test cases': '@T23322b0f',
        },
        suites: {
          'test1.js#Login API by username': '@Secf29ed4',
          'test1.js#Create API test cases': '@S63dfea36',
          'test1.js#Delete API test cases': '@S0e1abeb1',
        },
      };

      const idMap2 = {
        tests: {
          'test2.js#Login API by username#Login API should give valid response': '@T1d6a52b8',
          'test2.js#Create API test cases#Create API test cases': '@T7ca4cb35',
          'test2.js#Delete API test cases#Create API test cases': '@T22233b0f',
        },
        suites: {
          'test2.js#Login API by username': '@Secf29ed9',
          'test2.js#Create API test cases': '@S63dfea38',
          'test2.js#Delete API test cases': '@S0e1abeb3',
        },
      };

      // Write test1.js
      fs.writeFileSync(
        './virtual_dir/test1.js',
        `describe('Login API by username', () => {
          it('Login API should give valid response', () => {
            // TODO: Add test logic here
          });
        });

        describe('Create API test cases', () => {
          it('Create API test cases', () => {
            // TODO: Add test logic here
          });
        });

        describe('Delete API test cases', () => {
          it('Create API test cases', () => {
            // TODO: Add test logic here
          });
        });
      `,
      );

      // Write test2.js
      fs.writeFileSync(
        './virtual_dir/test2.js',
        `describe('Login API by username', () => {
          it('Login API should give valid response', () => {
            // TODO: Add test logic here
          });
        });

        describe('Create API test cases', () => {
          it('Create API test cases', () => {
            // TODO: Add test logic here
          });
        });

        describe('Delete API test cases', () => {
          it('Create API test cases', () => {
            // TODO: Add test logic here
          });
        });
      `,
      );

      analyzer1.analyze('test1.js');
      analyzer2.analyze('test2.js');

      updateIds(analyzer1.rawTests, idMap1, 'virtual_dir');
      updateIds(analyzer2.rawTests, idMap2, 'virtual_dir');

      const updatedFile1 = fs.readFileSync('virtual_dir/test1.js').toString();
      expect(updatedFile1).to.include("describe('Login API by username @Secf29ed4'");
      expect(updatedFile1).to.include("it('Login API should give valid response @T2d6a52b9'");
      expect(updatedFile1).to.include("describe('Create API test cases @S63dfea36'");
      expect(updatedFile1).to.include("it('Create API test cases @T9ca4cb86'");
      expect(updatedFile1).to.include("describe('Delete API test cases @S0e1abeb1'");
      expect(updatedFile1).to.include("it('Create API test cases @T23322b0f'");

      const updatedFile2 = fs.readFileSync('virtual_dir/test2.js').toString();
      expect(updatedFile2).to.include("describe('Login API by username @Secf29ed9'");
      expect(updatedFile2).to.include("it('Login API should give valid response @T1d6a52b8'");
      expect(updatedFile2).to.include("describe('Create API test cases @S63dfea38'");
      expect(updatedFile2).to.include("it('Create API test cases @T7ca4cb35'");
      expect(updatedFile2).to.include("describe('Delete API test cases @S0e1abeb3'");
      expect(updatedFile2).to.include("it('Create API test cases @T22233b0f'");
    });

    it('should update ids based on filename for suites with included nested suites', () => {
      const analyzer = new Analyzer('mocha', 'virtual_dir');

      const idMap = {
        tests: {
          'test_included.j#Simple included suite#1. First included test': '@T47c6e680',
          'Simple included suite#1. First included test': '@T47c6e680',
          '1. First included test': '@T47c6e680',
          'test_included.j#Simple suite and default values#1. First test': '@T96cd1c70',
          'Simple suite and default values#1. First test': '@T96cd1c70',
          '1. First test': '@T96cd1c70',
          'test_included.j#Simple included suite#2. Second included test': '@Tda299d22',
          'Simple included suite#2. Second included test': '@Tda299d22',
          '2. Second included test': '@Tda299d22',
          'test_included.j#Simple suite and default values#2. Second test': '@T9c32c073',
          'Simple suite and default values#2. Second test': '@T9c32c073',
          '2. Second test': '@T9c32c073',
          'test_included.j#Simple included suite#3. Third included test': '@T1ad7596b',
          'Simple included suite#3. Third included test': '@T1ad7596b',
          '3. Third included test': '@T1ad7596b',
          'test_included.j#Simple suite and default values#3. Third test': '@T68f84b8e',
          'Simple suite and default values#3. Third test': '@T68f84b8e',
          '3. Third test': '@T68f84b8e',
        },
        suites: {
          'test_included.js#Simple included suite': '@S4f1651cf',
          'Simple included suite': '@S4f1651cf',
          'test_included.js#Simple suite and default values': '@S0a0cd701',
          'Simple suite and default values': '@S0a0cd701',
        },
      };

      // Write test1.js
      fs.writeFileSync(
        './virtual_dir/test_included.js',
        `describe('Simple suite and default values', function () {
            it('1. First test', function () {
            });
            it('2. Second test', function () {
            });
            it('3. Third test', function () {
            });
            describe('Simple included suite', function () {
                it('1. First included test', function () {
                });
                it('2. Second included test', function () {
                });
                it('3. Third included test', function () {
                });
            });
        });`,
      );

      // Analyze both files
      analyzer.analyze('test_included.js');
      // Update IDs for both files
      updateIds(analyzer.rawTests, idMap, 'virtual_dir');

      // Read and validate updated test1.js
      const updatedFile1 = fs.readFileSync('virtual_dir/test_included.js').toString();
      expect(updatedFile1).to.include("describe('Simple suite and default values @S0a0cd701'");
      expect(updatedFile1).to.include("it('1. First test @T96cd1c70'");
      expect(updatedFile1).to.include("it('2. Second test @T9c32c073'");
      expect(updatedFile1).to.include("it('3. Third test @T68f84b8e'");
      expect(updatedFile1).to.include("describe('Simple included suite @S4f1651cf'");
      expect(updatedFile1).to.include("it('1. First included test @T47c6e680'");
      expect(updatedFile1).to.include("it('2. Second included test @Tda299d22'");
      expect(updatedFile1).to.include("it('3. Third included test @T1ad7596b'");
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
      fs.writeFileSync(
        './virtual_dir/test.js',
        "\nFeature('simple suite @Sf3d245a7')\nconst data = 1;\nScenario('simple test @T1d6a52b9', async ({ I }) => { I.doSomething() });",
      );

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
      fs.writeFileSync(
        './virtual_dir/test.js',
        '\nFeature(`simple suite @Sf3d245a7`)\nconst data = 1;\nScenario(`simple ${data} test @T1d6a52b9`, async ({ I }) => { I.doSomething() });',
      );

      analyzer.analyze('test.js');

      cleanIds(analyzer.rawTests, idMap, 'virtual_dir');

      const updatedFile = fs.readFileSync('virtual_dir/test.js', 'utf-8').toString();
      expect(updatedFile).to.include('Feature(`simple suite`)');
      expect(updatedFile).to.include('Scenario(`simple ${data} test`');
    });

    it('unsafely cleans up ids from string literals', () => {
      const analyzer = new Analyzer('codeceptjs', 'virtual_dir');
      fs.writeFileSync(
        './virtual_dir/test.js',
        '\nFeature(`simple suite @Sf3d245a7`)\nconst data = 1;\nScenario(`simple ${data} test @T1d6a52b9`, async ({ I }) => { I.doSomething() });',
      );

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

      fs.writeFileSync(
        './virtual_dir/test.js',
        `describe("simple suite @Sf3d245a7", function () {
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
      );

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
});
