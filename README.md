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

> Secure peer-to-peer transactions directly inside Telegram with AI-powered dispute arbitration and on-chain settlement.

LYNK eliminates trust issues in Telegram-based commerce by combining smart contract escrow, automated AI arbitration, and seamless chat-based interactions. Users can create and manage escrow agreements without leaving Telegram, while disputes are resolved instantly through AI analysis and executed transparently on-chain.

---

## 📌 Overview

Peer-to-peer trading on messaging platforms often suffers from a lack of trust:

* Buyers fear paying without receiving goods.
* Sellers fear shipping without guaranteed payment.
* Traditional escrow systems are slow, complicated, and require users to leave the conversation.
* Human arbitration is expensive, delayed, and subjective.

**LYNK solves this problem by bringing escrow and dispute resolution directly into Telegram.**

---

## 🚀 Features

### 🟢 Telegram-Native Escrow

Create and manage escrow agreements using simple chat commands:

```text
BUY
STATUS
RELEASE
DISPUTE
TRACKING
HELP
```

No external Web3 UI required.

---

### 🤖 AI-Powered Dispute Arbitration

Disputes are automatically analyzed using:

* Groq SDK
* Llama 3.3 70B

The AI:

* Reviews chat history and evidence
* Generates human-readable reasoning
* Produces a confidence score
* Issues a binding ruling

---

### 🔐 On-Chain Settlement

Funds are securely:

1. Locked in smart contracts
2. Released according to agreement
3. Settled transparently on the QIE Mainnet

---

### 📊 Real-Time Dashboards

Monitor every component through dedicated dashboards:

* Overview Dashboard
* Escrow Status
* Blockchain Explorer
* Arbitration Pipeline
* Telegram Bot Health
* Developer Tools

---

### 🔎 Transparent Arbitration Pipeline

Every AI decision includes:

* Evidence analysis
* Generated reasoning
* Confidence metrics
* Fallback mechanisms

---

## 🏗 Problem Statement

Telegram-based commerce currently lacks a reliable trust layer.

### Buyers Risk

* Paying and never receiving goods.

### Sellers Risk

* Delivering goods without payment guarantees.

### Existing Escrow Problems

* Poor UX
* Multiple external applications
* Slow human arbitrators
* High operational costs

---

## 💡 Solution

LYNK introduces:

* Chat-first escrow
* AI dispute resolution
* On-chain execution
* Real-time monitoring

All within a familiar Telegram experience.

---

## 🏛 Architecture

The system follows a simple flow:

```text
Telegram Bot
      ↓
Webhook API
      ↓
Next.js Backend
      ↓
Supabase + Groq
      ↓
QIE Blockchain
      ↓
Frontend Dashboards
```

---

## 📐 Architecture Diagram

```text
┌─────────────────────────────────────────────────────┐
│                    Telegram Bot                     │
│  BUY / STATUS / RELEASE / DISPUTE / TRACKING / HELP │
└──────────────────┬──────────────────────────────────┘
                   │ POST /api/telegram/webhook
                   ▼
┌──────────────────────────────────────────────────────┐
│          Next.js Backend (localhost:3000)            │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ Deal Service│  │ AI Arbitrator│  │ Dispute API │  │
│  │ (Supabase)  │  │ (Groq 70B)   │  │ (REST)      │  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘  │
│         │                │                 │         │
│         ▼                ▼                 ▼         │
│  ┌──────────────────────────────────────────────┐    │
│  │          MultiSig Wallet Service             │    │
│  │ openDispute / applyRuling / getStatus        │    │
│  └──────────────────┬───────────────────────────┘    │
└─────────────────────┼────────────────────────────────┘
                      │ QIE RPC
                      ▼
┌─────────────────────────────────────────────┐
│          LynkEscrow Smart Contract          │
│  QIE Mainnet · Chain ID 1990                │
│  0x5A871eD6740887f14F31dFB50a4e50486908DfAD │
└─────────────────────────────────────────────┘

                      ▲
                      │ poll (10s)
                      ▼
┌─────────────────────────────────────────────────────┐
│              Next.js Frontend (localhost:3001)      │
│                                                     │
│  Overview │ Escrow │ Telegram │ Developer Tools     │
│  Blockchain Explorer │ Arbitration Pipeline         │
└─────────────────────────────────────────────────────┘
```

---

## ⚙️ Tech Stack

| Layer           | Technology                  |
| --------------- | --------------------------- |
| Smart Contracts | Solidity 0.8.28 + Hardhat   |
| Backend         | Next.js 15 + TypeScript     |
| Frontend        | Next.js 15 + Tailwind CSS   |
| Database        | Supabase (PostgreSQL)       |
| AI Arbitrator   | Groq SDK + Llama 3.3 70B    |
| Blockchain      | QIE Mainnet (Chain ID 1990) |
| Messaging       | Telegram Bot API + Telegraf |

---

## 📂 Project Structure

```text
LYNK/
│
├── contracts/
├── backend/
├── frontend/
└── README.md
```

---

## 🚀 Getting Started

### 1. Deploy Smart Contracts

```bash
cd contracts

npm install

npx hardhat run scripts/deploy.ts --network qie
```

---

### 2. Start Backend

```bash
cd backend

npm install
```

Create `.env.local`

```env
QIE_RPC_URL=
TELEGRAM_BOT_TOKEN=
GROQ_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Run:

```bash
npm run dev
```

Backend:

```text
http://localhost:3000
```

---

### 3. Start Frontend

```bash
cd frontend

npm install
```

Create `.env.local`

```env
NEXT_PUBLIC_BACKEND_URL=
NEXT_PUBLIC_QIE_CONTRACT=
```

Run:

```bash
npm run dev
```

Frontend:

```text
http://localhost:3001
```

---

### 4. Configure Telegram Webhook

Expose your backend using:

```bash
ngrok http 3000
```

Set the webhook endpoint:

```text
/api/telegram/webhook
```

---

## 🔄 Transaction Lifecycle

```text
Buyer initiates purchase
        ↓
Escrow contract created
        ↓
Funds locked on-chain
        ↓
Seller delivers goods
        ↓
Buyer releases funds
        ↓
Transaction completed
```

### If a dispute occurs

```text
Dispute raised
        ↓
Evidence collected
        ↓
Groq Llama 3.3 analyzes data
        ↓
AI generates ruling
        ↓
Smart contract executes settlement
```

---

## 🔌 API Endpoints

| Method | Endpoint                        | Description                                        |
| ------ | ------------------------------- | -------------------------------------------------- |
| `GET`  | `/api/health`                   | RPC connectivity, wallet, balance, chain ID        |
| `GET`  | `/api/escrow/status`            | Escrow details: buyer, seller, amount, lifecycle   |
| `POST` | `/api/escrow/test-buy`          | Simulate a buy transaction                         |
| `POST` | `/api/escrow/release`           | Release escrow funds                               |
| `POST` | `/api/escrow/dispute`           | Open on-chain dispute                              |
| `GET`  | `/api/deals`                    | Recent deals (last 10, descending)                 |
| `GET`  | `/api/disputes?page=1&limit=20` | Paginated disputes with rulings, sorted by recency |
| `POST` | `/api/telegram/webhook`         | Telegram bot entrypoint                            |
| `GET`  | `/api/telegram/status`          | In-memory bot telemetry                            |

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

## 📸 Screenshots

### 1. Telegram Bot Interaction

Escrow creation and command execution.

### 2. LYNK Overview Dashboard

System-wide monitoring and metrics.

### 3. AI Arbitration Pipeline

Reasoning, confidence score, and dispute workflow.

### 4. Blockchain Explorer

On-chain contract state and transaction lifecycle.

---

## 🔮 Future Roadmap

### 🌐 Multi-Chain Expansion

Support for:

* Ethereum
* Polygon
* Arbitrum

### 👥 Human + AI Hybrid Arbitration

Secondary human review for:

* Low-confidence AI decisions
* High-value transactions

### 💳 Fiat On-Ramps

Enable funding via:

* Debit cards
* Credit cards
* Payment gateways

directly inside Telegram.

### 🌍 Multilingual AI Agents

Native dispute analysis across global languages.

---

## 🔒 Smart Contract

**Network:** QIE Mainnet
**Chain ID:** `1990`

```text
Contract Address:
0x5A871eD6740887f14F31dFB50a4e50486908DfAD
```

---

## 🤝 Contributing

Contributions are welcome.

```text
fork → branch → commit → pull request
```

Please ensure:

* Code quality is maintained.
* Tests pass successfully.
* Documentation remains updated.

---

## 📜 License

MIT License

---

<div align="center">

### ⚡ LYNK

**Trustless commerce. Instant AI arbitration. Telegram-first UX.**

</div>
