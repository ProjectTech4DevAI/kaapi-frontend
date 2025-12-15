# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kaapi Konsole is a Next.js 16 application by Tech4Dev for LLM development and evaluation. It provides:
- LLM response evaluation against QnA datasets
- Git-like version control for prompt templates
- Configuration management with A/B testing
- Dataset and API key management

The application has evolved from a simple evaluation tool into a full-featured LLM development platform.

## Technology Stack

- **Framework**: Next.js 16.0.7 (App Router)
- **React**: 19.2.0 (with hooks-based state management)
- **Routing**: Next.js App Router + React Router DOM 7.9.5 (dual system)
- **Styling**: Tailwind CSS 4.x + centralized color system in `/app/lib/colors.ts`
- **TypeScript**: 5.x (strict mode disabled)
- **Data Fetching**: SWR 2.3.6 (not widely used yet)
- **Date/Time**: date-fns 4.1.0, date-fns-tz 3.2.0

## Development Commands

```bash
# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Application Architecture

### Route Structure

```
/                              → Redirects to /evaluations
/evaluations                   → Main eval interface (upload & results)
/evaluations/[id]              → Detailed evaluation report
/datasets                      → Dataset upload and management
/keystore                      → API key management (localStorage-based)
/configurations/prompt-editor  → Git-like prompt version control
/test-evaluation               → Mock data testing page
```

**Coming Soon Routes** (placeholders):
- `/model-testing`, `/speech-to-text`, `/text-to-speech`, `/guardrails`, `/redteaming`

### Component Organization

**Shared Components** (`/app/components/`):
- `Sidebar.tsx` - Main navigation (240px collapsible)
- `TabNavigation.tsx` - Reusable tab switcher
- `ConfigModal.tsx` - Modal for viewing evaluation configs
- `DetailedResultsTable.tsx` - Evaluation traces table
- `ScoreDisplay.tsx`, `StatusBadge.tsx` - Display primitives
- `types.ts` - Shared TypeScript interfaces
- `utils.ts` - Date formatting, color utilities

**Prompt Editor Components** (`/app/components/prompt-editor/`):
- `Header.tsx` - Top nav with branch controls
- `EditorView.tsx` - WYSIWYG prompt editor
- `DiffView.tsx` - Side-by-side diff visualization
- `HistorySidebar.tsx` - Commit history tree
- `ConfigDrawer.tsx` - Right-side configuration drawer
- `CurrentConfigTab.tsx`, `HistoryTab.tsx`, `ABTestTab.tsx` - Drawer tabs
- `BranchModal.tsx`, `MergeModal.tsx` - Dialogs

### State Management Pattern

**No global state library** - uses React `useState` exclusively:
- Component-level state with props drilling
- LocalStorage for persistence (API keys, sidebar state)
- No Context API or Redux/Zustand

**LocalStorage Keys:**
- `kaapi_api_keys` - API key storage
- `sidebar-expanded-menus` - Sidebar expansion state

### API Integration Architecture

**Proxy Pattern**: All backend calls route through Next.js API handlers in `/app/api/`:

```
GET/POST /api/evaluations             → List/create eval jobs
GET      /api/evaluations/[id]         → Get job details
GET/POST /api/evaluations/datasets    → List/upload datasets
GET      /api/evaluations/datasets/[dataset_id]
GET      /api/assistant/[assistant_id] → Fetch assistant config
```

**Backend URL**: Configured via `NEXT_PUBLIC_BACKEND_URL` (default: `http://localhost:8000`)

**Authentication**: Custom header `X-API-KEY` passed from client

**Mock Data System**: Toggle via `USE_MOCK_DATA` flag in API routes. Mock files in `/public/mock-data/`.

### Type System

**Complex Type Hierarchies** in `/app/components/types.ts`:

**Evaluation Types:**
- `EvalJob` - Main evaluation job entity
- `ScoreObject` - Union type supporting 3 formats:
  - `NewScoreObjectV2` (with `traces[]` array)
  - `NewScoreObject` (with `individual_scores[]`)
  - `LegacyScoreObject` (old cosine similarity format)
- `TraceItem` - Individual Q&A evaluation trace
- `SummaryScore` - Aggregate metrics (NUMERIC/CATEGORICAL)

**Type Guards**: `isNewScoreObjectV2()`, `isLegacyScoreObject()` for runtime type checking

**Prompt Editor Types** in `/app/configurations/prompt-editor/types.ts`:
- `Commit` - Git-like commit with branch/parent relationships
- `Config` - LLM configuration blob with versioning
- `Tool` - Vector store tool definition
- `Variant` - A/B test variant configuration
- `DiffLine` - Myers diff algorithm output

### Styling System

**Current Design**: Vercel-style minimalist black/white theme

**Color Management**:
- All colors defined in `/app/lib/colors.ts` as TypeScript object
- Synchronized with CSS variables in `globals.css`
- Dark mode support via `prefers-color-scheme` media query
- See `COLOR_SCHEME.md` for quick preset options

**Styling Approach**:
1. Tailwind CSS for layout and spacing
2. Inline styles for colors (referencing `colors` object)
3. Hover states managed via React event handlers
4. No custom Tailwind classes or extended theme

**Color Palette**:
```typescript
bg: { primary: '#ffffff', secondary: '#fafafa' }
text: { primary: '#171717', secondary: '#737373' }
border: '#e5e5e5'
accent: { primary: '#171717', hover: '#404040' }
status: { success: '#16a34a', error: '#dc2626', warning: '#f59e0b' }
```

## Key Features

### 1. LLM Evaluation Pipeline

**Workflow**:
1. Upload CSV with `question,answer` columns
2. Configure experiment (model, instructions, vector stores)
3. Backend creates evaluation job
4. Job status polled every 10 seconds
5. Results displayed with detailed metrics

**Evaluation Modes**:
- Config-based: Specify model, instructions, tools
- Assistant-based: Use pre-configured assistant ID

**Metrics Display**:
- Summary scores (avg ± std for numeric, distribution for categorical)
- Per-item traces with expandable Q&A pairs
- Color-coded scores with dynamic thresholds
- CSV export functionality

### 2. Git-like Prompt Version Control

**Core Concepts** (see `/configurations/prompt-editor/page.tsx`):
- **Commits**: Versioned prompt snapshots with author/message/timestamp
- **Branches**: Parallel development streams (e.g., main, experiment-v2)
- **Diffs**: Myers algorithm for side-by-side change visualization
- **Merges**: Branch integration with duplicate commit detection

**Implementation Details**:
- All commits stored in-memory (no backend persistence yet)
- `createBranch()` preserves uncommitted changes when branching from HEAD
- `switchBranch()` loads latest commit from target branch
- `commitVersion()` creates new commit on current branch
- `mergeBranch()` prevents duplicate merges

**IMPORTANT**: When creating a new branch from current HEAD (not a specific historical commit), uncommitted changes in the editor must persist. This matches git behavior.

### 3. Configuration Management & A/B Testing

**Config Structure**:
```javascript
{
  id: string,
  name: string,
  version: number,  // Auto-incremented per name
  config_blob: {
    completion: {
      provider: 'openai' | 'anthropic' | 'google',
      params: { model, instructions, temperature, tools[] }
    }
  }
}
```

**Features**:
- Multi-version configs (auto-incremented)
- "Use Current Prompt" syncs from editor
- History tab shows all saved configs
- A/B testing with 2-4 variants
- Simulated test runs (1.5s delay, random scores)

See `CONFIG_AB.md` for complete feature specification.

## Key Implementation Patterns

### TypeScript Configuration

- Path alias `@/*` maps to project root
- Strict mode disabled (`strict: false`)
- JSX uses `react-jsx` transform
- Module resolution: `bundler`

### Date/Time Handling

- IST (Indian Standard Time) used throughout
- Timezone offsets manually added to UTC dates
- Format: `date-fns` with `date-fns-tz`

### Component Patterns

1. **Client-Side Components**: Most pages use `"use client"` for hooks and browser APIs
2. **Props Drilling**: Deep component trees pass 10+ props (no Context API)
3. **Inline Validation**: Error handling with alerts (no toast library)
4. **Loading States**: Skeleton loaders with Tailwind pulse animation

### Data Fetching

- Direct `fetch()` calls (no axios/react-query)
- SWR installed but minimally used
- Polling intervals for job status (10s)
- Mock data toggle for development

## File Path Conventions

- Use `@/` prefix for imports: `import Component from '@/app/components/Component'`
- All application code in `/app/` (App Router structure)
- Shared components: `/app/components/`
- Feature components: `/app/components/[feature]/`
- API routes: `/app/api/`
- Utilities: `/app/lib/`

## Development Workflow Guidelines

1. **Styling**: Use centralized colors from `/app/lib/colors.ts`, not hardcoded hex values
2. **State**: Keep state in component hierarchy, not global stores
3. **Types**: Use shared types from `/app/components/types.ts` for evaluations
4. **Colors**: Reference `colors` object for inline styles, Tailwind for layout
5. **API Calls**: Route through `/app/api/` handlers, not direct backend calls
6. **Date Formatting**: Use `formatDateTime()` from `/app/components/utils.ts`

## Backend Integration

**Environment Variables**:
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000  # Backend API base URL
```

**Authentication**:
- API keys stored in localStorage
- Passed via `X-API-KEY` header
- No JWT/OAuth implementation

**Dataset Upload**:
- CSV format: `question,expected_answer` columns
- Duplication factor supported (1-10)
- Backend handles file processing

## Technical Debt & Known Patterns

1. **Dual Routing**: Next.js App Router + React Router DOM coexist (avoid confusion)
2. **Props Drilling**: Consider Context API for deeply nested props
3. **Magic Strings**: Status values, localStorage keys hardcoded
4. **Mixed Styling**: Tailwind + inline styles + CSS modules (prefer consistency)
5. **No Testing**: No test files exist (add tests for critical paths)
6. **Large Files**: Some components exceed 1000 lines (consider splitting)
7. **Type Safety**: Strict mode disabled (many `any` types exist)

## Important Notes

1. **React 19**: Uses bleeding-edge React version (expect occasional breaking changes)
2. **LocalStorage**: API keys stored client-side (not production-ready for sensitive data)
3. **Mock Data**: Production code includes mock system (toggle via flags)
4. **IST Timezone**: All timestamps assume Indian Standard Time
5. **No Testing**: No test infrastructure exists yet
6. **Component Location**: Check both `/app/components/` and feature folders for components

## Documentation Files

- `/CLAUDE.md` - This file (architectural guidance)
- `/COLOR_SCHEME.md` - Quick color preset guide
- `/CONFIG_AB.md` - A/B testing feature specification
- `/README.md` - Standard Next.js boilerplate
