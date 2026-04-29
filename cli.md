# CLI Configuration Documentation

This document provides comprehensive information about all CLI options and environment variables available in the check-tests tool.

## Usage

```bash
npx check-tests <framework> <files> [options]
```

### Required Arguments

- `<framework>` - Test framework to analyze (codeceptjs, jasmine, jest, mocha, newman, playwright, qunit, testcafe, nightwatch)
- `<files>` - Glob pattern to match test files (e.g., `"tests/**/*_test.js"`)

## Push Command

The `push` command is a shortcut for importing markdown-based manual tests into Testomat.io. It is equivalent to `check-tests manual <files>` with `--update-ids` enabled by default.

```bash
npx check-tests push [options]
```

### Push Options

| Option                   | Description                                     | Default        |
| ------------------------ | ----------------------------------------------- | -------------- |
| `-d, --dir <dir>`        | Test directory to scan                          | Current dir    |
| `-f, --files <files...>` | One or more file paths or glob patterns to push | `**/*.test.md` |
| `--force`                | Skip git checks and force push files            | false          |

The `push` command also accepts the same Testomat.io and analysis options as the main command (`--sync`, `--create`, `--no-empty`, `--keep-structure`, `--clean-ids`, `--purge`, `--no-detached`, `--no-skipped`, `--exclude`, etc.).

### `--files` Option

Use `--files` (or `-f`) to override the default glob (`**/*.test.md`). It accepts:

- a **single file path** — push exactly that file
- **multiple file paths** — push every listed file
- a **glob pattern** (in quotes) — push every file matched by the pattern
- **multiple glob patterns** — push the union of files matched by each pattern

Paths and patterns are resolved relative to `--dir` (or the current directory if `--dir` is not set).

### Push Examples

```bash
# Push every **/*.test.md file under the current directory (default behaviour)
TESTOMATIO=your-api-key npx check-tests push

# Push a single markdown file
TESTOMATIO=your-api-key npx check-tests push --files docs/login.test.md

# Push several specific files
TESTOMATIO=your-api-key npx check-tests push -f docs/login.test.md docs/checkout.test.md

# Push everything matching a custom glob (quote the pattern!)
TESTOMATIO=your-api-key npx check-tests push --files "manual-tests/**/*.md"

# Combine multiple globs (e.g. smoke + regression suites)
TESTOMATIO=your-api-key npx check-tests push -f "smoke/**/*.test.md" "regression/**/*.test.md"

# Use a non-default directory together with --files
TESTOMATIO=your-api-key npx check-tests push -d ./tests --files "**/*.md"
```

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
| `--require-ids`             | Fail build if tests are missing Testomat.io IDs              | false   |
| `--force`                   | Skip git checks and force push files                         | false   |

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

| Variable                 | Description                                                                                  | Required                              |
| ------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------- |
| `TESTOMATIO`             | API key for Testomat.io                                                                      | Yes (for sync operations)             |
| `TESTOMATIO_URL`         | Testomat.io server URL                                                                       | No (default: https://app.testomat.io) |
| `TESTOMATIO_BRANCH`      | Branch name for Testomat.io                                                                  | No                                    |
| `TESTOMATIO_WORKDIR`     | Working directory for relative file paths                                                    | No                                    |
| `TESTOMATIO_PREPEND_DIR` | Directory to prepend to test paths                                                           | No                                    |
| `TESTOMATIO_SUITE`       | Suite name for tests                                                                         | No                                    |
| `TESTOMATIO_LABELS`      | Comma-separated labels to apply to all tests. Supports `label:value` format for label values | No                                    |
| `TESTOMATIO_SYNC_LABELS` | Alias for TESTOMATIO_LABELS (compatibility)                                                  | No                                    |
| `TESTOMATIO_NO_DETACHED` | Don't mark unmatched tests as detached                                                       | No                                    |

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

# Import tests into a specific suite
TESTOMATIO_SUITE=S1234567 TESTOMATIO=your-api-key npx check-tests jest "tests/**/*.test.js"

# Import tests with custom working directory
TESTOMATIO_WORKDIR=./e2e TESTOMATIO=your-api-key npx check-tests playwright "**/*.spec.ts"

# Import tests into a specific folder
TESTOMATIO_PREPEND_DIR="Frontend Tests" TESTOMATIO=your-api-key npx check-tests jest "tests/**/*.test.js"

# Apply labels to all imported tests
TESTOMATIO_LABELS="smoke,regression" TESTOMATIO=your-api-key npx check-tests jest "tests/**/*.test.js"

# Apply labels with values using label:value format
TESTOMATIO_LABELS="severity:high,feature:auth,team:frontend" TESTOMATIO=your-api-key npx check-tests jest "tests/**/*.test.js"

# Mix simple labels and label:value pairs
TESTOMATIO_LABELS="smoke,severity:critical,regression" TESTOMATIO=your-api-key npx check-tests playwright "tests/**/*.spec.ts"

# Apply labels using the alias (for Python SDK compatibility)
TESTOMATIO_SYNC_LABELS="api,integration" TESTOMATIO=your-api-key npx check-tests playwright "tests/**/*.spec.ts"
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
- `1` - Tests missing Testomat.io IDs found (when `--require-ids` is used)

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
