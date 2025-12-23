# 🔍 Transaction Tracker Server

> **Open Source Blockchain Transaction Tracker** - Real-time monitoring and tracking of Solana blockchain transactions for staking, unstaking, and reward claims.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![Koa](https://img.shields.io/badge/Koa-2.15-black.svg)](https://koajs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-8.14-blue.svg)](https://www.postgresql.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## 📋 Table of Contents

- [🔍 Transaction Tracker Server](#-transaction-tracker-server)
  - [📋 Table of Contents](#-table-of-contents)
  - [🎯 Overview](#-overview)
    - [⚠️ Important Notice](#️-important-notice)
  - [✨ Features](#-features)
    - [📡 Real-time Blockchain Event Monitoring](#-real-time-blockchain-event-monitoring)
    - [💾 Transaction Tracking \& Storage](#-transaction-tracking--storage)
    - [🔗 Web3 Integration](#-web3-integration)
    - [⚡ Health Monitoring \& Heartbeat System](#-health-monitoring--heartbeat-system)
  - [🛠️ Tech Stack](#️-tech-stack)
  - [🚀 Getting Started](#-getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Configuration](#configuration)
    - [Running the Server](#running-the-server)
  - [📁 Project Structure](#-project-structure)
  - [📜 Available Scripts](#-available-scripts)
  - [📚 API Documentation](#-api-documentation)
    - [Authentication](#authentication)
    - [Endpoints](#endpoints)
      - [Health Check](#health-check)
      - [Protected Endpoints](#protected-endpoints)
  - [💓 Heartbeat System](#-heartbeat-system)
    - [How It Works](#how-it-works)
    - [Database Table Structure](#database-table-structure)
    - [Health Status Format](#health-status-format)
    - [Frontend Integration](#frontend-integration)
    - [Features](#features)
  - [💻 Development](#-development)
    - [Code Style](#code-style)
    - [Database Setup](#database-setup)
    - [Environment Variables](#environment-variables)
  - [🐳 Docker Deployment](#-docker-deployment)
  - [🤝 Contributing](#-contributing)
    - [How to Contribute](#how-to-contribute)
    - [Guidelines](#guidelines)
  - [📄 License](#-license)
  - [💙 Farewell Message](#-farewell-message)

## 🎯 Overview

Transaction Tracker Server is an **open source** backend service designed to monitor and track blockchain transactions on the Solana network. It provides real-time event listening for key blockchain programs, processes transaction data, and stores it in a PostgreSQL database for analysis and reporting.

The server actively monitors two main Solana programs:
* **Depin Program**: Tracks staking, unstaking, NFT initialization, and node initialization events
* **Reward System Program**: Monitors reward claim transactions and processes reward distributions

This server handles the complex task of parsing blockchain logs, extracting transaction data, and maintaining a comprehensive record of all relevant network activities.

### ⚠️ Important Notice

**This project is now open source and community-maintained.** WAYRU Network no longer exists and does not provide support, maintenance, or updates for this repository. The code is provided as-is for the community to use, modify, and improve.

## ✨ Features

### 📡 Real-time Blockchain Event Monitoring

* **Depin Program Listener**: Monitors staking, unstaking, NFT initialization, and node initialization events
* **Reward System Listener**: Tracks reward claim transactions with optional memo parsing
* **Event Callbacks**: Flexible callback system for processing different event types
* **Automatic Reconnection**: Robust connection management with automatic reconnection handling
* **Error Resilience**: Graceful error handling and recovery mechanisms

### 💾 Transaction Tracking & Storage

* **Transaction Database**: Comprehensive PostgreSQL storage for all tracked transactions
* **Transaction Status Tracking**: Monitor transaction states from initiation to completion
* **Reward Tracking**: Track reward claims and payment status
* **Historical Data**: Maintain complete transaction history for analysis
* **Database Indices**: Optimized queries with strategic database indexing

### 🔗 Web3 Integration

* **Solana Blockchain**: Full integration with Solana Web3.js for blockchain interactions
* **Anchor Framework**: Uses Coral XYZ Anchor for program interaction
* **Smart Contract Integration**: Direct interaction with Solana smart contracts
* **Connection Management**: Singleton pattern for efficient connection reuse
* **Multi-RPC Support**: Configurable RPC endpoints with API key support

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
* **Database**: [PostgreSQL](https://www.postgresql.org/) 8.14+ - Robust relational database
* **Blockchain**: 
  + [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/) 1.98 - Solana blockchain integration
  + [Coral XYZ Anchor](https://www.anchor-lang.com/) 0.30.1 - Solana program framework
* **Task Scheduling**: [node-cron](https://github.com/node-cron/node-cron) - Automated task execution
* **Development**: 
  + [tsx](https://github.com/esbuild-kit/tsx) - Fast TypeScript execution
  + [nodemon](https://nodemon.io/) - Development server with hot-reload
  + [ESLint](https://eslint.org/) - Code quality and linting

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

* **Node.js** (v22 or higher) - [Download](https://nodejs.org/)
* **npm** or **yarn** package manager
* **PostgreSQL** (v14 or higher) - [Download](https://www.postgresql.org/download/)
* **Git** - [Download](https://git-scm.com/downloads)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/Wayru-Network/tx-tracker-server.git
cd tx-tracker-server
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
```

3. **Set up environment variables**

Create a `.env` file in the root directory (see [Configuration](#configuration) section below for details):

```bash
cp .env.example .env  # If .env.example exists
# Or create .env manually
```

4. **Configure your database**

   - Create a PostgreSQL database
   - Run any required migrations or schema setup
   - Update the `.env` file with your database credentials

5. **Build the project** (for production)

```bash
npm run build
```

### Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=1335
NODE_ENV=development

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=your_database_name
DATABASE_USERNAME=your_username
DATABASE_PASSWORD=your_password
DATABASE_SSL=false

# Explorers Database Configuration (optional)
EXPLORERS_DATABASE_HOST=localhost
EXPLORERS_DATABASE_PORT=5432
EXPLORERS_DATABASE_NAME=explorers_db
EXPLORERS_DATABASE_USERNAME=explorer_user
EXPLORERS_DATABASE_PASSWORD=explorer_password
EXPLORERS_DATABASE_SSL=false

# Web3 Configuration
DB_ADMIN_PUBLIC_KEY=your_admin_public_key
SOLANA_WALLET_PRIVATE_KEY=your_solana_wallet_private_key
SOLANA_API_URL=https://api.devnet.solana.com
SOLANA_API_KEY=your_solana_api_key  # Optional, for rate-limited RPC endpoints

# Program IDs (Solana Program Addresses)
DEFAULT_DEPIN_PROGRAM_ID=D1sMCRu3tRwCviHUDj69WrRQzDoVKd2m2YKydRyauYmJ
DEFAULT_REWARD_SYSTEM_PROGRAM_ID=Ey6f9uyT1s3UrCGpc586aeHmEupYdfR2xo8Nh7TpqLhX
```

### Running the Server

**Development mode** (with hot-reload):

```bash
npm run dev
```

**Production mode**:

```bash
npm run build
npm start
```

The server will start on `http://localhost:1335` (or the port specified in your `.env` file).

## 📁 Project Structure

```
tx-tracker-server/
├── src/
│   ├── api/                       # API routes and handlers
│   │   ├── hotspots-stakes/      # Hotspots and stakes API endpoints
│   │   ├── keys/                 # Keys API endpoints
│   │   ├── nfnodes/              # NFNodes API endpoints
│   │   ├── others/               # Other API endpoints
│   │   └── api.routes.ts         # Main API router configuration
│   ├── bootstrap/                # Application initialization
│   │   ├── bootstrap.ts          # Bootstrap sequence (listeners, services)
│   │   └── shutdown.ts           # Graceful shutdown handlers
│   ├── config/                   # Configuration files
│   │   ├── env/
│   │   │   └── env.ts           # Environment variables loader
│   │   └── db.ts                 # PostgreSQL connection pools
│   ├── constants/                # Application constants
│   │   ├── router.ts             # Route path constants
│   │   └── web3.ts               # Web3-related constants
│   ├── crons/                    # Scheduled tasks
│   │   └── index.ts              # Cron job definitions
│   ├── database/                 # Database scripts
│   │   └── indices.sql           # Database index definitions
│   ├── helpers/                  # Utility helper functions
│   ├── interfaces/               # TypeScript type definitions
│   ├── middlewares/              # Koa middleware
│   │   ├── auth-validator.ts     # Authentication middleware
│   │   └── db-error-handler.ts   # Database error handling
│   ├── services/                 # Business logic services
│   │   ├── health/               # Health check service
│   │   │   └── health-check.service.ts
│   │   ├── heartbeat/            # Heartbeat service
│   │   │   ├── heartbeat.service.ts
│   │   │   └── heartbeat.queries.ts
│   │   └── web3/                 # Web3-related services
│   │       ├── events/           # Blockchain event listeners
│   │       │   ├── depin-program/
│   │       │   ├── reward-system/
│   │       │   └── token-2022-transfer-listener.service.ts
│   │       ├── program/          # Program interaction services
│   │       ├── solana/           # Solana connection management
│   │       └── wallet/           # Wallet services
│   ├── utils/                    # Utility functions
│   └── server.ts                 # Main server entry point
├── dist/                         # Compiled JavaScript (generated)
├── kubernetes/                   # Kubernetes deployment files
├── .gitignore
├── Dockerfile                     # Docker container definition
├── eslint.config.mjs             # ESLint configuration
├── nodemon.json                   # Nodemon configuration
├── package.json                   # Project dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── tsconfig-paths-bootstrap.js   # Path alias bootstrap
└── README.md                      # This file
```

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot-reload using nodemon |
| `npm run build` | Compile TypeScript to JavaScript, run type checking, and copy SQL files |
| `npm start` | Start production server (requires build first) |
| `npm run lint` | Run ESLint to check code quality |
| `npm run lint:fix` | Run ESLint and automatically fix issues |

## 📚 API Documentation

### Authentication

All API endpoints (except health checks) require authentication. The authentication middleware validates requests based on the configured `DB_ADMIN_PUBLIC_KEY` environment variable.

### Endpoints

#### Health Check

**GET** `/api/health`

Returns the health status of the server and its dependencies.

**Response:**

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

#### Protected Endpoints

All endpoints under `/api/*` (except `/api/health` ) require authentication. See the source code in `src/api/` for specific endpoint documentation.

## 💓 Heartbeat System

The Transaction Tracker Server includes a heartbeat system that allows other services (like frontends) to verify its health status by querying a shared database table. This approach avoids exposing HTTP endpoints and IP addresses while providing reliable health status information.

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
* Follow the existing code structure and patterns

### Database Setup

1. **Create the database**:

```sql
CREATE DATABASE your_database_name;
```

2. **Run database migrations** (if applicable):

```bash
# Migration commands will depend on your setup
npm run migrate
```

3. **Create required indices**:

The project includes an `indices.sql` file that creates performance-optimized indices. Run it against your database:

```bash
psql -d your_database_name -f src/database/indices.sql
```

### Environment Variables

See the [Configuration](#configuration) section for all available environment variables. Make sure to set up all required variables before running the server.

## 🐳 Docker Deployment

The project includes a `Dockerfile` for containerized deployment. To build and run:

```bash
# Build the Docker image
docker build -t tx-tracker-server .

# Run the container
docker run -p 1335:1335 --env-file .env tx-tracker-server
```

For Kubernetes deployment, see the `kubernetes/` directory for deployment configurations.

## 🤝 Contributing

Contributions are welcome! Since this project is now community-maintained, your contributions help keep it alive and improve it for everyone.

### How to Contribute

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes
4. Run linting and ensure code quality (`npm run lint`)
5. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
6. Push to the branch (`git push origin feature/AmazingFeature`)
7. Open a Pull Request

### Guidelines

* Write clear commit messages
* Follow the existing code style
* Add tests for new features (when test infrastructure is available)
* Update documentation as needed
* Be respectful and constructive in discussions

## 📄 License

This project is licensed under the **ISC License** - see the LICENSE file for details.

This project is **open source** and available for use, modification, and distribution by the community.

---

## 💙 Farewell Message

With gratitude and love, we say goodbye.

WAYRU is closing its doors, but we are leaving these repositories open and free for the community.

May they continue to inspire builders, dreamers, and innovators.

With love, 
WAYRU

---

**Note**: This project is now maintained by the community. WAYRU Network no longer provides support, updates, or maintenance. Use at your own discretion and feel free to fork, modify, and improve as needed.
