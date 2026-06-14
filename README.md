# Codence

Consensus-driven AI code review and security validation platform built on [Genlayer](https://genlayer.com).

Codence uses Genlayer's Intelligent Contract and multi-validator consensus mechanism to provide trustless, deterministic code analysis. When you submit code for review, multiple independent AI validators on the Genlayer network analyze it in parallel. Their findings must reach consensus before results are finalized, eliminating single-point-of-failure bias that plagues traditional AI code review tools.

**Live:** [codence-app.vercel.app](https://codence-app.vercel.app)

---

## How It Works

```
Developer submits code
        |
        v
  Codence API creates a review record
        |
        v
  Chain Bridge sends transaction to Genlayer StudioNet
        |
        v
  Genlayer Intelligent Contract distributes to validators
        |
        v
  Multiple LLM validators analyze the code independently
        |
        v
  Validators reach consensus on findings
        |
        v
  Results written on-chain, returned to developer
```

Each review is an on-chain record. Findings include severity levels (critical, high, medium, low, informational) and categories (vulnerability, code smell, performance, architecture, security config, dependency, gas optimization, logic error, access control, best practice).

Developers can **appeal** reviews or **flag findings as false positives**, which triggers a re-evaluation through the consensus mechanism.

---

## Architecture

```
codence/
├── apps/
│   ├── api/          # FastAPI backend (Python 3.12)
│   ├── web/          # Next.js 16 frontend (TypeScript)
│   └── chain-bridge/ # Node.js bridge to Genlayer RPC
├── contracts/
│   └── src/          # Genlayer Intelligent Contract (Python)
├── infra/
│   └── docker/       # Database initialization SQL
└── docker-compose.yml
```

| Component | Stack | Port |
|-----------|-------|------|
| Frontend | Next.js 16, Tailwind v4, base-ui | 3000 |
| API | FastAPI, SQLAlchemy (async), Pydantic v2 | 8000 |
| Chain Bridge | Express.js, ethers.js | 8001 |
| Postgres | PostgreSQL 16 | 5436 |
| Redis | Redis 7 (rate limiting) | 6380 |

### Key Design Decisions

- **Genlayer LLMs only** - No external AI providers (OpenAI, Anthropic, etc.). All code analysis runs through Genlayer's validator consensus.
- **On-chain reviews** - Every review, finding, appeal, and false-positive flag is recorded on Genlayer StudioNet (chain ID 61999).
- **Wallet-per-user** - Each user gets an Ethereum-compatible wallet on signup, encrypted with AES-256-GCM using a server-side master key. The wallet signs Genlayer transactions.
- **JWT with refresh tokens** - 30-minute access tokens with 7-day rotating refresh tokens. Refresh tokens are SHA-256 hashed before storage.
- **Rate limiting** - Redis sliding-window rate limiter (60 req/min authenticated, 10 req/min for auth endpoints). Degrades gracefully if Redis is unavailable.

---

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 20+
- Python 3.12+

### 1. Start infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL (port 5436) and Redis (port 6380).

### 2. Start the API

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Create .env file
cat > .env << 'EOF'
SECRET_KEY=your-secret-key-here
MASTER_ENCRYPTION_KEY=your-32-byte-hex-key
CONTRACT_ADDRESS=0x996Cb5Cba2A81dB0582D9b4B9bb7f4b7E4d8DB3F
EOF

uvicorn app.main:app --reload --port 8000
```

### 3. Start the Chain Bridge

```bash
cd apps/chain-bridge
npm install
node server.js
```

### 4. Start the Frontend

```bash
cd apps/web
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Genlayer Intelligent Contract

The core contract at [`contracts/src/codence_review.py`](contracts/src/codence_review.py) runs on Genlayer StudioNet. It handles:

- **Review submission** - Accepts code, distributes to validators for consensus-based analysis
- **Finding management** - Stores categorized findings with severity levels
- **False positive flagging** - Allows developers to dispute individual findings
- **Appeal process** - Triggers re-evaluation through validator consensus
- **On-chain audit trail** - Immutable record of all reviews and actions

**Deployed contract:** `0x996Cb5Cba2A81dB0582D9b4B9bb7f4b7E4d8DB3F` on StudioNet (chain ID 61999)

---

## API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/signup` | Register with email/password |
| POST | `/api/v1/auth/login` | Login, returns JWT + refresh token |
| POST | `/api/v1/auth/refresh` | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Revoke session |

### Reviews
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/reviews/` | Submit code for review |
| GET | `/api/v1/reviews/` | List reviews (filterable by status) |
| GET | `/api/v1/reviews/{id}` | Get review with findings |
| GET | `/api/v1/reviews/stats` | Review count breakdown by status |
| POST | `/api/v1/reviews/{id}/findings/{fid}/flag` | Flag finding as false positive |
| DELETE | `/api/v1/reviews/{id}/findings/{fid}/flag` | Remove false positive flag |
| POST | `/api/v1/reviews/{id}/appeal` | Appeal review with reason |

### Organizations
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/organizations/` | Create organization |
| GET | `/api/v1/organizations/` | List user's organizations |
| POST | `/api/v1/organizations/{id}/members` | Invite member by email |
| PUT | `/api/v1/organizations/{id}/members/{mid}` | Update member role |
| DELETE | `/api/v1/organizations/{id}/members/{mid}` | Remove member |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users/me` | Get current user profile |
| PUT | `/api/v1/users/me` | Update display name / avatar |

### GitHub Integration
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/github/install` | Get GitHub App install URL |
| GET | `/api/v1/github/callback` | Handle installation callback |
| POST | `/api/v1/github/webhook` | Receive GitHub webhook events |

---

## Deployment

### Frontend (Vercel)

The Next.js frontend is deployed on Vercel. Set the environment variable:

```
NEXT_PUBLIC_API_URL=https://codence-api.fly.dev/api/v1
```

### Backend (Fly.io)

The FastAPI backend is deployed on Fly.io with managed Postgres.

```bash
cd apps/api
flyctl deploy
```

Required secrets:
```bash
flyctl secrets set SECRET_KEY=<your-secret>
flyctl secrets set MASTER_ENCRYPTION_KEY=<your-key>
flyctl secrets set CORS_ORIGINS='["https://codence-app.vercel.app"]'
```

The `DATABASE_URL` is automatically set when attaching Fly Postgres.

---

## Environment Variables

### API (`apps/api/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `SECRET_KEY` | JWT signing key | Yes |
| `MASTER_ENCRYPTION_KEY` | AES key for wallet encryption | Yes |
| `DATABASE_URL` | PostgreSQL connection string (auto-set on Fly) | Production |
| `CONTRACT_ADDRESS` | Genlayer contract address | Yes |
| `GITHUB_APP_ID` | GitHub App ID | For GitHub integration |
| `GITHUB_APP_PRIVATE_KEY` | GitHub App private key (PEM) | For GitHub integration |
| `GITHUB_WEBHOOK_SECRET` | GitHub webhook HMAC secret | For GitHub integration |
| `REDIS_URL` | Redis connection string | Optional (degrades gracefully) |

### Frontend (`apps/web/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | API base URL (e.g., `http://localhost:8000/api/v1`) |

---

## License

All rights reserved.
