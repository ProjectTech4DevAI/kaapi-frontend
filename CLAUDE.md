# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kaapi Frontend is a Next.js 16 application for evaluating LLM responses against QnA datasets. The application provides a simplified evaluation pipeline with dataset upload, automated evaluation, and results visualization capabilities. This is a Tech4Dev product called "Kaapi Konsole".

## Technology Stack

- **Framework**: Next.js 16.0.1 (App Router)
- **React**: 19.2.0
- **Routing**: React Router DOM 7.9.5 (in addition to Next.js routing)
- **Styling**: Tailwind CSS 4.x with PostCSS
- **TypeScript**: 5.x (with strict mode disabled)
- **Fonts**: Geist Sans and Geist Mono (via next/font)

## Development Commands

```bash
# Start development server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Code Architecture

### App Structure

The project uses Next.js App Router with the following structure:

- `app/page.tsx` - Main application page containing the SimplifiedEval component
- `app/layout.tsx` - Root layout with font configuration and metadata
- `app/globals.css` - Global styles with Tailwind imports and CSS variables

### Main Application Component (page.tsx)

The application is structured as a single-page evaluation tool with two main tabs:

**Upload Tab**:
- File upload interface for CSV datasets
- Expected format: `question,expected_answer` columns
- Progress tracking during evaluation
- Automatic redirect to results upon completion

**Results Tab**:
- Metrics overview (Average Score, Accuracy, F1 Score)
- Dataset summary and model information
- Detailed evaluation logs with question/answer comparisons
- Export functionality (CSV, clipboard, Langfuse)

**Key Components**:
- `SimplifiedEval` - Main container component with tab navigation
- `UploadTab` - Handles file upload and evaluation trigger
- `ResultsTab` - Displays evaluation results and metrics
- Helper components: `MetricCard`, `InfoItem`, `LogItem`

### State Management

Currently uses React's `useState` for local state:
- `activeTab` - Controls tab navigation
- `uploadedFile` - Stores uploaded CSV file
- `isEvaluating` - Tracks evaluation progress
- `evaluationResults` - Contains dummy/actual evaluation data
- `progress` - Evaluation progress percentage
- `sidebarCollapsed` - Sidebar visibility state

### Styling System

The application uses a custom monochrome/earth-tone color scheme defined with HSL values:

- Background: `hsl(42, 63%, 94%)` (warm beige)
- Primary accent: `hsl(167, 59%, 22%)` (dark teal/green)
- Text primary: `hsl(330, 3%, 19%)` (near black)
- Text secondary: `hsl(330, 3%, 49%)` (medium gray)
- Borders: `hsl(0, 0%, 85%)` (light gray)
- Status colors: Green (pass), Yellow (warning), Red (fail)

All colors are applied via inline styles rather than Tailwind utilities, allowing for precise HSL color control.

### TypeScript Configuration

- Path alias `@/*` maps to project root for imports
- Strict mode is disabled (`strict: false`)
- JSX uses `react-jsx` transform (not `preserve`)
- Module resolution set to `bundler`

## Key Implementation Notes

1. **Client-Side Component**: The main page uses `"use client"` directive as it requires React hooks and browser APIs

2. **Dummy Data**: The application currently uses `DUMMY_RESULTS` constant for evaluation results. When implementing backend integration, replace this with actual API calls

3. **Progress Simulation**: Evaluation progress is simulated with `setInterval`. Replace with actual progress tracking when implementing real evaluation pipeline

4. **Router Usage**: The app imports `useRouter` from `next/navigation` but also has `react-router-dom` installed. Consider consolidating routing approach

5. **Sidebar Navigation**: Two navigation items are present but only "Evaluations" is active. "Kaapi Keystore" is a placeholder for future functionality

## File Paths and Aliases

- Use `@/` prefix for imports from project root (configured in tsconfig.json)
- Example: `import Component from '@/app/components/Component'`

## Development Workflow

When modifying this codebase:

1. The app uses inline styles with HSL colors - maintain this pattern for consistency
2. Keep the monochrome color scheme using the defined HSL values
3. Component structure follows a pattern of main component → tab components → helper components
4. All interactive elements have hover states defined with inline style transitions

## Future Integration Points

Based on the current implementation, expect to integrate:

- Backend API for actual LLM evaluation (currently using dummy data)
- File upload handling to backend
- Real-time evaluation progress tracking
- Export functionality (CSV download, Langfuse integration)
- Authentication/API key management (Kaapi Keystore placeholder exists)
