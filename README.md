# Innova HMS

Hotel management school project with:
- `frontend/` for the React + Vite client
- `backend/` for the Flask API and database setup
- `rasa/` for the chatbot configuration

## Main Folder Guide

### `frontend/src`
- `App.jsx`
  Main route map for the whole frontend.
- `components/`
  Shared UI parts used across multiple pages and layouts.
- `customer/`
  Customer-only pages such as dashboard and bookings.
- `hooks/`
  Reusable React hooks.
- `layouts/`
  Shared page shells per role or section.
- `pages/`
  Route pages grouped by feature or role.
- `utils/`
  Small helper functions.

### `backend`
- `app.py`
  Main Flask backend file and API routes.
- `database/`
  SQL setup, schema, seed files, and database bootstrap helpers.
- `static/uploads/`
  Uploaded room images and static file assets served by backend.

## Database Files

The active SQL setup is kept in `backend/database/` and reduced to these five files:
- `schema.sql`
- `features.sql`
- `membership.sql`
- `notifications.sql`
- `seed.sql`

Extra database-safe bootstrap helpers now live in `backend/database/bootstrap.py`.
That keeps `backend/app.py` focused on routes, request handling, and database access instead of schema definitions.

## Folder Rules

To keep debugging simple:
- SQL files live in `backend/database/`
- backend Python code lives in `backend/`
- frontend code lives in `frontend/`
- Rasa YAML files live in `rasa/` and `rasa/data/`
- uploaded backend files live in `backend/static/uploads/`

## Suggested Debugging Flow

1. Check `frontend/src/App.jsx` to see which page or route is active.
2. Check the matching page inside `frontend/src/pages/` or `frontend/src/customer/`.
3. If the page fetches data, search the API path inside `backend/app.py`.
4. If the issue is layout-only, inspect the related file in `frontend/src/components/` or `frontend/src/layouts/`.

## Cleanup Done

Removed unused or template-style files to make the project easier to understand:
- old CRA test/template files
- unused sample components
- unused extra layout/page files

This cleanup was limited to files that were not referenced by the current app structure.
