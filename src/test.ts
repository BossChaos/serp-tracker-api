// Test script for SERP Tracker API
// Run with: npx tsx src/test.ts

const BASE_URL = process.env.API_URL || 'http://localhost:3000'

async function test() {
  console.log('🧪 Testing SERP Tracker API\n')

  // Test 1: Health check
  console.log('1. Health check...')
  const health = await fetch(BASE_URL)
  const healthData = await health.json()
  console.log(`   ✅ Service: ${healthData.service}`)
  console.log(`   ✅ Version: ${healthData.version}`)
  console.log(`   ✅ Endpoints: ${Object.keys(healthData.endpoints).join(', ')}\n`)

  // Test 2: SERP search (free discovery endpoint)
  console.log('2. SERP search discovery...')
  const serp = await fetch(`${BASE_URL}/serp/search`)
  const serpInfo = await serp.json()
  console.log(`   ✅ Pricing: ${serpInfo.pricing.cost}\n`)

  // Test 3: Add keyword to tracker
  console.log('3. Add keyword to tracker...')
  const addResp = await fetch(`${BASE_URL}/tracker/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keyword: 'best crypto wallet',
      domain: 'mywallet.com',
      gl: 'us'
    })
  })
  const addData = await addResp.json()
  console.log(`   ✅ Added: ${addData.keyword}`)
  console.log(`   ✅ ID: ${addData.id}\n`)

  // Test 4: List tracked keywords
  console.log('4. List tracked keywords...')
  const listResp = await fetch(`${BASE_URL}/tracker/list`)
  const listData = await listResp.json()
  console.log(`   ✅ Total tracked: ${listData.total}\n`)

  console.log('✅ All tests passed!')
}

test().catch(err => {
  console.error('❌ Test failed:', err.message)
  process.exit(1)
})
