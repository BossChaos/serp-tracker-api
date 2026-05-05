import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import type { MiddlewareHandler } from 'hono'
import { serpRouter } from './routes/serp.js'
import { trackerRouter } from './routes/tracker.js'

// ─── Configuration ───────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000')
const SOLANA_WALLET = process.env.SOLANA_WALLET_ADDRESS || 'J6aG3GD3QLuf4nDpCX71W2wFYTieJ6T9RtsXAuDhPFTE'
const PROXY_HOST = process.env.PROXY_HOST || 'us-4g.proxies.sx'
const PROXY_PORT = process.env.PROXY_PORT || '5057'
const PROXY_USER = process.env.PROXY_USER || ''
const PROXY_PASS = process.env.PROXY_PASS || ''

// ─── Hono App ────────────────────────────────────────────────────
const app = new Hono()

// Global middleware
app.use('*', cors())
app.use('*', logger())

// Health check (free)
app.get('/', (c) => {
  return c.json({
    service: 'SERP Tracker API',
    version: '1.0.0',
    protocol: 'x402',
    networks: ['solana'],
    recipient_wallet: SOLANA_WALLET,
    endpoints: {
      '/serp/search': {
        method: 'GET',
        price: '$0.003 USDC',
        description: 'Single SERP query with real mobile proxy',
        params: { q: 'Search query', num: 'Results count (1-20)', gl: 'Country code' }
      },
      '/tracker/add': {
        method: 'POST',
        price: '$0.01 USDC',
        description: 'Add keyword to tracking queue'
      },
      '/tracker/results': {
        method: 'GET',
        price: '$0.005 USDC',
        description: 'Get tracking results for keyword'
      }
    },
    docs: 'https://proxies.sx/x402-service-marketplace'
  })
})

// Mount x402-protected routers
app.route('/serp', serpRouter({
  proxyHost: PROXY_HOST,
  proxyPort: PROXY_PORT,
  proxyUser: PROXY_USER,
  proxyPass: PROXY_PASS,
  solanaWallet: SOLANA_WALLET
}))

app.route('/tracker', trackerRouter({
  proxyHost: PROXY_HOST,
  proxyPort: PROXY_PORT,
  proxyUser: PROXY_USER,
  proxyPass: PROXY_PASS,
  solanaWallet: SOLANA_WALLET
}))

// Start server
serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`🚀 SERP Tracker API running on http://localhost:${info.port}`)
  console.log(`💰 Solana wallet: ${SOLANA_WALLET}`)
  console.log(`🌐 Proxy: ${PROXY_HOST}:${PROXY_PORT}`)
})
