# NextVestIQ - Copilot Instructions

## Project Overview
NextVestIQ is a real estate and business investment analysis platform.

## Tech Stack
- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **State**: Redux Toolkit
- **Database/Auth**: Firebase (Firestore + Auth)
- **Charts**: Recharts
- **Deployment**: Vercel

## Architecture
- `/src/app` — Next.js App Router pages and layouts
- `/src/components` — Reusable React components organized by feature
- `/src/store` — Redux Toolkit slices and store configuration
- `/src/lib` — Utility functions, Firebase config, calculation engines
- `/src/types` — TypeScript type definitions
- `/src/hooks` — Custom React hooks

## Conventions
- Use functional components with TypeScript
- Use `'use client'` directive only when components need interactivity
- Keep calculation logic in `/src/lib/calculations/` separate from UI
- Use Redux Toolkit for global state (deals, scenarios, user prefs)
- Use Firebase Firestore for persistence, Firebase Auth for login
- All financial calculations must be pure functions with unit tests
