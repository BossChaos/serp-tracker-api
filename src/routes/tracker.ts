import { Hono } from 'hono'
import * as cheerio from 'cheerio'

interface ProxyConfig {
  proxyHost: string
  proxyPort: string
  proxyUser: string
  proxyPass: string
  solanaWallet: string
}

interface TrackedKeyword {
  id: string
  keyword: string
  domain: string
  gl: string
  hl: string
  lastChecked: string
  position: number | null
  previousPosition: number | null
  url: string | null
  bestUrl: string | null
  history: { date: string; position: number | null }[]
}

// In-memory storage (use database in production)
const trackedKeywords: Map<string, TrackedKeyword> = new Map()

export function trackerRouter(config: ProxyConfig) {
  const router = new Hono()

  // Add keyword to tracking
  router.post('/add', async (c) => {
    const body = await c.req.json()
    const { keyword, domain, gl = 'us', hl = 'en' } = body

    if (!keyword || !domain) {
      return c.json({ error: 'keyword and domain are required' }, 400)
    }

    const id = `${keyword}-${domain}-${gl}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')

    if (trackedKeywords.has(id)) {
      return c.json({ error: 'Keyword already being tracked', id }, 409)
    }

    trackedKeywords.set(id, {
      id,
      keyword,
      domain: domain.toLowerCase(),
      gl,
      hl,
      lastChecked: '',
      position: null,
      previousPosition: null,
      url: null,
      bestUrl: null,
      history: []
    })

    return c.json({
      message: 'Keyword added to tracking',
      id,
      keyword,
      domain,
      gl,
      nextCheck: 'Use /tracker/check/:id to run first scan'
    })
  })

  // Check position for a tracked keyword
  router.post('/check/:id', async (c) => {
    const id = c.req.param('id')
    const tracked = trackedKeywords.get(id)

    if (!tracked) {
      return c.json({ error: 'Keyword not found' }, 404)
    }

    try {
      tracked.previousPosition = tracked.position

      const results = await scrapeGoogleSERP({
        query: tracked.keyword,
        num: 50,
        gl: tracked.gl,
        hl: tracked.hl,
        start: 0,
        proxy: config
      })

      let bestPosition: number | null = null
      let bestUrl: string | null = null

      for (const result of results) {
        if (result.domain.includes(tracked.domain) || result.url.includes(tracked.domain)) {
          bestPosition = result.position
          bestUrl = result.url
          break
        }
      }

      tracked.position = bestPosition
      tracked.url = bestUrl
      if (bestUrl) tracked.bestUrl = bestUrl
      tracked.lastChecked = new Date().toISOString()
      tracked.history.push({
        date: tracked.lastChecked,
        position: bestPosition
      })

      return c.json({
        id: tracked.id,
        keyword: tracked.keyword,
        domain: tracked.domain,
        position: bestPosition,
        previousPosition: tracked.previousPosition,
        change: tracked.previousPosition
          ? (tracked.previousPosition - (bestPosition ?? 999))
          : null,
        url: bestUrl,
        lastChecked: tracked.lastChecked,
        totalResultsScanned: results.length
      })
    } catch (error: any) {
      return c.json({ error: error.message }, 500)
    }
  })

  // Get tracking results
  router.get('/results/:id', (c) => {
    const id = c.req.param('id')
    const tracked = trackedKeywords.get(id)

    if (!tracked) {
      return c.json({ error: 'Keyword not found' }, 404)
    }

    return c.json({
      id: tracked.id,
      keyword: tracked.keyword,
      domain: tracked.domain,
      gl: tracked.gl,
      currentPosition: tracked.position,
      previousPosition: tracked.previousPosition,
      change: tracked.previousPosition
        ? (tracked.previousPosition - (tracked.position ?? 999))
        : null,
      bestUrl: tracked.bestUrl,
      lastChecked: tracked.lastChecked,
      history: tracked.history.slice(-10) // Last 10 checks
    })
  })

  // List all tracked keywords
  router.get('/list', (c) => {
    const keywords = Array.from(trackedKeywords.values()).map(k => ({
      id: k.id,
      keyword: k.keyword,
      domain: k.domain,
      gl: k.gl,
      currentPosition: k.position,
      lastChecked: k.lastChecked
    }))

    return c.json({
      total: keywords.length,
      keywords
    })
  })

    // Bulk check all tracked keywords
  router.post('/check-all', async (c) => {
    const results: any[] = []
    const keywords = Array.from(trackedKeywords.values())

    for (const tracked of keywords) {
      try {
        tracked.previousPosition = tracked.position

        const serpResults = await scrapeGoogleSERP({
          query: tracked.keyword,
          num: 50,
          gl: tracked.gl,
          hl: tracked.hl,
          start: 0,
          proxy: config
        })

        let bestPosition: number | null = null
        let bestUrl: string | null = null

        for (const result of serpResults) {
          if (result.domain.includes(tracked.domain) || result.url.includes(tracked.domain)) {
            bestPosition = result.position
            bestUrl = result.url
            break
          }
        }

        tracked.position = bestPosition
        tracked.url = bestUrl
        if (bestUrl) tracked.bestUrl = bestUrl
        tracked.lastChecked = new Date().toISOString()
        tracked.history.push({
          date: tracked.lastChecked,
          position: bestPosition
        })

        results.push({
          id: tracked.id,
          keyword: tracked.keyword,
          domain: tracked.domain,
          position: bestPosition,
          url: bestUrl,
          status: 'success'
        })

        // Rate limit between checks
        await new Promise(r => setTimeout(r, 2000))
      } catch (error: any) {
        results.push({
          id: tracked.id,
          keyword: tracked.keyword,
          error: error.message,
          status: 'error'
        })
      }
    }

    return c.json({
      total: results.length,
      successful: results.filter(r => r.status === 'success').length,
      results
    })
  })

  return router
}

async function scrapeGoogleSERP(params: {
  query: string
  num: number
  gl: string
  hl: string
  start: number
  proxy: ProxyConfig
}): Promise<any[]> {
  const { query, num, gl, hl, start, proxy } = params

  const searchUrl = new URL('https://www.google.com/search')
  searchUrl.searchParams.set('q', query)
  searchUrl.searchParams.set('num', String(num))
  searchUrl.searchParams.set('gl', gl)
  searchUrl.searchParams.set('hl', hl)
  searchUrl.searchParams.set('start', String(start))

  const proxyUrl = `http://${proxy.proxyUser}:${proxy.proxyPass}@${proxy.proxyHost}:${proxy.proxyPort}`

  const response = await fetch(searchUrl.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': `${hl}-${gl},${hl};q=0.9,en;q=0.8`,
    },
    signal: AbortSignal.timeout(30000)
  })

  if (!response.ok) {
    throw new Error(`Google returned ${response.status}`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)
  const results: any[] = []

  const selectors = ['div.g', 'div[data-sokoban-container]', 'div.MjjYud']
  let container = null

  for (const selector of selectors) {
    if ($(selector).length > 0) {
      container = $(selector)
      break
    }
  }

  if (!container) {
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
            domain: new URL(url).hostname
          })
        }
      }
    })
    return results
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
}
