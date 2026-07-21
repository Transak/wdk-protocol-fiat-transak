import { beforeEach, describe, expect, jest, test } from '@jest/globals'

import TransakProtocol from '../src/transak-protocol.js'

const widgetUrl = jest.fn()
const getOrder = jest.fn()

// Transak partner API keys are UUIDs (from the Transak Partner dashboard).
const MOCK_API_KEY = '4fcd6904-706b-4aff-bd9d-77422813bbb7'
// The session-based widget URL Transak's Create Widget URL API returns.
const MOCK_WIDGET_URL = 'https://global-stg.transak.com/?apiKey=4fcd6904-706b-4aff-bd9d-77422813bbb7&sessionId=b8f4e2a1-9c3d-4e6f-8a1b-2c3d4e5f6a7b'
// The account's on-chain wallet address (EVM checksum format).
const MOCK_ACCOUNT_ADDRESS = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'

const MOCK_CRYPTO = [
  { symbol: 'ETH', name: 'Ethereum', decimals: 18, roundOff: 5, network: { name: 'ethereum', chainId: 1 }, isAllowed: true, uniqueId: 'ETHethereum' },
  { symbol: 'USDT', name: 'Tether USD', decimals: 6, roundOff: 2, network: { name: 'ethereum', chainId: 1 }, isAllowed: true, uniqueId: 'USDTethereum' },
  { symbol: 'USDT', name: 'Tether USD', decimals: 6, roundOff: 2, network: { name: 'tron' }, isAllowed: true, uniqueId: 'USDTtron' }
]

const MOCK_FIAT = [
  { symbol: 'USD', name: 'US Dollar', roundOff: 2, isAllowed: true },
  { symbol: 'EUR', name: 'The Euro', roundOff: 2, isAllowed: true },
  { symbol: 'JPY', name: 'Japanese Yen', isAllowed: true },
  { symbol: 'BHD', name: 'Bahraini Dinar', isAllowed: true },
  { symbol: 'CLF', name: 'Unidad de Fomento', isAllowed: true },
  { symbol: 'xyz', name: 'Unknown Currency', isAllowed: true },
  { symbol: 'jpy', name: 'Japanese Yen (lowercase)', isAllowed: true }
]

const mockAccount = {
  getAddress: jest.fn().mockResolvedValue(MOCK_ACCOUNT_ADDRESS)
}

/**
 * Builds a `fetch` mock that routes by URL to the correct Transak endpoint.
 */
function createFetchMock ({ crypto = MOCK_CRYPTO, fiat = MOCK_FIAT, quote, order, countries } = {}) {
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

describe('TransakProtocol', () => {
  const config = { widgetUrl, getOrder, apiKey: MOCK_API_KEY, environment: 'STAGING' }

  let transak

  beforeEach(() => {
    jest.clearAllMocks()
    transak = new TransakProtocol(undefined, config)
  })

  describe('buy', () => {
    test('should pass the widgetParams for an exact crypto amount to the widgetUrl callback', async () => {
      widgetUrl.mockReturnValue(MOCK_WIDGET_URL)
      global.fetch = createFetchMock()

      const result = await transak.buy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        cryptoAmount: 1_000_000_000_000_000_000n // 1 ETH, in base units (wei)
      })

      const [[widgetParams]] = widgetUrl.mock.calls

      // The module converts base units to the standard units Transak expects.
      expect(widgetParams).toMatchObject({
        apiKey: MOCK_API_KEY,
        productsAvailed: 'BUY',
        cryptoCurrencyCode: 'ETH',
        network: 'ethereum',
        fiatCurrency: 'USD',
        cryptoAmount: 1
      })
      expect(result).toEqual({ buyUrl: MOCK_WIDGET_URL })
    })

    test('should pass the widgetParams for a specified fiat amount to the widgetUrl callback', async () => {
      widgetUrl.mockReturnValue(MOCK_WIDGET_URL)
      global.fetch = createFetchMock()

      const result = await transak.buy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: 1000_00n // 1000 USD, in base units (cents)
      })

      const [[widgetParams]] = widgetUrl.mock.calls

      expect(widgetParams).toMatchObject({
        apiKey: MOCK_API_KEY,
        productsAvailed: 'BUY',
        cryptoCurrencyCode: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: 1000
      })
      expect(result).toEqual({ buyUrl: MOCK_WIDGET_URL })
    })

    test('should resolve the network from config when the symbol is ambiguous', async () => {
      widgetUrl.mockReturnValue(MOCK_WIDGET_URL)
      global.fetch = createFetchMock()

      await transak.buy({
        cryptoAsset: 'USDT',
        fiatCurrency: 'USD',
        fiatAmount: 100_00n,
        config: { network: 'tron' }
      })

      const [[widgetParams]] = widgetUrl.mock.calls

      expect(widgetParams).toMatchObject({
        cryptoCurrencyCode: 'USDT',
        network: 'tron'
      })
    })

    test('should throw when widgetUrl is not provided', async () => {
      global.fetch = createFetchMock()

      const noWidgetUrl = new TransakProtocol(undefined, { apiKey: MOCK_API_KEY, environment: 'STAGING' })

      await expect(noWidgetUrl.buy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: 1000_00n
      })).rejects.toThrow('A \'widgetUrl\' callback is required to create a Transak widget URL')
      expect(widgetUrl).not.toHaveBeenCalled()
    })

    test('should use the recipient wallet address when provided', async () => {
      widgetUrl.mockReturnValue(MOCK_WIDGET_URL)
      global.fetch = createFetchMock()

      await transak.buy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: 1000_00n,
        recipient: '0x8ba1f109551bD432803012645Ac136ddd64DBA72'
      })

      const [[widgetParams]] = widgetUrl.mock.calls
      expect(widgetParams.walletAddress).toBe('0x8ba1f109551bD432803012645Ac136ddd64DBA72')
    })

    test('should use the account wallet address when no recipient is provided', async () => {
      widgetUrl.mockReturnValue(MOCK_WIDGET_URL)
      global.fetch = createFetchMock()

      transak = new TransakProtocol(mockAccount, config)
      await transak.buy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: 1000_00n
      })

      const [[widgetParams]] = widgetUrl.mock.calls
      expect(mockAccount.getAddress).toHaveBeenCalled()
      expect(widgetParams.walletAddress).toBe(MOCK_ACCOUNT_ADDRESS)
    })

    test('should throw when both cryptoAmount and fiatAmount are provided', async () => {
      global.fetch = createFetchMock()

      await expect(transak.buy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        cryptoAmount: 1n,
        fiatAmount: 1n
      })).rejects.toThrow('\'cryptoAmount\' and \'fiatAmount\' both cannot be provided')
    })

    test('should throw when neither cryptoAmount nor fiatAmount is provided', async () => {
      global.fetch = createFetchMock()

      await expect(transak.buy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD'
      })).rejects.toThrow('Either \'cryptoAmount\' or \'fiatAmount\' must be provided')
    })

    test('should throw when the crypto asset or fiat currency is unknown', async () => {
      global.fetch = createFetchMock()

      await expect(transak.buy({
        cryptoAsset: 'DOGE',
        fiatCurrency: 'USD',
        fiatAmount: 100_00n
      })).rejects.toThrow('Cannot find info for cryptoAsset and fiatCurrency')
    })
  })

  describe('sell', () => {
    test('should pass the widgetParams for an exact crypto amount to the widgetUrl callback', async () => {
      widgetUrl.mockReturnValue(MOCK_WIDGET_URL)
      global.fetch = createFetchMock()

      const result = await transak.sell({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        cryptoAmount: 1_000_000_000_000_000_000n // 1 ETH, in base units (wei)
      })

      const [[widgetParams]] = widgetUrl.mock.calls

      // The module converts base units to the standard units Transak expects.
      expect(widgetParams).toMatchObject({
        apiKey: MOCK_API_KEY,
        productsAvailed: 'SELL',
        cryptoCurrencyCode: 'ETH',
        network: 'ethereum',
        fiatCurrency: 'USD',
        cryptoAmount: 1
      })
      expect(result).toEqual({ sellUrl: MOCK_WIDGET_URL })
    })

    test('should pass the widgetParams for a specified fiat amount to the widgetUrl callback', async () => {
      widgetUrl.mockReturnValue(MOCK_WIDGET_URL)
      global.fetch = createFetchMock()

      const result = await transak.sell({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: 1000_00n // 1000 USD, in base units (cents)
      })

      const [[widgetParams]] = widgetUrl.mock.calls

      expect(widgetParams).toMatchObject({
        apiKey: MOCK_API_KEY,
        productsAvailed: 'SELL',
        cryptoCurrencyCode: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: 1000
      })
      expect(result).toEqual({ sellUrl: MOCK_WIDGET_URL })
    })

    test('should resolve the network from config when the symbol is ambiguous', async () => {
      widgetUrl.mockReturnValue(MOCK_WIDGET_URL)
      global.fetch = createFetchMock()

      await transak.sell({
        cryptoAsset: 'USDT',
        fiatCurrency: 'USD',
        cryptoAmount: 1_000_000n, // 1 USDT, in base units (6 decimals)
        config: { network: 'tron' }
      })

      const [[widgetParams]] = widgetUrl.mock.calls

      expect(widgetParams).toMatchObject({
        cryptoCurrencyCode: 'USDT',
        network: 'tron'
      })
    })

    test('should throw when both cryptoAmount and fiatAmount are provided', async () => {
      global.fetch = createFetchMock()

      await expect(transak.sell({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        cryptoAmount: 1n,
        fiatAmount: 1n
      })).rejects.toThrow('\'cryptoAmount\' and \'fiatAmount\' both cannot be provided')
    })

    test('should throw when neither cryptoAmount nor fiatAmount is provided', async () => {
      global.fetch = createFetchMock()

      await expect(transak.sell({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD'
      })).rejects.toThrow('Either \'cryptoAmount\' or \'fiatAmount\' must be provided')
    })

    test('should throw when the crypto asset or fiat currency is unknown', async () => {
      global.fetch = createFetchMock()

      await expect(transak.sell({
        cryptoAsset: 'DOGE',
        fiatCurrency: 'USD',
        cryptoAmount: 1_000_000_000_000_000_000n
      })).rejects.toThrow('Cannot find info for cryptoAsset and fiatCurrency')
    })

    test('should throw when widgetUrl is not provided', async () => {
      global.fetch = createFetchMock()

      const noWidgetUrl = new TransakProtocol(undefined, { apiKey: MOCK_API_KEY, environment: 'STAGING' })

      await expect(noWidgetUrl.sell({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        cryptoAmount: 1_000_000_000_000_000_000n
      })).rejects.toThrow('A \'widgetUrl\' callback is required to create a Transak widget URL')
      expect(widgetUrl).not.toHaveBeenCalled()
    })
  })

  describe('environment', () => {
    // `environment` selects the API origin used for every network call
    // (quotes, order lookup, supported currencies/countries).
    test('STAGING uses the staging API origin (api-stg.transak.com)', async () => {
      global.fetch = createFetchMock()

      const staging = new TransakProtocol(undefined, { apiKey: MOCK_API_KEY, environment: 'STAGING' })
      await staging.getSupportedCryptoAssets()

      const [url] = findCall('crypto-currencies')
      expect(new URL(url).origin).toBe('https://api-stg.transak.com')
    })

    test('PRODUCTION uses the production API origin (api.transak.com)', async () => {
      global.fetch = createFetchMock()

      const production = new TransakProtocol(undefined, { apiKey: MOCK_API_KEY, environment: 'PRODUCTION' })
      await production.getSupportedCryptoAssets()

      const [url] = findCall('crypto-currencies')
      expect(new URL(url).origin).toBe('https://api.transak.com')
    })

    test('defaults to PRODUCTION when environment is omitted', async () => {
      global.fetch = createFetchMock()

      const defaulted = new TransakProtocol(undefined, { apiKey: MOCK_API_KEY })
      await defaulted.getSupportedCryptoAssets()

      const [url] = findCall('crypto-currencies')
      expect(new URL(url).origin).toBe('https://api.transak.com')
    })
  })

  describe('quoteBuy', () => {
    const MOCK_BUY_QUOTE = {
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
      global.fetch = createFetchMock({ quote: MOCK_BUY_QUOTE })

      const quote = await transak.quoteBuy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: 1000_00n, // 1000 USD, in base units (cents)
        config: { paymentMethod: 'credit_debit_card' }
      })

      const [quoteUrl] = findCall('pricing/public/quotes')
      const quoteParams = Object.fromEntries(new URL(quoteUrl).searchParams)
      expect(quoteParams).toMatchObject({
        partnerApiKey: MOCK_API_KEY,
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
        metadata: MOCK_BUY_QUOTE
      })
    })

    test('should send x-api-key header on the quote request', async () => {
      global.fetch = createFetchMock({ quote: MOCK_BUY_QUOTE })

      await transak.quoteBuy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: 1000_00n,
        config: { paymentMethod: 'credit_debit_card' }
      })

      const [, options] = findCall('pricing/public/quotes')
      expect(options.headers['x-api-key']).toBe(MOCK_API_KEY)
    })

    test('should throw when both cryptoAmount and fiatAmount are provided', async () => {
      global.fetch = createFetchMock({ quote: MOCK_BUY_QUOTE })

      await expect(transak.quoteBuy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        cryptoAmount: 1n,
        fiatAmount: 1n
      })).rejects.toThrow('\'cryptoAmount\' and \'fiatAmount\' both cannot be provided')
    })

    test('should throw when neither cryptoAmount nor fiatAmount is provided', async () => {
      global.fetch = createFetchMock({ quote: MOCK_BUY_QUOTE })

      await expect(transak.quoteBuy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD'
      })).rejects.toThrow('Either \'cryptoAmount\' or \'fiatAmount\' must be provided')
    })

    test('should throw when the quote request fails', async () => {
      global.fetch = jest.fn().mockImplementation((url) => {
        if (url.includes('crypto-currencies')) return Promise.resolve({ ok: true, json: jest.fn().mockResolvedValue({ response: MOCK_CRYPTO }) })
        if (url.includes('fiat-currencies')) return Promise.resolve({ ok: true, json: jest.fn().mockResolvedValue({ response: MOCK_FIAT }) })
        return Promise.resolve({ ok: false, status: 400, statusText: 'Bad Request' })
      })

      await expect(transak.quoteBuy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: 1000_00n,
        config: { paymentMethod: 'credit_debit_card' }
      })).rejects.toThrow('Failed to fetch Transak quote: 400 Bad Request')
    })
  })

  describe('quoteSell', () => {
    const MOCK_SELL_QUOTE = {
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
      global.fetch = createFetchMock({ quote: MOCK_SELL_QUOTE })

      const quote = await transak.quoteSell({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        cryptoAmount: 500_000_000_000_000_000n, // 0.5 ETH, in base units (wei)
        config: { paymentMethod: 'sepa_bank_transfer' }
      })

      const [quoteUrl] = findCall('pricing/public/quotes')
      expect(Object.fromEntries(new URL(quoteUrl).searchParams)).toMatchObject({
        partnerApiKey: MOCK_API_KEY,
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
        metadata: MOCK_SELL_QUOTE
      })
    })

    test('should throw when cryptoAmount is not provided', async () => {
      global.fetch = createFetchMock({ quote: MOCK_SELL_QUOTE })

      await expect(transak.quoteSell({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        config: { paymentMethod: 'sepa_bank_transfer' }
      })).rejects.toThrow('\'cryptoAmount\' must be provided')
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
        metadata: MOCK_CRYPTO[0]
      })
    })

    test('should throw when the response is not an array', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({ response: { not: 'an array' } }) })

      await expect(transak.getSupportedCryptoAssets()).rejects.toThrow('Failed to fetch Transak supported crypto assets')
    })

    test('should cache results across calls within the cache window', async () => {
      global.fetch = createFetchMock()

      await transak.getSupportedCryptoAssets()
      await transak.getSupportedCryptoAssets()

      expect(findCall('crypto-currencies')).toBeDefined()
      expect(global.fetch.mock.calls.filter(([url]) => url.includes('crypto-currencies'))).toHaveLength(1)
    })
  })

  describe('getSupportedFiatCurrencies', () => {
    test('should return normalised fiat currencies', async () => {
      global.fetch = createFetchMock({ fiat: [MOCK_FIAT[0], MOCK_FIAT[1]] })

      const currencies = await transak.getSupportedFiatCurrencies()

      expect(currencies).toHaveLength(2)
      expect(currencies[0]).toEqual({
        code: 'USD',
        decimals: 2,
        name: 'US Dollar',
        metadata: MOCK_FIAT[0]
      })
    })

    test('should resolve decimals per ISO 4217', async () => {
      global.fetch = createFetchMock({ fiat: [MOCK_FIAT[2], MOCK_FIAT[3], MOCK_FIAT[4]] })

      const currencies = await transak.getSupportedFiatCurrencies()

      expect(currencies).toEqual([
        { code: 'JPY', decimals: 0, name: 'Japanese Yen', metadata: MOCK_FIAT[2] },
        { code: 'BHD', decimals: 3, name: 'Bahraini Dinar', metadata: MOCK_FIAT[3] },
        { code: 'CLF', decimals: 4, name: 'Unidad de Fomento', metadata: MOCK_FIAT[4] }
      ])
    })

    test('should default to 2 decimals for an unrecognised currency code', async () => {
      global.fetch = createFetchMock({ fiat: [MOCK_FIAT[5]] })

      const currencies = await transak.getSupportedFiatCurrencies()

      expect(currencies).toEqual([
        { code: 'xyz', decimals: 2, name: 'Unknown Currency', metadata: MOCK_FIAT[5] }
      ])
    })

    test('should match ISO 4217 codes case-insensitively', async () => {
      global.fetch = createFetchMock({ fiat: [MOCK_FIAT[6]] })

      const currencies = await transak.getSupportedFiatCurrencies()

      expect(currencies[0].decimals).toBe(0)
    })
  })

  describe('getSupportedCountries', () => {
    // isBuyAllowed/isSellAllowed are derived from the matching fiat currency's
    // isAllowed/isPayOutAllowed flags (looked up via currencyCode), not the
    // country's own isAllowed flag.
    const MOCK_COUNTRY_FIAT = [
      { symbol: 'USD', name: 'US Dollar', isAllowed: true, isPayOutAllowed: true },
      { symbol: 'EUR', name: 'The Euro', isAllowed: true } // isPayOutAllowed omitted -> sell not allowed
    ]

    const MOCK_COUNTRIES = [
      { alpha2: 'US', alpha3: 'USA', name: 'United States', currencyCode: 'USD', isAllowed: true },
      { alpha2: 'FR', alpha3: 'FRA', name: 'France', currencyCode: 'EUR', isAllowed: true },
      { alpha3: 'CAN', name: 'Canada', currencyCode: 'CAD', isAllowed: false } // No alpha2 to test fallback; no matching fiat currency
    ]

    test('should successfully return supported countries', async () => {
      global.fetch = createFetchMock({ countries: MOCK_COUNTRIES, fiat: MOCK_COUNTRY_FIAT })

      const countries = await transak.getSupportedCountries()

      expect(countries).toHaveLength(3)
      expect(countries[0].code).toBe('US')
      expect(countries[0].name).toBe('United States')
      expect(countries[0].isBuyAllowed).toBe(true)
      expect(countries[0].isSellAllowed).toBe(true)
      expect(countries[0].metadata).toEqual(MOCK_COUNTRIES[0])

      expect(countries[1].code).toBe('FR')
      expect(countries[1].isBuyAllowed).toBe(true)
      expect(countries[1].isSellAllowed).toBe(false)

      expect(countries[2].code).toBe('CAN')
      expect(countries[2].isBuyAllowed).toBe(false)
      expect(countries[2].isSellAllowed).toBe(false)
    })

    test('should throw when fetch fails', async () => {
      global.fetch = jest.fn().mockImplementation((url) => {
        if (url.includes('fiat-currencies')) return Promise.resolve({ ok: true, json: jest.fn().mockResolvedValue({ response: MOCK_FIAT }) })
        return Promise.resolve({ ok: false, status: 500, statusText: 'Error' })
      })

      await expect(transak.getSupportedCountries()).rejects.toThrow('Failed to fetch supported countries: 500 Error')
    })

    test('should throw when data is invalid', async () => {
      global.fetch = jest.fn().mockImplementation((url) => {
        if (url.includes('fiat-currencies')) return Promise.resolve({ ok: true, json: jest.fn().mockResolvedValue({ response: MOCK_FIAT }) })
        return Promise.resolve({ ok: true, json: jest.fn().mockResolvedValue({ response: 'not an array' }) })
      })

      await expect(transak.getSupportedCountries()).rejects.toThrow('Failed to fetch supported countries')
    })
  })

  describe('getTransactionDetail', () => {
    test('should fetch the order via the getOrder callback and map a completed status', async () => {
      const mockOrder = { id: 'o1', status: 'COMPLETED', cryptoCurrency: 'ETH', fiatCurrency: 'USD', isBuyOrSell: 'BUY' }
      getOrder.mockResolvedValue(mockOrder)

      const details = await transak.getTransactionDetail('o1')

      expect(getOrder).toHaveBeenCalledWith('o1')
      expect(details).toEqual({
        status: 'completed',
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        metadata: mockOrder
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
      const noGetOrder = new TransakProtocol(undefined, { apiKey: MOCK_API_KEY, environment: 'STAGING' })

      await expect(noGetOrder.getTransactionDetail('o1')).rejects.toThrow('A \'getOrder\' callback is required to fetch a Transak order')
      expect(getOrder).not.toHaveBeenCalled()
    })

    test('should propagate errors from the getOrder callback', async () => {
      getOrder.mockRejectedValue(new Error('Failed to fetch Transak order: 404 Not Found'))

      await expect(transak.getTransactionDetail('missing')).rejects.toThrow('Failed to fetch Transak order: 404 Not Found')
    })
  })
})
