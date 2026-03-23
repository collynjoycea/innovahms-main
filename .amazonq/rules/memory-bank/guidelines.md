# Innova HMS - Development Guidelines

## Code Quality Standards

### General
- Functional components only — no class components
- Named exports for hooks/utilities; default exports for components and pages
- Keep components focused: layouts handle structure, pages handle data/logic, components handle UI
- Avoid global state libraries — use `localStorage` for session/auth, local `useState` for UI state

### Naming Conventions
- Components/Pages: PascalCase (`AdminSidebar`, `HrPayrollStaffLayout`)
- Hooks: camelCase prefixed with `use` (`useStaffSession`)
- Utility functions: camelCase (`readSession`, `resolveImg`)
- Route paths: kebab-case (`/staff/check-in`, `/hr/task-logs`)
- localStorage keys: camelCase strings (`staffUser`, `adminSession`, `hrDarkMode`)

### File Organization
- One component per file, filename matches component name
- Staff pages grouped by role under `pages/Staff/<role>/`
- Each role has its own Layout, Header, and Sidebar component trio

---

## Layout Pattern (All Role Dashboards)

Every staff/admin/owner role follows this exact structure:

```jsx
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import RoleHeader from '../components/RoleHeader';
import RoleSidebar from '../components/RoleSidebar';

const RoleLayout = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('roleThemeKey');
    return saved ? saved === 'dark' : true; // or JSON.parse(saved)
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('roleThemeKey', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  return (
    <div className={`flex h-screen overflow-hidden ${isDarkMode ? 'bg-[#09090b]' : 'bg-gray-50'}`}>
      <RoleSidebar isDarkMode={isDarkMode} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <RoleHeader isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ isDarkMode }} />
        </main>
      </div>
    </div>
  );
};

export default RoleLayout;
```

- `isDarkMode` is always persisted to `localStorage` with a role-specific key
- `Outlet context` passes `isDarkMode` to child pages (some roles use `context={[isDarkMode]}` array form)
- Dark mode applies `dark` class to `document.documentElement` for Tailwind `dark:` utilities

---

## Sidebar Pattern

Sidebars use a `menuSections` array to define grouped navigation:

```jsx
const menuSections = [
  {
    title: "Section Title",
    items: [
      { name: 'Page Name', path: '/role/path', icon: <LucideIcon /> },
      { name: 'Page Name', path: '/role/path', icon: <LucideIcon />, badge: "NEW" },
    ]
  },
];
```

- Active state: `location.pathname === item.path` via `useLocation()`
- Active item styling: gold accent `text-[#c9a84c]`, `bg-[#c9a84c]/10`, left border indicator `bg-[#c9a84c]`
- Icons from `lucide-react`, cloned with `React.cloneElement(item.icon, { size: 18, strokeWidth: active ? 2.5 : 2 })`
- Online/offline status indicator using `navigator.onLine` + `window` event listeners
- Custom scrollbar via inline `<style>` tag with `::-webkit-scrollbar` rules

---

## Authentication & Session Management

### Session Keys in localStorage
| Role | Key | Value |
|------|-----|-------|
| Customer | `user` or `customerSession` | JSON object or `"true"` |
| Front Desk Staff | `staffSession` | `"true"` |
| HR/Manager/Other Staff | `staffUser` | JSON object |
| Admin | `adminSession` | `"true"` |

### Protected Route Pattern
```jsx
const ProtectedRole = ({ children }) => {
  const isAuth =
    localStorage.getItem("staffSession") === "true" ||
    localStorage.getItem("managerSession") === "true" ||
    localStorage.getItem("hrSession") === "true" ||
    localStorage.getItem("staffUser");
  return isAuth ? children : <Navigate to="/staff/login" replace />;
};
```

### useStaffSession Hook
Use `useStaffSession` for reactive staff session data in components:

```js
import { useStaffSession } from '../hooks/useStaffSession';

const { staffId, hotelId, hotelName, firstName, lastName, role, qs } = useStaffSession();
// qs = `?hotel_id=${hotelId}` — append to API calls to scope by hotel
```

- Listens to both `storage` (cross-tab) and `staffSessionChanged` (same-tab) events
- Dispatch `staffSessionChanged` custom event after login/logout in the same tab

---

## Styling Conventions (Tailwind CSS)

### Brand Colors
- Gold accent: `#c9a84c` (active nav, highlights, CTAs)
- Dark background: `#09090b` (admin/staff dark mode)
- Near-black: `#050505` (HR dark mode)

### Dark/Light Mode Pattern
```jsx
// Container
className={`${isDarkMode ? 'bg-[#09090b] text-white' : 'bg-gray-50 text-gray-800'}`}

// Borders
className={`${isDarkMode ? 'border-[#c9a84c]/20' : 'border-gray-200'}`}

// Cards
className={`${isDarkMode ? 'bg-[#c9a84c]/5 border-[#c9a84c]/10' : 'bg-white border-gray-200 shadow-sm'}`}
```

### Typography
- Section labels: `text-[9px] font-black tracking-[0.25em] uppercase`
- Nav items: `text-[11px] uppercase tracking-wide font-bold` (active: `font-black`)
- Role badges: `text-[8px] font-bold uppercase tracking-widest`

### Layout Structure
- Full-height layouts: `flex h-screen overflow-hidden`
- Sidebar: fixed width `w-[260px]`, `flex-shrink-0`
- Content area: `flex-1 flex flex-col min-w-0 overflow-hidden`
- Scrollable main: `flex-1 overflow-y-auto`
- Max content width: `max-w-[1600px] mx-auto`

### Animations
- Page entry: `animate-in fade-in slide-in-from-bottom-4 duration-700`
- Transitions: `transition-all duration-300`, `transition-colors duration-300`
- Logo hover: `hover:scale-105`

---

## Backend Patterns (Flask)

### Route Structure
```python
@app.route('/api/resource', methods=['GET', 'POST'])
def resource_handler():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # ... query logic
        conn.commit()
        return jsonify(result), 200
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        _safe_close(conn, cur)
```

### DB Access Conventions
- Always use `RealDictCursor` for dict-style row access
- Always initialize `conn = None; cur = None` before try block
- Always call `_safe_close(conn, cur)` in `finally`
- Rollback on exception: `if conn: conn.rollback()`

### PayMongo Integration
- GCash, Maya (PayMaya), QR Ph: use Payment Intent + Payment Method + Attach flow
- Card: use PayMongo Link (`/v1/links`)
- Payment intent IDs start with `pi_` — used to distinguish intent vs link in verify endpoint
- Always convert amounts to cents: `int(amount * 100)`
- Success/failed redirect URLs built from `FRONTEND_URL` env var

### Error Response Format
```python
return jsonify({'error': 'Human-readable message'}), 4xx_or_5xx
```

### Environment Variables
- Load via `os.getenv('VAR_NAME', 'default_value')`
- `FRONTEND_URL` defaults to `http://localhost:5173`
- `PAYMONGO_SECRET_KEY` used in `_paymongo_headers()`

---

## API Communication (Frontend)

- Use `axios` for all HTTP requests
- API base path: `/api/...` (proxied to Flask in dev via Vite)
- Static files: `/static/uploads/rooms/<filename>` (proxied to Flask)
- Append `?hotel_id=<id>` to scope requests by hotel (use `qs` from `useStaffSession`)

---

## Component Patterns

### Page Component (minimal)
```jsx
import Hero from "../components/Hero";
import FeaturedRooms from "../components/FeaturedRooms";

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedRooms />
    </>
  );
}
```

### Notifications
- Use `react-hot-toast` for toast notifications
- Use `sweetalert2` for confirmation dialogs and modals

### PDF Export
- Use `jspdf` + `jspdf-autotable` for generating downloadable reports

### Maps
- Use `react-leaflet` + `leaflet` for interactive maps (NeighborhoodMap component)

### 360° Tours
- Use `marzipano` for virtual room tours (VirtualTour component)
