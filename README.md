# SERP Tracker API

Google SERP tracking API with real mobile proxy integration via Proxies.sx.

## Features

- 🔍 **Real-time SERP scraping** with Google search results
- 📊 **Keyword position tracking** with history
- 🌍 **Multi-country support** (US, UK, DE, FR, JP, etc.)
- 🔄 **Bulk tracking** for multiple keywords
- 💰 **x402 USDC payment ready** (Solana network)
- 📱 **Mobile proxy integration** via Proxies.sx

## Quick Start

```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env

# Run development server
npm run dev

# Production
npm run build && npm start
```

## API Endpoints

### Health Check (Free)
```
GET /
```

### SERP Search
```
GET /serp/search?q=best+crypto+wallet&num=10&gl=us
```

### Add Keyword to Tracker
```
POST /tracker/add
Content-Type: application/json

{
  "keyword": "best crypto wallet",
  "domain": "mywallet.com",
  "gl": "us"
}
```

### Check Keyword Position
```
POST /tracker/check/{id}
```

### Get Tracking Results
```
GET /tracker/results/{id}
```

### List All Tracked Keywords
```
GET /tracker/list
```

### Bulk Check All Keywords
```
POST /tracker/check-all
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `SOLANA_WALLET_ADDRESS` | Your Solana wallet for USDC payments | - |
| `PROXY_HOST` | Proxies.sx proxy host | `us-4g.proxies.sx` |
| `PROXY_PORT` | Proxies.sx proxy port | `5057` |
| `PROXY_USER` | Proxies.sx username | - |
| `PROXY_PASS` | Proxies.sx password | - |

## Bounty Submission

This project is submitted for the Proxies.sx SERP Tracker bounty ($200 USDC).

- **Wallet**: `J6aG3GD3QLuf4nDpCX71W2wFYTieJ6T9RtsXAuDhPFTE`
- **Marketplace**: https://proxies.sx/x402-service-marketplace
