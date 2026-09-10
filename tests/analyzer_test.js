const { expect } = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Analyzer = require('../src/analyzer');

let analyzer;

describe('analyzer', () => {
  it('can import analyzer from main index', () => {
    const { Analyzer } = require('../src');
    expect(Analyzer).not.to.be.undefined;
  });

  it('should parse all mocha files', () => {
    analyzer = new Analyzer('mocha', path.join(__dirname, '..'));
    analyzer.analyze('./example/mocha/**_test.js');

    const stats = analyzer.getStats();
    const actualTests = stats.tests;
    const skippedTests = stats.skipped;
    const decorator = analyzer.getDecorator();

    const skippedTestsLineNumbers = decorator.tests.filter(t => t.skipped).map(t => t.line);
    expect(decorator.getSuiteNames()).to.include('Math');

    expect(actualTests).to.include('Math: should test if 3*3 = 9');
    expect(actualTests, 'commented').to.not.include('Math: should test (3-4)*8 SHOULD EQUAL -8');
    expect(skippedTests, 'commented').to.not.include('Math: should test (3-4)*8 SHOULD EQUAL -8');
    expect(skippedTests, 'xit').to.include('Math: should be clone');
    expect(skippedTests, 'it.skip').to.include('Math: should be second clone');
    expect(skippedTests, 'describe.skip').to.include('Math: NoMath: should be disabled');
    expect(skippedTestsLineNumbers).to.include(14);
    expect(skippedTestsLineNumbers).to.include(19);
    expect(skippedTestsLineNumbers).to.include(25);
    // assert.equal(tests.length, 3);
  });

  it('should parse all typescript files', () => {
    analyzer = new Analyzer('mocha', path.join(__dirname, '..'));
    analyzer.withTypeScript();
    analyzer.analyze('./example/protractor/**.ts');
    const decorator = analyzer.getDecorator();
    expect(decorator.getSuiteNames()).to.include('Login - Global Header: Institutional Sign In Modal');
  });

  it('should exclude dir in file name if dir specified', () => {
    analyzer = new Analyzer('mocha', 'example');
    analyzer.analyze('mocha/**_test.js');

    const tests = analyzer.getDecorator().getTests();
    expect(tests.length).to.be.above(0);
    expect(tests[0].file.startsWith('mocha/')).to.be.true;
  });

  it('should include full dir in file name', () => {
    analyzer = new Analyzer('mocha');
    analyzer.analyze('example/mocha/**_test.js');

    const tests = analyzer.getDecorator().getTests();
    expect(tests.length).to.be.above(0);
    expect(tests[0].file.startsWith('example')).to.be.true;
  });

  it('should avoid node_modules', () => {
    analyzer = new Analyzer('mocha', path.join(__dirname, '..'));
    analyzer.analyze('./example/dummy/**_test.js');

    const stats = analyzer.getStats();
    const actualTests = stats.tests;
    const skippedTests = stats.skipped;
    const decorator = analyzer.getDecorator();

    const skippedTestsLineNumbers = decorator.tests.filter(t => t.skipped).map(t => t.line);
    expect(decorator.getSuiteNames()).to.include('Math');
    expect(decorator.getSuiteNames()).to.not.include('Empty');

    expect(actualTests).to.include('Math: should test');
    expect(actualTests).to.not.include('Empty: should test');
  });

  it('should read ` char', () => {
    analyzer = new Analyzer('mocha', path.join(__dirname, '..'));
    analyzer.analyze('./example/dummy/string_spec.js');

    const stats = analyzer.getStats();
    const actualTests = stats.tests;
    const skippedTests = stats.skipped;
    const decorator = analyzer.getDecorator();

    const skippedTestsLineNumbers = decorator.tests.filter(t => t.skipped).map(t => t.line);
    expect(decorator.getSuiteNames()).to.include('Feature');

    expect(actualTests).to.include('Feature: should test');
    expect(skippedTests).to.include('Feature: should skip');
  });

  it('should not load dirs as files', () => {
    analyzer = new Analyzer('mocha', path.join(__dirname, '..'));
    analyzer.analyze('./example/dummy/**.js');

    const stats = analyzer.getStats();
    const actualTests = stats.tests;
    const skippedTests = stats.skipped;
    const decorator = analyzer.getDecorator();

    const skippedTestsLineNumbers = decorator.tests.filter(t => t.skipped).map(t => t.line);
    expect(decorator.getSuiteNames()).to.include('Math');
  });

  it('should exclude files matching exclude pattern', () => {
    analyzer = new Analyzer('mocha', path.join(__dirname, '..'), { exclude: 'example/dummy/**' });
    analyzer.analyze('./example/**/*.js');

    const stats = analyzer.getStats();
    const files = stats.files;
    const decorator = analyzer.getDecorator();

    // Should not include files from dummy directory
    const dummyFiles = files.filter(file => file.includes('dummy'));
    expect(dummyFiles).to.have.length(0);

    // Should still include other example files (check for mocha directory in absolute paths)
    const mochaFiles = files.filter(file => file.includes('\\mocha\\') || file.includes('/mocha/'));
    expect(mochaFiles.length).to.be.above(0);
  });

  it('should exclude specific file patterns', () => {
    analyzer = new Analyzer('mocha', path.join(__dirname, '..'), { exclude: 'example/**/index_test.js' });
    analyzer.analyze('./example/**/*.js');

    const stats = analyzer.getStats();
    const files = stats.files;

    // Should not include any index_test.js files
    const indexTestFiles = files.filter(file => file.includes('index_test.js'));
    expect(indexTestFiles).to.have.length(0);

    // Should still include other test files
    expect(files.length).to.be.above(0);
  });

  it('should work without exclude option', () => {
    const analyzerWithoutExclude = new Analyzer('mocha', path.join(__dirname, '..'));
    analyzerWithoutExclude.analyze('./example/dummy/**_test.js');

    const analyzerWithExclude = new Analyzer('mocha', path.join(__dirname, '..'), {
      exclude: 'example/dummy/node_modules/**',
    });
    analyzerWithExclude.analyze('./example/dummy/**_test.js');

    const statsWithoutExclude = analyzerWithoutExclude.getStats();
    const statsWithExclude = analyzerWithExclude.getStats();

    // Should have same number of tests when excluding node_modules (which has no real tests anyway)
    expect(statsWithExclude.tests.length).to.equal(statsWithoutExclude.tests.length);
  });

  context('env variable params', () => {
    beforeEach(() => {
      process.env.TESTOMATIO_PREPEND_DIR = 'MyTests';
    });

    afterEach(() => {
      process.env.TESTOMATIO_PREPEND_DIR = null;
    });

    it('should prepend a dir from env variable', () => {
      analyzer = new Analyzer('mocha', path.join(__dirname, '..'));
      analyzer.analyze('./example/dummy/**_test.js');
      const tests = analyzer.getDecorator().tests;
      expect(tests[0].file)
        .to.be.a('string')
        .and.satisfy(msg => msg.startsWith(''));
    });
  });

  it('should parse TypeScript files with ES2023 Explicit Resource Management', () => {
    analyzer = new Analyzer('jest', path.join(__dirname, '..'));
    analyzer.withTypeScript();
    analyzer.analyze('example/jest/erm.spec.ts');

    const stats = analyzer.getStats();
    const decorator = analyzer.getDecorator();
    const actualTests = stats.tests;

    expect(actualTests).to.include('ERM: using works');
    expect(decorator.getSuiteNames()).to.include('ERM');
    expect(stats.tests.length).to.equal(1);
    expect(stats.skipped.length).to.equal(0);

    const tests = decorator.getTests();
    expect(tests[0].code).to.include('using r = getResource();');
  });

  it('should sort files alphabetically', () => {
    analyzer = new Analyzer('codeceptJS', path.join(__dirname, '..'));
    analyzer.analyze('./example/codeceptjs/*.js');

    const stats = analyzer.getStats();
    const files = stats.files;

    const decorator = analyzer.getDecorator();
    const tests = decorator.getTests();

    expect(files[0]).to.include('create_todos_test.js');
    expect(files[files.length - 1]).to.include('test_hooks_description.js');
    expect(tests[0].file).to.include('create_todos_test.js');
    expect(tests[tests.length - 1].file).to.include('test_hooks_description.js');
  });

  it('should maintain consistent file order across multiple runs', () => {
    const analyzer1 = new Analyzer('codeceptJS', path.join(__dirname, '..'));
    analyzer1.analyze('./example/codeceptjs/*.js');
    const files1 = analyzer1.getStats().files;

    const analyzer2 = new Analyzer('mocha', path.join(__dirname, '..'));
    analyzer2.analyze('./example/codeceptjs/*.js');
    const files2 = analyzer2.getStats().files;

    expect(files1).to.deep.equal(files2);
  });

  describe('attachments (manual/markdown push)', () => {
    // Minimal valid 1x1 PNG, generated on the fly so no binary fixture needs to live in the repo.
    const TEST_PNG_BASE64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    let screenshotPath;

    beforeEach(() => {
      screenshotPath = path.join(
        os.tmpdir(),
        `analyzer-screenshot-${Date.now()}-${Math.random().toString(36).slice(2)}.png`,
      );
      fs.writeFileSync(screenshotPath, Buffer.from(TEST_PNG_BASE64, 'base64'));
    });

    afterEach(() => {
      fs.unlinkSync(screenshotPath);
    });

    describe('readAttachments', () => {
      it('should resolve, validate and base64-encode attachments, keyed by filename only', () => {
        const testAnalyzer = new Analyzer('manual', path.join(__dirname, '..'));

        const result = testAnalyzer.readAttachments([screenshotPath], 'example/checkout.test.md');

        expect(result).to.deep.equal([
          { name: path.basename(screenshotPath), content: fs.readFileSync(screenshotPath).toString('base64') },
        ]);
      });

      it('should silently skip attachments that cannot be read from disk', () => {
        const testAnalyzer = new Analyzer('manual', path.join(__dirname, '..'));

        expect(testAnalyzer.readAttachments(['does-not-exist.png'], 'example/checkout.test.md')).to.deep.equal([]);
      });

      it('should skip attachments with disallowed extensions', () => {
        const testAnalyzer = new Analyzer('manual', path.join(__dirname, '..'));

        expect(testAnalyzer.readAttachments(['checkout.test.md'], 'example/checkout.test.md')).to.deep.equal([]);
      });

      it('should skip attachments larger than the size limit', () => {
        const testAnalyzer = new Analyzer('manual', path.join(__dirname, '..'));
        const oversizedFile = path.join(os.tmpdir(), `analyzer-oversized-${Date.now()}.png`);
        fs.writeFileSync(oversizedFile, Buffer.alloc(6 * 1024 * 1024));

        try {
          expect(testAnalyzer.readAttachments([oversizedFile], 'example/checkout.test.md')).to.deep.equal([]);
        } finally {
          fs.unlinkSync(oversizedFile);
        }
      });
    });

    describe('extractAttachments', () => {
      it('should resolve declarations collected during the last analyze() pass into file content', () => {
        const testAnalyzer = new Analyzer('manual', path.join(__dirname, '..'));
        testAnalyzer.attachmentDeclarations = [
          {
            testName: 'Test 1',
            suiteName: 'Suite A',
            file: 'example/checkout.test.md',
            id: '@T111',
            attachments: [screenshotPath],
          },
        ];

        const declarations = testAnalyzer.extractAttachments();

        expect(declarations).to.deep.equal([
          {
            testName: 'Test 1',
            suiteName: 'Suite A',
            file: 'example/checkout.test.md',
            id: '@T111',
            attachments: [
              { name: path.basename(screenshotPath), content: fs.readFileSync(screenshotPath).toString('base64') },
            ],
          },
        ]);
      });

      it('should drop a declaration entirely when every attachment fails validation', () => {
        const testAnalyzer = new Analyzer('manual', path.join(__dirname, '..'));
        testAnalyzer.attachmentDeclarations = [
          { testName: 'Test 1', file: 'example/checkout.test.md', attachments: ['does-not-exist.png'] },
        ];

        expect(testAnalyzer.extractAttachments()).to.deep.equal([]);
      });

      it('should return an empty list when nothing was collected during parsing', () => {
        const testAnalyzer = new Analyzer('manual', path.join(__dirname, '..'));

        expect(testAnalyzer.extractAttachments()).to.deep.equal([]);
      });
    });

    describe('resolveTestId', () => {
      it('should look up a test id by exact name in the id map', () => {
        const testAnalyzer = new Analyzer('manual', path.join(__dirname, '..'));
        const idMap = { tests: { 'My test': '@T111' } };

        expect(testAnalyzer.resolveTestId('My test', idMap)).to.equal('@T111');
      });

      it('should fall back to matching the tag-stripped name', () => {
        const testAnalyzer = new Analyzer('manual', path.join(__dirname, '..'));
        const idMap = { tests: { 'My test': '@T111' } };

        expect(testAnalyzer.resolveTestId('My test @smoke', idMap)).to.equal('@T111');
      });

      it('should return null when there is no match', () => {
        const testAnalyzer = new Analyzer('manual', path.join(__dirname, '..'));

        expect(testAnalyzer.resolveTestId('Unknown test', { tests: {} })).to.be.null;
      });

      it('should return null when idMap is missing', () => {
        const testAnalyzer = new Analyzer('manual', path.join(__dirname, '..'));

        expect(testAnalyzer.resolveTestId('My test', null)).to.be.null;
      });

      it('should prefer the file#suite#test key when suite and file are known', () => {
        const testAnalyzer = new Analyzer('manual', path.join(__dirname, '..'));
        const idMap = {
          tests: {
            'a.test.md#Suite A#My test': '@T111',
            'Suite A#My test': '@T222',
            'My test': '@T333',
          },
        };

        expect(testAnalyzer.resolveTestId('My test', idMap, { suiteName: 'Suite A', file: 'a.test.md' })).to.equal(
          '@T111',
        );
      });

      it('should disambiguate same-named tests in different suites via the suite#test key', () => {
        const testAnalyzer = new Analyzer('manual', path.join(__dirname, '..'));
        const idMap = {
          tests: {
            'Suite A#My test': '@T111',
            'Suite B#My test': '@T222',
          },
        };

        expect(testAnalyzer.resolveTestId('My test', idMap, { suiteName: 'Suite A' })).to.equal('@T111');
        expect(testAnalyzer.resolveTestId('My test', idMap, { suiteName: 'Suite B' })).to.equal('@T222');
      });

      it('should fall back to the bare name key when no suite context is given', () => {
        const testAnalyzer = new Analyzer('manual', path.join(__dirname, '..'));
        const idMap = { tests: { 'My test': '@T111' } };

        expect(testAnalyzer.resolveTestId('My test', idMap)).to.equal('@T111');
      });

      it('should consume a matched key so it cannot be handed out to a second test', () => {
        const testAnalyzer = new Analyzer('manual', path.join(__dirname, '..'));
        const idMap = { tests: { 'My test': '@T111' } };

        expect(testAnalyzer.resolveTestId('My test', idMap)).to.equal('@T111');
        expect(testAnalyzer.resolveTestId('My test', idMap)).to.be.null;
      });
    });

    describe('resolveAttachmentIds', () => {
      it('should leave an existing id untouched', () => {
        const testAnalyzer = new Analyzer('manual', path.join(__dirname, '..'));

        const resolved = testAnalyzer.resolveAttachmentIds([{ testName: 'Test 1', id: '@T111', attachments: [] }], {
          tests: { 'Test 1': '@T999' },
        });

        expect(resolved[0].id).to.equal('@T111');
      });

      it('should patch in the id from idMap when the declaration has none (new test)', () => {
        const testAnalyzer = new Analyzer('manual', path.join(__dirname, '..'));

        const resolved = testAnalyzer.resolveAttachmentIds([{ testName: 'New test', attachments: [] }], {
          tests: { 'New test': '@T999' },
        });

        expect(resolved[0].id).to.equal('@T999');
      });

      it('should leave id null when it cannot be resolved', () => {
        const testAnalyzer = new Analyzer('manual', path.join(__dirname, '..'));

        const resolved = testAnalyzer.resolveAttachmentIds([{ testName: 'Unknown test', attachments: [] }], {
          tests: {},
        });

        expect(resolved[0].id).to.be.null;
      });

      it('should correctly disambiguate same-named tests across different suites', () => {
        const testAnalyzer = new Analyzer('manual', path.join(__dirname, '..'));
        const idMap = {
          tests: {
            'Suite A#Login': '@T111',
            'Suite B#Login': '@T222',
          },
        };

        const resolved = testAnalyzer.resolveAttachmentIds(
          [
            { testName: 'Login', suiteName: 'Suite A', attachments: [] },
            { testName: 'Login', suiteName: 'Suite B', attachments: [] },
          ],
          idMap,
        );

        expect(resolved[0].id).to.equal('@T111');
        expect(resolved[1].id).to.equal('@T222');
      });

      it('should disambiguate by suite end-to-end, through extractAttachments() output (regression: extractAttachments must not drop suiteName/file)', () => {
        const testAnalyzer = new Analyzer('manual', path.join(__dirname, '..'));
        testAnalyzer.attachmentDeclarations = [
          {
            testName: 'Login',
            suiteName: 'Suite A',
            file: 'example/checkout.test.md',
            attachments: [screenshotPath],
          },
          {
            testName: 'Login',
            suiteName: 'Suite B',
            file: 'example/checkout.test.md',
            attachments: [screenshotPath],
          },
        ];

        const extracted = testAnalyzer.extractAttachments();
        const idMap = {
          tests: {
            'Suite A#Login': '@T111',
            'Suite B#Login': '@T222',
          },
        };

        const resolved = testAnalyzer.resolveAttachmentIds(extracted, idMap);

        expect(resolved[0].id).to.equal('@T111');
        expect(resolved[1].id).to.equal('@T222');
      });
    });

    describe('integration with the markdown parser', () => {
      it('should populate attachmentDeclarations while analyzing, without putting attachments on the test object', () => {
        const testAnalyzer = new Analyzer('manual', path.join(__dirname, '..'));
        const relativeAttachmentPath = path.relative(path.join(__dirname, '..', 'example'), screenshotPath);
        const fixtureDir = path.join(__dirname, '..', 'example');
        const fixturePath = path.join(fixtureDir, 'attachments-analyzer.test.md');

        fs.writeFileSync(
          fixturePath,
          [
            '<!-- suite',
            'id: @S1',
            '-->',
            '# S',
            '',
            '<!-- test',
            'id: @T111',
            'attachments:',
            `- ${relativeAttachmentPath}`,
            '-->',
            '',
            '## Case',
            '',
          ].join('\n'),
        );

        try {
          testAnalyzer.analyze('./example/attachments-analyzer.test.md');

          const tests = testAnalyzer.getDecorator().getTests();
          expect(tests[0]).to.not.have.property('attachments');
          expect(testAnalyzer.attachmentDeclarations).to.deep.equal([
            {
              testName: 'Case',
              suiteName: 'S',
              file: 'example/attachments-analyzer.test.md',
              id: '@T111',
              attachments: [relativeAttachmentPath],
            },
          ]);
        } finally {
          fs.unlinkSync(fixturePath);
        }
      });
    });
  });
});
