# 🐳 Docker Deployment Guide — NeuroChat AI

This repository is equipped with a multi-container Docker architecture orchestrating the frontend, backend, PostgreSQL with `pgvector`, Redis cache & BullMQ queue, and an Nginx reverse proxy load balancer gateway.

---

## 🏗️ Architecture Overview

| Service | Container Name | Port | Description |
| :--- | :--- | :--- | :--- |
| **Nginx Gateway** | `neurochat-nginx` | `80` | Reverse proxy gateway routing `/api/*` to backend and `/*` to Next.js |
| **Frontend** | `neurochat-frontend` | `3000` | Next.js 14 Web App with split-screen video & Firebase Google OAuth |
| **Backend** | `neurochat-backend` | `5000` | Express TypeScript server with Groq LLM, HuggingFace embeddings & Bcrypt |
| **PostgreSQL** | `neurochat-postgres` | `5432` | PostgreSQL 16 + `pgvector` extension for 384-D semantic memory |
| **Redis** | `neurochat-redis` | `6379` | In-memory cache & BullMQ background job queue pipeline |

---

## 🚀 Quick Start (Production Mode)

To build and run all services in production mode:

```bash
docker compose up -d --build
```

### Accessing the Application:
* **Web Application (via Gateway)**: [http://localhost](http://localhost) (or [http://localhost:3000](http://localhost:3000))
* **Backend API Health Check**: [http://localhost/api/health](http://localhost/api/health) (or [http://localhost:5000/api/health](http://localhost:5000/api/health))
* **PostgreSQL pgvector**: `localhost:5432` (User: `postgres`, Pass: `postgres`, DB: `ai_chatbot`)
* **Redis**: `localhost:6379`

### Stopping All Services:
```bash
docker compose down
```

To remove all volumes (database and cache data):
```bash
docker compose down -v
```

---

## 💻 Development Mode (Live Reloading)

If you wish to run the entire stack inside Docker while live-reloading your local source code edits on Windows/macOS/Linux:

```bash
docker compose -f docker-compose.dev.yml up
```

---

## 🔍 Useful Docker Commands

### View Live Logs:
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

### Inspect PostgreSQL Database inside Container:
```bash
docker exec -it neurochat-postgres psql -U postgres -d ai_chatbot
```

Verify `pgvector` and tables inside the database:
```sql
\dt
SELECT * FROM users;
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
```

### Check Redis Cache Status:
```bash
docker exec -it neurochat-redis redis-cli ping
docker exec -it neurochat-redis redis-cli keys "*"
```
