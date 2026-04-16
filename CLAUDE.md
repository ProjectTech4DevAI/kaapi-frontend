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
- **Routing**: Next.js App Router + React Router DOM 7.9.5 (dual system)
- **Styling**: Tailwind CSS 4.x + custom color system and styles defined in `/app/globals.css` for cases not supported by Tailwind
- **Data Fetching**: Native Fetch API + SWR 2.3.6 (used selectively where required)
- **Date/Time**: date-fns 4.1.0, date-fns-tz 3.2.0
- **ESLint**: Used for maintaining code quality, enforcing consistent coding standards, and catching potential issues during development and build time

### Directory Structure

| Path                       | Purpose                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| `app/(auth)/`              | Authentication-related routes (e.g., invite, verify flows)                                    |
| `app/(main)/`              | Main application routes (dashboard-level features like datasets, evaluations, settings, etc.) |
| `app/api/`                 | Backend API route handlers (Next.js route handlers acting as BFF layer)                       |
| `app/components/`          | App-scoped UI components used within routes                                                   |
| `app/hooks/`               | Custom React hooks specific to app features                                                   |
| `lib/`                     | Core shared logic and utilities across the application                                        |
| `lib/components/`          | Reusable shared components (not tightly coupled to app routes)                                |
| `lib/context/`             | React context providers (global state handling)                                               |
| `lib/store/`               | State management logic (if using custom/global store)                                         |
| `lib/types/`               | TypeScript type definitions (shared across modules)                                           |
| `lib/apiClient.ts`         | Centralized API client for handling backend requests                                          |
| `lib/authCookie.ts`        | Authentication cookie utilities (get/set/remove tokens)                                       |
| `lib/configFetchers.ts`    | API fetchers related to configuration modules                                                 |
| `lib/constants.ts`         | Global constants used across the app                                                          |
| `lib/models.ts`            | Data models/interfaces for structured data handling                                           |
| `lib/navConfig.ts`         | Navigation configuration (sidebar/menu structure)                                             |
| `lib/promptEditorUtils.ts` | Utility functions for prompt editor logic                                                     |
| `lib/utils.ts`             | General utility/helper functions                                                              |
| `public/favicon.ico`       | Application favicon                                                                           |

## Import Aliases

[tsconfig.json](./tsconfig.json) sets paths: `{ "@/*": ["./*"] }`, so imports are resolved from the project root using the `@/` prefix. Use:

```
import { apiClient } from '@/app/lib/apiClient';
import { Providers } from '@/app/components/providers';
import { APP_NAME } from '@/app/lib/constants';
```

SVGs follow Next.js defaults (imported as static assets via next/image or referenced from /public). Most in-app icons are hand-authored React components under `app/components/icons` rather than SVG imports.

## Routing & Role-Based Access

Routing uses the **Next.js App Router** exclusively (no React Router trees). Routes are organized via route groups:

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

Toasts are managed via a React Context provider ([Toast.tsx](app/components/Toast.tsx)), mounted once in [Providers.tsx](app/components/providers/Providers.tsx). Consume them from any client com

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
