import { beforeEach, describe, expect, jest, test } from '@jest/globals'

import { ValueError, NoSuchElementError } from '@tetherto/wdk-wallet'

import TransakProtocol from '../src/transak-protocol.js'
import { TransakApiError } from '../src/errors.js'

const widgetUrl = jest.fn()
const getOrder = jest.fn()

// Transak partner API keys are UUIDs (from the Transak Partner dashboard).
const DUMMY_API_KEY = '4fcd6904-706b-4aff-bd9d-77422813bbb7'
// The session-based widget URL Transak's Create Widget URL API returns.
const DUMMY_WIDGET_URL = 'https://global-stg.transak.com/?apiKey=4fcd6904-706b-4aff-bd9d-77422813bbb7&sessionId=b8f4e2a1-9c3d-4e6f-8a1b-2c3d4e5f6a7b'
// The account's on-chain wallet address (EVM checksum format).
const DUMMY_ACCOUNT_ADDRESS = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'

const DUMMY_CRYPTO = [
  { coinId: 'ethereum', symbol: 'ETH', name: 'Ethereum', decimals: 18, roundOff: 5, network: { name: 'ethereum', chainId: 1 }, isAllowed: true, uniqueId: 'ETHethereum' },
  { coinId: 'tether', symbol: 'USDT', name: 'Tether USD', decimals: 6, roundOff: 2, network: { name: 'ethereum', chainId: 1 }, isAllowed: true, uniqueId: 'USDTethereum' },
  { coinId: 'tether', symbol: 'USDT', name: 'Tether USD', decimals: 6, roundOff: 2, network: { name: 'tron' }, isAllowed: true, uniqueId: 'USDTtron' }
]

const DUMMY_FIAT = [
  { symbol: 'USD', name: 'US Dollar', roundOff: 2, isAllowed: true },
  { symbol: 'EUR', name: 'The Euro', roundOff: 2, isAllowed: true },
  { symbol: 'JPY', name: 'Japanese Yen', roundOff: 0, isAllowed: true },
  { symbol: 'BHD', name: 'Bahraini Dinar', roundOff: 3, isAllowed: true },
  { symbol: 'CLF', name: 'Unidad de Fomento', roundOff: 4, isAllowed: true },
  { symbol: 'xyz', name: 'Unknown Currency', roundOff: 2, isAllowed: true },
  { symbol: 'jpy', name: 'Japanese Yen (lowercase)', roundOff: 0, isAllowed: true }
]

const dummyAccount = {
  getAddress: jest.fn().mockResolvedValue(DUMMY_ACCOUNT_ADDRESS)
}

/**
 * Builds a `fetch` mock that routes by URL to the correct Transak endpoint.
 */
function createFetchMock ({ crypto = DUMMY_CRYPTO, fiat = DUMMY_FIAT, quote, order, countries } = {}) {
  return jest.fn().mockImplementation((url) => {
    const respond = (data) => Promise.resolve({ ok: true, json: jest.fn().mockResolvedValue(data) })

    if (url.includes('crypto-currencies')) return respond({ response: crypto })
    if (url.includes('fiat-currencies')) return respond({ response: fiat })
    if (url.includes('pricing/public/quotes')) return respond({ response: quote })
    if (url.includes('/order/')) return respond({ response: order })
    if (url.includes('api/v2/countries')) return respond({ response: countries })

    return respond({})
  })
}

function findCall (urlFragment) {
  return global.fetch.mock.calls.find(([url]) => url.includes(urlFragment))
}

describe('wdk-protocol-fiat-transak', () => {
  const config = { widgetUrl, getOrder, apiKey: DUMMY_API_KEY, environment: 'STAGING' }

  let transak

  beforeEach(() => {
    jest.clearAllMocks()
    transak = new TransakProtocol(undefined, config)
  })

  describe('buy', () => {
    test('should pass the widgetParams for an exact crypto amount to the widgetUrl callback', async () => {
      widgetUrl.mockReturnValue(DUMMY_WIDGET_URL)
      global.fetch = createFetchMock()

      const result = await transak.buy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        cryptoAmount: 1_000_000_000_000_000_000n // 1 ETH, in base units (wei)
      })

      // The module converts base units to the standard units Transak expects.
      expect(widgetUrl).toHaveBeenCalledWith({
        apiKey: DUMMY_API_KEY,
        productsAvailed: 'BUY',
        cryptoCurrencyCode: 'ETH',
        network: 'ethereum',
        fiatCurrency: 'USD',
        cryptoAmount: 1
      })
      expect(result).toEqual({ buyUrl: DUMMY_WIDGET_URL })
    })

    test('should pass the widgetParams for a specified fiat amount to the widgetUrl callback', async () => {
      widgetUrl.mockReturnValue(DUMMY_WIDGET_URL)
      global.fetch = createFetchMock()

      const result = await transak.buy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: 1000_00n // 1000 USD, in base units (cents)
      })

      expect(widgetUrl).toHaveBeenCalledWith({
        apiKey: DUMMY_API_KEY,
        productsAvailed: 'BUY',
        cryptoCurrencyCode: 'ETH',
        network: 'ethereum',
        fiatCurrency: 'USD',
        fiatAmount: 1000
      })
      expect(result).toEqual({ buyUrl: DUMMY_WIDGET_URL })
    })

    test('should resolve the network from config when the symbol is ambiguous', async () => {
      widgetUrl.mockReturnValue(DUMMY_WIDGET_URL)
      global.fetch = createFetchMock()

      await transak.buy({
        cryptoAsset: 'USDT',
        fiatCurrency: 'USD',
        fiatAmount: 100_00n,
        config: { network: 'tron' }
      })

      expect(widgetUrl).toHaveBeenCalledWith({
        network: 'tron',
        apiKey: DUMMY_API_KEY,
        productsAvailed: 'BUY',
        cryptoCurrencyCode: 'USDT',
        fiatCurrency: 'USD',
        fiatAmount: 100
      })
    })

    test('should throw when widgetUrl is not provided', async () => {
      global.fetch = createFetchMock()

      const noWidgetUrl = new TransakProtocol(undefined, { apiKey: DUMMY_API_KEY, environment: 'STAGING' })

      const error = await noWidgetUrl.buy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: 1000_00n
      }).catch((e) => e)

      expect(error).toBeInstanceOf(ValueError)
      expect(error.message).toBe('A \'widgetUrl\' callback is required to create a Transak widget URL')
      expect(widgetUrl).not.toHaveBeenCalled()
    })

    test('should use the recipient wallet address when provided', async () => {
      widgetUrl.mockReturnValue(DUMMY_WIDGET_URL)
      global.fetch = createFetchMock()

      await transak.buy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: 1000_00n,
        recipient: '0x8ba1f109551bD432803012645Ac136ddd64DBA72'
      })

      expect(widgetUrl).toHaveBeenCalledWith({
        apiKey: DUMMY_API_KEY,
        productsAvailed: 'BUY',
        cryptoCurrencyCode: 'ETH',
        network: 'ethereum',
        fiatCurrency: 'USD',
        fiatAmount: 1000,
        walletAddress: '0x8ba1f109551bD432803012645Ac136ddd64DBA72'
      })
    })

    test('should use the account wallet address when no recipient is provided', async () => {
      widgetUrl.mockReturnValue(DUMMY_WIDGET_URL)
      global.fetch = createFetchMock()

      transak = new TransakProtocol(dummyAccount, config)
      await transak.buy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: 1000_00n
      })

      expect(dummyAccount.getAddress).toHaveBeenCalled()
      expect(widgetUrl).toHaveBeenCalledWith({
        apiKey: DUMMY_API_KEY,
        productsAvailed: 'BUY',
        cryptoCurrencyCode: 'ETH',
        network: 'ethereum',
        fiatCurrency: 'USD',
        fiatAmount: 1000,
        walletAddress: DUMMY_ACCOUNT_ADDRESS
      })
    })

    test('should throw when both cryptoAmount and fiatAmount are provided', async () => {
      global.fetch = createFetchMock()

      const error = await transak.buy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        cryptoAmount: 1n,
        fiatAmount: 1n
      }).catch((e) => e)

      expect(error).toBeInstanceOf(ValueError)
      expect(error.message).toBe('\'cryptoAmount\' and \'fiatAmount\' both cannot be provided')
    })

    test('should throw when neither cryptoAmount nor fiatAmount is provided', async () => {
      global.fetch = createFetchMock()

      const error = await transak.buy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD'
      }).catch((e) => e)

      expect(error).toBeInstanceOf(ValueError)
      expect(error.message).toBe('Either \'cryptoAmount\' or \'fiatAmount\' must be provided')
    })

    test('should throw when the crypto asset or fiat currency is unknown', async () => {
      global.fetch = createFetchMock()

      const error = await transak.buy({
        cryptoAsset: 'DOGE',
        fiatCurrency: 'USD',
        fiatAmount: 100_00n
      }).catch((e) => e)

      expect(error).toBeInstanceOf(NoSuchElementError)
      expect(error.message).toBe('Cannot find info for cryptoAsset and fiatCurrency')
    })
  })

  describe('sell', () => {
    test('should pass the widgetParams for an exact crypto amount to the widgetUrl callback', async () => {
      widgetUrl.mockReturnValue(DUMMY_WIDGET_URL)
      global.fetch = createFetchMock()

      const result = await transak.sell({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        cryptoAmount: 1_000_000_000_000_000_000n // 1 ETH, in base units (wei)
      })

      // The module converts base units to the standard units Transak expects.
      expect(widgetUrl).toHaveBeenCalledWith({
        apiKey: DUMMY_API_KEY,
        productsAvailed: 'SELL',
        cryptoCurrencyCode: 'ETH',
        network: 'ethereum',
        fiatCurrency: 'USD',
        cryptoAmount: 1
      })
      expect(result).toEqual({ sellUrl: DUMMY_WIDGET_URL })
    })

    test('should pass the widgetParams for a specified fiat amount to the widgetUrl callback', async () => {
      widgetUrl.mockReturnValue(DUMMY_WIDGET_URL)
      global.fetch = createFetchMock()

      const result = await transak.sell({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: 1000_00n // 1000 USD, in base units (cents)
      })

      expect(widgetUrl).toHaveBeenCalledWith({
        apiKey: DUMMY_API_KEY,
        productsAvailed: 'SELL',
        cryptoCurrencyCode: 'ETH',
        network: 'ethereum',
        fiatCurrency: 'USD',
        fiatAmount: 1000
      })
      expect(result).toEqual({ sellUrl: DUMMY_WIDGET_URL })
    })

    test('should resolve the network from config when the symbol is ambiguous', async () => {
      widgetUrl.mockReturnValue(DUMMY_WIDGET_URL)
      global.fetch = createFetchMock()

      await transak.sell({
        cryptoAsset: 'USDT',
        fiatCurrency: 'USD',
        cryptoAmount: 1_000_000n, // 1 USDT, in base units (6 decimals)
        config: { network: 'tron' }
      })

      expect(widgetUrl).toHaveBeenCalledWith({
        network: 'tron',
        apiKey: DUMMY_API_KEY,
        productsAvailed: 'SELL',
        cryptoCurrencyCode: 'USDT',
        fiatCurrency: 'USD',
        cryptoAmount: 1
      })
    })

    test('should throw when both cryptoAmount and fiatAmount are provided', async () => {
      global.fetch = createFetchMock()

      const error = await transak.sell({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        cryptoAmount: 1n,
        fiatAmount: 1n
      }).catch((e) => e)

      expect(error).toBeInstanceOf(ValueError)
      expect(error.message).toBe('\'cryptoAmount\' and \'fiatAmount\' both cannot be provided')
    })

    test('should throw when neither cryptoAmount nor fiatAmount is provided', async () => {
      global.fetch = createFetchMock()

      const error = await transak.sell({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD'
      }).catch((e) => e)

      expect(error).toBeInstanceOf(ValueError)
      expect(error.message).toBe('Either \'cryptoAmount\' or \'fiatAmount\' must be provided')
    })

    test('should throw when the crypto asset or fiat currency is unknown', async () => {
      global.fetch = createFetchMock()

      const error = await transak.sell({
        cryptoAsset: 'DOGE',
        fiatCurrency: 'USD',
        cryptoAmount: 1_000_000_000_000_000_000n
      }).catch((e) => e)

      expect(error).toBeInstanceOf(NoSuchElementError)
      expect(error.message).toBe('Cannot find info for cryptoAsset and fiatCurrency')
    })

    test('should throw when widgetUrl is not provided', async () => {
      global.fetch = createFetchMock()

      const noWidgetUrl = new TransakProtocol(undefined, { apiKey: DUMMY_API_KEY, environment: 'STAGING' })

      const error = await noWidgetUrl.sell({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        cryptoAmount: 1_000_000_000_000_000_000n
      }).catch((e) => e)

      expect(error).toBeInstanceOf(ValueError)
      expect(error.message).toBe('A \'widgetUrl\' callback is required to create a Transak widget URL')
      expect(widgetUrl).not.toHaveBeenCalled()
    })
  })

  describe('environment', () => {
    // `environment` selects the API origin used for every network call
    // (quotes, order lookup, supported currencies/countries).
    test('STAGING uses the staging API origin (api-stg.transak.com)', async () => {
      global.fetch = createFetchMock()

      const staging = new TransakProtocol(undefined, { apiKey: DUMMY_API_KEY, environment: 'STAGING' })
      await staging.getSupportedCryptoAssets()

      const [url] = findCall('crypto-currencies')
      expect(new URL(url).origin).toBe('https://api-stg.transak.com')
    })

    test('PRODUCTION uses the production API origin (api.transak.com)', async () => {
      global.fetch = createFetchMock()

      const production = new TransakProtocol(undefined, { apiKey: DUMMY_API_KEY, environment: 'PRODUCTION' })
      await production.getSupportedCryptoAssets()

      const [url] = findCall('crypto-currencies')
      expect(new URL(url).origin).toBe('https://api.transak.com')
    })

    test('defaults to PRODUCTION when environment is omitted', async () => {
      global.fetch = createFetchMock()

      const defaulted = new TransakProtocol(undefined, { apiKey: DUMMY_API_KEY })
      await defaulted.getSupportedCryptoAssets()

      const [url] = findCall('crypto-currencies')
      expect(new URL(url).origin).toBe('https://api.transak.com')
    })
  })

  describe('quoteBuy', () => {
    const DUMMY_BUY_QUOTE = {
      quoteId: 'q1',
      conversionPrice: 2000,
      fiatCurrency: 'USD',
      cryptoCurrency: 'ETH',
      fiatAmount: 1000,
      cryptoAmount: 0.5,
      isBuyOrSell: 'BUY',
      network: 'ethereum',
      totalFee: 5,
      feeBreakdown: [{ name: 'Transak fee', value: 5 }]
    }

    test('should fetch and normalise a buy quote for a fiat amount', async () => {
      global.fetch = createFetchMock({ quote: DUMMY_BUY_QUOTE })

      const quote = await transak.quoteBuy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: 1000_00n, // 1000 USD, in base units (cents)
        config: { paymentMethod: 'credit_debit_card' }
      })

      const [quoteUrl] = findCall('pricing/public/quotes')
      const quoteParams = Object.fromEntries(new URL(quoteUrl).searchParams)
      expect(quoteParams).toMatchObject({
        partnerApiKey: DUMMY_API_KEY,
        fiatCurrency: 'USD',
        cryptoCurrency: 'ETH',
        network: 'ethereum',
        isBuyOrSell: 'BUY',
        fiatAmount: '1000', // converted to standard units for Transak
        paymentMethod: 'credit_debit_card'
      })
      // The raw cryptoAsset must not leak into the pricing query.
      expect(quoteParams.cryptoAsset).toBeUndefined()

      expect(quote).toEqual({
        cryptoAmount: 500_000_000_000_000_000n, // 0.5 ETH
        fiatAmount: 1000_00n,
        fee: 5_00n,
        rate: '2000',
        metadata: DUMMY_BUY_QUOTE
      })
    })

    test('should send x-api-key header on the quote request', async () => {
      global.fetch = createFetchMock({ quote: DUMMY_BUY_QUOTE })

      await transak.quoteBuy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: 1000_00n,
        config: { paymentMethod: 'credit_debit_card' }
      })

      const [, options] = findCall('pricing/public/quotes')
      expect(options.headers['x-api-key']).toBe(DUMMY_API_KEY)
    })

    test('should throw when both cryptoAmount and fiatAmount are provided', async () => {
      global.fetch = createFetchMock({ quote: DUMMY_BUY_QUOTE })

      const error = await transak.quoteBuy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        cryptoAmount: 1n,
        fiatAmount: 1n
      }).catch((e) => e)

      expect(error).toBeInstanceOf(ValueError)
      expect(error.message).toBe('\'cryptoAmount\' and \'fiatAmount\' both cannot be provided')
    })

    test('should throw when neither cryptoAmount nor fiatAmount is provided', async () => {
      global.fetch = createFetchMock({ quote: DUMMY_BUY_QUOTE })

      const error = await transak.quoteBuy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD'
      }).catch((e) => e)

      expect(error).toBeInstanceOf(ValueError)
      expect(error.message).toBe('Either \'cryptoAmount\' or \'fiatAmount\' must be provided')
    })

    test('should throw when the quote request fails', async () => {
      global.fetch = jest.fn().mockImplementation((url) => {
        if (url.includes('crypto-currencies')) return Promise.resolve({ ok: true, json: jest.fn().mockResolvedValue({ response: DUMMY_CRYPTO }) })
        if (url.includes('fiat-currencies')) return Promise.resolve({ ok: true, json: jest.fn().mockResolvedValue({ response: DUMMY_FIAT }) })
        return Promise.resolve({ ok: false, status: 400, statusText: 'Bad Request' })
      })

      const error = await transak.quoteBuy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: 1000_00n,
        config: { paymentMethod: 'credit_debit_card' }
      }).catch((e) => e)

      expect(error).toBeInstanceOf(TransakApiError)
      expect(error.message).toBe('Failed to fetch Transak quote: 400 Bad Request')
    })
  })

  describe('quoteSell', () => {
    const DUMMY_SELL_QUOTE = {
      quoteId: 'q2',
      conversionPrice: 2000,
      fiatCurrency: 'USD',
      cryptoCurrency: 'ETH',
      fiatAmount: 995,
      cryptoAmount: 0.5,
      isBuyOrSell: 'SELL',
      network: 'ethereum',
      totalFee: 5
    }

    test('should fetch and normalise a sell quote', async () => {
      global.fetch = createFetchMock({ quote: DUMMY_SELL_QUOTE })

      const quote = await transak.quoteSell({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        cryptoAmount: 500_000_000_000_000_000n, // 0.5 ETH, in base units (wei)
        config: { paymentMethod: 'sepa_bank_transfer' }
      })

      const [quoteUrl] = findCall('pricing/public/quotes')
      expect(Object.fromEntries(new URL(quoteUrl).searchParams)).toMatchObject({
        partnerApiKey: DUMMY_API_KEY,
        fiatCurrency: 'USD',
        cryptoCurrency: 'ETH',
        isBuyOrSell: 'SELL',
        cryptoAmount: '0.5', // converted to standard units for Transak
        paymentMethod: 'sepa_bank_transfer'
      })

      expect(quote).toEqual({
        cryptoAmount: 500_000_000_000_000_000n,
        fiatAmount: 995_00n,
        fee: 5_00n,
        rate: '2000',
        metadata: DUMMY_SELL_QUOTE
      })
    })

    test('should throw when cryptoAmount is not provided', async () => {
      global.fetch = createFetchMock({ quote: DUMMY_SELL_QUOTE })

      const error = await transak.quoteSell({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        config: { paymentMethod: 'sepa_bank_transfer' }
      }).catch((e) => e)

      expect(error).toBeInstanceOf(ValueError)
      expect(error.message).toBe('\'cryptoAmount\' must be provided')
    })
  })

  describe('getSupportedCryptoAssets', () => {
    test('should return normalised crypto assets', async () => {
      global.fetch = createFetchMock()

      const assets = await transak.getSupportedCryptoAssets()

      expect(assets).toHaveLength(3)
      expect(assets[0]).toEqual({
        code: 'ETH',
        decimals: 18,
        networkCode: 'ethereum',
        name: 'Ethereum',
        metadata: DUMMY_CRYPTO[0]
      })
    })

    test('should throw when the response is not an array', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({ response: { not: 'an array' } }) })

      const error = await transak.getSupportedCryptoAssets().catch((e) => e)

      expect(error).toBeInstanceOf(TransakApiError)
      expect(error.message).toBe('Failed to fetch Transak supported crypto assets')
    })

    test('should cache results across calls within the cache window', async () => {
      global.fetch = createFetchMock()

      await transak.getSupportedCryptoAssets()
      await transak.getSupportedCryptoAssets()

      expect(global.fetch.mock.calls.filter(([url]) => url.includes('crypto-currencies'))).toHaveLength(1)
    })
  })

  describe('getSupportedFiatCurrencies', () => {
    test('should return normalised fiat currencies', async () => {
      global.fetch = createFetchMock({ fiat: [DUMMY_FIAT[0], DUMMY_FIAT[1]] })

      const currencies = await transak.getSupportedFiatCurrencies()

      expect(currencies).toHaveLength(2)
      expect(currencies[0]).toEqual({
        code: 'USD',
        decimals: 2,
        name: 'US Dollar',
        metadata: DUMMY_FIAT[0]
      })
    })

    test('should resolve decimals per ISO 4217', async () => {
      global.fetch = createFetchMock({ fiat: [DUMMY_FIAT[2], DUMMY_FIAT[3], DUMMY_FIAT[4]] })

      const currencies = await transak.getSupportedFiatCurrencies()

      expect(currencies).toEqual([
        { code: 'JPY', decimals: 0, name: 'Japanese Yen', metadata: DUMMY_FIAT[2] },
        { code: 'BHD', decimals: 3, name: 'Bahraini Dinar', metadata: DUMMY_FIAT[3] },
        { code: 'CLF', decimals: 4, name: 'Unidad de Fomento', metadata: DUMMY_FIAT[4] }
      ])
    })

    test('should default to 2 decimals for an unrecognised currency code', async () => {
      global.fetch = createFetchMock({ fiat: [DUMMY_FIAT[5]] })

      const currencies = await transak.getSupportedFiatCurrencies()

      expect(currencies).toEqual([
        { code: 'xyz', decimals: 2, name: 'Unknown Currency', metadata: DUMMY_FIAT[5] }
      ])
    })

    test('should match ISO 4217 codes case-insensitively', async () => {
      global.fetch = createFetchMock({ fiat: [DUMMY_FIAT[6]] })

      const currencies = await transak.getSupportedFiatCurrencies()

      expect(currencies[0].decimals).toBe(0)
    })
  })

  describe('getSupportedCountries', () => {
    // isBuyAllowed/isSellAllowed are derived from the matching fiat currency's
    // isAllowed/isPayOutAllowed flags (looked up via currencyCode), not the
    // country's own isAllowed flag.
    const DUMMY_COUNTRY_FIAT = [
      { symbol: 'USD', name: 'US Dollar', isAllowed: true, isPayOutAllowed: true },
      { symbol: 'EUR', name: 'The Euro', isAllowed: true } // isPayOutAllowed omitted -> sell not allowed
    ]

    const DUMMY_COUNTRIES = [
      { alpha2: 'US', alpha3: 'USA', name: 'United States', currencyCode: 'USD', isAllowed: true },
      { alpha2: 'FR', alpha3: 'FRA', name: 'France', currencyCode: 'EUR', isAllowed: true },
      { alpha3: 'CAN', name: 'Canada', currencyCode: 'CAD', isAllowed: false } // No alpha2 to test fallback; no matching fiat currency
    ]

    test('should successfully return supported countries', async () => {
      global.fetch = createFetchMock({ countries: DUMMY_COUNTRIES, fiat: DUMMY_COUNTRY_FIAT })

      const countries = await transak.getSupportedCountries()

      expect(countries).toEqual([
        { code: 'US', isBuyAllowed: true, isSellAllowed: true, name: 'United States', metadata: DUMMY_COUNTRIES[0] },
        { code: 'FR', isBuyAllowed: true, isSellAllowed: false, name: 'France', metadata: DUMMY_COUNTRIES[1] },
        { code: 'CAN', isBuyAllowed: false, isSellAllowed: false, name: 'Canada', metadata: DUMMY_COUNTRIES[2] }
      ])
    })

    test('should throw when fetch fails', async () => {
      global.fetch = jest.fn().mockImplementation((url) => {
        if (url.includes('fiat-currencies')) return Promise.resolve({ ok: true, json: jest.fn().mockResolvedValue({ response: DUMMY_FIAT }) })
        return Promise.resolve({ ok: false, status: 500, statusText: 'Error' })
      })

      const error = await transak.getSupportedCountries().catch((e) => e)

      expect(error).toBeInstanceOf(TransakApiError)
      expect(error.message).toBe('Failed to fetch supported countries: 500 Error')
    })

    test('should throw when data is invalid', async () => {
      global.fetch = jest.fn().mockImplementation((url) => {
        if (url.includes('fiat-currencies')) return Promise.resolve({ ok: true, json: jest.fn().mockResolvedValue({ response: DUMMY_FIAT }) })
        return Promise.resolve({ ok: true, json: jest.fn().mockResolvedValue({ response: 'not an array' }) })
      })

      const error = await transak.getSupportedCountries().catch((e) => e)

      expect(error).toBeInstanceOf(TransakApiError)
      expect(error.message).toBe('Failed to fetch supported countries')
    })
  })

  describe('getTransactionDetail', () => {
    test('should fetch the order via the getOrder callback and map a completed status', async () => {
      const dummyOrder = { id: 'o1', status: 'COMPLETED', cryptoCurrency: 'ETH', fiatCurrency: 'USD', isBuyOrSell: 'BUY' }
      getOrder.mockResolvedValue(dummyOrder)

      const details = await transak.getTransactionDetail('o1')

      expect(getOrder).toHaveBeenCalledWith('o1')
      expect(details).toEqual({
        status: 'completed',
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        metadata: dummyOrder
      })
    })

    test('should map an in-progress status', async () => {
      getOrder.mockResolvedValue({ id: 'o2', status: 'PROCESSING', cryptoCurrency: 'ETH', fiatCurrency: 'USD' })

      const details = await transak.getTransactionDetail('o2')
      expect(details.status).toBe('in_progress')
    })

    test('should map a failed status', async () => {
      getOrder.mockResolvedValue({ id: 'o3', status: 'FAILED', cryptoCurrency: 'ETH', fiatCurrency: 'USD' })

      const details = await transak.getTransactionDetail('o3')
      expect(details.status).toBe('failed')
    })

    test('should default unknown statuses to in_progress', async () => {
      getOrder.mockResolvedValue({ id: 'o4', status: 'SOME_NEW_STATUS', cryptoCurrency: 'ETH', fiatCurrency: 'USD' })

      const details = await transak.getTransactionDetail('o4')
      expect(details.status).toBe('in_progress')
    })

    test('should throw when the getOrder callback is not provided', async () => {
      const noGetOrder = new TransakProtocol(undefined, { apiKey: DUMMY_API_KEY, environment: 'STAGING' })

      const error = await noGetOrder.getTransactionDetail('o1').catch((e) => e)

      expect(error).toBeInstanceOf(ValueError)
      expect(error.message).toBe('A \'getOrder\' callback is required to fetch a Transak order')
      expect(getOrder).not.toHaveBeenCalled()
    })

    test('should propagate errors from the getOrder callback', async () => {
      getOrder.mockRejectedValue(new Error('Failed to fetch Transak order: 404 Not Found'))

      await expect(transak.getTransactionDetail('missing')).rejects.toThrow('Failed to fetch Transak order: 404 Not Found')
    })
  })
})
