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

    pull = new Pull(mockReporter, testDir, { force: true });

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
      pull = new Pull(mockReporter, testDir, { dryRun: true, force: true });
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

  describe('git checks', () => {
    const { execSync } = require('child_process');
    let tempGitDir;

    beforeEach(() => {
      tempGitDir = path.join('/tmp', 'temp-git-test-' + Date.now());
      if (fs.existsSync(tempGitDir)) {
        fs.rmSync(tempGitDir, { recursive: true, force: true });
      }
    });

    afterEach(() => {
      if (fs.existsSync(tempGitDir)) {
        fs.rmSync(tempGitDir, { recursive: true, force: true });
      }
    });

    describe('non-empty directory without git', () => {
      it('should exit with error when directory has files but no git', async () => {
        // Create non-empty directory
        fs.mkdirSync(tempGitDir, { recursive: true });
        fs.writeFileSync(path.join(tempGitDir, 'existing.txt'), 'content');

        // Set test environment
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';

        const pullNoForce = new Pull(mockReporter, tempGitDir, { force: false });

        try {
          await pullNoForce.pullFiles();
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).to.include('Directory is not empty and git is not initialized');
        } finally {
          process.env.NODE_ENV = originalEnv;
        }
      });

      it('should pass when directory is empty and no git', async () => {
        // Create empty directory
        fs.mkdirSync(tempGitDir, { recursive: true });

        const pullNoForce = new Pull(mockReporter, tempGitDir, { force: false });
        const files = await pullNoForce.pullFiles();

        expect(files).to.have.length(2);
      });

      it('should pass when directory has only hidden files and no git', async () => {
        // Create directory with only hidden files
        fs.mkdirSync(tempGitDir, { recursive: true });
        fs.writeFileSync(path.join(tempGitDir, '.hidden'), 'content');

        const pullNoForce = new Pull(mockReporter, tempGitDir, { force: false });
        const files = await pullNoForce.pullFiles();

        expect(files).to.have.length(2);
      });
    });

    describe('git repository with dirty working tree', () => {
      beforeEach(() => {
        // Initialize git repo
        fs.mkdirSync(tempGitDir, { recursive: true });
        execSync('git init', { cwd: tempGitDir, stdio: 'ignore' });
        execSync('git config user.email "test@example.com"', { cwd: tempGitDir, stdio: 'ignore' });
        execSync('git config user.name "Test User"', { cwd: tempGitDir, stdio: 'ignore' });
      });

      it('should exit with error when working tree is dirty', async () => {
        // Create uncommitted file
        fs.writeFileSync(path.join(tempGitDir, 'uncommitted.txt'), 'content');

        // Set test environment
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';

        const pullNoForce = new Pull(mockReporter, tempGitDir, { force: false });

        try {
          await pullNoForce.pullFiles();
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).to.include('Git working tree is not clean');
        } finally {
          process.env.NODE_ENV = originalEnv;
        }
      });

      it('should pass when working tree is clean', async () => {
        // Create and commit a file
        fs.writeFileSync(path.join(tempGitDir, 'committed.txt'), 'content');
        execSync('git add .', { cwd: tempGitDir, stdio: 'ignore' });
        execSync('git commit -m "Initial commit"', { cwd: tempGitDir, stdio: 'ignore' });

        const pullNoForce = new Pull(mockReporter, tempGitDir, { force: false });
        const files = await pullNoForce.pullFiles();

        expect(files).to.have.length(2);
      });
    });

    describe('force mode', () => {
      it('should bypass git checks with force mode', async () => {
        // Create non-empty directory with no git
        fs.mkdirSync(tempGitDir, { recursive: true });
        fs.writeFileSync(path.join(tempGitDir, 'existing.txt'), 'content');

        const pullForce = new Pull(mockReporter, tempGitDir, { force: true });
        const files = await pullForce.pullFiles();

        expect(files).to.have.length(2);
      });

      it('should bypass dirty working tree check with force mode', async () => {
        // Initialize git repo with uncommitted changes
        fs.mkdirSync(tempGitDir, { recursive: true });
        execSync('git init', { cwd: tempGitDir, stdio: 'ignore' });
        execSync('git config user.email "test@example.com"', { cwd: tempGitDir, stdio: 'ignore' });
        execSync('git config user.name "Test User"', { cwd: tempGitDir, stdio: 'ignore' });
        fs.writeFileSync(path.join(tempGitDir, 'uncommitted.txt'), 'content');

        const pullForce = new Pull(mockReporter, tempGitDir, { force: true });
        const files = await pullForce.pullFiles();

        expect(files).to.have.length(2);
      });
    });
  });
});
