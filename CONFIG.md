# Mission Control Configuration

## Global Paths

These paths are used throughout the system for saving documents, research, and other files.

### Documents Root
```
DOCUMENTS_ROOT=/Users/mattbruce/.openclaw/workspace/projects/Documents
```

### Subdirectories
- **Research:** `{DOCUMENTS_ROOT}/Research/`
- **Plans:** `{DOCUMENTS_ROOT}/plans/`
- **Business:** `{DOCUMENTS_ROOT}/Research/Business/`

## Usage in Code

When agents save documents, they should use these paths:

```typescript
const DOCUMENTS_ROOT = '/Users/mattbruce/.openclaw/workspace/projects/Documents';

// Research documents
const researchPath = `${DOCUMENTS_ROOT}/Research/{topic}-{date}.md`;

// Plans
const planPath = `${DOCUMENTS_ROOT}/plans/{title}-{timestamp}.md`;
```

## Environment Variable

Can also be set via environment:
```bash
export MISSION_CONTROL_DOCS_ROOT=/Users/mattbruce/.openclaw/workspace/projects/Documents
```
