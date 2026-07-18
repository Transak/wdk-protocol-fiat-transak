import { beforeEach, describe, expect, jest, test } from '@jest/globals'

import TransakProtocol from '../src/transak-protocol.js'

const widgetUrl = jest.fn()

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
  { symbol: 'BAD_FIAT', name: 'Bad Fiat', roundOff: undefined, isAllowed: true }
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
  const config = { widgetUrl, apiKey: MOCK_API_KEY, environment: 'STAGING' }

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
        cryptoAmount: 1
      })

      const [[widgetParams]] = widgetUrl.mock.calls

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
        fiatAmount: 1000 // 1000 USD
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
        fiatAmount: 100,
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
        fiatAmount: 1000
      })).rejects.toThrow('A \'widgetUrl\' callback is required to create a Transak widget URL')
      expect(widgetUrl).not.toHaveBeenCalled()
    })

    test('should use the recipient wallet address when provided', async () => {
      widgetUrl.mockReturnValue(MOCK_WIDGET_URL)
      global.fetch = createFetchMock()

      await transak.buy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: 1000,
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
        fiatAmount: 1000
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
        cryptoAmount: 1,
        fiatAmount: 1
      })).rejects.toThrow('\'cryptoAmount\' and \'fiatAmount\' cannot both be provided')
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
        fiatAmount: 100
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
        cryptoAmount: 1
      })

      const [[widgetParams]] = widgetUrl.mock.calls

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
        fiatAmount: 1000 // 1000 USD
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
        cryptoAmount: 1,
        config: { network: 'tron' }
      })

      const [[widgetParams]] = widgetUrl.mock.calls

      expect(widgetParams).toMatchObject({
        cryptoCurrencyCode: 'USDT',
        network: 'tron'
      })
    })

    test('should use the refundAddress as the wallet address when provided', async () => {
      widgetUrl.mockReturnValue(MOCK_WIDGET_URL)
      global.fetch = createFetchMock()

      await transak.sell({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        cryptoAmount: 1,
        refundAddress: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8'
      })

      const [[widgetParams]] = widgetUrl.mock.calls
      expect(widgetParams.walletAddress).toBe('0x2170Ed0880ac9A755fd29B2688956BD959F933F8')
    })

    test('should use the account wallet address when no refundAddress is provided', async () => {
      widgetUrl.mockReturnValue(MOCK_WIDGET_URL)
      global.fetch = createFetchMock()

      transak = new TransakProtocol(mockAccount, config)
      await transak.sell({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        cryptoAmount: 1
      })

      const [[widgetParams]] = widgetUrl.mock.calls
      expect(mockAccount.getAddress).toHaveBeenCalled()
      expect(widgetParams.walletAddress).toBe(MOCK_ACCOUNT_ADDRESS)
    })

    test('should throw when both cryptoAmount and fiatAmount are provided', async () => {
      global.fetch = createFetchMock()

      await expect(transak.sell({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        cryptoAmount: 1,
        fiatAmount: 1
      })).rejects.toThrow('\'cryptoAmount\' and \'fiatAmount\' cannot both be provided')
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
        cryptoAmount: 1
      })).rejects.toThrow('Cannot find info for cryptoAsset and fiatCurrency')
    })

    test('should throw when widgetUrl is not provided', async () => {
      global.fetch = createFetchMock()

      const noWidgetUrl = new TransakProtocol(undefined, { apiKey: MOCK_API_KEY, environment: 'STAGING' })

      await expect(noWidgetUrl.sell({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        cryptoAmount: 1
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
        fiatAmount: 1000,
        paymentMethod: 'credit_debit_card',
        network: 'ethereum'
      })

      const [quoteUrl] = findCall('pricing/public/quotes')
      const quoteParams = Object.fromEntries(new URL(quoteUrl).searchParams)
      expect(quoteParams).toMatchObject({
        partnerApiKey: MOCK_API_KEY,
        fiatCurrency: 'USD',
        cryptoCurrency: 'ETH',
        network: 'ethereum',
        isBuyOrSell: 'BUY',
        fiatAmount: '1000',
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
        fiatAmount: 1000,
        paymentMethod: 'credit_debit_card',
        network: 'ethereum'
      })

      const [, options] = findCall('pricing/public/quotes')
      expect(options.headers['x-api-key']).toBe(MOCK_API_KEY)
    })

    test('should throw when fiatAmount is not provided', async () => {
      global.fetch = createFetchMock({ quote: MOCK_BUY_QUOTE })

      await expect(transak.quoteBuy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        paymentMethod: 'credit_debit_card',
        network: 'ethereum'
      })).rejects.toThrow('\'fiatAmount\' must be provided')
    })

    test('should throw when paymentMethod is not provided', async () => {
      global.fetch = createFetchMock({ quote: MOCK_BUY_QUOTE })

      await expect(transak.quoteBuy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: 1000,
        network: 'ethereum'
      })).rejects.toThrow('\'paymentMethod\' must be provided')
    })

    test('should throw when network is not provided', async () => {
      global.fetch = createFetchMock({ quote: MOCK_BUY_QUOTE })

      await expect(transak.quoteBuy({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        fiatAmount: 1000,
        paymentMethod: 'credit_debit_card'
      })).rejects.toThrow('\'network\' must be provided')
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
        fiatAmount: 1000,
        paymentMethod: 'credit_debit_card',
        network: 'ethereum'
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
        cryptoAmount: 0.5, // 0.5 ETH
        paymentMethod: 'sepa_bank_transfer',
        network: 'ethereum'
      })

      const [quoteUrl] = findCall('pricing/public/quotes')
      expect(Object.fromEntries(new URL(quoteUrl).searchParams)).toMatchObject({
        partnerApiKey: MOCK_API_KEY,
        fiatCurrency: 'USD',
        cryptoCurrency: 'ETH',
        isBuyOrSell: 'SELL',
        cryptoAmount: '0.5',
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
        paymentMethod: 'sepa_bank_transfer',
        network: 'ethereum'
      })).rejects.toThrow('\'cryptoAmount\' must be provided')
    })

    test('should throw when paymentMethod is not provided', async () => {
      global.fetch = createFetchMock({ quote: MOCK_SELL_QUOTE })

      await expect(transak.quoteSell({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        cryptoAmount: 0.5,
        network: 'ethereum'
      })).rejects.toThrow('\'paymentMethod\' must be provided')
    })

    test('should throw when network is not provided', async () => {
      global.fetch = createFetchMock({ quote: MOCK_SELL_QUOTE })

      await expect(transak.quoteSell({
        cryptoAsset: 'ETH',
        fiatCurrency: 'USD',
        cryptoAmount: 0.5,
        paymentMethod: 'sepa_bank_transfer'
      })).rejects.toThrow('\'network\' must be provided')
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

    test('should throw when a fiat currency is missing decimals', async () => {
      global.fetch = createFetchMock()

      await expect(transak.getSupportedFiatCurrencies()).rejects.toThrow('Could not determine decimals for fiat currency: BAD_FIAT')
    })
  })

  describe('getSupportedCountries', () => {
    const MOCK_COUNTRIES = [
      { alpha2: 'US', alpha3: 'USA', name: 'United States', isAllowed: true },
      { alpha3: 'CAN', name: 'Canada', isAllowed: false } // No alpha2 to test fallback
    ]

    test('should successfully return supported countries', async () => {
      global.fetch = createFetchMock({ countries: MOCK_COUNTRIES })

      const countries = await transak.getSupportedCountries()

      expect(countries).toHaveLength(2)
      expect(countries[0].code).toBe('US')
      expect(countries[0].name).toBe('United States')
      expect(countries[0].isBuyAllowed).toBe(true)
      expect(countries[0].isSellAllowed).toBe(true)
      expect(countries[0].metadata).toEqual(MOCK_COUNTRIES[0])

      expect(countries[1].code).toBe('CAN')
      expect(countries[1].isBuyAllowed).toBe(false)
    })

    test('should throw when fetch fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Error' })

      await expect(transak.getSupportedCountries()).rejects.toThrow('Failed to fetch supported countries: 500 Error')
    })

    test('should throw when data is invalid', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({ response: 'not an array' }) })

      await expect(transak.getSupportedCountries()).rejects.toThrow('Failed to fetch supported countries')
    })
  })

  describe('getTransactionDetail', () => {
    test('should fetch order details and map a completed status', async () => {
      const mockOrder = { id: 'o1', status: 'COMPLETED', cryptoCurrency: 'ETH', fiatCurrency: 'USD', isBuyOrSell: 'BUY' }
      global.fetch = createFetchMock({ order: mockOrder })

      const details = await transak.getTransactionDetail('o1')

      const [orderUrl, options] = findCall('/order/')
      expect(orderUrl).toBe('https://api-stg.transak.com/partners/api/v2/order/o1')
      expect(options.headers['x-api-key']).toBe(MOCK_API_KEY)
      expect(details.status).toBe('completed')
      expect(details.cryptoAsset).toBe('ETH')
      expect(details.fiatCurrency).toBe('USD')
      expect(details.metadata).toEqual(mockOrder)
    })

    test('should map an in-progress status', async () => {
      const mockOrder = { id: 'o2', status: 'PROCESSING', cryptoCurrency: 'ETH', fiatCurrency: 'USD' }
      global.fetch = createFetchMock({ order: mockOrder })

      const details = await transak.getTransactionDetail('o2')
      expect(details.status).toBe('in_progress')
    })

    test('should map a failed status', async () => {
      const mockOrder = { id: 'o3', status: 'FAILED', cryptoCurrency: 'ETH', fiatCurrency: 'USD' }
      global.fetch = createFetchMock({ order: mockOrder })

      const details = await transak.getTransactionDetail('o3')
      expect(details.status).toBe('failed')
    })

    test('should default unknown statuses to in_progress', async () => {
      const mockOrder = { id: 'o4', status: 'SOME_NEW_STATUS', cryptoCurrency: 'ETH', fiatCurrency: 'USD' }
      global.fetch = createFetchMock({ order: mockOrder })

      const details = await transak.getTransactionDetail('o4')
      expect(details.status).toBe('in_progress')
    })

    test('should throw when the order fetch fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' })

      await expect(transak.getTransactionDetail('missing')).rejects.toThrow('Failed to fetch Transak transaction detail: 404 Not Found')
    })
  })
})
