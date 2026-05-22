# LYNK

Telegram-native Web3 escrow protocol on QIE with live telemetry dashboards.

LYNK combines a smart contract escrow, a Telegram bot/webhook orchestrator, and a real-time ops UI. The backend speaks to the blockchain and Telegram, and the frontend renders live system telemetry (escrow state, chain status, and bot activity).

---

## Highlights

- Live escrow state from the deployed smart contract
- Telegram webhook -> blockchain transactions (BUY, RELEASE, DISPUTE)
- Telemetry layer for bot activity, commands, and status
- Operations dashboards: Overview, Escrow, Telegram, Developer Tools, Blockchain Explorer, AI Dispute Center
- Clean separation: contracts / backend / frontend

---

## Architecture (High Level)

1. **Contracts (Hardhat)**
   - `LynkEscrow.sol` holds funds between buyer and seller
   - Exposes `getEscrowDetails()` for backend polling

2. **Backend (Next.js App Router)**
   - QIE provider + signer
   - Escrow action routes: BUY / RELEASE / DISPUTE
   - Telegram webhook and telemetry state
   - Status endpoints for dashboard polling

3. **Frontend (Next.js App Router)**
   - Live ops dashboards
   - Polling-based telemetry with 10s refresh intervals

---

## Project Structure

```
lynk/
  backend/     # Next.js backend + API routes
  frontend/    # Next.js frontend dashboard
  contracts/   # Hardhat smart contracts
```

---

## Environment Variables

### Backend (.env.local in backend/)

```
QIE_RPC_URL=...             # QIE JSON-RPC endpoint
QIE_PRIVATE_KEY=...         # Signer private key
QIE_ESCROW_CONTRACT=...     # Deployed LynkEscrow address
TELEGRAM_BOT_TOKEN=...      # Telegram bot token
```

### Frontend (.env.local in frontend/)

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_QIE_CONTRACT=...   # Same escrow contract address
```

---

## Quick Start (Local)

### 1) Contracts

```bash
cd contracts
npm install
# deploy with your hardhat workflow (see contracts/DEPLOYMENT.md)
```

### 2) Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on: http://localhost:3000

### 3) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: http://localhost:3001

---

## API Endpoints

### Health
- `GET /api/health`
  - Blockchain RPC connectivity, signer wallet info, and balance

### Escrow
- `POST /api/escrow/test-buy`
- `POST /api/escrow/release`
- `POST /api/escrow/dispute`
- `GET /api/escrow/status`
  - Returns `buyer`, `seller`, `amount`, `released`, `disputed`, `createdAt`

### Telegram
- `POST /api/telegram/webhook`
  - Telegram entrypoint for commands and transactions
- `GET /api/telegram/status`
  - Live telemetry from in-memory store

---

## Dashboard Pages

### Overview
- Live escrow state and chain health

### Escrow Operations
- Execute BUY / RELEASE / DISPUTE
- Shows transaction activity and normalized errors

### Telegram Control
- Bot telemetry: last command, user, message, webhook status

### Developer Tools
- Operational snapshot across health, escrow, telegram

### Blockchain Explorer
- Chain height, wallet state, escrow lifecycle

### AI Dispute Center
- Live escrow dispute state + heuristic AI analytics

---

## Demo Flow (Suggested)

1. Open Overview -> confirm live contract + chain
2. Send Telegram command: `BALANCE`
3. Open Telegram Control -> see live telemetry update
4. Run Escrow action -> view activity feed
5. Open AI Dispute Center -> show arbitration panels

---

## Notes on Telemetry

- Telegram telemetry is stored in-memory for hackathon simplicity
- Uses `globalThis` to keep state stable across dev reloads
- Designed to be swapped with Redis or a database later

---

## Security & Ops

- Never commit `.env*`
- Keep signer keys private
- Use a dedicated wallet for demo funds

---

## License

MIT (or update as needed)
