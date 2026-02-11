# replit.md

## Overview

**idea.dump** is a minimalist idea-capturing web application with a dark, brutalist aesthetic. Users can quickly jot down thoughts, view them in a card grid, and delete them. It's a simple CRUD app: create ideas, list them, and delete them. The app uses a monorepo structure with a React frontend and Express backend, backed by PostgreSQL.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure
The project is organized into three main directories:
- **`client/`** — React frontend (Vite-powered SPA)
- **`server/`** — Express backend (API + static file serving)
- **`shared/`** — Code shared between frontend and backend (schema, route definitions, types)

### Frontend (`client/src/`)
- **Framework**: React with TypeScript
- **Bundler**: Vite (config in `vite.config.ts`)
- **Routing**: Wouter (lightweight client-side routing)
- **State/Data Fetching**: TanStack React Query for server state management
- **UI Components**: shadcn/ui (new-york style) with Radix UI primitives, stored in `client/src/components/ui/`
- **Styling**: Tailwind CSS with CSS variables for theming. Strict dark mode only. Uses Inter and JetBrains Mono fonts.
- **Animations**: Framer Motion for card entry/exit animations
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend (`server/`)
- **Framework**: Express 5 on Node.js, run via `tsx`
- **Entry point**: `server/index.ts` creates an HTTP server
- **Routes**: Defined in `server/routes.ts`, registered against the Express app
- **Storage layer**: `server/storage.ts` provides a `DatabaseStorage` class implementing `IStorage` interface. This abstraction makes it easy to swap storage implementations.
- **Dev mode**: Vite dev server middleware is attached for HMR (`server/vite.ts`)
- **Production**: Static files served from `dist/public` (`server/static.ts`)

### Shared Code (`shared/`)
- **`schema.ts`**: Drizzle ORM table definitions and Zod validation schemas (using `drizzle-zod`). Single table: `ideas` with `id`, `content`, and `createdAt`.
- **`routes.ts`**: API contract definitions with paths, methods, input schemas, and response schemas. Both client and server import from here to stay in sync.

### Database
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Driver**: `pg` (node-postgres) Pool
- **Connection**: Via `DATABASE_URL` environment variable (required)
- **Schema push**: `npm run db:push` uses `drizzle-kit push` to sync schema to database
- **Migrations**: Output to `./migrations` directory

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ideas` | List all ideas (newest first) |
| POST | `/api/ideas` | Create a new idea (body: `{ content: string }`) |
| DELETE | `/api/ideas/:id` | Delete an idea by ID |

The server seeds 3 default ideas if the database is empty on startup.

### Build Process
- **Dev**: `npm run dev` — runs `tsx server/index.ts` with Vite middleware for HMR
- **Build**: `npm run build` — runs `script/build.ts` which uses Vite to build the client and esbuild to bundle the server into `dist/index.cjs`
- **Start**: `npm start` — runs the production build from `dist/index.cjs`

## External Dependencies

### Database
- **PostgreSQL** — Required. Connection string must be in `DATABASE_URL` environment variable. Uses `connect-pg-simple` for session storage support (though sessions aren't actively used yet).

### Key NPM Packages
- **drizzle-orm** + **drizzle-kit** — Database ORM and migration tooling
- **express** (v5) — HTTP server
- **@tanstack/react-query** — Client-side data fetching and caching
- **framer-motion** — Animations
- **zod** + **drizzle-zod** — Runtime validation and schema generation
- **wouter** — Client-side routing
- **shadcn/ui** components (Radix UI primitives) — Full component library installed
- **date-fns** — Date formatting (relative timestamps on cards)
- **lucide-react** — Icons

### Replit-Specific Plugins
- `@replit/vite-plugin-runtime-error-modal` — Always active
- `@replit/vite-plugin-cartographer` and `@replit/vite-plugin-dev-banner` — Active in dev mode on Replit only