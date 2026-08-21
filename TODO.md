# Task: Make uploaded room & hotel images display correctly everywhere

## Steps
- [x] 1. Update `frontend/src/utils/resolveImg.js` — dynamic API base + fix double-slash on /static/ paths
- [x] 2. Update `frontend/src/pages/owner/Rooms.jsx` — fix broken fallback thumbnail path (`/images/room1.jpg` -> `/images/deluxe-room.jpg`)
- [x] 3. Update `frontend/src/pages/customer/VisionSuites.jsx` — show fallback instead of hiding image on error
- [x] 4. Verify `frontend/src/pages/Home.jsx` & HotelDetail use resolveImg with valid fallbacks
- [x] 5. Cleanup temporary scripts

