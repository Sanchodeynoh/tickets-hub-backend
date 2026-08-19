# TICKETS HUB — Backend API v1.1.0

## Quick Setup
1. Install Node.js from nodejs.org (LTS)
2. Run: `npm install`
3. Copy `.env.example` to `.env` and fill in values
4. Get Gmail App Password: myaccount.google.com > Security > App Passwords > name it TicketsHub
5. Run: `npm start`

## Admin Login
- Email: admin@ticketshub.com  
- Password: Admin@2026!

## Deploy to Render (free)
1. Push this folder to a GitHub repo called `tickets-hub-backend`
2. Go to render.com > New > Web Service > connect repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Add all .env variables in Render Environment section
6. Deploy — get your URL e.g. https://tickets-hub-api.onrender.com

## API Endpoints
- POST /auth/register
- POST /auth/login
- GET  /auth/me
- GET  /events
- POST /events (admin)
- PUT  /events/:id (admin)
- DELETE /events/:id (admin)
- POST /orders (triggers email to admin)
- GET  /orders (admin)
- GET  /orders/my (user)
- PATCH /orders/:id/status (admin - confirm/reject, emails buyer)
- GET  /orders/:id/confirm?secret= (email link quick confirm)
- GET  /orders/:id/reject?secret= (email link quick reject)
- POST /messages (user sends)
- GET  /messages/my (user thread)
- GET  /messages/threads (admin all)
- GET  /messages/thread/:id (admin specific)
- POST /messages/reply/:threadId (admin reply)
