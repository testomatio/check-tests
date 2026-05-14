# Markdown Manual Tests

Testomat.io supports manual tests written in Markdown files. Use the `push` and `pull` commands to sync them with your project.

## File Format

Each test file uses HTML comment blocks for metadata and Markdown headings for suite/test titles.

```markdown
<!-- suite
id: @S12345678
-->

# Suite Title

<!-- test
id: @T12345678
priority: high
type: manual
-->

## Test Title

Test description and steps go here.
```

### Metadata

Metadata is placed inside the HTML comment block before the heading. Available fields:

**Suite metadata:**

| Field      | Description                                             |
| ---------- | ------------------------------------------------------- |
| `id`       | Suite ID assigned by Testomat.io (e.g. `@S12345678`)    |
| `emoji`    | Emoji icon for the suite                                |
| `tags`     | Comma-separated tags (not already present in the title) |
| `labels`   | Comma-separated labels                                  |
| `assignee` | Email of the assigned user                              |
| `issues`   | Linked issues                                           |

**Test metadata:**

| Field      | Description                                             |
| ---------- | ------------------------------------------------------- |
| `id`       | Test ID assigned by Testomat.io (e.g. `@T12345678`)     |
| `type`     | `manual` or `automated`                                 |
| `priority` | `normal`, `high`, or `low`                              |
| `assignee` | Email of the assigned user                              |
| `creator`  | Email of the test creator                               |
| `tags`     | Comma-separated tags (not already present in the title) |
| `labels`   | Comma-separated labels                                  |
| `issues`   | Linked issues                                           |
| `shared`   | `true` if the test is shared across suites              |

> **Note:** Suite-level `issues` (Jira) are inherited by all tests inside that suite on push. Suite-level `assignee` is inherited only by tests that don't have their own `assignee` set.

> **Note:** `type` and `shared` are read-only fields exported from Testomat.io. Changing them locally has no effect on the test in Testomat.io after push.

> **Note:** The `id` field is used to match a local test with an existing test in Testomat.io. If you change the `id`, the test will be treated as a new test on next push and a new record will be created.

### Single-line comments

If no metadata is needed, use the single-line form:

```markdown
<!-- suite -->

# Suite Title

<!-- test -->

## Test Title
```

On first push, the single-line comment is expanded to a full block and the `id` is inserted.

## Commands

### push

Uploads manual tests from Markdown files to Testomat.io and writes back assigned IDs.

```
npx check-tests push [options]
```

| Option                   | Description                                                                     |
| ------------------------ | ------------------------------------------------------------------------------- |
| `-d, --dir <dir>`        | Directory to scan for markdown files                                            |
| `-f, --files <files...>` | File paths or glob patterns (default: `**/*.test.md`)                           |
| `--no-empty`             | Remove empty suites after import                                                |
| `--keep-structure`       | Prefer file structure over Testomat.io structure                                |
| `--clean-ids`            | Remove IDs from test files (requires API key, removes only IDs known to server) |
| `--purge`                | Remove all IDs from test files without server verification                      |
| `--force`                | Skip git checks                                                                 |

**Examples:**

```bash
# Push all *.test.md files from current directory
TESTOMATIO=api_key npx check-tests push

# Push from a specific directory
TESTOMATIO=api_key npx check-tests push -d ./tests/manual

# Push specific files
TESTOMATIO=api_key npx check-tests push --files "docs/**/*.md"
```

### pull

Downloads Markdown test files from Testomat.io to the local filesystem.

```
npx check-tests pull [options]
```

| Option               | Description                                                       |
| -------------------- | ----------------------------------------------------------------- |
| `-d, --dir <dir>`    | Target directory (default: `.`)                                   |
| `--suite-ids <ids>`  | Comma-separated suite IDs to pull (e.g. `@S12345678, @S456r4342`) |
| `--export-automated` | Include automated tests in exported Markdown                      |
| `--dry-run`          | Preview files that would be created without writing them          |
| `--force`            | Skip git working tree checks                                      |

**Examples:**

```bash
# Pull all manual test files
TESTOMATIO=api_key npx check-tests pull -d

# Pull into specific directory
TESTOMATIO=api_key npx check-tests pull -d ./tests/manual

# Pull specific suites only
TESTOMATIO=api_key npx check-tests pull --suite-ids "@S12345678,@S87654321"

# Preview what would be pulled
TESTOMATIO=api_key npx check-tests pull --dry-run
```

## Environment Variables

| Variable         | Description                                                 |
| ---------------- | ----------------------------------------------------------- |
| `TESTOMATIO`     | API key (required)                                          |
| `TESTOMATIO_URL` | Custom Testomat.io URL (default: `https://app.testomat.io`) |
