const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const Pull = require('../src/pull');

describe('Pull', () => {
  let mockReporter;
  let pull;
  const testDir = path.join(__dirname, 'temp-pull');

  beforeEach(() => {
    mockReporter = {
      getFilesFromServer: () =>
        Promise.resolve({
          files: {
            'test1.md': '# Test 1\nContent of test 1',
            'subdir/test2.md': '# Test 2\nContent of test 2',
          },
        }),
    };

    pull = new Pull(mockReporter, testDir);

    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('pullFiles', () => {
    it('should create files from server response', async () => {
      const files = await pull.pullFiles();

      expect(files).to.have.length(2);
      expect(files).to.include(path.join(testDir, 'test1.md'));
      expect(files).to.include(path.join(testDir, 'subdir/test2.md'));

      // Check file contents
      const file1Content = fs.readFileSync(path.join(testDir, 'test1.md'), 'utf8');
      const file2Content = fs.readFileSync(path.join(testDir, 'subdir/test2.md'), 'utf8');

      expect(file1Content).to.equal('# Test 1\nContent of test 1');
      expect(file2Content).to.equal('# Test 2\nContent of test 2');
    });

    it('should create directories if they do not exist', async () => {
      await pull.pullFiles();

      expect(fs.existsSync(path.join(testDir, 'subdir'))).to.be.true;
      expect(fs.existsSync(path.join(testDir, 'subdir/test2.md'))).to.be.true;
    });

    it('should overwrite existing files', async () => {
      // Create test directory and file
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(path.join(testDir, 'test1.md'), 'Old content');

      await pull.pullFiles();

      const content = fs.readFileSync(path.join(testDir, 'test1.md'), 'utf8');
      expect(content).to.equal('# Test 1\nContent of test 1');
    });

    it('should handle empty files response', async () => {
      mockReporter.getFilesFromServer = () => Promise.resolve({});

      const files = await pull.pullFiles();
      expect(files).to.have.length(0);
    });

    it('should handle server errors', async () => {
      mockReporter.getFilesFromServer = () => Promise.reject(new Error('Server error'));

      try {
        await pull.pullFiles();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Server error');
      }
    });
  });

  describe('dry run mode', () => {
    beforeEach(() => {
      pull = new Pull(mockReporter, testDir, { dryRun: true });
    });

    it('should not create files in dry run mode', async () => {
      const files = await pull.pullFiles();

      expect(files).to.have.length(0);
      expect(fs.existsSync(path.join(testDir, 'test1.md'))).to.be.false;
      expect(fs.existsSync(path.join(testDir, 'subdir/test2.md'))).to.be.false;
    });

    it('should show what files would be created', async () => {
      // Create one existing file to test overwrite scenario
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(path.join(testDir, 'test1.md'), 'Existing content');

      const consoleSpy = [];
      const originalLog = console.log;
      console.log = message => {
        consoleSpy.push(message);
        originalLog(message);
      };

      try {
        await pull.pullFiles();

        expect(consoleSpy.some(msg => msg.includes('Would overwrite'))).to.be.true;
        expect(consoleSpy.some(msg => msg.includes('Would create'))).to.be.true;
        expect(consoleSpy.some(msg => msg.includes('Dry run complete'))).to.be.true;
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('file tree display', () => {
    it('should display file tree after successful pull', async () => {
      const consoleSpy = [];
      const originalLog = console.log;
      console.log = message => {
        consoleSpy.push(message);
        originalLog(message);
      };

      try {
        await pull.pullFiles();

        expect(consoleSpy.some(msg => msg.includes('Files structure:'))).to.be.true;
        expect(consoleSpy.some(msg => msg.includes('├──') || msg.includes('└──'))).to.be.true;
        expect(consoleSpy.some(msg => msg.includes('test1.md'))).to.be.true;
      } finally {
        console.log = originalLog;
      }
    });
  });
});
