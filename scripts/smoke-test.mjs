// Live smoke test — exercises all 8 TransakProtocol methods against a real
// Transak environment (STAGING by default). NOT part of the published package.
//
//   TRANSAK_API_KEY=... TRANSAK_API_SECRET=... node scripts/smoke-test.mjs
//
// Optional:
//   TRANSAK_ENV=PRODUCTION            (default STAGING)
//   TRANSAK_ORDER_ID=<existing id>    (to exercise getTransactionDetail)
//
// The `widgetUrl` and `getOrder` callbacks below are the "backend" for this
// test: they hold the api-secret and make the authenticated calls. In a real
// app these live on your server behind an endpoint — never in client code.

import TransakProtocol from '../src/transak-protocol.js'

const API_KEY = process.env.TRANSAK_API_KEY
const API_SECRET = process.env.TRANSAK_API_SECRET
const ENV = process.env.TRANSAK_ENV || 'STAGING'
const ORDER_ID = process.env.TRANSAK_ORDER_ID
// referrerDomain (your allow-listed domain) and x-user-ip (the end user's IP,
// valid IPv4/IPv6) are required by Transak's authenticated widget-URL APIs.
const REFERRER_DOMAIN = process.env.TRANSAK_REFERRER_DOMAIN
const USER_IP = process.env.TRANSAK_USER_IP

if (!API_KEY || !API_SECRET || !REFERRER_DOMAIN || !USER_IP) {
  console.error('Set TRANSAK_API_KEY, TRANSAK_API_SECRET, TRANSAK_REFERRER_DOMAIN and TRANSAK_USER_IP in the environment.')
  process.exit(1)
}

const API = ENV === 'PRODUCTION' ? 'https://api.transak.com' : 'https://api-stg.transak.com'
const GATEWAY = ENV === 'PRODUCTION' ? 'https://api-gateway.transak.com' : 'https://api-gateway-stg.transak.com'

// A throwaway EVM address for the wallet fields (staging only).
const WALLET = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
// ---- backend-side auth (would run on your server) --------------------------

let cached // { token, exp }

async function accessToken () {
  const now = Math.floor(Date.now() / 1000)
  if (cached && cached.exp > now + 30) return cached.token

  const res = await fetch(`${API}/partners/api/v2/refresh-token`, {
    method: 'POST',
    headers: { 'api-secret': API_SECRET, 'content-type': 'application/json', 'x-user-ip': USER_IP },
    body: JSON.stringify({ apiKey: API_KEY })
  })
  if (!res.ok) throw new Error(`refresh-token ${res.status}: ${await res.text()}`)
  const { data } = await res.json()
  cached = { token: data.accessToken, exp: data.expiresAt }
  return data.accessToken
}

const widgetUrl = async (widgetParams) => {
  const token = await accessToken()
  const res = await fetch(`${GATEWAY}/api/v2/auth/session`, {
    method: 'POST',
    headers: { 'access-token': token, 'content-type': 'application/json', 'x-user-ip': USER_IP },
    body: JSON.stringify({ widgetParams })
  })
  if (!res.ok) throw new Error(`auth/session ${res.status}: ${await res.text()}`)
  const { data } = await res.json()
  return data.widgetUrl
}

const getOrder = async (txId) => {
  const token = await accessToken()
  const res = await fetch(`${API}/partners/api/v2/order/${txId}`, {
    headers: { 'x-api-key': API_KEY, 'access-token': token, 'x-user-ip': USER_IP }
  })
  if (!res.ok) throw new Error(`order/${txId} ${res.status}: ${await res.text()}`)
  const { data } = await res.json()
  return data
}

// ---- the module under test -------------------------------------------------

const transak = new TransakProtocol(undefined, { apiKey: API_KEY, widgetUrl, getOrder, environment: ENV })

// ---- helpers ---------------------------------------------------------------

const results = []

const MAX_LIST_LINES = 10

// Drop `metadata` (the raw Transak API response) and stringify BigInt amounts.
function clean (value) {
  if (Array.isArray(value)) return value.map(clean)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).filter(([k]) => k !== 'metadata').map(([k, v]) => [k, clean(v)])
    )
  }
  return typeof value === 'bigint' ? `${value}n` : value
}

// Print the module's return value (arrays are capped to MAX_LIST_LINES).
function printReturn (value) {
  if (value === undefined) return
  const out = clean(value)
  if (Array.isArray(out)) {
    const head = out.slice(0, MAX_LIST_LINES - 1)
    for (const item of head) console.log(`    ${JSON.stringify(item)}`)
    if (out.length > head.length) console.log(`    …and ${out.length - head.length} more (${out.length} total)`)
  } else {
    for (const line of JSON.stringify(out, null, 2).split('\n')) console.log(`    ${line}`)
  }
}

async function step (name, fn) {
  try {
    const out = await fn()
    console.log(`✓ ${name}`)
    printReturn(out)
    results.push({ name, ok: true })
    return out
  } catch (err) {
    console.error(`✗ ${name} — ${err.message}`)
    results.push({ name, ok: false })
    return undefined
  }
}

const pick = (arr, fallbackIdx = 0) => arr?.[fallbackIdx]
const baseUnits = (whole, decimals) => BigInt(whole) * 10n ** BigInt(decimals)

// ---- run --------------------------------------------------------------------

console.log(`\nTransak smoke test — ${ENV} (x-user-ip: ${USER_IP})\n`)

const cryptos = await step('getSupportedCryptoAssets', () => transak.getSupportedCryptoAssets())
const fiats = await step('getSupportedFiatCurrencies', () => transak.getSupportedFiatCurrencies())
await step('getSupportedCountries', () => transak.getSupportedCountries())

// Choose real values from the fetched lists (fall back to the first entry).
const asset = cryptos?.find((a) => a.code === 'ETH' && a.networkCode === 'ethereum') || pick(cryptos)
const fiat = fiats?.find((c) => c.code === 'EUR') || pick(fiats)

if (asset && fiat) {
  const fiatAmount = baseUnits(100, fiat.decimals) // 100 EUR in cents
  const cryptoAmount = 10n ** BigInt(asset.decimals) / 100n // 0.01 of the asset, in base units
  const paymentMethod = fiat.metadata?.paymentOptions?.[0]?.id // first available, if any
  const config = { network: asset.networkCode, ...(paymentMethod ? { paymentMethod } : {}) }
  // The widget-URL flow additionally requires referrerDomain.
  const widgetConfig = { ...config, referrerDomain: REFERRER_DOMAIN }

  console.log(`  using ${asset.code}/${asset.networkCode} + ${fiat.code}` + (paymentMethod ? ` (${paymentMethod})` : ''))

  await step('quoteBuy', () => transak.quoteBuy({ cryptoAsset: asset.code, fiatCurrency: fiat.code, fiatAmount, config }))
  await step('quoteSell', () => transak.quoteSell({ cryptoAsset: asset.code, fiatCurrency: fiat.code, cryptoAmount, config }))

  await step('buy (widget URL)', () => transak.buy({ cryptoAsset: asset.code, fiatCurrency: fiat.code, fiatAmount, recipient: WALLET, config: widgetConfig }))
  await step('sell (widget URL)', () => transak.sell({ cryptoAsset: asset.code, fiatCurrency: fiat.code, cryptoAmount, refundAddress: WALLET, config: widgetConfig }))
} else {
  console.error('✗ could not resolve a crypto asset / fiat currency from the supported lists — skipping quotes & widget URLs')
}

if (ORDER_ID) {
  await step('getTransactionDetail', () => transak.getTransactionDetail(ORDER_ID))
} else {
  console.log('· getTransactionDetail — skipped (set TRANSAK_ORDER_ID to run)')
}

// ---- summary ----------------------------------------------------------------

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed` + (failed.length ? ` — failed: ${failed.map((r) => r.name).join(', ')}` : ''))
process.exit(failed.length ? 1 : 0)
