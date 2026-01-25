# ☀️ Solara Core

Solara Core is an experimental web application designed to test and refine build/deployment pipelines. It serves as the foundation for a future browser game, currently focusing on core infrastructure, containerization, and authentication.

---

## 🚀 Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) |
| **Backend** | [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) (v15) |
| **Authentication** | [Clerk](https://clerk.com/) |
| **Proxy / SSL** | [Nginx](https://www.nginx.com/) + [Certbot](https://certbot.eff.org/) |
| **Infrastructure** | [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/) |

---

## 🛠️ Getting Started

### Prerequisites
- **Docker & Docker Compose** installed on your system.
- A **Clerk** account for authentication keys.
- (Optional) A domain pointed to your server (default: `solara-core.de`).

### 1. Environment Configuration
Create a `.env` file in the root directory and add your Clerk credentials:

```env
CLERK_SECRET_KEY=your_secret_key_here
VITE_CLERK_PUBLISHABLE_KEY=your_publishable_key_here
```

### 2. Launch the Application
For development with hot-reloading (syncing local changes to containers):

```bash
docker compose up --watch
```

This command will:
- Spin up the React frontend (Vite).
- Spin up the Express backend.
- Start the PostgreSQL database.
- Configure Nginx as a reverse proxy.
- Start Certbot for SSL management.

### 3. Rebuilding
If you change dependencies or Docker configurations, run:

```bash
docker compose build --no-cache
```

---

## 📁 Project Structure

```text
.
├── backend/            # Express API & Backend logic
├── frontend/           # React + Vite application
├── nginx/              # Proxy & SSL configuration
├── data/               # Persistent storage (DB & SSL)
├── .env                # Local secrets (Clerk keys)
└── docker-compose.yml  # Container orchestration
```

---

## ⚠️ Important Caveats

1. **Domain Dependency**: The `nginx.conf` is pre-configured for `solara-core.de`. If running on a different domain or localhost, update the `server_name` in `nginx/nginx.conf`.
2. **Local Development SSL**: Nginx is configured to expect SSL certificates in `/etc/letsencrypt`. For pure local development without a domain, you might need to comment out the SSL block in `nginx/nginx.conf` or use tools like `mkcert` for local HTTPS.
3. **Clerk Keys**: The application will not function without valid Clerk keys in the `.env` file. Ensure both `CLERK_SECRET_KEY` and `VITE_CLERK_PUBLISHABLE_KEY` are present.
4. **Syncing vs Rebuilding**:
   - `up --watch` handles most frontend/backend source changes.
   - Changes to `package.json` or `Dockerfile` require a manual rebuild.

---

## 🔮 Future Goals
- Transition into a fully functional browser game.
- Implement production-optimized deployment stages alongside the current development stage.
- Expand game mechanics and persistent world state.