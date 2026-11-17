# Folio360 Frontend

Web application for **Folio360** — a unified digital academic and professional identity platform.

## Tech Stack

- **React 19** + **Vite 8** + **TypeScript**
- **Tailwind CSS v4** with centralized CSS variables (`src/design/tokens.css`)
- **Motion** (`motion/react`) for gentle editorial reveals
- **Lucide React** for iconography
- **React Router v7** for client-side routing

## Getting Started

```bash
npm install
cp .env.example .env
npm run dev
```

### Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server at `http://localhost:5173` |
| `npm run typecheck` | Run strict TypeScript type-checking (`tsc --noEmit`) |
| `npm run build` | Type-check and build production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |

## Mock vs. Live API Mode

Set `VITE_USE_MOCKS=true` (default in `.env.example`) during Phase 1 frontend development. All requests go through `src/services/http.ts` and `src/services/api/*` following **API Contract Revision 2** (`/api/v1`). Access tokens are kept in memory only; refresh tokens are never stored in `localStorage`.

## Project Structure

```text
src/
  app/          AuthContext, ProtectedRoute
  design/       Locked theme tokens, ThemeProvider, StrandCanvas, shared UI primitives
  features/     Home, Auth, Workspace Overview, and module scaffolds
  hooks/        useApiQuery
  layouts/      PublicLayout, WorkspaceLayout
  services/     httpClient, domain API services, mock adapter + fixtures
  types/        TypeScript contracts mirroring API Contract Revision 2
```
