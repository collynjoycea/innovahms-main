# Innova HMS - Technology Stack

## Frontend
- React 18.2
- Vite 7.x (build tool, dev server)
- React Router DOM 7.x (client-side routing)
- Framer Motion 12.x (animations)
- Leaflet + React Leaflet 4.x (interactive maps)
- Marzipano 0.10 (360° virtual tours)
- Lucide React (icons)
- SweetAlert2 (modals/alerts)
- React Hot Toast (notifications)
- Axios 1.x (HTTP client)
- jsPDF + jspdf-autotable (PDF generation/export)
- QRCode 1.5 (QR code generation)
- @react-oauth/google (Google OAuth)
- react-facebook-login (Facebook OAuth)

## Backend
- Python 3.x
- Flask 3.x (REST API framework)
- flask-cors (CORS handling)
- psycopg2-binary (PostgreSQL driver)
- Werkzeug 3.x (utilities)
- SendGrid 6.x (email delivery)
- requests (PayMongo API calls)

## Database
- PostgreSQL
- Schema managed via SQL files in `backend/database/`

## AI / Chatbot
- Rasa (NLU + dialogue management)
- Custom Rasa actions in Python (`rasa/actions/actions.py`)

## External Services
- PayMongo (Philippine payment gateway — GCash, Maya/PayMaya, QR Ph, Card)
- SendGrid (transactional email)
- Google OAuth
- Facebook Login
- OpenStreetMap / Leaflet (maps)

## Development Commands

### Frontend
```bash
cd frontend
npm install
npm run dev        # Start Vite dev server (http://localhost:5173)
npm run build      # Production build
npm run preview    # Preview production build
```

### Backend
```bash
cd backend
pip install -r requirements.txt
python app.py      # Start Flask server (http://localhost:5000)
```

### Rasa Chatbot
```bash
cd rasa
rasa train
rasa run --enable-api
rasa run actions   # In separate terminal
```

## Environment Variables

### Backend (`backend/.env`)
- `DATABASE_URL` — PostgreSQL connection string
- `PAYMONGO_SECRET_KEY` — PayMongo secret key
- `SENDGRID_API_KEY` — SendGrid API key
- `FRONTEND_URL` — Frontend base URL (default: `http://localhost:5173`)

## Dev Proxy
Vite proxies `/api` and `/static` requests to `http://127.0.0.1:5000` during development (configured in `frontend/vite.config.js`).
