# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start dev server at http://localhost:3000
npm run lint             # Run ESLint
npm run build            # Production build
npm run format           # Format TS/tsx with Prettier
```

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 16.0.7 (App Router)
- **React 19.2.0** + **TypeScript** (strict mode)
- **Routing**: Next.js App Router (react-router-dom is listed as a dependency but currently unused)
- **Styling**: Tailwind CSS 4.x + custom color system and styles defined in `/app/globals.css` for cases not supported by Tailwind
- **Data Fetching**: Native Fetch API + SWR 2.3.6 (used selectively where required)
- **Date/Time**: date-fns 4.1.0, date-fns-tz 3.2.0
- **ESLint**: Used for maintaining code quality, enforcing consistent coding standards, and catching potential issues during development and build time

### Directory Structure

| Path                           | Purpose                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| `app/(auth)/`                  | Authentication-related routes (e.g., invite, verify flows)                                    |
| `app/(main)/`                  | Main application routes (dashboard-level features like datasets, evaluations, settings, etc.) |
| `app/api/`                     | Backend API route handlers (Next.js route handlers acting as BFF layer)                       |
| `app/components/`              | App-scoped components used within routes/Pages                                                |
| `app/components/icons/`        | Hand-authored React icon components                                                           |
| `app/hooks/`                   | Custom React hooks specific to app features                                                   |
| `app/lib/`                     | Core shared logic and utilities across the application                                        |
| `app/lib/context/`             | React context providers (global state handling)                                               |
| `app/lib/store/`               | State management logic (custom/global store)                                                  |
| `app/lib/types/`               | TypeScript type definitions (shared across modules)                                           |
| `app/lib/utils/`               | Domain-specific utility modules (e.g., evaluation, guardrails)                                |
| `app/lib/data/`                | Static data and validators (e.g., guardrails validators)                                      |
| `app/lib/apiClient.ts`         | Centralized API client for forwarding requests to the backend                                 |
| `app/lib/authCookie.ts`        | Authentication cookie utilities (get/set/remove tokens)                                       |
| `app/lib/configFetchers.ts`    | API fetchers related to configuration modules                                                 |
| `app/lib/constants.ts`         | Global constants used across the app                                                          |
| `app/lib/guardrailsClient.ts`  | Client-side API helpers for guardrails features                                               |
| `app/lib/models.ts`            | Data models/interfaces for structured data handling                                           |
| `app/lib/navConfig.ts`         | Navigation configuration (sidebar/menu structure)                                             |
| `app/lib/promptEditorUtils.ts` | Utility functions for prompt editor logic                                                     |
| `app/lib/utils.ts`             | General utility/helper functions                                                              |
| `public/favicon.ico`           | Application favicon                                                                           |

## Import Aliases

[tsconfig.json](./tsconfig.json) sets paths: `{ "@/*": ["./*"] }`, so imports are resolved from the project root using the `@/` prefix. Use:

```
import { apiClient } from '@/app/lib/apiClient';
import { Providers } from '@/app/components/providers';
import { APP_NAME } from '@/app/lib/constants';
```

SVGs follow Next.js defaults (imported as static assets via next/image or referenced from /public).

## Routing & Role-Based Access

Routing uses the **Next.js App Router** exclusively. Routes are organized via route groups:

- `app/(auth)/` - unauthenticated flows (`/invite`, `/verify`)
- `app/(main)/` — authenticated app surface (`/evaluations`, `/datasets`, `/configurations`, `/guardrails`, `/knowledge-base`, `/settings`, etc.)

Role gating lives in middleware.ts and reads a kaapi_role cookie with two values:

- `user` - standard authenticated user
- `superuser` - admin; required for `/settings/*`

The cookie is issued server-side by [authCookie.ts](app/lib/authCookie.ts) after login/verify based on user.is_superuser. Middleware classifies each request into one of:

- `PUBLIC_ROUTES` — open to everyone (`/evaluations`, `/invite`, `/verify`, `/coming-soon/*`)
- `GUEST_ONLY_ROUTES` — unauthenticated only (`/keystore`); authenticated users are redirected to `/evaluations`
- `/settings/*` — superuser only
- Everything else — any authenticated user

There is no dynamic/custom role system; only the two static roles above.

## Toast Notifications

Toasts are managed via a React Context provider ([Toast.tsx](app/components/Toast.tsx)), mounted once in [Providers.tsx](app/components/providers/Providers.tsx). Consume them from any client component:

```
import { useToast } from '@/app/components/Toast';
// or the re-export: import { useToast } from '@/app/hooks/useToast';

function MyComponent() {
  const toast = useToast();

  toast.success('Saved successfully');          // success toast
  toast.error('Something went wrong');          // error toast
  toast.warning('Heads up');                    // warning toast
  toast.info('FYI');                            // info toast

  // Optional: override the default 5000ms auto-dismiss
  toast.success('Saved', 3000);

  // Low-level API (type + duration)
  toast.addToast('Custom message', 'success', 4000);
}
```

## Authentication [AuthContext.tsx](app/lib/context/AuthContext.tsx)

There is no `AuthService` class. Auth state is owned by a React Context provider (`AuthProvider`) mounted in [Providers.tsx](app/components/providers/Providers.tsx), and consumed via the `useAuth()` hook:

```
import { useAuth } from '@/app/lib/context/AuthContext';

function MyComponent() {
  const {
    isAuthenticated, isHydrated,
    session, currentUser, googleProfile,
    apiKeys, activeKey, addKey, removeKey, setKeys,
    loginWithToken, logout,
  } = useAuth();
}
```

## App Context [AppContext.tsx](app/lib/context/AppContext.tsx)

Sidebar state is managed via `AppProvider`, consumed with `useApp()`:

```
import { useApp } from '@/app/lib/context/AppContext';

const { sidebarCollapsed, setSidebarCollapsed, toggleSidebar } = useApp();
```

## Code Quality Guidelines

Follow these rules when writing or modifying code in this repository:

- **File size limit**: Do not let any file exceed **500 LOC**. If a file is approaching or has crossed this limit, split it into smaller modules (extract sub-components, hooks, utilities, or types into their own files).
- **Single Responsibility Principle (SRP)**: Each component, hook, function, or module should do one thing and have one reason to change. If a component handles data fetching, business logic, and UI rendering all together, split it — extract data fetching into a hook, business logic into a utility, and keep the component focused on presentation.
- **Don't Repeat Yourself (DRY)**: Before writing new logic, search the codebase for existing implementations. Reuse and extend rather than duplicate. If you spot the same pattern emerging in 2+ places, extract it into a shared helper, hook, or component in `app/lib/` or `app/components/`.
- **Reuse existing components and icons**: Always check `app/components/` and `app/components/icons/` before creating a new component or icon. Prefer composing or extending existing primitives over authoring new ones. New icons go in `app/components/icons/` as hand-authored React components — do not inline SVGs in feature code.
- **Reuse existing utilities and hooks**: Check `app/lib/utils/`, `app/lib/utils.ts`, and `app/hooks/` before adding new helpers. Domain-specific utilities belong under `app/lib/utils/<domain>/`.
- **Reuse existing types**: Shared types live in `app/lib/types/` and `app/lib/models.ts` — import from there instead of redefining shapes locally.

## API Client & Error Handling

The BFF layer uses [apiClient.ts](app/lib/apiClient.ts) which forwards requests from Next.js route handlers to the backend at `BACKEND_URL` (defaults to `http://localhost:8000`). Key patterns:

- **Server-side (route handlers)**: Use `apiClient(request, endpoint, options)` — it relays `X-API-KEY` and `Cookie` headers automatically and returns `{ status, data, headers }`.
- **Client-side**: Use `clientFetch(endpoint, options)` — handles token refresh on 401, dispatches `AUTH_EXPIRED_EVENT` when refresh fails, and throws with a message extracted from `error`, `message`, or `detail` fields in the response body.
- **Error extraction**: `extractErrorMessage(body, fallback)` reads `body.error || body.message || body.detail` — follow this pattern when adding new API routes.
- **Auth expiry**: On 401 with failed refresh, a `CustomEvent(AUTH_EXPIRED_EVENT)` is dispatched on `window`, which `AuthContext` listens to for automatic logout.
