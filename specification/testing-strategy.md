# Testing Strategy

This document describes the testing approach for nco-control, informed by patterns observed in [mcp-inspector](https://github.com/modelcontextprotocol/inspector).

## Design Principles

1. **Test the Core Thoroughly** - Business logic in `@nco-control/core` is the foundation. It gets the most comprehensive test coverage.

2. **Integration Over Mocks for CLI** - CLI tests spawn the actual CLI as a subprocess. This catches real issues that unit tests miss.

3. **Co-locate Tests with Source** - Tests live next to the code they test (`foo.ts` → `foo.test.ts`). Easy to find, easy to maintain.

4. **Parallel-Safe by Default** - Tests must run in parallel without conflicts. Use unique temp files and avoid shared state.

## Framework Choice

**Vitest** for all packages (already specified in [tech-stack.md](./tech-stack.md)).

Rationale:
- Native ESM support
- Compatible with Jest APIs
- Works with TypeScript out of the box
- Single framework across all packages (simpler than Jest + Vitest split)

For E2E web tests, add **Playwright** when the web package is implemented.

## Testing by Package

### Core Package (`@nco-control/core`)

The core package contains pure business logic. Test it with standard unit tests.

**What to Test:**
- Merge engine (deep merge, null handling, array replacement)
- Diff engine (detect adds, removes, changes)
- Config loader (YAML parsing, file discovery)
- Schema validator (Ajv integration, error formatting)
- Secret substitution (`${VAR}` replacement)
- Plan service (orchestration logic)

**Test Patterns:**

```typescript
// packages/core/src/merge/deep-merge.test.ts
import { describe, it, expect } from 'vitest';
import { deepMerge } from './deep-merge';

describe('deepMerge', () => {
  it('overrides primitive values', () => {
    const base = { timeout: 30 };
    const override = { timeout: 60 };
    expect(deepMerge(base, override)).toEqual({ timeout: 60 });
  });

  it('removes fields when override is null', () => {
    const base = { a: 1, b: 2 };
    const override = { a: null };
    expect(deepMerge(base, override)).toEqual({ b: 2 });
  });

  it('replaces arrays instead of merging', () => {
    const base = { items: [1, 2, 3] };
    const override = { items: [4] };
    expect(deepMerge(base, override)).toEqual({ items: [4] });
  });
});
```

**Coverage Target:** High coverage for merge, diff, and validation logic. These are the most critical paths.

### CLI Package (`@nco-control/cli`)

CLI tests use **subprocess integration testing** - spawn the actual CLI and verify its behavior.

**Why Subprocess Testing:**
- Tests the real CLI, not a simulated version
- Catches issues with argument parsing, exit codes, stdout/stderr
- Validates JSON output mode works correctly
- Ensures the CLI binary is correctly configured

**Test Helpers:**

```typescript
// packages/cli/src/__tests__/helpers/cli-runner.ts
import { spawn } from 'child_process';

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runCli(args: string[], options?: {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['./bin/ncoctl.js', ...args], {
      cwd: options?.cwd ?? process.cwd(),
      env: { ...process.env, ...options?.env },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data; });
    proc.stderr.on('data', (data) => { stderr += data; });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('CLI timeout'));
    }, options?.timeout ?? 10000);

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}
```

**Assertion Helpers:**

```typescript
// packages/cli/src/__tests__/helpers/assertions.ts
import { expect } from 'vitest';
import type { CliResult } from './cli-runner';

export function expectCliSuccess(result: CliResult): void {
  expect(result.exitCode, `CLI failed: ${result.stderr}`).toBe(0);
}

export function expectCliFailure(result: CliResult): void {
  expect(result.exitCode).not.toBe(0);
}

export function expectValidJson(result: CliResult): unknown {
  expectCliSuccess(result);
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`Invalid JSON output: ${result.stdout}`);
  }
}
```

**Test Example:**

```typescript
// packages/cli/src/__tests__/validate.test.ts
import { describe, it, beforeEach, afterEach } from 'vitest';
import { runCli, expectCliSuccess, expectCliFailure } from './helpers';
import { createTestProject, cleanupTestProject } from './fixtures';

describe('ncoctl validate', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await createTestProject({
      configs: {
        'norce_adapter.yaml': { id: 'norce_adapter', timeout: 30 },
        'se-klarna/norce_adapter.yaml': { id: 'norce_adapter' },
      },
    });
  });

  afterEach(async () => {
    await cleanupTestProject(projectDir);
  });

  it('validates a correct project', async () => {
    const result = await runCli(['validate'], { cwd: projectDir });
    expectCliSuccess(result);
    expect(result.stdout).toContain('Validation passed');
  });

  it('reports validation errors', async () => {
    // Create invalid config
    const result = await runCli(['validate'], { cwd: projectDir });
    expectCliFailure(result);
    expect(result.stderr).toContain('Validation failed');
  });
});
```

**Test Fixtures:**

```typescript
// packages/cli/src/__tests__/fixtures.ts
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { dump } from 'js-yaml';

export async function createTestProject(options: {
  configs: Record<string, unknown>;
  projectConfig?: Record<string, unknown>;
}): Promise<string> {
  const id = randomUUID();
  const dir = join(process.cwd(), '.test-projects', id);

  await mkdir(dir, { recursive: true });

  // Write project config
  const projectConfig = options.projectConfig ?? {
    merchant: 'test-merchant',
    api: { baseUrl: 'https://example.com/api' },
  };
  await writeFile(
    join(dir, 'ncoctl.config.yaml'),
    dump(projectConfig)
  );

  // Write config files
  for (const [path, content] of Object.entries(options.configs)) {
    const fullPath = join(dir, path);
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, dump(content));
  }

  return dir;
}

export async function cleanupTestProject(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}
```

### Web Package (`@nco-control/web`)

The web package has two testing layers:

#### Component Tests (Vitest + Testing Library)

Test React components in isolation.

```typescript
// packages/web/client/src/components/DiffView.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiffView } from './DiffView';

describe('DiffView', () => {
  it('shows added fields in green', () => {
    const diffs = [
      { path: '/timeout', type: 'add' as const, newValue: 60 },
    ];
    render(<DiffView diffs={diffs} />);

    const addedLine = screen.getByText(/timeout/);
    expect(addedLine).toHaveClass('diff-add');
  });

  it('shows removed fields in red', () => {
    const diffs = [
      { path: '/oldField', type: 'remove' as const, oldValue: 'gone' },
    ];
    render(<DiffView diffs={diffs} />);

    const removedLine = screen.getByText(/oldField/);
    expect(removedLine).toHaveClass('diff-remove');
  });
});
```

#### E2E Tests (Playwright)

Test the full application flow. Add these once the web package is functional.

```typescript
// packages/web/e2e/plan-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Plan workflow', () => {
  test('shows pending changes', async ({ page }) => {
    await page.goto('/');

    // Navigate to plan view
    await page.click('text=Plan');

    // Verify changes are displayed
    await expect(page.locator('.diff-summary')).toContainText('1 to update');
  });
});
```

**Playwright Configuration:**

```typescript
// packages/web/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Test Organization

```
packages/
├── core/
│   └── src/
│       ├── merge/
│       │   ├── deep-merge.ts
│       │   └── deep-merge.test.ts      # Co-located
│       ├── diff/
│       │   ├── differ.ts
│       │   └── differ.test.ts
│       └── ...
├── cli/
│   └── src/
│       ├── __tests__/
│       │   ├── helpers/
│       │   │   ├── cli-runner.ts       # Subprocess runner
│       │   │   ├── assertions.ts       # Custom assertions
│       │   │   └── fixtures.ts         # Test project setup
│       │   ├── validate.test.ts
│       │   ├── plan.test.ts
│       │   └── apply.test.ts
│       └── commands/
│           └── ...
└── web/
    ├── client/
    │   └── src/
    │       └── components/
    │           ├── DiffView.tsx
    │           └── DiffView.test.tsx   # Co-located
    └── e2e/
        └── plan-workflow.spec.ts       # Playwright tests
```

## Vitest Configuration

### Root Configuration

```typescript
// vitest.config.ts (root)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run tests from all packages
    include: ['packages/*/src/**/*.test.ts'],

    // Increase timeout for subprocess tests
    testTimeout: 15000,

    // Enable parallel execution
    pool: 'threads',

    // Coverage settings
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        '**/dist/',
        '**/*.test.ts',
        '**/e2e/',
      ],
    },
  },
});
```

### Web Client Configuration

```typescript
// packages/web/client/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.tsx'],
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

```typescript
// packages/web/client/src/test-setup.ts
import '@testing-library/jest-dom/vitest';
```

## npm Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

## Best Practices

### Parallel Safety

Always use unique identifiers for test resources:

```typescript
import { randomUUID } from 'crypto';

// Good - unique per test run
const testDir = `/tmp/ncoctl-test-${randomUUID()}`;

// Bad - conflicts with parallel tests
const testDir = '/tmp/ncoctl-test';
```

### Cleanup

Always clean up test resources:

```typescript
afterEach(async () => {
  await cleanupTestProject(projectDir);
});
```

### Descriptive Test Names

Test names should describe the expected behavior:

```typescript
// Good
it('removes fields when override value is null', () => {});
it('exits with code 1 when validation fails', () => {});

// Bad
it('test merge', () => {});
it('works', () => {});
```

### Test Independence

Each test should be runnable in isolation:

```typescript
// Good - sets up its own state
beforeEach(async () => {
  projectDir = await createTestProject({ ... });
});

// Bad - depends on previous test
it('first creates the project', () => { ... });
it('then validates it', () => { ... });  // Fails if run alone
```

## What Not to Test

- Third-party library internals (Ajv validation logic, js-yaml parsing)
- Simple pass-through functions
- Type definitions
- Generated code

Focus testing effort on:
- Business logic (merge, diff, plan generation)
- Error handling paths
- Edge cases in data transformation
- CLI argument parsing and output formatting
