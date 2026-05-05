# SERP Tracker API - Bounty Submission

## Project Overview

A production-ready SERP (Search Engine Results Page) tracking API built with Hono.js and integrated with Proxies.sx mobile proxy infrastructure.

## What This Does

1. **Real-time SERP Scraping**: Query Google search results through real mobile proxies
2. **Keyword Position Tracking**: Monitor where your domain ranks for specific keywords
3. **Historical Data**: Track position changes over time
4. **Multi-country Support**: Track rankings in different geographic locations
5. **x402 Payment Integration**: Ready for USDC micropayments via Solana

## Files

```
serp-tracker/
├── src/
│   ├── index.ts           # Main entry point, Hono server
│   └── routes/
│       ├── serp.ts        # SERP scraping endpoints
│       └── tracker.ts     # Keyword tracking endpoints
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
└── SUBMISSION.md
```

## API Endpoints

### Free Endpoints
- `GET /` - Service discovery and documentation

### SERP Search (x402 Protected)
- `GET /serp/search?q=query&num=10&gl=us` - Search Google SERP

### Keyword Tracking (x402 Protected)
- `POST /tracker/add` - Add keyword to tracking
- `POST /tracker/check/:id` - Run position check
- `GET /tracker/results/:id` - Get tracking results
- `GET /tracker/list` - List all tracked keywords
- `POST /tracker/check-all` - Bulk check all keywords

## How to Run

```bash
npm install
cp .env.example .env
# Edit .env with your Proxies.sx credentials
npm run dev
```

## Proxy Configuration

The service supports Proxies.sx mobile proxies:
- Host: `us-4g.proxies.sx`
- Port: `5057`
- Protocol: HTTP/SOCKS5

When proxy credentials are provided, all SERP requests route through real mobile IPs.
Without credentials, the service runs in demo mode with sample data.

## Wallet for Payments

**Solana**: `J6aG3GD3QLuf4nDpCX71W2wFYTieJ6T9RtsXAuDhPFTE`

## Bounty Claim

Submitted for Proxies.sx SERP Tracker bounty ($200 USDC).
