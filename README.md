# KaniCompanion 蟹

> A supplementary practice companion for [WaniKani](https://www.wanikani.com). Drill kanji, vocab, and sentences without ever touching your official SRS reviews.

**Not affiliated with, endorsed by, or sponsored by Tofugu LLC.**

## 🏗 Stack

| Layer        | Tech                                       |
|--------------|--------------------------------------------|
| Frontend     | React 18 + Vite + Tailwind CSS + Motion    |
| Backend      | Rails 8 API + PostgreSQL                   |
| Background   | Solid Queue (Postgres-backed)              |
| Cache        | Solid Cache (Postgres-backed)              |
| Auth         | Rails 8 built-in auth (bcrypt + sessions)  |
| Frontend host| Cloudflare Pages                           |
| Backend host | Fly.io                                     |
| Database     | Neon (serverless Postgres)                 |
| Object store | Cloudflare R2                              |

## 📁 Structure

```
kanicompanion/
├── frontend/           # React SPA (Vite)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── backend/            # Rails 8 API
│   ├── app/
│   ├── config/
│   ├── db/
│   ├── Dockerfile
│   ├── fly.toml
│   └── Gemfile
├── .github/workflows/  # CI/CD
└── docker-compose.yml  # Local dev
```

## 🚀 Getting Started

### Prerequisites
- Node 20+
- Ruby 3.3+
- PostgreSQL 16+ (or use docker-compose)
- A WaniKani API v2 token (for testing sync)

### Local Development

```bash
# 1. Clone
git clone <your-repo-url>
cd kanicompanion

# 2. Spin up Postgres
docker compose up -d db

# 3. Backend setup
cd backend
bundle install
bin/rails db:setup
bin/rails server   # runs on :3000

# 4. Frontend setup (new terminal)
cd frontend
npm install
npm run dev        # runs on :5173
```

The frontend proxies `/api/*` to `localhost:3000` in dev — see `vite.config.ts`.

### Environment Variables

Copy `.env.example` files in each directory and fill them in. **Never commit real secrets.**

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full instructions.

**TL;DR:**
- Frontend → Cloudflare Pages (auto-deploys on push to `main`)
- Backend → Fly.io (`fly deploy` from `/backend`)
- Database → Neon (managed, free tier)

## 🧪 Testing

```bash
# Backend
cd backend && bin/rails test

# Frontend
cd frontend && npm run test
```

## 📜 License

MIT — see [LICENSE](./LICENSE)
