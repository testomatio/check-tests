# Test Specification Format for Manual Tests

This document describes the format for writing manual test cases in markdown that can be parsed by the check-tests tool.

## File Structure

Each markdown file represents a test suite and should follow this structure:

1. **Suite Metadata Block** (HTML comment with YAML-like syntax)
2. **Suite Title** (Level 1 heading `#`)
3. **Suite Description** (optional paragraph)
4. **Test Cases** (each containing metadata block and test title)

## Suite Format

### Suite Metadata Block

```markdown
<!-- suite
id: @S123
priority: high
tags: regression,smoke
-->
```

### Suite Title

```markdown
# Suite Name Here
```

### Suite Description (Optional)

```markdown
Brief description of what this test suite covers.
```

## Test Case Format

### Test Metadata Block

```markdown
<!-- test
id: @T456
priority: high
tags: critical,login
author: john.doe
-->
```

### Test Title

```markdown
## Test Case Name Here
```

### Test Description and Content

Standard markdown content including:

- Test description
- Prerequisites/Preconditions
- Test steps with expected results
- Test data
- Additional notes

## Supported Metadata Fields

### Suite Metadata

- `id`: Unique identifier (e.g., @S123)
- `priority`: high, medium, low, critical
- `tags`: comma-separated list
- `author`: test author
- `component`: component being tested

### Test Metadata

- `id`: Unique identifier (e.g., @T456)
- `priority`: high, medium, low, critical
- `tags`: comma-separated list
- `author`: test author
- `component`: component being tested
- `type`: functional, integration, ui, api
- `automated`: true/false

## Rules

1. **HTML Comments Only**: Use HTML comment blocks for metadata, not YAML frontmatter
2. **YAML-like Syntax**: Inside comments, use `key: value` format
3. **Required Elements**: Each file must have at least one suite and one test
4. **Heading Levels**: Use `#` for suites, `##` for tests
5. **Blank Lines**: Separate sections with blank lines for readability
6. **No Default Values**: Only include relevant metadata fields, omit defaults

## Example Usage

```bash
# Parse manual tests from markdown files
npx check-tests "**/*.test.md" --framework manual

# Include in test import
npx check-tests "test/**/*.md" --framework manual --sync
```

## File Naming Convention

Recommended naming patterns:

- `feature-name.test.md`
- `component-name.manual.md`
- `suite-name.spec.md`

Files should be organized in logical directories matching your application structure.
