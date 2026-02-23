const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { updateIdsMarkdown, cleanIdsMarkdown } = require('../src/updateIds/updateIds-markdown');

describe('updateIds markdown', () => {
  const testFile = path.join(__dirname, 'temp-test.md');

  afterEach(() => {
    // Clean up test file
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
  });

  describe('updateIdsMarkdown', () => {
    it('should add ID to test metadata', () => {
      const content = `<!-- test
priority: high
-->
## Test Login

User should be able to login.`;

      fs.writeFileSync(testFile, content);

      const testomatioMap = {
        tests: {
          'Test Login': '@T12345678',
        },
        suites: {},
      };

      const result = updateIdsMarkdown(testomatioMap, __dirname, { pattern: 'temp-test.md' });

      expect(result.map(f => path.resolve(f))).to.include(path.resolve(testFile));

      const updatedContent = fs.readFileSync(testFile, 'utf8');
      expect(updatedContent).to.include('id: @T12345678');
      expect(updatedContent).to.include('priority: high');
    });

    it('should add ID to suite metadata', () => {
      const content = `<!-- suite
priority: high
-->
# Login Suite

Test suite for login functionality.`;

      fs.writeFileSync(testFile, content);

      const testomatioMap = {
        tests: {},
        suites: {
          'Login Suite': '@S87654321',
        },
      };

      const result = updateIdsMarkdown(testomatioMap, __dirname, { pattern: 'temp-test.md' });

      expect(result.map(f => path.resolve(f))).to.include(path.resolve(testFile));

      const updatedContent = fs.readFileSync(testFile, 'utf8');
      expect(updatedContent).to.include('id: @S87654321');
      expect(updatedContent).to.include('priority: high');
    });

    it('should update existing ID', () => {
      const content = `<!-- test
id: @T11111111
priority: high
-->
## Test Login

User should be able to login.`;

      fs.writeFileSync(testFile, content);

      const testomatioMap = {
        tests: {
          'Test Login': '@T12345678',
        },
        suites: {},
      };

      const result = updateIdsMarkdown(testomatioMap, __dirname, { pattern: 'temp-test.md' });

      expect(result.map(f => path.resolve(f))).to.include(path.resolve(testFile));

      const updatedContent = fs.readFileSync(testFile, 'utf8');
      expect(updatedContent).to.include('id: @T12345678');
      expect(updatedContent).to.not.include('id: @T11111111');
    });

    it('should handle metadata without ID field', () => {
      const content = `<!-- test
priority: high
author: john
-->
## Test Login

User should be able to login.`;

      fs.writeFileSync(testFile, content);

      const testomatioMap = {
        tests: {
          'Test Login': '@T12345678',
        },
        suites: {},
      };

      const result = updateIdsMarkdown(testomatioMap, __dirname, { pattern: 'temp-test.md' });

      expect(result.map(f => path.resolve(f))).to.include(path.resolve(testFile));

      const updatedContent = fs.readFileSync(testFile, 'utf8');
      expect(updatedContent).to.include('id: @T12345678');
      expect(updatedContent).to.include('priority: high');
      expect(updatedContent).to.include('author: john');
    });

    it('should skip tests without metadata comment', () => {
      const content = `## Test Login

User should be able to login.`;

      fs.writeFileSync(testFile, content);

      const testomatioMap = {
        tests: {
          'Test Login': '@T12345678',
        },
        suites: {},
      };

      const result = updateIdsMarkdown(testomatioMap, __dirname, { pattern: 'temp-test.md' });

      expect(result).to.not.include(testFile);

      const updatedContent = fs.readFileSync(testFile, 'utf8');
      expect(updatedContent).to.not.include('@T12345678');
    });
  });

  describe('cleanIdsMarkdown', () => {
    it('should remove ID from metadata', () => {
      const content = `<!-- test
id: @T12345678
priority: high
-->
## Test Login

User should be able to login.`;

      fs.writeFileSync(testFile, content);

      const result = cleanIdsMarkdown({}, __dirname, { pattern: 'temp-test.md' });

      expect(result.map(f => path.resolve(f))).to.include(path.resolve(testFile));

      const updatedContent = fs.readFileSync(testFile, 'utf8');
      expect(updatedContent).to.not.include('id: @T12345678');
      expect(updatedContent).to.include('priority: high');
    });

    it('should handle multiple IDs in file', () => {
      const content = `<!-- suite
id: @S87654321
-->
# Login Suite

<!-- test
id: @T12345678
priority: high
-->
## Test Login

User should be able to login.`;

      fs.writeFileSync(testFile, content);

      const result = cleanIdsMarkdown({}, __dirname, { pattern: 'temp-test.md' });

      expect(result.map(f => path.resolve(f))).to.include(path.resolve(testFile));

      const updatedContent = fs.readFileSync(testFile, 'utf8');
      expect(updatedContent).to.not.include('id: @T12345678');
      expect(updatedContent).to.not.include('id: @S87654321');
      expect(updatedContent).to.include('priority: high');
    });
  });
});
