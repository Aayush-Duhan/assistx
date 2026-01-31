# AssistX Agent Guidelines

This document provides comprehensive guidelines for AI agents working on the AssistX codebase. Follow these conventions to maintain code quality and consistency.

## Project Overview

**AssistX** is an Electron application with React and TypeScript that provides AI-powered screen analysis using the Vercel AI SDK. It features real-time AI streaming, multiple display support, and a modern UI built with React and Tailwind CSS.

- **Repository**: Local development repository
- **Tech Stack**: Electron, React 19, TypeScript, Tailwind CSS, Vite
- **AI Integration**: Vercel AI SDK with multiple providers (OpenAI, Anthropic, Google, Groq, xAI)
- **Package Manager**: pnpm 10.23.0
- **State Management**: Zustand, Jotai, MobX (migration to Zustand in progress)
- **Database**: SQLite with Drizzle ORM

## Project Structure

```
assistx/
├── src/                    # Main source code
│   ├── apps/              # Application modules
│   │   ├── dashboard/     # Dashboard UI
│   │   ├── widgetApp/     # Main widget application
│   │   └── onboardingApp/ # Onboarding flow
│   ├── components/        # Reusable UI components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   ├── services/          # Business logic services
│   ├── state/             # Global state (atoms, stores)
│   └── stores/            # Zustand stores
├── electron/              # Electron main process
│   ├── lib/ai/mcp/       # MCP (Model Context Protocol) implementation
│   └── preload.ts        # Preload script
├── shared/                # Shared types and utilities
├── server/                # Fastify server for local API
└── scripts/               # Build and utility scripts
```

## Development Environment

### Required Tools
- **Node.js**: 20.x or higher (LTS recommended)
- **pnpm**: 10.23.0 (enforced via packageManager field)
- **Git**: For version control
- **pre-commit**: For git hooks (install via `pip install pre-commit`)

### Quick Start
```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run all validation checks
pnpm validate
```

## Build, Test, and Development Commands

- **Install dependencies**: `pnpm install`
- **Run dev server**: `pnpm dev`
- **Build for production**: `pnpm build`
- **Run tests**: `pnpm test`
- **Lint code**: `pnpm lint` (uses Oxlint - 50-100x faster than ESLint)
- **Fix lint issues**: `pnpm lint:fix`
- **Check formatting**: `pnpm format` (uses Oxfmt)
- **Fix formatting**: `pnpm format:fix`
- **Type check**: `pnpm typecheck`
- **Full validation**: `pnpm validate` (lint + typecheck + test)

### Pre-commit Hooks
Install pre-commit hooks to run checks automatically:
```bash
pre-commit install
```

Hooks run automatically on every commit:
- Secret detection (prevent API keys from being committed)
- Lint checking (Oxlint)
- Format checking (Oxfmt)

## Coding Style & Naming Conventions

### Language & TypeScript
- **Language**: TypeScript (ESM, strict mode)
- **Target**: ES2020
- **Module**: ESNext with Bundler resolution
- **JSX**: react-jsx transform

### Code Quality Standards
1. **Strict typing**: Avoid `any`, use proper types
2. **No unused code**: Remove unused imports, variables, and parameters
3. **Error handling**: Always handle errors properly, use `cause` property when re-throwing
4. **File size**: Keep files under ~500 LOC when feasible
5. **Comments**: Add brief comments for tricky or non-obvious logic

### Naming Conventions
- **Components**: PascalCase (e.g., `DashboardPage.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useGlobalShortcut.ts`)
- **Utilities**: camelCase (e.g., `apiHelpers.ts`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Types/Interfaces**: PascalCase with descriptive names
- **Files**: Match export name (e.g., `DashboardPage.tsx` exports `DashboardPage`)

### Import Order
1. React/Node built-ins
2. Third-party libraries (grouped by category)
3. Internal absolute imports (`@/components`, `@/hooks`, etc.)
4. Relative imports
5. Type-only imports (use `import type`)

Example:
```typescript
import { useState, useCallback } from 'react';
import { create } from 'zustand';
import { Button } from '@/components/ui/Button';
import { useService } from '@/hooks/useService';
import type { UserConfig } from '@/types';
```

## State Management Guidelines

### Current State (Transition Period)
The codebase currently uses three state management libraries:
- **Zustand**: Primary store (preferred for new code)
- **Jotai**: Atomic state (being migrated to Zustand)
- **MobX**: Legacy stores (migration planned)

### State Management Best Practices
1. **Prefer Zustand** for new global state
2. **Use React hooks** (useState, useReducer) for local component state
3. **Avoid mixing** state libraries in new features
4. **Document state shape** in store files

### Zustand Pattern
```typescript
// stores/userStore.ts
import { create } from 'zustand';

interface UserState {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
```

## Component Guidelines

### React Components
- Use functional components with hooks
- Use TypeScript for props (no PropTypes)
- Keep components focused (Single Responsibility)
- Extract complex logic into custom hooks

### Component Structure
```typescript
// ComponentName.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface ComponentNameProps {
  title: string;
  onAction: () => void;
}

export function ComponentName({ title, onAction }: ComponentNameProps) {
  const [isActive, setIsActive] = useState(false);

  return (
    <div>
      <h1>{title}</h1>
      <Button onClick={onAction}>Action</Button>
    </div>
  );
}
```

### UI Components
Located in `src/components/ui/`, follow these patterns:
- Use Tailwind CSS for styling
- Use `class-variance-authority` for component variants
- Export both named and default exports
- Include TypeScript interfaces for all props

## Electron Architecture

### Main Process (`electron/`)
- Entry point: `main.ts` (not shown in structure, implied)
- IPC handlers: `ipc/` directory
- MCP implementation: `lib/ai/mcp/`
- Preload script: `preload.ts`

### IPC Communication
- Use type-safe IPC channels
- Validate all inputs in main process
- Keep preload script minimal and secure

### MCP (Model Context Protocol)
Implementation in `electron/lib/ai/mcp/`:
- Configuration storage: `fb-mcp-config-storage.ts`
- Server management: `McpServerManager.ts`
- Tool execution: `McpToolExecutor.ts`

## Testing Guidelines

### Test Framework
- **Framework**: Vitest
- **Location**: Colocate tests with source (`*.test.ts`)
- **Naming**: Match source file name (e.g., `utils.ts` → `utils.test.ts`)

### Test Requirements
1. Run tests before committing: `pnpm test`
2. Write tests for utility functions
3. Write tests for complex hooks
4. Test error cases, not just happy paths

### Test Example
```typescript
// utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate } from './utils';

describe('formatDate', () => {
  it('formats date correctly', () => {
    const date = new Date('2024-01-15');
    expect(formatDate(date)).toBe('Jan 15, 2024');
  });
});
```

## Git Workflow

### Branches
- **main**: Production-ready code
- **feature/***: Feature branches
- **fix/***: Bug fix branches

### Commits
- Use conventional commits format
- Write descriptive commit messages
- Keep commits atomic (one logical change per commit)

Example:
```
feat: add keyboard shortcut configuration
fix: resolve memory leak in screenshot service
docs: update AGENTS.md with testing guidelines
```

### Pull Requests
- Run full validation before creating PR: `pnpm validate`
- Ensure all checks pass (lint, typecheck, test)
- Include description of changes
- Reference related issues

## Security Guidelines

### API Keys & Secrets
- **Never commit** API keys, tokens, or secrets
- Use `.env.local` for local development (already in .gitignore)
- Use `detect-secrets` pre-commit hook to catch accidental commits

### Safe Storage
- API keys stored in: `data/` directory (SQLite)
- Configuration: Local files only, no cloud sync
- Session data: Stored locally in `data/sessions/`

### Pre-commit Secret Detection
The pre-commit hook will catch patterns like:
- API keys (sk-*, AIza*, etc.)
- Private keys
- Passwords in config files
- Token patterns

## Common Patterns

### Error Handling
```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  // Preserve original error when re-throwing
  throw new Error('Operation failed', { cause: error });
}
```

### Async Operations
```typescript
// Use async/await, not callbacks
const data = await fetchData();

// Handle errors properly
try {
  await saveData(data);
} catch (error) {
  console.error('Failed to save:', error);
  // Show user-friendly error
}
```

### IPC Type Safety
```typescript
// Define channel types
interface IpcChannels {
  'screenshot:capture': () => Promise<Buffer>;
  'config:get': (key: string) => Promise<unknown>;
}

// Use typed IPC in renderer
const screenshot = await window.electron.ipcRenderer.invoke('screenshot:capture');
```

## Troubleshooting

### Common Issues

**Pre-commit hook failures:**
- Run `pnpm format:fix` to fix formatting
- Run `pnpm lint:fix` to auto-fix lint issues
- Check for secrets with `detect-secrets scan --baseline .secrets.baseline`

**Build failures:**
- Clear `dist/` and `dist-electron/` directories
- Run `pnpm install` to ensure dependencies are up to date
- Check TypeScript errors with `pnpm typecheck`

**Electron issues:**
- Kill existing Electron processes: `taskkill /F /IM electron.exe` (Windows) or `pkill -f electron` (macOS/Linux)
- Clear Electron cache: `rm -rf node_modules/.vite-electron-renderer/`

## Resources

### Internal Documentation
- `README.md`: Project overview and quick start
- `TODO.md`: Roadmap and planned features
- `AGENTS.md`: This file (development guidelines)

### External Resources
- [Electron Documentation](https://www.electronjs.org/docs/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Oxlint Rules](https://oxc.rs/docs/guide/usage/linter/rules.html)

## Agent-Specific Notes

### When Working on This Codebase
1. **Always run validation** before committing: `pnpm validate`
2. **Follow existing patterns** in the codebase
3. **Ask before changing** dependencies or build configuration
4. **Test on Windows** (primary development platform)
5. **Check for secrets** accidentally committed in files

### Multi-Agent Safety
- **Focus on your changes**: Don't modify unrelated files
- **Commit scope**: Keep commits focused on specific features
- **Communication**: Note when you're working on shared files
- **Rebase**: Use `git pull --rebase` to avoid merge commits

### Code Review Checklist
Before submitting changes:
- [ ] Code follows TypeScript strict mode
- [ ] No `any` types (unless absolutely necessary)
- [ ] All imports used (no dead code)
- [ ] Proper error handling
- [ ] Tests pass (`pnpm test`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Format passes (`pnpm format`)
- [ ] No secrets in code
- [ ] Commit message is descriptive

---

**Last Updated**: January 31, 2026
**Maintainer**: AssistX Development Team
