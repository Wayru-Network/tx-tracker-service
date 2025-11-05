# 🌐 Explorer Server

> **A powerful Web3 backend server for the Wayru Network Explorer** - Manage map hexes, hotspot statistics, and user wallet stakes with ease.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![Koa](https://img.shields.io/badge/Koa-2.15-black.svg)](https://koajs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-8.14-blue.svg)](https://www.postgresql.org/)

## 📋 Table of Contents

- [🌐 Explorer Server](#-explorer-server)
  - [📋 Table of Contents](#-table-of-contents)
  - [🎯 Overview](#-overview)
  - [✨ Features](#-features)
    - [🗺️ Map Hex Management](#️-map-hex-management)
    - [📊 Hotspot Statistics](#-hotspot-statistics)
    - [💼 Wallet \& Stake Management](#-wallet--stake-management)
    - [🔗 Web3 Integration](#-web3-integration)
  - [🛠️ Tech Stack](#️-tech-stack)
  - [🚀 Getting Started](#-getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Configuration](#configuration)
  - [📁 Project Structure](#-project-structure)
  - [📜 Scripts](#-scripts)
  - [📚 API Documentation](#-api-documentation)
    - [Planned Endpoints](#planned-endpoints)
  - [💻 Development](#-development)
    - [Code Style](#code-style)
    - [Running Tests](#running-tests)
    - [Database Migrations](#database-migrations)
  - [🤝 Contributing](#-contributing)
    - [Guidelines](#guidelines)
  - [📄 License](#-license)
  - [🔗 Links](#-links)

## 🎯 Overview

Explorer Server is the backend infrastructure powering the Wayru Network Explorer web application. It provides comprehensive APIs for managing geospatial data (map hexes), real-time hotspot statistics, and Web3 wallet interactions including stake management.

This server handles the complex business logic required for a decentralized network explorer, providing efficient data aggregation, blockchain interactions via Solana, and seamless database operations.

## ✨ Features

### 🗺️ Map Hex Management
- **Hexagonal Grid System**: Manage and query hexagonal map cells (hexes) for geospatial data visualization
- **Location-based Queries**: Efficient spatial queries for hotspot and network coverage data
- **Real-time Updates**: Live hex data synchronization with the blockchain

### 📊 Hotspot Statistics
- **General Statistics**: Aggregate statistics across all hotspots in the network
- **Performance Metrics**: Track hotspot performance, uptime, and rewards
- **Network Insights**: Comprehensive analytics for network health and distribution

### 💼 Wallet & Stake Management
- **User Wallet Integration**: Secure Web3 wallet connections and authentication
- **Stake Tracking**: Monitor and manage user stakes across the network
- **Transaction History**: Complete transaction records and stake history
- **Real-time Balance Updates**: Live wallet balance and stake status tracking

### 🔗 Web3 Integration
- **Solana Blockchain**: Full integration with Solana Web3.js for blockchain interactions
- **Smart Contract Integration**: Interact with Wayru Network smart contracts
- **Event Listening**: Real-time blockchain event monitoring and processing

## 🛠️ Tech Stack

- **Runtime**: Node.js 22+
- **Framework**: [Koa.js](https://koajs.com/) - Lightweight web framework
- **Language**: [TypeScript](https://www.typescriptlang.org/) 5.4 - Type-safe JavaScript
- **Database**: [PostgreSQL](https://www.postgresql.org/) 8.14 - Robust relational database
- **Blockchain**: [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/) 1.98 - Solana blockchain integration
- **Task Scheduling**: [node-cron](https://github.com/node-cron/node-cron) - Automated task execution
- **Development**: [tsx](https://github.com/esbuild-kit/tsx) - Fast TypeScript execution

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v22 or higher)
- **npm** or **yarn** package manager
- **PostgreSQL** (v14 or higher)
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone git@github.com:Wayru-Network/explorer-server.git
   cd explorer-server
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
DATABASE_NAME=explorer_db
DATABASE_USERNAME=your_username
DATABASE_PASSWORD=your_password
DATABASE_SSL=false

# Web3 Configuration
DB_ADMIN_PUBLIC_KEY=your_admin_public_key

# Add other environment-specific variables as needed
```

## 📁 Project Structure

```
explorer-server/
├── src/
│   ├── config/
│   │   ├── env/
│   │   │   └── env.ts          # Environment variables configuration
│   │   └── db.ts                # PostgreSQL database connection
│   ├── middlewares/
│   │   ├── auth-validator.ts    # Authentication middleware
│   │   └── db-error-handler.ts  # Database error handling
│   ├── crons/
│   │   └── index.ts             # Scheduled tasks (cron jobs)
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

## 📚 API Documentation

> **Note**: Full API documentation will be available as endpoints are implemented.

### Planned Endpoints

- **GET** `/api/hexes` - Retrieve map hex data
- **GET** `/api/hexes/:id` - Get specific hex information
- **GET** `/api/hotspots` - List all hotspots with statistics
- **GET** `/api/hotspots/:id` - Get detailed hotspot information
- **GET** `/api/stats` - General network statistics
- **GET** `/api/wallets/:address` - Get wallet information and stakes
- **POST** `/api/wallets/:address/stakes` - Create or update stake
- **GET** `/api/wallets/:address/transactions` - Get wallet transaction history

## 💻 Development

### Code Style

- Follow TypeScript best practices
- Use async/await for asynchronous operations
- Implement proper error handling
- Add JSDoc comments for public functions

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

- Write clear commit messages
- Follow the existing code style
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the ISC License.

## 🔗 Links

- [Wayru Network](https://wayru.io/)
- [Documentation](https://docs.wayru.io/)
- [GitHub Repository](https://github.com/Wayru-Network/explorer-server)

---

**Built with ❤️ by the Wayru Network Team**

