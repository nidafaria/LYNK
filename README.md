<div align="center">

# ⚡ LYNK

**Telegram-native Web3 escrow protocol on QIE — AI‑powered dispute arbitration, real‑time dashboards, and on‑chain settlement.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)]()
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?logo=solidity)]()
[![Groq AI](https://img.shields.io/badge/Arbitration-Groq%20Llama%203.3%2070B-10a37f)]()
[![Supabase](https://img.shields.io/badge/DB-Supabase-3ecf8e?logo=supabase)]()
[![QIE](https://img.shields.io/badge/Chain-QIE%20Mainnet-5b5bd7)]()

---

**Send a Telegram message. Get an escrow contract. Dispute with AI arbitration. All without leaving the chat.**

</div>

---

## ✨ What LYNK Does

LYNK lets buyers and sellers transact on Telegram with **smart contract escrow** and **AI‑powered dispute resolution**:

1. **Buyer** sends a Telegram command → LYNK deploys a `LynkEscrow` contract
2. **Buyer funds** the contract → funds are locked on-chain
3. **Seller ships** and submits tracking → buyer confirms receipt
4. **No dispute?** → Funds released to seller automatically
5. **Dispute?** → **Groq Llama 3.3 70B** analyzes the case, chat history, and evidence → issues a binding ruling with confidence score
6. **Ruling persisted** in Supabase → displayed in the Arbitration Pipeline dashboard

---

## 🧠 AI Arbitration

LYNK uses **Groq's Llama 3.3 70B** model for real dispute intelligence:

| Feature | Implementation |
|---|---|
| **Model** | `llama-3.3-70b-versatile` via Groq SDK |
| **Evidence** | Buyer/seller statements, chat history, item description, image references |
| **Rulings** | `BUYER_WINS`, `SELLER_WINS`, `SPLIT` |
| **Confidence** | 0.0–1.0 score per ruling |
| **Reasoning** | Human-readable explanation of the decision |
| **Fallback** | Keyword extraction if JSON parsing fails |
| **Persistence** | Ruling, confidence, reasoning saved to Supabase |

> **Example flow:** Buyer messages `/dispute item is broken` → LYNK on-chains the dispute → Groq AI analyzes → ruling persisted → Telegram notification with confidence + reasoning.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Telegram Bot                       │
│  BUY / STATUS / RELEASE / DISPUTE / TRACKING / HELP   │
└──────────────────┬──────────────────────────────────┘
                   │ POST /api/telegram/webhook
                   ▼
┌──────────────────────────────────────────────────────┐
│          Next.js Backend (localhost:3000)              │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  Deal Service│  │  AI Arbitrator│  │  Dispute API │ │
│  │  (Supabase)  │  │  (Groq)       │  │  (REST)      │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                 │                  │        │
│         ▼                 ▼                  ▼        │
│  ┌──────────────────────────────────────────────┐    │
│  │          MultiSig Wallet Service              │    │
│  │  openDispute / applyRuling / getStatus        │    │
│  └──────────────────┬───────────────────────────┘    │
└─────────────────────┼────────────────────────────────┘
                      │ QIE RPC
                      ▼
┌─────────────────────────────────────────────┐
│          LynkEscrow Smart Contract           │
│  QIE Mainnet · Chain ID 1990                 │
│  0x5A871eD6740887f14F31dFB50a4e50486908DfAD │
└─────────────────────────────────────────────┘

                      ▲
                      │ poll (10s)
                      ▼
┌─────────────────────────────────────────────────────┐
│              Next.js Frontend (localhost:3001)         │
│                                                       │
│  Overview │ Escrow │ Telegram │ Developer             │
│  Blockchain Explorer │ Arbitration Pipeline            │
└─────────────────────────────────────────────────────┘
```

---

## 📦 Project Structure

```
LYNK/
├── contracts/          # Hardhat — LynkEscrow.sol
│   ├── contracts/
│   │   ├── LynkEscrow.sol       # Core escrow logic
│   │   └── LynkMultisig.sol     # Multi-signature support
│   ├── scripts/deploy.ts
│   └── DEPLOYMENT.md
│
├── backend/            # Next.js App Router API
│   ├── app/api/
│   │   ├── health/              # RPC + wallet health
│   │   ├── escrow/              # test-buy, release, dispute, status
│   │   ├── deals/               # Deal list (paginated)
│   │   ├── disputes/            # Dispute list (paginated, sorted)
│   │   └── telegram/            # webhook + status
│   ├── lib/
│   │   ├── ai/arbitrator.ts     # Groq AI arbitration
│   │   ├── blockchain/          # contract, multisig, provider, wallet
│   │   ├── deal/                # dealService + manager
│   │   ├── shipping/oracle.ts   # Tracking resolution
│   │   ├── commands/parser.ts   # Telegram command parser
│   │   └── db/supabase.ts       # Database client
│   └── services/telegram.ts     # Bot messaging
│
├── frontend/           # Next.js App Router UI
│   ├── app/
│   │   ├── page.tsx            # Overview dashboard
│   │   ├── escrow/             # Escrow operations
│   │   ├── telegram/           # Bot telemetry
│   │   ├── developer/          # Full-stack snapshot
│   │   ├── blockchain/         # Chain explorer
│   │   └── disputes/           # Arbitration pipeline
│   ├── components/
│   │   ├── animations.tsx      # FadeIn, StaggerGrid, PulseDot, HoverCard, etc.
│   │   ├── EscrowPanel.tsx     # Escrow action panel
│   │   ├── ConsoleShell.tsx    # Terminal-style activity log
│   │   ├── StatusCard.tsx      # Status indicator card
│   │   └── HealthPanel.tsx     # Health monitoring
│   └── services/
│       ├── api.ts              # Backend API client
│       └── blockchain.ts       # Wallet + chain helpers
│
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | RPC connectivity, wallet, balance, chain ID |
| `GET` | `/api/escrow/status` | Escrow details: buyer, seller, amount, lifecycle |
| `POST` | `/api/escrow/test-buy` | Simulate a buy transaction |
| `POST` | `/api/escrow/release` | Release escrow funds |
| `POST` | `/api/escrow/dispute` | Open on-chain dispute |
| `GET` | `/api/deals` | Recent deals (last 10, descending) |
| `GET` | `/api/disputes?page=1&limit=20` | Paginated disputes with rulings, sorted by recency |
| `POST` | `/api/telegram/webhook` | Telegram bot entrypoint |
| `GET` | `/api/telegram/status` | In-memory bot telemetry |

### `/api/disputes` Response Shape

```json
{
  "success": true,
  "data": [
    {
      "dealId": "deal_1718000000_abc123",
      "buyer": 123456789,
      "seller": 987654321,
      "amount": "100",
      "status": "resolved",
      "disputeRuling": "BUYER_WINS",
      "disputeConfidence": 0.87,
      "disputeReasoning": "Buyer provided photo evidence of damage...",
      "resolvedAt": "2026-06-08T12:34:56Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

## 📊 Dashboard Pages

| Page | Route | What It Shows |
|---|---|---|
| **Overview** | `/` | Live escrow state + chain health + bot status |
| **Escrow Operations** | `/escrow` | BUY / RELEASE / DISPUTE actions + activity feed |
| **Telegram Control** | `/telegram` | Bot telemetry: last command, user, message, webhook |
| **Developer Tools** | `/developer` | Full telemetry snapshot: health, escrow, telegram, deals, disputes |
| **Blockchain Explorer** | `/blockchain` | Chain height, wallet state, contract lifecycle, activity timeline |
| **Arbitration Pipeline** | `/disputes` | AI rulings, confidence scores, reasoning, resolution breakdown |

All dashboards **auto-refresh every 10–15 seconds**.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- A [Groq API key](https://console.groq.com) (free tier available)
- A [Supabase](https://supabase.com) project
- A [Telegram Bot Token](https://t.me/botfather)
- QIE RPC endpoint + funded wallet

### 1. Smart Contracts

```bash
cd contracts
npm install
# Deploy to QIE (see contracts/DEPLOYMENT.md)
npx hardhat run scripts/deploy.ts --network qie
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env.local   # Fill in your keys
npm run dev                   # → http://localhost:3000
```

<details>
<summary><b>Required environment variables</b></summary>

```
# backend/.env.local
QIE_RPC_URL=https://rpc.qie.network
QIE_PRIVATE_KEY=0x...
QIE_ESCROW_CONTRACT=0x5A871eD6740887f14F31dFB50a4e50486908DfAD
TELEGRAM_BOT_TOKEN=...
GROQ_API_KEY=gsk_...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=...
```
</details>

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev                   # → http://localhost:3001
```

<details>
<summary><b>Required environment variables</b></summary>

```
# frontend/.env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_QIE_CONTRACT=0x5A871eD6740887f14F31dFB50a4e50486908DfAD
```
</details>

### 4. Telegram Webhook

```bash
curl -F "url=https://your-ngrok.ngrok.app/api/telegram/webhook" \
  https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook
```

---

## 🤖 Telegram Commands

| Command | Action |
|---|---|
| `BUY @seller 100` | Create a deal for 100 QIE |
| `STATUS` | Check your active deal |
| `TRACKING ABC123` | Submit tracking number |
| `RELEASE` | Confirm receipt, release funds |
| `DISPUTE reason...` | Open a dispute → triggers AI arbitration |
| `BALANCE` | Check wallet balance |
| `HELP` | Show available commands |

---

## 🧪 Demo Flow

1. **Start** → Open the **Overview** dashboard → confirm live chain + contract
2. **Telegram** → Send `BALANCE` to the bot → see telemetry update in **Telegram Control**
3. **Create deal** → Send `BUY @seller 100` → check **Escrow Operations**
4. **Dispute** → Send `DISPUTE item is damaged` → AI arbitrates → ruling appears in **Arbitration Pipeline**
5. **Explore** → Browse **Blockchain Explorer** for chain state → **Developer Tools** for full snapshot

---

## 🛡️ Security

- **Private keys** are never committed — use `.env.local`
- **Signer wallet** should be dedicated for demo/limited funds
- **Webhook URLs** should use HTTPS in production
- **Supabase RLS** policies should be configured before production use
- **Never** expose `GROQ_API_KEY` or `SUPABASE_ANON_KEY` client-side

---

## 🧱 Built With

| Layer | Technology |
|---|---|
| **Smart Contracts** | Solidity 0.8.28 + Hardhat |
| **Backend** | Next.js 15 (App Router) + TypeScript |
| **Frontend** | Next.js 15 + Tailwind CSS |
| **Database** | Supabase (PostgreSQL) |
| **AI** | Groq SDK — Llama 3.3 70B |
| **Blockchain** | QIE Mainnet (Chain ID 1990) |
| **Messaging** | Telegram Bot API + Telegraf |
| **Telemetry** | In-memory store (swappable to Redis) |

---

<div align="center">

**Built for the QIE ecosystem · MIT License**

</div>
