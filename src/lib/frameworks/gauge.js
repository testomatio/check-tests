/**
 * Gauge framework adapter
 * Parses Gauge specification files (.spec) written in Markdown format
 * Extracts scenarios as tests and includes steps as code
 */
module.exports = (ast, file = '', source = '') => {
  const tests = [];
  const lines = source.split('\n');

  let currentSuite = null;
  let currentTags = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Specification heading (# Title)
    if (line.startsWith('# ')) {
      currentSuite = line.replace(/^#\s*/, '');
      currentTags = [];
      continue;
    }

    // Alternative specification format (underlined with ===)
    if (line.match(/^=+$/) && i > 0) {
      currentSuite = lines[i - 1]?.trim();
      currentTags = [];
      continue;
    }

    // Scenario heading (## Scenario Name or underlined with ---)
    if (line.startsWith('## ')) {
      const testName = line.replace(/^##\s*/, '');
      const testStartLine = i + 1;

      // Check for scenario tags on next line
      let scenarioTags = [...currentTags];
      const tagsLine = lines[i + 1]?.trim();
      if (tagsLine?.toLowerCase().startsWith('tags:')) {
        scenarioTags = [...currentTags, ...parseTags(tagsLine)];
        i++; // Skip tags line
      }

      // Collect steps and content until next scenario or end
      const testCode = collectScenarioContent(lines, i + 1);

      tests.push({
        name: testName,
        suites: currentSuite ? [currentSuite] : [],
        line: testStartLine,
        code: testCode,
        file,
        tags: scenarioTags,
        skipped: false,
      });
    } else if (line.match(/^-+$/)) {
      // Alternative scenario format (underlined with ---)
      const testName = lines[i - 1]?.trim();
      if (testName && !testName.match(/^=+$/) && !testName.startsWith('#')) {
        const testStartLine = i + 1;

        // Check for scenario tags on next line
        let scenarioTags = [...currentTags];
        const tagsLine = lines[i + 1]?.trim();
        if (tagsLine?.toLowerCase().startsWith('tags:')) {
          scenarioTags = [...currentTags, ...parseTags(tagsLine)];
          i++; // Skip tags line
        }

        // Collect steps and content until next scenario or end
        const testCode = collectScenarioContent(lines, i + 1);

        tests.push({
          name: testName,
          suites: currentSuite ? [currentSuite] : [],
          line: testStartLine,
          code: testCode,
          file,
          tags: scenarioTags,
          skipped: false,
        });
      }
    }
  }

  return tests;
};

/**
 * Parse tags from tags line
 * @param {string} tagsLine - Line containing tags (e.g., "tags: tag1, tag2")
 * @returns {string[]} Array of tag names
 */
function parseTags(tagsLine) {
  return tagsLine
    .replace(/^tags:\s*/i, '')
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

/**
 * Collect scenario content including steps and tables
 * @param {string[]} lines - All lines from the file
 * @param {number} startIndex - Starting line index for this scenario
 * @returns {string} The collected content for this scenario
 */
function collectScenarioContent(lines, startIndex) {
  const contentLines = [];
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i];

    // Stop at next scenario or specification
    if (line.startsWith('## ') || (line.match(/^=+$/) && i > 0) || (line.startsWith('# ') && !line.startsWith('##'))) {
      break;
    }

    contentLines.push(line);
    i++;
  }

  return contentLines.join('\n');
}
