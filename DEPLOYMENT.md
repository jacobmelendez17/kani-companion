# Deployment Guide

This walks through deploying KaniCompanion for free using:
- **Frontend** → Cloudflare Pages
- **Backend** → Fly.io
- **Database** → Neon (serverless Postgres)

> ⏱ **Time estimate:** ~45 minutes for first deploy. After that, every push to `main` redeploys automatically via GitHub Actions.

---

## 0. Prerequisites

You'll need accounts on:
- [GitHub](https://github.com) ✓ (you already have one)
- [Cloudflare](https://cloudflare.com) (free)
- [Fly.io](https://fly.io) (free with $5/month free credit — no card required for hobby projects)
- [Neon](https://neon.tech) (free tier: 0.5 GB storage, plenty for this app)

Install CLIs locally:

```bash
# Fly.io CLI (macOS)
brew install flyctl

# Or curl install
curl -L https://fly.io/install.sh | sh
```

---

## 1. Push the code to GitHub

The repo `kani-companion` already exists. Push this scaffold to it:

```bash
cd path/to/kanicompanion
git init
git add .
git commit -m "Initial scaffold: frontend + backend + deployment configs"
git branch -M main
git remote add origin https://github.com/jacobmelendez17/kani-companion.git
git push -u origin main
```

> ⚠️ Before pushing — **double-check** your `.gitignore` covers `.env`, `master.key`, and `credentials/*.key`. Never commit secrets.

---

## 2. Bootstrap the Rails app

The `backend/` directory is a scaffold, not a fully-generated Rails app. Generate the missing boilerplate:

```bash
cd backend

# Generate Rails 8 boilerplate without overwriting our files
rails new . --api --database=postgresql --skip-test --skip-jbuilder --skip-git --force --skip-bundle

# Install gems
bundle install

# Install Solid Queue, Solid Cache, Solid Cable
bin/rails solid_cache:install
bin/rails solid_queue:install
bin/rails solid_cable:install

# Generate ActiveRecord encryption keys (for the WaniKani token)
bin/rails db:encryption:init
# Copy the printed YAML into config/credentials.yml.enc:
EDITOR="code --wait" bin/rails credentials:edit
# (Paste the active_record_encryption block, save, close.)

# Set up the local DB
bin/rails db:create
bin/rails db:migrate

# Verify it boots
bin/rails server
```

Visit `http://localhost:3000/up` — should return 200.

---

## 3. Set up Neon (Postgres)

1. Go to [console.neon.tech](https://console.neon.tech) and create a new project named `kani-companion`.
2. Choose the region closest to your Fly.io region (default: `us-east`).
3. Copy the **pooled** connection string from the dashboard. It looks like:
   ```
   postgres://neondb_owner:xxxx@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Save it — you'll need it for Fly secrets.

---

## 4. Deploy backend to Fly.io

```bash
cd backend

# Sign in
fly auth login

# Launch — read the fly.toml we already provided
fly launch --copy-config --no-deploy
# When prompted:
#   - App name: kani-companion-api  (or whatever you prefer)
#   - Region: pick closest to you
#   - Postgres: NO (we're using Neon)
#   - Redis: NO (we're using Solid Queue)

# Set production secrets
fly secrets set \
  DATABASE_URL="<your-neon-connection-string>" \
  RAILS_MASTER_KEY="$(cat config/master.key)" \
  ALLOWED_ORIGINS="https://kani-companion.pages.dev"
# (We'll update ALLOWED_ORIGINS once Cloudflare Pages gives us a real URL.)

# Deploy
fly deploy
```

Once deployment finishes, visit `https://<your-app-name>.fly.dev/up` — should return 200.

**Note your Fly URL** — e.g. `https://kani-companion-api.fly.dev` — you'll need it for the frontend.

---

## 5. Deploy frontend to Cloudflare Pages

### Option A: Connect to GitHub (recommended)

1. Go to [Cloudflare Pages dashboard](https://dash.cloudflare.com/?to=/:account/pages).
2. **Create a project** → **Connect to Git** → select `kani-companion`.
3. Configure build:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `frontend`
   - **Environment variables:**
     - `VITE_API_BASE_URL` = `https://<your-fly-app-name>.fly.dev`
4. Click **Save and Deploy**.

After the first build, Cloudflare gives you a URL like `https://kani-companion.pages.dev`.

### Option B: CLI

```bash
cd frontend
npm install
VITE_API_BASE_URL=https://kani-companion-api.fly.dev npm run build
npx wrangler pages deploy dist --project-name=kani-companion
```

---

## 6. Update CORS

Now that you have your real Cloudflare Pages URL, update Fly:

```bash
cd backend
fly secrets set ALLOWED_ORIGINS="https://kani-companion.pages.dev,https://<custom-domain-if-any>"
```

Fly will automatically restart the app.

---

## 7. (Optional) Set up auto-deploy via GitHub Actions

Our CI workflow at `.github/workflows/ci.yml` will redeploy on every push to `main`. To enable it, add these GitHub repository secrets (Settings → Secrets and variables → Actions):

| Secret | Where to get it |
|--------|-----------------|
| `FLY_API_TOKEN` | `fly tokens create deploy` |
| `CLOUDFLARE_API_TOKEN` | [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) → "Edit Cloudflare Workers" template |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard URL: `dash.cloudflare.com/<this-id>` |
| `VITE_API_BASE_URL` | Your Fly app URL, e.g. `https://kani-companion-api.fly.dev` |

Once those are set, every push to `main` will:
1. Run frontend lint + build
2. Run backend tests
3. Deploy frontend to Cloudflare Pages
4. Deploy backend to Fly.io

---

## 8. (Optional) Custom domain

### Cloudflare Pages
1. Pages dashboard → your project → **Custom domains** → Add custom domain
2. Cloudflare auto-configures DNS if your domain is on Cloudflare.

### Fly.io (for `api.yourdomain.com`)
```bash
fly certs create api.yourdomain.com
# Then add the CNAME Cloudflare prompts you for
```

Don't forget to update `ALLOWED_ORIGINS` and `VITE_API_BASE_URL` after.

---

## 🧯 Troubleshooting

### "Application Error" on first Fly.io visit
- Check logs: `fly logs`
- Most common: missing `RAILS_MASTER_KEY` or DB migrations didn't run.
- Force a deploy with the release command: `fly deploy --strategy immediate`

### CORS errors in browser console
- Verify `ALLOWED_ORIGINS` on Fly matches your Pages URL exactly (no trailing slash).
- `fly secrets list` to confirm.

### Frontend builds but blank page
- Check the browser console for the API URL it's hitting.
- Verify `VITE_API_BASE_URL` was set at build time (env vars during `npm run build`, not runtime).

### Solid Queue jobs not running
- Confirm `SOLID_QUEUE_IN_PUMA=true` is in `fly.toml` (we have it).
- Or add a separate worker process in `fly.toml` `[processes]` block.

### Neon Postgres connection drops
- Use the **pooled** connection string (the one with `-pooler` in the host).
- Add `?sslmode=require` to the URL if not already present.

---

## 💸 Free tier limits (as of 2026)

- **Fly.io:** ~3 small VMs, 160GB transfer/month — plenty for a hobby project. Auto-stop machines reduce idle cost.
- **Cloudflare Pages:** Unlimited bandwidth, 500 builds/month — generous.
- **Neon:** 0.5 GB storage, 1 project, autoscale to zero. Will scale up to ~$19/mo if you outgrow it.

If you hit limits: paid Fly tiers start at ~$5/mo, Neon Scale plan at $19/mo.

---

## 🔐 Security checklist before going public

- [ ] `RAILS_MASTER_KEY` is set as a Fly secret, not committed
- [ ] `master.key` is in `.gitignore`
- [ ] `ALLOWED_ORIGINS` is restricted to your real frontend domains
- [ ] WaniKani tokens are encrypted (verify with `User.first.wanikani_profile.api_token` — should not match what's in DB)
- [ ] Filter parameters in `config/initializers/filter_parameter_logging.rb` includes `:api_token`
- [ ] `force_https = true` in `fly.toml` ✓
- [ ] Rate limit auth endpoints (consider adding `rack-attack` gem)
