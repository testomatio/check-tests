# Gauge Framework Support

The Gauge framework adapter allows you to import Gauge specification files (`.spec`) into Testomat.io.

## Overview

Gauge is a lightweight cross-platform test automation tool that uses Markdown-based specification files. The adapter parses `.spec` files and extracts scenarios as individual tests while preserving the complete test structure.

## File Format

Gauge specifications use Markdown format with the following structure:

```markdown
# Specification Title

Tags: tag1, tag2

This is a specification description.

## Scenario Name

Tags: scenario-tag

- Step 1 description
- Step 2 description
- Step 3 with "parameter"

## Another Scenario

- First step
- Second step with table:
  |column1|column2|
  |value1|value2|
```

## Usage

### CLI Usage

```bash
# Basic usage
npx check-tests gauge "specs/**/*.spec"

# With specific working directory
npx check-tests gauge "**/*.spec" --work-dir ./my-project

# With TypeScript support (if using TypeScript in step implementations)
npx check-tests gauge "specs/**/*.spec" --typescript

# Exclude certain files
npx check-tests gauge "specs/**/*.spec" --exclude "specs/legacy/**"
```

### GitHub Action

```yaml
- uses: testomatio/check-tests@stable
  with:
    framework: gauge
    tests: 'specs/**/*.spec'
    token: ${{ secrets.GITHUB_TOKEN }}
```

### Programmatic Usage

```javascript
const Analyzer = require('check-tests/src/analyzer');

const analyzer = new Analyzer('gauge', './project');
analyzer.analyze('specs/**/*.spec');
const stats = analyzer.getStats();
```

## Supported Features

### Specification Detection

- **Title**: Lines starting with `# Title` or underlined with `===`
- **Tags**: `Tags: tag1, tag2` (case-insensitive)
- **Description**: Any text between specification and first scenario

### Scenario Detection

- **Title**: Lines starting with `## Scenario Name`
- **Tags**: `tags: tag1, tag2` (lowercase, scenario-specific)
- **Steps**: All lines starting with `* ` are included as test code
- **Tables**: Inline tables and data tables are preserved

### Test Structure

Each test object contains:

```javascript
{
  name: "Scenario Name",
  suites: ["Specification Title"],
  line: 5,
  code: "* Step 1\n* Step 2\n* Step 3",
  file: "specs/user-management.spec",
  tags: ["api", "users", "create"],
  skipped: false
}
```

## Examples

### Basic Specification

```markdown
# User Management API

Tags: api, users

This specification tests user management functionality.

## Create new user

Tags: create

- Send POST request to "/users"
- Set request body with user data
- Verify response status is 201
- Verify user ID is returned

## Update user

Tags: update

- Send PUT request to "/users/123"
- Update user email
- Verify response status is 200
```

### With Data Tables

```markdown
# Login Tests

## Login with valid credentials

- Navigate to login page
- Enter credentials:
  |username|password|
  |admin|secret123|
- Click login button
- Verify dashboard is displayed

## Login with invalid credentials

- Navigate to login page
- Enter invalid credentials
- Verify error message "Invalid credentials" is displayed
```

### With Context and Teardown

```markdown
# Shopping Cart

## Add item to cart

- Login as user
- Add product "laptop" to cart
- Verify cart contains 1 item

## Remove item from cart

- Login as user
- Add product "laptop" to cart
- Remove item from cart
- Verify cart is empty
```

## Configuration Options

### CLI Options

- `--no-hooks`: Exclude before/after hooks (not applicable for Gauge)
- `--line-numbers`: Include line numbers in test code
- `--typescript`: Enable TypeScript support for step implementations
- `--exclude`: Pattern to exclude files
- `--work-dir`: Working directory for relative paths

### Environment Variables

- `TESTOMATIO`: API key for Testomat.io
- `TESTOMATIO_URL`: Custom Testomat.io URL
- `TESTOMATIO_WORKDIR`: Working directory for path normalization

## Limitations

1. **Concepts**: `.cpt` concept files are not currently parsed
2. **Dynamic Parameters**: `<parameter>` placeholders are preserved as-is
3. **File References**: Special parameters like `<file:data.csv>` are included in test code
4. **Hooks**: Gauge hooks (before/after) are not included in test code

## Troubleshooting

### Common Issues

1. **Files not found**: Ensure glob pattern matches `.spec` files
2. **Encoding issues**: Ensure files are UTF-8 encoded
3. **Path issues**: Use `--work-dir` for correct relative paths

### Debug Mode

Enable debug logging:

```bash
DEBUG="testomatio:*" npx check-tests gauge "specs/**/*.spec"
```

## Integration with CI/CD

### GitHub Actions

```yaml
name: Test Analysis
on: [push, pull_request]

jobs:
  analyze-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - uses: testomatio/check-tests@stable
        with:
          framework: gauge
          tests: 'specs/**/*.spec'
          token: ${{ secrets.GITHUB_TOKEN }}
          has-tests-label: true
          no-tests-label: 'Tests Needed'
```

### Jenkins

```groovy
pipeline {
    agent any
    stages {
        stage('Analyze Tests') {
            steps {
                sh 'npx check-tests gauge "specs/**/*.spec"'
            }
        }
    }
}
```

## Migration from Other Frameworks

If migrating from other frameworks to Gauge:

1. Convert existing test cases to Gauge format
2. Use the same file patterns for consistency
3. Leverage Gauge's specification format for better readability
4. Use tags for categorization and filtering
