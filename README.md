# 🔍 Transaction Tracker Server

> **Blockchain transactions tracker for Wayru Network Ecosystem** - Real-time monitoring and tracking of Solana blockchain transactions for staking, unstaking, and reward claims.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![Koa](https://img.shields.io/badge/Koa-2.15-black.svg)](https://koajs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-8.14-blue.svg)](https://www.postgresql.org/)

## 📋 Table of Contents

- [🔍 Transaction Tracker Server](#-transaction-tracker-server)
  - [📋 Table of Contents](#-table-of-contents)
  - [🎯 Overview](#-overview)
  - [✨ Features](#-features)
    - [📡 Real-time Blockchain Event Monitoring](#-real-time-blockchain-event-monitoring)
    - [💾 Transaction Tracking \& Storage](#-transaction-tracking--storage)
    - [🔗 Web3 Integration](#-web3-integration)
    - [⚡ Health Monitoring](#-health-monitoring)
  - [🛠️ Tech Stack](#️-tech-stack)
  - [🚀 Getting Started](#-getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Configuration](#configuration)
  - [📁 Project Structure](#-project-structure)
  - [📜 Scripts](#-scripts)
  - [📚 API Documentation](#-api-documentation)
    - [Health Check Endpoint](#health-check-endpoint)
      - [GET `/api/health`](#get-apihealth)
  - [💻 Development](#-development)
    - [Code Style](#code-style)
    - [Running Tests](#running-tests)
    - [Database Migrations](#database-migrations)
  - [🤝 Contributing](#-contributing)
    - [Guidelines](#guidelines)
  - [📄 License](#-license)
  - [🔗 Links](#-links)

## 🎯 Overview

Transaction Tracker Server is a backend service designed to monitor and track blockchain transactions on the Solana network for the Wayru Network ecosystem. It provides real-time event listening for key blockchain programs, processes transaction data, and stores it in a PostgreSQL database for analysis and reporting.

The server actively monitors two main Solana programs:
* **Depin Program**: Tracks staking, unstaking, NFT initialization, and node initialization events
* **Reward System Program**: Monitors reward claim transactions and processes reward distributions

This server handles the complex task of parsing blockchain logs, extracting transaction data, and maintaining a comprehensive record of all relevant network activities.

## ✨ Features

### 📡 Real-time Blockchain Event Monitoring

* **Depin Program Listener**: Monitors staking, unstaking, NFT initialization, and node initialization events
* **Reward System Listener**: Tracks reward claim transactions with optional memo parsing
* **Event Callbacks**: Flexible callback system for processing different event types
* **Automatic Reconnection**: Robust connection management with automatic reconnection handling

### 💾 Transaction Tracking & Storage

* **Transaction Database**: Comprehensive PostgreSQL storage for all tracked transactions
* **Transaction Status Tracking**: Monitor transaction states from initiation to completion
* **Reward Tracking**: Track reward claims and payment status
* **Historical Data**: Maintain complete transaction history for analysis

### 🔗 Web3 Integration

* **Solana Blockchain**: Full integration with Solana Web3.js for blockchain interactions
* **Anchor Framework**: Uses Coral XYZ Anchor for program interaction
* **Smart Contract Integration**: Direct interaction with Wayru Network smart contracts
* **Connection Management**: Singleton pattern for efficient connection reuse

### ⚡ Health Monitoring & Heartbeat System

* **Heartbeat Service**: Automatically updates service health status in the database every 15 seconds
* **Database-Backed Health Checks**: Frontend can verify service availability by querying the shared database
* **Comprehensive Health Status**: Monitors database, Solana RPC, Depin Program, and Reward System connections
* **Service Status Tracking**: Real-time status tracking stored in `heartbeats` table for cross-service communication
* **Automatic Document Creation**: Creates heartbeat records automatically if they don't exist

## 🛠️ Tech Stack

* **Runtime**: Node.js 22+
* **Framework**: [Koa.js](https://koajs.com/) - Lightweight web framework
* **Language**: [TypeScript](https://www.typescriptlang.org/) 5.4 - Type-safe JavaScript
* **Database**: [PostgreSQL](https://www.postgresql.org/) 8.14 - Robust relational database
* **Blockchain**: 
  + [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/) 1.98 - Solana blockchain integration
  + [Coral XYZ Anchor](https://www.anchor-lang.com/) 0.30.1 - Solana program framework
* **Task Scheduling**: [node-cron](https://github.com/node-cron/node-cron) - Automated task execution
* **Development**: 
  + [tsx](https://github.com/esbuild-kit/tsx) - Fast TypeScript execution
  + [nodemon](https://nodemon.io/) - Development server with hot-reload

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

* **Node.js** (v22 or higher)
* **npm** or **yarn** package manager
* **PostgreSQL** (v14 or higher)
* **Git**

### Installation

1. **Clone the repository**
   

```bash
   git clone git@github.com:Wayru-Network/tx-tracker-server.git
   cd tx-tracker-server
   ```

2. **Install dependencies**
   

```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   

```bash
   cp .env.example .env  # If .env.example exists
   # Or create .env manually with the variables below
   ```

4. **Configure your database**
   - Create a PostgreSQL database
   - Update the `.env` file with your database credentials

5. **Start the development server**
   

```bash
   npm run dev
   # or
   yarn dev
   ```

### Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=1335
NODE_ENV=develop

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=your_database_name
DATABASE_USERNAME=your_username
DATABASE_PASSWORD=your_password
DATABASE_SSL=false

# Web3 Configuration
DB_ADMIN_PUBLIC_KEY=your_admin_public_key
SOLANA_WALLET_PRIVATE_KEY=your_solana_wallet_private_key
SOLANA_API_URL=https://api.devnet.solana.com
SOLANA_API_KEY=your_solana_api_key  # Optional
DEFAULT_DEPIN_PROGRAM_ID=ECcNAeDo6TbYpr1bY2e1uybkiNEuRSbxRbqad4r1azK8
DEFAULT_REWARD_SYSTEM_PROGRAM_ID=Ey6f9uyT1s3UrCGpc586aeHmEupYdfR2xo8Nh7TpqLhX
```

## 📁 Project Structure

```
tx-tracker-server/
├── src/
│   ├── api/
│   │   ├── hotspots-stakes/     # Hotspots and stakes API (to be removed)
│   │   ├── keys/                # Keys API
│   │   ├── nfnodes/             # NFNodes API
│   │   └── api.routes.ts        # Main API router
│   ├── bootstrap/
│   │   ├── bootstrap.ts        # Application initialization
│   │   └── shutdown.ts          # Graceful shutdown
│   ├── config/
│   │   ├── env/
│   │   │   └── env.ts          # Environment variables configuration
│   │   └── db.ts                # PostgreSQL database connection
│   ├── constants/
│   │   ├── router.ts            # Route constants
│   │   └── web3.ts              # Web3 constants
│   ├── crons/
│   │   └── index.ts             # Scheduled tasks (cron jobs)
│   ├── helpers/                 # Utility helpers
│   ├── interfaces/              # TypeScript interfaces
│   ├── middlewares/
│   │   ├── auth-validator.ts    # Authentication middleware
│   │   └── db-error-handler.ts  # Database error handling
│   ├── services/
│   │   ├── health/              # Health check service
│   │   │   └── health-check.service.ts
│   │   ├── heartbeat/           # Heartbeat service
│   │   │   ├── heartbeat.service.ts
│   │   │   └── heartbeat.queries.ts
│   │   └── web3/
│   │       ├── events/          # Blockchain event listeners
│   │       ├── program/         # Program interaction services
│   │       ├── solana/          # Solana connection management
│   │       └── wallet/          # Wallet services
│   ├── utils/                   # Utility functions
│   └── server.ts                # Main server entry point
├── dist/                        # Compiled JavaScript (generated)
├── .gitignore
├── package.json
├── tsconfig.json                # TypeScript configuration
├── tsconfig-paths-bootstrap.js  # Path alias bootstrap
└── README.md
```

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Start production server (requires build first) |
| `npm run lint` | Run ESLint to check code quality |
| `npm run lint:fix` | Run ESLint and automatically fix issues |

## 📚 Heartbeat System

The Transaction Tracker Server includes a heartbeat system that allows other services (like the frontend) to verify its health status by querying a shared database table. This approach avoids exposing HTTP endpoints and IP addresses while providing reliable health status information.

### How It Works

1. **Automatic Updates**: The heartbeat service runs automatically and updates the `heartbeats` table every 15 seconds
2. **Service Identification**: Uses `service_name = 'tx_tracker_service'` to identify this service
3. **Health Status Storage**: Stores comprehensive health information in the `extra_info` JSON field
4. **Database-Backed**: Frontend and other services can query the database directly to check service status

### Database Table Structure

The `heartbeats` table contains the following fields:

* `service_name` (VARCHAR): Service identifier (`'tx_tracker_service'`)
* `last_seen_at` (TIMESTAMP): Last heartbeat update timestamp
* `extra_info` (JSON): Complete health status information
* `created_at` (TIMESTAMP): Record creation timestamp
* `published_at` (TIMESTAMP): Record publication timestamp

### Health Status Format

The `extra_info` field contains a JSON object with the following structure:

```json
{
  "status": "ok" | "degraded" | "down",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "database": "connected" | "disconnected" | "unknown",
    "solana": "connected" | "disconnected" | "unknown",
    "depin": "connected" | "disconnected" | "unknown",
    "rewardSystem": "connected" | "disconnected" | "unknown"
  }
}
```

### Frontend Integration

To check if the service is healthy before performing transactions, query the database:

```sql
SELECT service_name, last_seen_at, extra_info
FROM heartbeats
WHERE service_name = 'tx_tracker_service';
```

**Health Check Logic**:
* If `last_seen_at` is older than 30-60 seconds → Service may be down
* If `extra_info.status` is `"down"` → Do not proceed with transactions
* If `extra_info.status` is `"degraded"` → Show warning but allow transactions
* If `extra_info.status` is `"ok"` → Proceed normally

### Features

* **Automatic Document Creation**: If no heartbeat record exists, one is created automatically with default status
* **Table Existence Check**: Gracefully handles cases where the table doesn't exist yet
* **Error Resilience**: Heartbeat failures don't crash the service
* **Update Strategy**: Uses UPDATE-first approach (no UNIQUE constraint required)

## 💻 Development

### Code Style

* Follow TypeScript best practices
* Use async/await for asynchronous operations
* Implement proper error handling
* Add JSDoc comments for public functions
* Use ESLint for code quality checks

### Running Tests

```bash
# Tests will be added as the project grows
npm test
```

### Database Migrations

```bash
# Migration commands will be added
npm run migrate
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Guidelines

* Write clear commit messages
* Follow the existing code style
* Add tests for new features
* Update documentation as needed

## 📄 License

This project is licensed under the ISC License.

## 🔗 Links

* [Wayru Network](https://wayru.io/)
* [Documentation](https://docs.wayru.io/)
* [GitHub Repository](https://github.com/Wayru-Network/tx-tracker-server)

---

**Built with ❤️ by the Wayru Network Team**
