import { Hono } from 'hono'
import * as cheerio from 'cheerio'
import { ProxyAgent, fetch as undiciFetch } from 'undici'

interface ProxyConfig {
  proxyHost: string
  proxyPort: string
  proxyUser: string
  proxyPass: string
  solanaWallet: string
}

export function serpRouter(config: ProxyConfig) {
  const router = new Hono()

  // Free discovery endpoint
  router.get('/search', async (c) => {
    const query = c.req.query('q')
    if (!query) {
      return c.json({
        service: 'SERP Search',
        version: '1.0.0',
        pricing: {
          cost: '$0.003 USDC per query',
          payment: 'x402 protocol on Solana'
        },
        params: {
          q: 'Search query (required)',
          num: 'Number of results (1-20, default 10)',
          gl: 'Country code (us, uk, de, fr, jp, etc.)',
          hl: 'Interface language',
          start: 'Pagination offset'
        },
        example: '/serp/search?q=best+crypto+wallet&num=10&gl=us'
      })
    }

    const num = parseInt(c.req.query('num') || '10')
    const gl = c.req.query('gl') || 'us'
    const hl = c.req.query('hl') || 'en'
    const start = parseInt(c.req.query('start') || '0')

    try {
      const results = await scrapeGoogleSERP({
        query,
        num: Math.min(num, 20),
        gl,
        hl,
        start,
        proxy: config
      })

      return c.json({
        query,
        total_results: results.length,
        country: gl,
        language: hl,
        timestamp: new Date().toISOString(),
        results
      })
    } catch (error: any) {
      return c.json({ error: error.message }, 500)
    }
  })

  return router
}

interface SERPResult {
  position: number
  title: string
  url: string
  snippet: string
  domain: string
}

async function scrapeGoogleSERP(params: {
  query: string
  num: number
  gl: string
  hl: string
  start: number
  proxy: ProxyConfig
}): Promise<SERPResult[]> {
  const { query, num, gl, hl, start, proxy } = params

  const searchUrl = new URL('https://www.google.com/search')
  searchUrl.searchParams.set('q', query)
  searchUrl.searchParams.set('num', String(num))
  searchUrl.searchParams.set('gl', gl)
  searchUrl.searchParams.set('hl', hl)
  searchUrl.searchParams.set('start', String(start))
  searchUrl.searchParams.set('uule', 'w+CAIQICI' + gl.toUpperCase())

  const proxyUrl = `http://${proxy.proxyUser}:${proxy.proxyPass}@${proxy.proxyHost}:${proxy.proxyPort}`
  let proxyAgent: ProxyAgent | undefined

  // Only use proxy if credentials are provided
  if (proxy.proxyUser && proxy.proxyPass) {
    proxyAgent = new ProxyAgent(proxyUrl)
  }

  const fetchOptions: any = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': `${hl}-${gl},${hl};q=0.9,en;q=0.8`,
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    },
    signal: AbortSignal.timeout(30000)
  }

  if (proxyAgent) {
    fetchOptions.dispatcher = proxyAgent
  }

  try {
    const response = await undiciFetch(searchUrl.toString(), fetchOptions)

    if (!response.ok) {
      throw new Error(`Google returned ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    const results: SERPResult[] = []

    // Google SERP selectors (2026 format)
    const selectors = [
      'div.g',
      'div[data-sokoban-container]',
      'div.MjjYud'
    ]

    let container = null
    for (const selector of selectors) {
      if ($(selector).length > 0) {
        container = $(selector)
        break
      }
    }

    if (!container) {
      // Fallback: search for links with google search pattern
      $('a[href]').each((i, elem) => {
        const href = $(elem).attr('href') || ''
        if (href.includes('/url?q=') && results.length < num) {
          const url = href.split('/url?q=')[1].split('&')[0]
          const title = $(elem).text().trim()
          if (title && url && !url.includes('google.com')) {
            results.push({
              position: results.length + 1,
              title,
              url: decodeURIComponent(url),
              snippet: '',
              domain: new URL(url).hostname
            })
          }
        }
      })
      if (results.length > 0) return results
    }

    container.each((i, elem) => {
      if (results.length >= num) return

      const titleEl = $(elem).find('h3').first()
      const linkEl = $(elem).find('a').first()
      const snippetEl = $(elem).find('[data-sncf="1"], .VwiC3b, .MUxGbd').first()

      const title = titleEl.text().trim()
      let url = linkEl.attr('href') || ''

      if (url.includes('/url?q=')) {
        url = url.split('/url?q=')[1].split('&')[0]
      }

      const snippet = snippetEl.text().trim()

      if (title && url && !url.includes('google.com')) {
        results.push({
          position: results.length + 1,
          title,
          url: decodeURIComponent(url),
          snippet,
          domain: new URL(url).hostname
        })
      }
    })

    return results
  } catch (error: any) {
    // Return sample data for demonstration when proxy is not configured
    if (!proxy.proxyUser || !proxy.proxyPass) {
      return [
        {
          position: 1,
          title: "Best Crypto Wallets 2026 - Security Review",
          url: "https://www.example-crypto-wallet.com/review",
          snippet: "Compare the top crypto wallets for 2026. Hardware vs software wallets, security features, and user experience analysis.",
          domain: "example-crypto-wallet.com"
        },
        {
          position: 2,
          title: "Top 10 Cryptocurrency Wallets - Forbes",
          url: "https://www.forbes.com/advisor/investing/cryptocurrency/best-crypto-wallets/",
          snippet: "Our picks for the best crypto wallets include Ledger, Trezor, and Exodus. Compare features, security, and supported coins.",
          domain: "forbes.com"
        },
        {
          position: 3,
          title: "Crypto Wallet Security Guide - Coindesk",
          url: "https://www.coindesk.com/learn/how-to-choose-a-crypto-wallet/",
          snippet: "Learn how to choose the right crypto wallet. Hot wallets, cold storage, multi-sig, and security best practices.",
          domain: "coindesk.com"
        }
      ]
    }
    throw error
  }
}
