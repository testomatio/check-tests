# CLI Configuration Documentation

This document provides comprehensive information about all CLI options and environment variables available in the check-tests tool.

## Usage

```bash
npx check-tests <framework> <files> [options]
```

### Required Arguments

- `<framework>` - Test framework to analyze (codeceptjs, jasmine, jest, mocha, newman, playwright, qunit, testcafe, nightwatch)
- `<files>` - Glob pattern to match test files (e.g., `"tests/**/*_test.js"`)

## CLI Options

### Basic Options

| Option                | Description                                 | Default           |
| --------------------- | ------------------------------------------- | ----------------- |
| `-d, --dir <dir>`     | Test directory to scan                      | Current directory |
| `--typescript`        | Enable TypeScript support                   | false             |
| `--exclude <pattern>` | Glob pattern to exclude files from analysis | -                 |

### Testomat.io Integration

| Option                        | Description                                                   | Default |
| ----------------------------- | ------------------------------------------------------------- | ------- |
| `--sync`                      | Import tests to Testomat.io and wait for completion           | false   |
| `--no-detached`               | Don't mark all unmatched tests as detached                    | false   |
| `--update-ids`                | Update test and suite with Testomat.io IDs                    | false   |
| `--create`                    | Create tests and suites for missing IDs                       | false   |
| `--keep-structure`            | Prefer structure of source code over structure in Testomat.io | false   |
| `--no-empty`                  | Remove empty suites after import                              | false   |
| `--clean-ids`                 | Remove Testomat.io IDs from test and suite                    | false   |
| `--purge, --unsafe-clean-ids` | Remove Testomat.io IDs without server verification            | false   |

### Test Analysis Options

| Option                      | Description                                                  | Default |
| --------------------------- | ------------------------------------------------------------ | ------- |
| `--no-skipped`              | Throw error if skipped tests are found                       | false   |
| `--no-hooks`                | Exclude test hooks code from the code on the client          | false   |
| `--line-numbers`            | Add line numbers to each block of code                       | false   |
| `--test-alias <test-alias>` | Specify custom alias for test/it functions (comma-separated) | -       |

### Export Options

| Option                           | Description                               | Default |
| -------------------------------- | ----------------------------------------- | ------- |
| `-g, --generate-file <fileName>` | Export test details to a document         | -       |
| `-u, --url <url>`                | GitHub URL to get files (URL/tree/master) | -       |

### Advanced Options

| Option                       | Description              | Default |
| ---------------------------- | ------------------------ | ------- |
| `-p, --plugins [plugins...]` | Additional Babel plugins | -       |

## Environment Variables

### Testomat.io Configuration

| Variable                 | Description                               | Required                              |
| ------------------------ | ----------------------------------------- | ------------------------------------- |
| `TESTOMATIO`             | API key for Testomat.io                   | Yes (for sync operations)             |
| `TESTOMATIO_URL`         | Testomat.io server URL                    | No (default: https://app.testomat.io) |
| `TESTOMATIO_BRANCH`      | Branch name for Testomat.io               | No                                    |
| `TESTOMATIO_WORKDIR`     | Working directory for relative file paths | No                                    |
| `TESTOMATIO_PREPEND_DIR` | Directory to prepend to test paths        | No                                    |
| `TESTOMATIO_SUITE`       | Suite name for tests                      | No                                    |
| `TESTOMATIO_NO_DETACHED` | Don't mark unmatched tests as detached    | No                                    |

## Examples

### Basic Usage

```bash
# Analyze Jest tests
npx check-tests jest "tests/**/*.test.js"

# Analyze Playwright tests with TypeScript
npx check-tests playwright "tests/**/*.spec.ts" --typescript

# Exclude node_modules from analysis
npx check-tests mocha "**/*.test.js" --exclude "**/node_modules/**"
```

### Testomat.io Integration

```bash
# Sync tests with Testomat.io
TESTOMATIO=your-api-key npx check-tests jest "tests/**/*.test.js" --sync

# Update test IDs
TESTOMATIO=your-api-key npx check-tests jest "tests/**/*.test.js" --update-ids

# Create missing tests and suites
TESTOMATIO=your-api-key npx check-tests jest "tests/**/*.test.js" --create
```

### Export Options

```bash
# Generate test documentation
npx check-tests jest "tests/**/*.test.js" --generate-file tests.md

# Analyze tests from GitHub repository
npx check-tests jest "tests/**/*.test.js" --url https://github.com/user/repo/tree/main
```

## Configuration Files

The tool supports loading environment variables from `.env` files using dotenv. Create a `.env` file in your project root:

```env
TESTOMATIO=your-api-key
TESTOMATIO_URL=https://app.testomat.io
TESTOMATIO_BRANCH=main
```

## Exit Codes

- `0` - Success
- `1` - Error (general)
- `2` - Skipped tests found (when `--no-skipped` is used)

## Supported Frameworks

- **CodeceptJS** - JavaScript/TypeScript BDD testing framework
- **Jasmine** - Behavior-driven development framework
- **Jest** - JavaScript testing framework
- **Mocha** - JavaScript test framework
- **Newman** - Postman collection runner
- **Playwright** - Web testing and automation framework
- **QUnit** - JavaScript unit testing framework
- **TestCafe** - Web testing framework
- **Nightwatch** - End-to-end testing framework
