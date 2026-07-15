// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict'

import { FiatProtocol } from '@tetherto/wdk-wallet/protocols'
import BigNumber from 'bignumber.js'

/** @typedef {import('@tetherto/wdk-wallet').IWalletAccount} IWalletAccount */
/** @typedef {import('@tetherto/wdk-wallet').IWalletAccountReadOnly} IWalletAccountReadOnly */

/** @typedef {import("@tetherto/wdk-wallet/protocols").BuyOptions} BuyOptions */
/** @typedef {import("@tetherto/wdk-wallet/protocols").BuyResult} BuyResult */

/** @typedef {import("@tetherto/wdk-wallet/protocols").SellOptions} SellOptions */
/** @typedef {import("@tetherto/wdk-wallet/protocols").SellCommonOptions} SellCommonOptions */
/** @typedef {import("@tetherto/wdk-wallet/protocols").SellExactCryptoAmountOptions} SellExactCryptoAmountOptions */
/** @typedef {import("@tetherto/wdk-wallet/protocols").SellResult} SellResult */

/** @typedef {import('@tetherto/wdk-wallet/protocols').FiatQuote} FiatQuote */

/** @typedef {import('@tetherto/wdk-wallet/protocols').FiatTransactionStatus} FiatTransactionStatus */
/** @typedef {import('@tetherto/wdk-wallet/protocols').FiatTransactionDetail} FiatTransactionDetail */

/** @typedef {import('@tetherto/wdk-wallet/protocols').SupportedCountry} SupportedCountry */
/** @typedef {import('@tetherto/wdk-wallet/protocols').SupportedFiatCurrency} SupportedFiatCurrency */
/** @typedef {import('@tetherto/wdk-wallet/protocols').SupportedCryptoAsset} SupportedCryptoAsset */

/**
 * Widget UI parameters shared by the buy and sell flows.
 * See https://docs.transak.com/customization/query-parameters for the full list.
 * @typedef {Object} TransakWidgetUiParams
 * @property {string} [themeColor] - The primary color of the widget, as a hex code without the leading '#'.
 * @property {string} [backgroundColors] - A comma-separated list of hex colors used for the widget background.
 * @property {string} [borderColors] - A comma-separated list of hex colors used for the widget borders.
 * @property {'DARK' | 'LIGHT'} [colorMode] - The default appearance for the widget.
 * @property {string} [defaultFiatCurrency] - The fiat currency code selected by default. The customer can still select another currency.
 * @property {string} [fiatCurrency] - Locks the fiat currency the customer can transact with.
 * @property {string} [countryCode] - The ISO 3166-1 alpha-2 country code used to pre-select the customer's country.
 * @property {string} [redirectURL] - A URL to redirect the customer to after the flow is complete. Must use 'https://'.
 * @property {string} [referrerDomain] - Your domain URL (web) or application package name (mobile). Recommended for allow-listing.
 * @property {string} [hideMenu] - If 'true', hides the widget navigation menu.
 * @property {string} [themeId] - The ID of the theme created for your application or website.
 */

/**
 * Widget UI parameters specific to the buy (on-ramp) flow.
 * @typedef {Object} TransakWidgetUiBuyParams
 * @property {string} [defaultCryptoCurrency] - The crypto currency code you would prefer the customer to purchase. The customer can still select another currency.
 * @property {string} [walletAddress] - The cryptocurrency wallet address the purchased funds will be sent to. If you pass a valid wallet address the customer won't be prompted to enter one.
 * @property {string} [walletAddressesData] - A JSON string representing the wallet addresses you want to use for multiple networks/coins.
 * @property {boolean} [disableWalletAddressForm] - If 'true', the customer cannot edit the destination wallet address.
 * @property {boolean} [hideExchangeScreen] - If 'true', skips the exchange screen and takes the customer straight to the payment screen.
 * @property {boolean} [isFeeCalculationHidden] - If 'true', hides the fee breakdown from the customer.
 * @property {boolean} [lockAmount] - If 'true', locks the fiat/crypto amount and prevents the customer from modifying it.
 * @property {string} [defaultPaymentMethod] - Pre-select the payment method you want the customer to use.
 * @property {string} [paymentMethod] - Restrict the customer to a single payment method.
 * @property {string} [email] - The customer's email address. If you pass a valid email address, the customer won't be prompted to enter one.
 * @property {string} [partnerOrderId] - An identifier you would like to associate with the order. It is returned in webhooks and order data.
 * @property {string} [partnerCustomerId] - An identifier you would like to associate with the customer. It is returned in webhooks and order data.
 * @property {string} [network] - Restrict the customer to a single network for the selected crypto currency.
 */

/** @typedef {TransakWidgetUiParams & TransakWidgetUiBuyParams} TransakBuyParams */

/**
 * Widget UI parameters specific to the sell (off-ramp) flow.
 * @typedef {Object} TransakWidgetUiSellParams
 * @property {string} [defaultCryptoCurrency] - The crypto currency code you would prefer the customer to sell. The customer can still select another currency.
 * @property {string} [walletAddress] - The wallet address the customer will send the crypto from.
 * @property {string} [walletAddressesData] - A JSON string representing the wallet addresses you want to use for multiple networks/coins.
 * @property {boolean} [disableWalletAddressForm] - If 'true', the customer cannot edit the source wallet address.
 * @property {boolean} [hideExchangeScreen] - If 'true', skips the exchange screen and takes the customer straight to the payout screen.
 * @property {boolean} [isFeeCalculationHidden] - If 'true', hides the fee breakdown from the customer.
 * @property {boolean} [lockAmount] - If 'true', locks the fiat/crypto amount and prevents the customer from modifying it.
 * @property {string} [defaultPaymentMethod] - Pre-select the payout method you want the customer to use.
 * @property {string} [paymentMethod] - Restrict the customer to a single payout method.
 * @property {string} [email] - The customer's email address. If you pass a valid email address, the customer won't be prompted to enter one.
 * @property {string} [partnerOrderId] - An identifier you would like to associate with the order. It is returned in webhooks and order data.
 * @property {string} [partnerCustomerId] - An identifier you would like to associate with the customer. It is returned in webhooks and order data.
 * @property {string} [network] - Restrict the customer to a single network for the selected crypto currency.
 */

/** @typedef {TransakWidgetUiParams & TransakWidgetUiSellParams} TransakSellParams */

/**
 * The complete set of parameters for a buy quote from the Transak pricing API.
 * @typedef {Object} TransakQuoteBuyParams
 * @property {string} cryptoAsset - The crypto asset code to price (e.g. 'ETH'). Required.
 * @property {string} fiatCurrency - The fiat currency's ISO 4217 code (e.g. 'USD'). Required.
 * @property {number} fiatAmount - The fiat amount to spend, as a decimal in standard units (e.g. 100.5 for 100.50 USD). Required.
 * @property {string} paymentMethod - The payment method to price the quote against (e.g. 'credit_debit_card'). Required.
 * @property {string} network - The network of the crypto currency (e.g. 'ethereum'). Required.
 */

/**
 * The complete set of parameters for a sell quote from the Transak pricing API.
 * @typedef {Object} TransakQuoteSellParams
 * @property {string} cryptoAsset - The crypto asset code to price (e.g. 'ETH'). Required.
 * @property {string} fiatCurrency - The fiat currency's ISO 4217 code (e.g. 'USD'). Required.
 * @property {number} cryptoAmount - The crypto amount to sell, as a decimal in standard units (e.g. 0.5 for 0.5 ETH). Required.
 * @property {string} paymentMethod - The payout method to price the quote against (e.g. 'sepa_bank_transfer'). Required.
 * @property {string} network - The network of the crypto currency (e.g. 'ethereum'). Required.
 */

/**
 * @typedef {Object} TransakNetworkDetails
 * @property {string} name - The network's Transak identifier (e.g. 'ethereum', 'tron').
 * @property {string} [chainId] - The chain ID, when applicable.
 * @property {Array<{ fiatCurrency: string, paymentMethod: string }>} [fiatCurrenciesNotSupported] - Fiat/payment-method combinations not supported on this network.
 */

/**
 * A crypto currency as returned by Transak's Get Crypto Currencies API.
 * See https://docs.transak.com/api/public/get-crypto-currencies.
 * @typedef {Object} TransakCryptoCurrencyDetails
 * @property {string} coinId - Transak's internal coin identifier.
 * @property {string} name - The crypto currency's name.
 * @property {string} symbol - The crypto currency's symbol (e.g. 'USDT').
 * @property {string} uniqueId - A unique identifier derived from the symbol and network.
 * @property {number} decimals - The on-chain number of decimal places for the asset's base unit.
 * @property {number} roundOff - The number of decimal places used when displaying amounts.
 * @property {TransakNetworkDetails} network - The network the asset lives on.
 * @property {boolean} isAllowed - Whether buy (on-ramp) transactions are supported for this asset.
 * @property {boolean} [isPayInAllowed] - Whether sell (off-ramp) transactions are supported for this asset.
 * @property {boolean} [isStable] - Whether the asset is a stablecoin.
 * @property {boolean} [isPopular] - Whether the asset is flagged as popular.
 * @property {string | null} [address] - The token contract address, when applicable.
 * @property {string} [tokenType] - The token standard/classification (e.g. 'ERC20').
 * @property {*} [tokenIdentifier] - The token classification identifier.
 * @property {number} [minAmountForPayIn] - The minimum amount accepted for sell (pay-in) transactions.
 * @property {number} [maxAmountForPayIn] - The maximum amount accepted for sell (pay-in) transactions.
 * @property {Array<string>} [kycCountriesNotSupported] - Country codes where this asset is not supported.
 * @property {{ large?: string, small?: string, thumb?: string }} [image] - Icon URLs for the asset.
 */

/**
 * @typedef {Object} TransakPaymentOption
 * @property {string} id - The payment option's identifier (e.g. 'credit_debit_card').
 * @property {string} name - The payment option's display name.
 * @property {boolean} isActive - Whether the payment option is currently active.
 * @property {number} [minAmount] - The minimum transaction amount for this payment option.
 * @property {number} [maxAmount] - The maximum transaction amount for this payment option.
 * @property {boolean} [isPayOutAllowed] - Whether the payment option supports off-ramp payouts.
 */

/**
 * A fiat currency as returned by Transak's Get Fiat Currencies API.
 * See https://docs.transak.com/api/public/get-fiat-currencies.
 * Note: the fiat schema has no `decimals` field — `roundOff` is the number of
 * decimal places for the currency's smallest unit.
 * @typedef {Object} TransakFiatCurrencyDetails
 * @property {string} symbol - The currency's code (e.g. 'USD').
 * @property {string} name - The currency's name.
 * @property {boolean} isAllowed - Whether buy (on-ramp) transactions using this currency are supported.
 * @property {boolean} [isPayOutAllowed] - Whether sell (off-ramp) payouts to this currency are supported.
 * @property {number} roundOff - The number of decimal places for this currency's smallest unit.
 * @property {boolean} [isPopular] - Whether the currency is flagged as popular.
 * @property {Array<string>} [supportingCountries] - ISO 3166-1 alpha-2 country codes that support this currency.
 * @property {string} [logoSymbol] - The country/region code used for the currency's logo.
 * @property {string} [icon] - The currency's icon (SVG markup or URL).
 * @property {string} [defaultCountryForNFT] - The default country used for NFT flows.
 * @property {string} [displayMessage] - A message shown when the currency is unavailable.
 * @property {Array<TransakPaymentOption>} [paymentOptions] - The payment options available for this currency.
 */

/**
 * @typedef {Object} TransakCountryDetail
 * @property {string} alpha2 - The country's ISO 3166-1 alpha-2 code.
 * @property {string} alpha3 - The country's ISO 3166-1 alpha-3 code.
 * @property {boolean} isAllowed - Whether residents of this country can use the service.
 * @property {boolean} [isLightKycAllowed] - Whether residents of this country are eligible for light KYC.
 * @property {string} name - The country's name.
 * @property {string} [currencyCode] - The country's default fiat currency code.
 * @property {Array<string>} [supportedDocuments] - A list of supported identity documents for the country.
 * @property {Array<object>} [partners] - The payment partners available in the country.
 */

/**
 * Type definition for the status of a Transak order.
 * @typedef {'AWAITING_PAYMENT_FROM_USER' | 'PAYMENT_DONE_MARKED_BY_USER' | 'PROCESSING' | 'PENDING_DELIVERY_FROM_TRANSAK' | 'ON_HOLD_PENDING_DELIVERY_FROM_TRANSAK' | 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'REFUNDED' | 'EXPIRED'} TransakOrderStatus
 */

/**
 * @typedef {Object} TransakFeeBreakdown
 * @property {string} name - The human readable name of the fee component.
 * @property {number} value - The fee amount, denominated in the fiat currency.
 * @property {string} [id] - The fee component's identifier.
 * @property {Array<string>} [ids] - The identifiers of the sub-components rolled up into this fee.
 */

/**
 * @typedef {Object} TransakQuote
 * @property {string} quoteId - Unique identifier for the quote.
 * @property {number} conversionPrice - The exchange rate between the crypto currency and the fiat currency.
 * @property {number} [marketConversionPrice] - The mid-market exchange rate at quote time.
 * @property {number} [slippage] - The slippage applied to the quote.
 * @property {string} fiatCurrency - The fiat currency code.
 * @property {string} cryptoCurrency - The crypto currency symbol.
 * @property {string} [paymentMethod] - The payment method the quote was priced against.
 * @property {number} fiatAmount - The fiat amount, expressed in standard units (e.g. dollars).
 * @property {number} cryptoAmount - The crypto amount, expressed in standard units (e.g. ETH).
 * @property {'BUY' | 'SELL'} isBuyOrSell - The direction of the quote.
 * @property {string} network - The network the crypto currency lives on.
 * @property {number} [feeDecimal] - The total fee expressed as a decimal fraction.
 * @property {number} totalFee - The total fee, denominated in the fiat currency.
 * @property {Array<TransakFeeBreakdown>} [feeBreakdown] - A breakdown of the individual fee components.
 * @property {string} [nonce] - A nonce associated with the quote.
 * @property {string} [cryptoLiquidityProvider] - The liquidity provider used for the quote.
 * @property {Array<object>} [notes] - Additional notes returned with the quote.
 */

/**
 * @typedef {Object} TransakOrder
 * @property {string} id - Unique identifier for the order.
 * @property {TransakOrderStatus} status - The order's status.
 * @property {string} cryptoCurrency - The crypto currency symbol.
 * @property {string} fiatCurrency - The fiat currency code.
 * @property {number} fiatAmount - The fiat amount, expressed in standard units.
 * @property {number} [cryptoAmount] - The crypto amount, expressed in standard units.
 * @property {'BUY' | 'SELL'} isBuyOrSell - The direction of the order.
 * @property {string} network - The network the crypto currency lives on.
 * @property {string} [walletAddress] - The wallet address associated with the order.
 * @property {string} [transactionHash] - The on-chain transaction hash, once available.
 * @property {number} [amountPaid] - The fiat amount actually paid by the customer.
 * @property {string} [createdAt] - Time at which the order was created. Returned as an ISO 8601 string.
 * @property {string} [completedAt] - Time at which the order was completed. Returned as an ISO 8601 string.
 */

/** @typedef {FiatTransactionDetail & { metadata: TransakOrder }} TransakTransactionDetail */

/** @typedef {SupportedCountry & { metadata: TransakCountryDetail }} TransakSupportedCountry */

/** @typedef {SupportedCryptoAsset & { metadata: TransakCryptoCurrencyDetails }} TransakSupportedCryptoAsset */

/** @typedef {SupportedFiatCurrency & { metadata: TransakFiatCurrencyDetails }} TransakSupportedFiatCurrency */

/** @typedef {BuyOptions & { config?: TransakBuyParams }} TransakBuyOptions */

/** @typedef {FiatQuote & { metadata: TransakQuote }} TransakBuyQuote */

/** @typedef {FiatQuote & { metadata: TransakQuote }} TransakSellQuote */

/** @typedef {SellOptions & { config?: TransakSellParams }} TransakSellOptions */

/**
 * @typedef {Object} TransakProtocolConfig
 * @property {string} apiKey - Your Transak partner API key.
 * @property {(url: string) => Promise<string>} [widgetUrl] - Callback used to turn the generated widget URL into a secure, session-based Transak widget URL via a trusted provider (e.g. a backend service that calls Transak's Create Widget URL API). If not provided, the protocol returns the unsigned query-parameter URL.
 * @property {number} [cacheTime] - The duration in milliseconds to cache supported currencies.
 * @property {"PRODUCTION" | "STAGING"} [environment] - The environment to use for Transak endpoints and widget URLs. Defaults to "PRODUCTION". Use "PRODUCTION" for live transactions and "STAGING" for testing with non-real funds.
 */

/**
 * Converts a Transak order status to a standardized FiatTransactionStatus.
 * @param {TransakOrderStatus | string} transakStatus - The status from the Transak API.
 * @returns {FiatTransactionStatus} The standardized status.
 */
function toWdkStatus (transakStatus) {
  switch (transakStatus) {
    case 'COMPLETED':
      return 'completed'
    case 'FAILED':
    case 'CANCELLED':
    case 'REFUNDED':
    case 'EXPIRED':
      return 'failed'
    case 'AWAITING_PAYMENT_FROM_USER':
    case 'PAYMENT_DONE_MARKED_BY_USER':
    case 'PROCESSING':
    case 'PENDING_DELIVERY_FROM_TRANSAK':
    case 'ON_HOLD_PENDING_DELIVERY_FROM_TRANSAK':
      return 'in_progress'
    default:
      return 'in_progress'
  }
}

/**
 * Gets the number of decimal places for a fiat currency.
 * @param {TransakFiatCurrencyDetails} currencyDetail
 * @returns {number}
 */
function getFiatDecimals (currencyDetail) {
  const decimals = currencyDetail.roundOff

  if (typeof decimals !== 'number') {
    throw new Error(`Could not determine decimals for fiat currency: ${currencyDetail.symbol}`)
  }
  return decimals
}

const TRANSAK_ORIGINS = {
  API: {
    PRODUCTION: 'https://api.transak.com/',
    STAGING: 'https://api-stg.transak.com/'
  },
  WIDGET: {
    PRODUCTION: 'https://global.transak.com/',
    STAGING: 'https://global-stg.transak.com/'
  }
}
const TRANSAK_CACHE_TIME = 10 * 60 * 1000

export default class TransakProtocol extends FiatProtocol {
  /**
   * Creates a new interface to interact with the Transak protocol without binding it to a wallet account.
   *
   * @overload
   * @param {undefined} account - The wallet account to use to interact with the protocol.
   * @param {TransakProtocolConfig} config - The Transak protocol configuration.
   */

  /**
   * Creates a new read-only interface to interact with the Transak protocol.
   *
   * @overload
   * @param {IWalletAccountReadOnly} account - The wallet account to use to interact with the protocol.
   * @param {TransakProtocolConfig} config - The Transak protocol configuration.
   */

  /**
   * Creates a new interface to interact with the Transak protocol.
   *
   * @overload
   * @param {IWalletAccount} account - The wallet account to use to interact with the protocol.
   * @param {TransakProtocolConfig} config - The Transak protocol configuration.
   */
  constructor (account, { apiKey, widgetUrl, environment = 'PRODUCTION', cacheTime = TRANSAK_CACHE_TIME }) {
    super(account)

    /** @private */
    this._apiKey = apiKey

    /** @private */
    this._widgetUrl = widgetUrl

    /** @private */
    this._environment = environment

    /** @private */
    this._supportedCryptoAssetsCache = undefined

    /** @private */
    this._supportedFiatCurrenciesCache = undefined

    /** @private */
    this._cacheThreshold = cacheTime
  }

  /** @private */
  get _apiOrigin () {
    return TRANSAK_ORIGINS.API[this._environment]
  }

  /** @private */
  get _widgetOrigin () {
    return TRANSAK_ORIGINS.WIDGET[this._environment]
  }

  /**
   * Resolves the Transak crypto asset and fiat currency details for the given codes.
   * Codes are matched case-sensitively against Transak's conventions, exactly as
   * returned by `getSupportedCryptoAssets`/`getSupportedFiatCurrencies` (crypto and
   * fiat symbols are upper-case, e.g. 'ETH'/'USD'; networks are lower-case, e.g. 'ethereum').
   * @private
   * @param {string} cryptoAsset - The crypto asset symbol (e.g. 'USDT').
   * @param {string} fiatCurrency - The fiat currency code (e.g. 'USD').
   * @param {string} [network] - An optional network used to disambiguate the crypto asset (e.g. 'ethereum').
   */
  async _getAssetDetails (cryptoAsset, fiatCurrency, network) {
    const [cryptoAssets, fiatCurrencies] = await Promise.all([
      this._fetchAndCacheSupportedCryptoAssets(),
      this._fetchAndCacheSupportedFiatCurrencies()
    ])

    const cryptoInfo = cryptoAssets.find((asset) =>
      asset.symbol === cryptoAsset &&
      (network === undefined || asset.network.name === network))
    const fiatInfo = fiatCurrencies.find((currency) =>
      currency.symbol === fiatCurrency)

    if (!cryptoInfo || !fiatInfo) {
      throw new Error('Cannot find info for cryptoAsset and fiatCurrency')
    }
    return { cryptoInfo, fiatInfo }
  }

  /**
   * Generates a widget URL for a user to purchase a crypto asset with fiat currency.
   * `options.fiatAmount`/`options.cryptoAmount` are decimals in standard units
   * (e.g. 100.5 for 100.50 USD, 0.5 for 0.5 ETH), matching Transak's API — not base units.
   * @override
   * @param {TransakBuyOptions} options - The options for the purchase.
   * @returns {Promise<BuyResult>} The URL for the user to complete the purchase.
   */
  async buy (options) {
    const { cryptoAsset, fiatCurrency, recipient, config } = options

    const { cryptoInfo, fiatInfo } = await this._getAssetDetails(cryptoAsset, fiatCurrency, config?.network)

    const params = {
      ...config,
      apiKey: this._apiKey,
      productsAvailed: 'BUY',
      cryptoCurrencyCode: cryptoInfo.symbol,
      network: cryptoInfo.network.name,
      fiatCurrency: fiatInfo.symbol
    }

    if ('cryptoAmount' in options && 'fiatAmount' in options) {
      throw new Error('\'cryptoAmount\' and \'fiatAmount\' cannot both be provided')
    }

    if ('cryptoAmount' in options) {
      params.cryptoAmount = new BigNumber(options.cryptoAmount).toFixed()
    } else if ('fiatAmount' in options) {
      params.fiatAmount = new BigNumber(options.fiatAmount).toFixed()
    } else {
      throw new Error('Either \'cryptoAmount\' or \'fiatAmount\' must be provided')
    }

    if (recipient) {
      params.walletAddress = recipient
    } else if (this._account) {
      params.walletAddress = await this._account.getAddress()
    }

    const url = new URL('/', this._widgetOrigin)

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value)
      }
    })

    const generatedUrl = url.toString()

    if (!this._widgetUrl) {
      return {
        buyUrl: generatedUrl
      }
    }

    const buyUrl = await this._widgetUrl(generatedUrl)

    return {
      buyUrl
    }
  }

  /**
   * Gets a quote for a crypto asset purchase.
   * @override
   * @param {TransakQuoteBuyParams} config - The parameters for the quote.
   * @returns {Promise<TransakBuyQuote>} A quote for the transaction.
   */
  async quoteBuy (config) {
    const { cryptoAsset, fiatCurrency, fiatAmount, paymentMethod, network } = config

    if (fiatAmount === undefined) {
      throw new Error('\'fiatAmount\' must be provided')
    }

    if (!paymentMethod) {
      throw new Error('\'paymentMethod\' must be provided')
    }

    if (!network) {
      throw new Error('\'network\' must be provided')
    }

    const { cryptoInfo, fiatInfo } = await this._getAssetDetails(cryptoAsset, fiatCurrency, network)

    const params = {
      partnerApiKey: this._apiKey,
      fiatCurrency: fiatInfo.symbol,
      cryptoCurrency: cryptoInfo.symbol,
      network: cryptoInfo.network.name,
      paymentMethod,
      isBuyOrSell: 'BUY',
      fiatAmount: new BigNumber(fiatAmount).toFixed()
    }

    const quote = await this._fetchQuote(params)

    return this._toFiatQuote(quote, cryptoInfo, fiatInfo)
  }

  /**
   * Gets a quote for a crypto asset sale.
   * @override
   * @param {TransakQuoteSellParams} config - The parameters for the quote.
   * @returns {Promise<TransakSellQuote>} A quote for the transaction.
   */
  async quoteSell (config) {
    const { cryptoAsset, fiatCurrency, cryptoAmount, paymentMethod, network } = config

    if (cryptoAmount === undefined) {
      throw new Error('\'cryptoAmount\' must be provided')
    }

    if (!paymentMethod) {
      throw new Error('\'paymentMethod\' must be provided')
    }

    if (!network) {
      throw new Error('\'network\' must be provided')
    }

    const { cryptoInfo, fiatInfo } = await this._getAssetDetails(cryptoAsset, fiatCurrency, network)

    const params = {
      partnerApiKey: this._apiKey,
      fiatCurrency: fiatInfo.symbol,
      cryptoCurrency: cryptoInfo.symbol,
      network: cryptoInfo.network.name,
      paymentMethod,
      isBuyOrSell: 'SELL',
      cryptoAmount: new BigNumber(cryptoAmount).toFixed()
    }

    const quote = await this._fetchQuote(params)

    return this._toFiatQuote(quote, cryptoInfo, fiatInfo)
  }

  /**
   * Generates a widget URL for a user to sell a crypto asset for fiat currency.
   * `options.fiatAmount`/`options.cryptoAmount` are decimals in standard units
   * (e.g. 100.5 for 100.50 USD, 0.5 for 0.5 ETH), matching Transak's API — not base units.
   * @override
   * @param {TransakSellOptions} options - The options for the sale.
   * @returns {Promise<SellResult>} The URL for the user to complete the sale.
   */
  async sell (options) {
    const { cryptoAsset, fiatCurrency, refundAddress, config } = options

    const { cryptoInfo, fiatInfo } = await this._getAssetDetails(cryptoAsset, fiatCurrency, config?.network)

    const params = {
      ...config,
      apiKey: this._apiKey,
      productsAvailed: 'SELL',
      cryptoCurrencyCode: cryptoInfo.symbol,
      network: cryptoInfo.network.name,
      fiatCurrency: fiatInfo.symbol
    }

    if ('cryptoAmount' in options && 'fiatAmount' in options) {
      throw new Error('\'cryptoAmount\' and \'fiatAmount\' cannot both be provided')
    }

    if ('cryptoAmount' in options) {
      params.cryptoAmount = new BigNumber(options.cryptoAmount).toFixed()
    } else if ('fiatAmount' in options) {
      params.fiatAmount = new BigNumber(options.fiatAmount).toFixed()
    } else {
      throw new Error('Either \'cryptoAmount\' or \'fiatAmount\' must be provided')
    }

    if (refundAddress) {
      params.walletAddress = refundAddress
    } else if (this._account) {
      params.walletAddress = await this._account.getAddress()
    }

    const url = new URL('/', this._widgetOrigin)

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value)
      }
    })

    const generatedUrl = url.toString()

    if (!this._widgetUrl) {
      return {
        sellUrl: generatedUrl
      }
    }

    const sellUrl = await this._widgetUrl(generatedUrl)

    return {
      sellUrl
    }
  }

  /**
   * Retrieves the details of a specific order from the provider.
   * @override
   * @param {string} txId - The unique identifier of the order.
   * @returns {Promise<TransakTransactionDetail>} The transaction details.
   */
  async getTransactionDetail (txId) {
    const url = new URL(`partners/api/v2/order/${txId}`, this._apiOrigin)

    const resp = await fetch(url.toString(), {
      headers: {
        accept: 'application/json',
        'x-api-key': this._apiKey
      }
    })

    if (!resp.ok) {
      throw new Error(`Failed to fetch Transak transaction detail: ${resp.status} ${resp.statusText}`)
    }

    const body = await resp.json()
    const transakOrder = body.response ?? body

    return {
      status: toWdkStatus(transakOrder.status),
      cryptoAsset: transakOrder.cryptoCurrency,
      fiatCurrency: transakOrder.fiatCurrency,
      metadata: transakOrder
    }
  }

  /**
   * Fetches a quote from the Transak pricing API.
   * @private
   * @param {Record<string, unknown>} params - The query parameters for the quote.
   * @returns {Promise<TransakQuote>}
   */
  async _fetchQuote (params) {
    const url = new URL('api/v1/pricing/public/quotes', this._apiOrigin)

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value)
      }
    })

    const resp = await fetch(url.toString(), {
      headers: {
        accept: 'application/json',
        'x-api-key': this._apiKey
      }
    })

    if (!resp.ok) {
      throw new Error(`Failed to fetch Transak quote: ${resp.status} ${resp.statusText}`)
    }

    const body = await resp.json()

    return body.response ?? body
  }

  /**
   * Normalises a Transak quote into WDK's standardized FiatQuote format.
   * @private
   * @param {TransakQuote} quote
   * @param {TransakCryptoCurrencyDetails} cryptoInfo
   * @param {TransakFiatCurrencyDetails} fiatInfo
   * @returns {FiatQuote & { metadata: TransakQuote }}
   */
  _toFiatQuote (quote, cryptoInfo, fiatInfo) {
    const fiatDecimals = getFiatDecimals(fiatInfo)

    const cryptoAmount = new BigNumber(quote.cryptoAmount).shiftedBy(cryptoInfo.decimals)
    const fiatAmount = new BigNumber(quote.fiatAmount).shiftedBy(fiatDecimals)
    const totalFee = new BigNumber(quote.totalFee).shiftedBy(fiatDecimals)

    return {
      cryptoAmount: BigInt(cryptoAmount.toFixed(0)),
      fiatAmount: BigInt(fiatAmount.toFixed(0)),
      fee: BigInt(totalFee.toFixed(0)),
      rate: quote.conversionPrice.toString(),
      metadata: quote
    }
  }

  /**
   * Fetches and caches supported crypto assets from Transak.
   * @private
   * @returns {Promise<Array<TransakCryptoCurrencyDetails>>}
   */
  async _fetchAndCacheSupportedCryptoAssets () {
    const now = Date.now()

    if (!this._supportedCryptoAssetsCache || (now - this._supportedCryptoAssetsCache.timestamp >= this._cacheThreshold)) {
      const url = new URL('cryptocoverage/api/v1/public/crypto-currencies', this._apiOrigin)

      const resp = await fetch(url.toString(), {
        headers: {
          accept: 'application/json',
          'x-api-key': this._apiKey
        }
      })

      if (!resp.ok) {
        throw new Error(`Failed to fetch Transak supported crypto assets: ${resp.status} ${resp.statusText}`)
      }

      const body = await resp.json()
      const data = body.response ?? body

      if (!Array.isArray(data)) {
        throw new Error('Failed to fetch Transak supported crypto assets')
      }

      this._supportedCryptoAssetsCache = {
        timestamp: now,
        data
      }
    }

    return this._supportedCryptoAssetsCache?.data || []
  }

  /**
   * Fetches and caches supported fiat currencies from Transak.
   * @private
   * @returns {Promise<Array<TransakFiatCurrencyDetails>>}
   */
  async _fetchAndCacheSupportedFiatCurrencies () {
    const now = Date.now()

    if (!this._supportedFiatCurrenciesCache || (now - this._supportedFiatCurrenciesCache.timestamp >= this._cacheThreshold)) {
      const url = new URL('fiat/public/v1/currencies/fiat-currencies', this._apiOrigin)

      const resp = await fetch(url.toString(), {
        headers: {
          accept: 'application/json',
          'x-api-key': this._apiKey
        }
      })

      if (!resp.ok) {
        throw new Error(`Failed to fetch Transak supported fiat currencies: ${resp.status} ${resp.statusText}`)
      }

      const body = await resp.json()
      const data = body.response ?? body

      if (!Array.isArray(data)) {
        throw new Error('Failed to fetch Transak supported fiat currencies')
      }

      this._supportedFiatCurrenciesCache = {
        timestamp: now,
        data
      }
    }

    return this._supportedFiatCurrenciesCache?.data || []
  }

  /**
   * Retrieves a list of supported crypto assets from the provider.
   * @override
   * @returns {Promise<TransakSupportedCryptoAsset[]>} An array of supported crypto assets.
   */
  async getSupportedCryptoAssets () {
    const cryptoAssets = await this._fetchAndCacheSupportedCryptoAssets()

    return cryptoAssets.map((assetDetail) => {
      return {
        code: assetDetail.symbol,
        decimals: assetDetail.decimals,
        networkCode: assetDetail.network.name,
        name: assetDetail.name,
        metadata: assetDetail
      }
    })
  }

  /**
   * Retrieves a list of supported fiat currencies from the provider.
   * @override
   * @returns {Promise<TransakSupportedFiatCurrency[]>} An array of supported fiat currencies.
   */
  async getSupportedFiatCurrencies () {
    const fiatCurrencies = await this._fetchAndCacheSupportedFiatCurrencies()

    return fiatCurrencies.map((currencyDetail) => ({
      code: currencyDetail.symbol,
      decimals: getFiatDecimals(currencyDetail),
      name: currencyDetail.name,
      metadata: currencyDetail
    }))
  }

  /**
   * Retrieves a list of supported countries from the provider.
   * @override
   * @returns {Promise<TransakSupportedCountry[]>} An array of supported countries.
   */
  async getSupportedCountries () {
    const url = new URL('api/v2/countries', this._apiOrigin)

    const resp = await fetch(url.toString(), {
      headers: {
        accept: 'application/json',
        'x-api-key': this._apiKey
      }
    })

    if (!resp.ok) {
      throw new Error(`Failed to fetch supported countries: ${resp.status} ${resp.statusText}`)
    }

    const body = await resp.json()
    const transakSupportedCountries = body.response ?? body

    if (!Array.isArray(transakSupportedCountries)) {
      throw new Error('Failed to fetch supported countries')
    }

    return transakSupportedCountries.map((countryDetail) => {
      return {
        code: countryDetail.alpha2 || countryDetail.alpha3,
        isBuyAllowed: countryDetail.isAllowed,
        isSellAllowed: countryDetail.isAllowed,
        name: countryDetail.name,
        metadata: countryDetail
      }
    })
  }
}
