/**
 * Parse markdown files for manual tests
 * Expected format:
 * - HTML comment with YAML-like metadata for suite: <!-- suite\nid: @S123\n-->
 * - Level 1 heading (#) for suite title
 * - HTML comment with YAML-like metadata for test: <!-- test\nid: @T456\npriority: high\n-->
 * - Level 2 heading (##) for test title
 */
module.exports = (ast, file = '', source = '') => {
  const tests = [];
  const lines = source.split('\n');
  let currentSuite = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Check for HTML comment blocks
    if (line === '<!-- suite') {
      const suiteMetadata = parseMetadataBlock(lines, i);
      i = suiteMetadata.endIndex;

      // Next non-empty line should be suite title (# heading)
      while (i < lines.length && !lines[i].trim()) i++;
      if (i < lines.length && lines[i].trim().startsWith('#')) {
        const suiteName = lines[i].trim().replace(/^#+\s*/, '');
        currentSuite = {
          name: suiteName,
          line: i + 1,
          metadata: suiteMetadata.data,
        };
        i++;
      }
      continue;
    }

    if (line === '<!-- test') {
      const testMetadata = parseMetadataBlock(lines, i);
      i = testMetadata.endIndex;

      // Next non-empty line should be test title (# or ## heading)
      while (i < lines.length && !lines[i].trim()) i++;
      if (i < lines.length && lines[i].trim().startsWith('#')) {
        const testName = lines[i].trim().replace(/^#+\s*/, '');
        const testStartLine = i + 1;

        // Collect test content until next test or end of file
        const testContent = [];
        testContent.push(lines[i]); // Include the heading
        i++;

        // Collect content until next test comment or end of file
        while (i < lines.length) {
          const nextLine = lines[i].trim();
          if (nextLine === '<!-- test' || nextLine === '<!-- suite') {
            break;
          }
          testContent.push(lines[i]);
          i++;
        }

        // Create test object
        const testData = {
          name: testName,
          suites: currentSuite ? [currentSuite.name] : [],
          line: testStartLine,
          file,
          manual: true,
          ...testMetadata.data,
        };

        tests.push(testData);
        continue;
      }
    }

    i++;
  }

  return tests;
};

/**
 * Parse metadata block from HTML comment
 * Returns the parsed data and the end index
 */
function parseMetadataBlock(lines, startIndex) {
  const metadata = {};
  let i = startIndex + 1; // Skip the opening comment line

  // Parse YAML-like content until -->
  while (i < lines.length) {
    const line = lines[i].trim();

    if (line === '-->') {
      break;
    }

    // Parse YAML-like key: value pairs
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      metadata[key] = value;
    }

    i++;
  }

  return {
    data: metadata,
    endIndex: i + 1, // Skip the closing -->
  };
}
