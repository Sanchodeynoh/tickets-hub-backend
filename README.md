# TICKETS HUB — Backend API

## Setup
1. Install Node.js from nodejs.org
2. Run: npm install
3. Copy .env.example to .env and fill values
4. Get Gmail App Password: myaccount.google.com > Security > App Passwords
5. Run: npm start

## Admin Login
- Email: admin@ticketshub.com
- Password: Admin@2026!

## API Endpoints
- POST /auth/register — Register user
- POST /auth/login — Login
- GET  /auth/me — Get current user
- GET  /events — All events (public)
- POST /events — Add event (admin)
- PUT  /events/:id — Edit event (admin)
- DELETE /events/:id — Delete event (admin)
- POST /orders — Submit order (triggers email to admin)
- GET  /orders — All orders (admin)
- PATCH /orders/:id/status — Confirm or reject
- GET  /orders/:id/confirm?secret= — Quick confirm via email link
- GET  /orders/:id/reject?secret= — Quick reject via email link
- POST /messages — Send message (user)
- GET  /messages/my — Get my thread (user)
- GET  /messages/threads — All threads (admin)
- GET  /messages/thread/:id — Specific thread (admin)
- POST /messages/reply/:threadId — Admin reply

## Deploy to Render (free)
1. Push to GitHub repo (tickets-hub-backend)
2. Go to render.com > New Web Service > Connect repo
3. Build: npm install | Start: npm start
4. Add all .env variables in Render dashboard
5. Copy your Render URL and update API_URL in frontend api.js
