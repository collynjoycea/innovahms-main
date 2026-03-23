# Innova HMS - Project Structure

## Repository Layout
```
innovahms-main/
├── backend/                  # Flask REST API
│   ├── app.py                # Main application, all routes
│   ├── requirements.txt      # Python dependencies
│   ├── database/             # SQL schema, seed, migration files
│   │   ├── schema.sql        # Main DB schema
│   │   ├── seed.sql          # Seed data
│   │   ├── innova_suites.sql # Innova Suites hotel data
│   │   ├── vision_suites.sql # Vision Suites hotel data
│   │   └── ...               # Other migration/seed files
│   ├── static/uploads/rooms/ # Served room images
│   └── uploads/rooms/        # Uploaded room images
├── frontend/                 # React + Vite SPA
│   ├── src/
│   │   ├── App.jsx           # Root router, all route definitions
│   │   ├── main.jsx          # React entry point
│   │   ├── components/       # Shared/reusable UI components
│   │   ├── layouts/          # Role-based layout wrappers
│   │   ├── pages/            # Page components by role
│   │   │   ├── admin/        # Super admin pages
│   │   │   ├── owner/        # Hotel owner pages
│   │   │   ├── customer/     # Customer-specific pages
│   │   │   └── Staff/        # All staff role pages
│   │   │       ├── frontdesktop/       # Front desk staff
│   │   │       ├── hotelmanager/       # Hotel manager
│   │   │       ├── housekeepingmainte/ # Housekeeping & maintenance
│   │   │       ├── HrPayrollStaff/     # HR & payroll
│   │   │       └── inventorysupply/    # Inventory & supply
│   │   ├── customer/         # Customer dashboard components
│   │   ├── hooks/            # Custom React hooks
│   │   └── utils/            # Utility functions
│   ├── public/images/        # Static hotel/room images
│   ├── package.json
│   └── vite.config.js        # Vite config with API proxy
├── rasa/                     # Rasa AI chatbot
│   ├── actions/actions.py    # Custom Rasa actions
│   ├── data/                 # NLU, stories, rules
│   ├── domain.yml
│   └── config.yml
└── innovahms-main/           # Older/nested copy of the project (legacy)
```

## Core Components

### Backend (Flask)
- Single `app.py` file contains all API routes
- PostgreSQL database via `psycopg2`
- `get_db_connection()` for DB access, `_safe_close(conn, cur)` for cleanup
- `RealDictCursor` used for dict-style row access
- PayMongo payment integration (payment intents, links, methods)
- SendGrid for email
- File uploads for room images

### Frontend (React)
- `App.jsx` is the single source of truth for all routes
- Role-based layouts: each role has its own Layout + Header + Sidebar trio
  - `CustomerLayout`, `OwnerLayout`, `AdminLayout`, `FrontdesktopLayout`
  - `HotelManagerLayout`, `HousekeepingMainteLayout`, `HrPayrollStaffLayout`, `InventoryLayout`
- Protected routes via inline components: `ProtectedAdmin`, `ProtectedStaff`, `ProtectedRole`, `ProtectedCustomer`
- Auth state stored in `localStorage` (e.g. `adminSession`, `staffSession`, `user`)

### AI Chatbot (Rasa)
- Separate Rasa server with custom actions
- Integrated into frontend via `GlobalAIAssistant.jsx`

## Architectural Patterns
- Monolithic Flask backend (all routes in one file)
- SPA frontend with client-side routing (React Router v7)
- Role-based access control via localStorage session keys
- Proxy: Vite dev server proxies `/api` and `/static` to Flask on port 5000
- No Redux/Zustand — state managed locally per component or via localStorage
- `isDarkMode` state lifted to `App.jsx` and passed as prop to staff/HR/housekeeping pages
