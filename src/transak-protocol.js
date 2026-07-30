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
import { ValueError, NoSuchElementError } from '@tetherto/wdk-wallet'
import BigNumber from 'bignumber.js'

import { TransakApiError } from './errors.js'

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
 * @see https://docs.transak.com/customization/query-parameters
 * @typedef {Object} TransakWidgetUiParams
 * @property {string} [themeColor] - The primary color of the widget, as a hex code without the leading '#'.
 * @property {'DARK' | 'LIGHT'} [colorMode] - The default appearance for the widget.
 * @property {string} [redirectURL] - A URL to redirect the customer to after the flow is complete. Must use 'https://'.
 * @property {string} [referrerDomain] - Your domain URL (web) or application package name (mobile). Recommended for allow-listing.
 * @property {string} [hideMenu] - If 'true', hides the widget navigation menu.
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
 * @property {string} [defaultPaymentMethod] - Pre-select the payout method you want the customer to use.
 * @property {string} [paymentMethod] - Restrict the customer to a single payout method.
 * @property {string} [email] - The customer's email address. If you pass a valid email address, the customer won't be prompted to enter one.
 * @property {string} [partnerOrderId] - An identifier you would like to associate with the order. It is returned in webhooks and order data.
 * @property {string} [partnerCustomerId] - An identifier you would like to associate with the customer. It is returned in webhooks and order data.
 * @property {string} [network] - Restrict the customer to a single network for the selected crypto currency.
 */

/** @typedef {TransakWidgetUiParams & TransakWidgetUiSellParams} TransakSellParams */

/**
 * Provider-specific extras accepted by the Transak pricing API when requesting a buy quote.
 * @typedef {Object} TransakQuoteBuyParams
 * @property {string} [paymentMethod] - The payment method to price the quote against (e.g. 'credit_debit_card').
 * @property {string} [network] - The network of the crypto currency. Resolved from the supported assets list when omitted.
 */

/**
 * Provider-specific extras accepted by the Transak pricing API when requesting a sell quote.
 * @typedef {Object} TransakQuoteSellParams
 * @property {string} [paymentMethod] - The payout method to price the quote against (e.g. 'sepa_bank_transfer').
 * @property {string} [network] - The network of the crypto currency. Resolved from the supported assets list when omitted.
 */

/**
 * The network a Transak crypto asset lives on.
 * @typedef {Object} TransakNetworkDetails
 * @property {string} name - The network's Transak identifier (e.g. 'ethereum', 'tron').
 * @property {string} [chainId] - The chain ID, when applicable.
 * @property {{ fiatCurrency: string, paymentMethod: string }[]} [fiatCurrenciesNotSupported] - Fiat/payment-method combinations not supported on this network.
 */

/**
 * A crypto currency as returned by Transak's Get Crypto Currencies API.
 * @see https://docs.transak.com/api/public/get-crypto-currencies
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
 * @property {string[]} [kycCountriesNotSupported] - Country codes where this asset is not supported.
 * @property {{ large?: string, small?: string, thumb?: string }} [image] - Icon URLs for the asset.
 */

/**
 * A payment/payout option available for a Transak fiat currency.
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
 * Note: the fiat schema has no `decimals` field — `roundOff` is the number of
 * decimal places for the currency's smallest unit.
 * @see https://docs.transak.com/api/public/get-fiat-currencies
 * @typedef {Object} TransakFiatCurrencyDetails
 * @property {string} symbol - The currency's code (e.g. 'USD').
 * @property {string} name - The currency's name.
 * @property {boolean} isAllowed - Whether buy (on-ramp) transactions using this currency are supported.
 * @property {boolean} [isPayOutAllowed] - Whether sell (off-ramp) payouts to this currency are supported.
 * @property {number} roundOff - The number of decimal places for this currency's smallest unit.
 * @property {boolean} [isPopular] - Whether the currency is flagged as popular.
 * @property {string[]} [supportingCountries] - ISO 3166-1 alpha-2 country codes that support this currency.
 * @property {string} [logoSymbol] - The country/region code used for the currency's logo.
 * @property {string} [icon] - The currency's icon (SVG markup or URL).
 * @property {string} [defaultCountryForNFT] - The default country used for NFT flows.
 * @property {string} [displayMessage] - A message shown when the currency is unavailable.
 * @property {TransakPaymentOption[]} [paymentOptions] - The payment options available for this currency.
 */

/**
 * A payment partner available in a Transak-supported country.
 * @typedef {Object} TransakCountryPartner
 * @property {string} currencyCode - The fiat currency code the partner supports.
 * @property {boolean} isCardPayment - Whether the partner supports card payments.
 * @property {string} name - The partner's identifier (e.g. 'transak').
 */

/**
 * A country as returned by Transak's Get Countries API.
 * @typedef {Object} TransakCountryDetail
 * @property {string} alpha2 - The country's ISO 3166-1 alpha-2 code.
 * @property {string} alpha3 - The country's ISO 3166-1 alpha-3 code.
 * @property {boolean} isAllowed - Whether residents of this country can use the service.
 * @property {boolean} [isLightKycAllowed] - Whether residents of this country are eligible for light KYC.
 * @property {string} name - The country's name.
 * @property {string} [currencyCode] - The country's default fiat currency code.
 * @property {string[]} [supportedDocuments] - A list of supported identity documents for the country.
 * @property {TransakCountryPartner[]} [partners] - The payment partners available in the country.
 */

/**
 * Type definition for the status of a Transak order.
 * @typedef {'AWAITING_PAYMENT_FROM_USER' | 'PAYMENT_DONE_MARKED_BY_USER' | 'PROCESSING' | 'PENDING_DELIVERY_FROM_TRANSAK' | 'ON_HOLD_PENDING_DELIVERY_FROM_TRANSAK' | 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'REFUNDED' | 'EXPIRED'} TransakOrderStatus
 */

/**
 * A single item in a Transak quote's fee breakdown.
 * @typedef {Object} TransakFeeBreakdown
 * @property {string} name - The human readable name of the fee component.
 * @property {number} value - The fee amount, denominated in the fiat currency.
 * @property {string} [id] - The fee component's identifier.
 * @property {string[]} [ids] - The identifiers of the sub-components rolled up into this fee.
 */

/**
 * A quote for a Transak buy or sell, as returned by the pricing API.
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
 * @property {TransakFeeBreakdown[]} [feeBreakdown] - A breakdown of the individual fee components.
 * @property {string} [nonce] - A nonce associated with the quote.
 * @property {string} [cryptoLiquidityProvider] - The liquidity provider used for the quote.
 * @property {string[]} [notes] - Additional notes returned with the quote.
 */

/**
 * A Transak order, as returned by the Get Order API.
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

/** @typedef {Omit<BuyOptions, 'recipient'> & { config?: TransakQuoteBuyParams }} TransakQuoteBuyOptions */

/** @typedef {FiatQuote & { metadata: TransakQuote }} TransakBuyQuote */

/** @typedef {Omit<SellCommonOptions, 'refundAddress'> & SellExactCryptoAmountOptions & { config?: TransakQuoteSellParams }} TransakQuoteSellOptions */

/** @typedef {FiatQuote & { metadata: TransakQuote }} TransakSellQuote */

/** @typedef {Omit<SellOptions, 'refundAddress'> & { config?: TransakSellParams }} TransakSellOptions */

/**
 * The assembled Transak widget parameters passed to the `widgetUrl` callback — send
 * this object as `widgetParams` to Transak's Create Widget URL API. It also carries
 * any widget UI fields supplied via the buy/sell `config`.
 * @typedef {Object} TransakWidgetParams
 * @property {string} apiKey - Your Transak partner API key.
 * @property {'BUY' | 'SELL'} productsAvailed - The flow direction.
 * @property {string} cryptoCurrencyCode - The crypto asset symbol (e.g. 'ETH').
 * @property {string} network - The network the asset lives on (e.g. 'ethereum').
 * @property {string} fiatCurrency - The fiat currency code (e.g. 'USD').
 * @property {number} [fiatAmount] - The fiat amount, as a decimal in standard units.
 * @property {number} [cryptoAmount] - The crypto amount, as a decimal in standard units.
 * @property {string} [walletAddress] - The destination (buy) or source (sell) wallet address.
 */

/**
 * Configuration for {@link TransakProtocol}.
 * @typedef {Object} TransakProtocolConfig
 * @property {string} apiKey - Your Transak partner API key.
 * @property {(widgetParams: TransakWidgetParams) => Promise<string>} [widgetUrl] - Required by `buy`/`sell`. Receives the assembled `widgetParams` object and must return a session-based widget URL. Create it on your backend by calling Transak's Create Widget URL API (which needs your API secret). `buy`/`sell` throw if it is not provided.
 * @property {(txId: string) => Promise<TransakOrder>} [getOrder] - Required by `getTransactionDetail`. Receives an order id and must return the Transak order. Fetch it on your backend by calling Transak's Get Order API (which needs a partner `access-token` minted from your API secret). `getTransactionDetail` throws if it is not provided.
 * @property {number} [cacheTime] - The duration in milliseconds to cache supported currencies (default: 600,000 — 10 minutes).
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

// These tables are the source of truth instead, per the ISO 4217 standard.
const ISO_4217_ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF',
  'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
])
const ISO_4217_THREE_DECIMAL_CURRENCIES = new Set([
  'BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND'
])
const ISO_4217_FOUR_DECIMAL_CURRENCIES = new Set([
  'CLF', 'UYW'
])
const ISO_4217_DEFAULT_DECIMALS = 2

/**
 * Gets the number of decimal places for a fiat currency's smallest unit, per
 * the ISO 4217 standard.
 * @param {TransakFiatCurrencyDetails} currencyDetail - The fiat currency detail object.
 * @returns {number} The number of decimal places for the currency's smallest unit.
 */
const _getFiatDecimals = (currencyDetail) => {
  const code = currencyDetail.symbol?.toUpperCase()

  if (ISO_4217_ZERO_DECIMAL_CURRENCIES.has(code)) return 0
  if (ISO_4217_THREE_DECIMAL_CURRENCIES.has(code)) return 3
  if (ISO_4217_FOUR_DECIMAL_CURRENCIES.has(code)) return 4
  return ISO_4217_DEFAULT_DECIMALS
}

/**
 * Converts a base-unit amount (e.g. wei, cents) to the standard-unit number
 * Transak's APIs expect, rounded down to the given display precision.
 * @param {bigint | number | string} amount - The amount, in base units.
 * @param {number} decimals - The base unit's decimal exponent.
 * @param {number} roundOff - The number of decimal places to round to for display.
 * @returns {number} The amount in standard units, rounded to `roundOff` decimal places.
 */
const _toMajorUnits = (amount, decimals, roundOff) => {
  return Number(new BigNumber(amount).shiftedBy(-1 * decimals).toFixed(roundOff, 1))
}

const TRANSAK_ORIGINS = {
  API: {
    PRODUCTION: 'https://api.transak.com',
    STAGING: 'https://api-stg.transak.com'
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
  constructor (account, { apiKey, widgetUrl, getOrder, environment = 'PRODUCTION', cacheTime = TRANSAK_CACHE_TIME }) {
    super(account)

    /** @private */
    this._apiKey = apiKey

    /** @private */
    this._widgetUrl = widgetUrl

    /** @private */
    this._getOrder = getOrder

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
      throw new NoSuchElementError('Cannot find info for cryptoAsset and fiatCurrency')
    }
    return { cryptoInfo, fiatInfo }
  }

  /**
   * Generates a widget URL for a user to purchase a crypto asset with fiat currency.
   * @override
   * @param {TransakBuyOptions} options - The options for the purchase.
   * @returns {Promise<BuyResult>} The URL for the user to complete the purchase.
   * @throws {ValueError} If `widgetUrl` is not configured, or if both/neither of `cryptoAmount` and `fiatAmount` are provided.
   * @throws {NoSuchElementError} If `cryptoAsset` or `fiatCurrency` cannot be resolved.
   * @throws {TransakApiError} If fetching supported crypto assets or fiat currencies fails.
   */
  async buy (options) {
    const { cryptoAsset, fiatCurrency, recipient, config } = options

    if (!this._widgetUrl) {
      throw new ValueError('A \'widgetUrl\' callback is required to create a Transak widget URL')
    }

    const { cryptoInfo, fiatInfo } = await this._getAssetDetails(cryptoAsset, fiatCurrency, config?.network)

    const fiatDecimals = _getFiatDecimals(fiatInfo)

    const widgetParams = {
      ...config,
      apiKey: this._apiKey,
      productsAvailed: 'BUY',
      cryptoCurrencyCode: cryptoInfo.symbol,
      network: cryptoInfo.network.name,
      fiatCurrency: fiatInfo.symbol
    }

    if ('cryptoAmount' in options && 'fiatAmount' in options) {
      throw new ValueError('\'cryptoAmount\' and \'fiatAmount\' both cannot be provided')
    }

    if ('cryptoAmount' in options) {
      widgetParams.cryptoAmount = _toMajorUnits(options.cryptoAmount, cryptoInfo.decimals, cryptoInfo.roundOff)
    } else if ('fiatAmount' in options) {
      widgetParams.fiatAmount = _toMajorUnits(options.fiatAmount, fiatDecimals, fiatInfo.roundOff)
    } else {
      throw new ValueError('Either \'cryptoAmount\' or \'fiatAmount\' must be provided')
    }

    if (recipient) {
      widgetParams.walletAddress = recipient
    } else if (this._account) {
      widgetParams.walletAddress = await this._account.getAddress()
    }

    const buyUrl = await this._widgetUrl(widgetParams)

    return {
      buyUrl
    }
  }

  /**
   * Gets a quote for a crypto asset purchase.
   * @override
   * @param {TransakQuoteBuyOptions} options - The options for the quote.
   * @returns {Promise<TransakBuyQuote>} A quote for the transaction.
   * @throws {ValueError} If both/neither of `cryptoAmount` and `fiatAmount` are provided.
   * @throws {NoSuchElementError} If `cryptoAsset` or `fiatCurrency` cannot be resolved.
   * @throws {TransakApiError} If fetching the quote, supported crypto assets, or supported fiat currencies fails.
   */
  async quoteBuy (options) {
    const { cryptoAsset, fiatCurrency, config } = options

    const { cryptoInfo, fiatInfo } = await this._getAssetDetails(cryptoAsset, fiatCurrency, config?.network)

    const fiatDecimals = _getFiatDecimals(fiatInfo)

    const params = {
      ...config,
      partnerApiKey: this._apiKey,
      fiatCurrency: fiatInfo.symbol,
      cryptoCurrency: cryptoInfo.symbol,
      network: cryptoInfo.network.name,
      isBuyOrSell: 'BUY'
    }

    if ('cryptoAmount' in options && 'fiatAmount' in options) {
      throw new ValueError('\'cryptoAmount\' and \'fiatAmount\' both cannot be provided')
    }

    if ('cryptoAmount' in options) {
      params.cryptoAmount = _toMajorUnits(options.cryptoAmount, cryptoInfo.decimals, cryptoInfo.roundOff)
    } else if ('fiatAmount' in options) {
      params.fiatAmount = _toMajorUnits(options.fiatAmount, fiatDecimals, fiatInfo.roundOff)
    } else {
      throw new ValueError('Either \'cryptoAmount\' or \'fiatAmount\' must be provided')
    }

    const quote = await this._fetchQuote(params)

    return this._toFiatQuote(quote, cryptoInfo, fiatInfo)
  }

  /**
   * Gets a quote for a crypto asset sale.
   * @override
   * @param {TransakQuoteSellOptions} options - The options for the quote.
   * @returns {Promise<TransakSellQuote>} A quote for the transaction.
   * @throws {ValueError} If `cryptoAmount` is not provided.
   * @throws {NoSuchElementError} If `cryptoAsset` or `fiatCurrency` cannot be resolved.
   * @throws {TransakApiError} If fetching the quote, supported crypto assets, or supported fiat currencies fails.
   */
  async quoteSell (options) {
    const { cryptoAsset, fiatCurrency, cryptoAmount, config } = options

    if (cryptoAmount === undefined) {
      throw new ValueError('\'cryptoAmount\' must be provided')
    }

    const { cryptoInfo, fiatInfo } = await this._getAssetDetails(cryptoAsset, fiatCurrency, config?.network)

    const params = {
      ...config,
      partnerApiKey: this._apiKey,
      fiatCurrency: fiatInfo.symbol,
      cryptoCurrency: cryptoInfo.symbol,
      network: cryptoInfo.network.name,
      isBuyOrSell: 'SELL',
      cryptoAmount: _toMajorUnits(cryptoAmount, cryptoInfo.decimals, cryptoInfo.roundOff)
    }

    const quote = await this._fetchQuote(params)

    return this._toFiatQuote(quote, cryptoInfo, fiatInfo)
  }

  /**
   * Generates a widget URL for a user to sell a crypto asset for fiat currency.
   * @override
   * @param {TransakSellOptions} options - The options for the sale.
   * @returns {Promise<SellResult>} The URL for the user to complete the sale.
   * @throws {ValueError} If `widgetUrl` is not configured, or if both/neither of `cryptoAmount` and `fiatAmount` are provided.
   * @throws {NoSuchElementError} If `cryptoAsset` or `fiatCurrency` cannot be resolved.
   * @throws {TransakApiError} If fetching supported crypto assets or fiat currencies fails.
   */
  async sell (options) {
    const { cryptoAsset, fiatCurrency, config } = options

    if (!this._widgetUrl) {
      throw new ValueError('A \'widgetUrl\' callback is required to create a Transak widget URL')
    }

    const { cryptoInfo, fiatInfo } = await this._getAssetDetails(cryptoAsset, fiatCurrency, config?.network)

    const fiatDecimals = _getFiatDecimals(fiatInfo)

    const widgetParams = {
      ...config,
      apiKey: this._apiKey,
      productsAvailed: 'SELL',
      cryptoCurrencyCode: cryptoInfo.symbol,
      network: cryptoInfo.network.name,
      fiatCurrency: fiatInfo.symbol
    }

    if ('cryptoAmount' in options && 'fiatAmount' in options) {
      throw new ValueError('\'cryptoAmount\' and \'fiatAmount\' both cannot be provided')
    }

    if ('cryptoAmount' in options) {
      widgetParams.cryptoAmount = _toMajorUnits(options.cryptoAmount, cryptoInfo.decimals, cryptoInfo.roundOff)
    } else if ('fiatAmount' in options) {
      widgetParams.fiatAmount = _toMajorUnits(options.fiatAmount, fiatDecimals, fiatInfo.roundOff)
    } else {
      throw new ValueError('Either \'cryptoAmount\' or \'fiatAmount\' must be provided')
    }

    const sellUrl = await this._widgetUrl(widgetParams)

    return {
      sellUrl
    }
  }

  /**
   * Retrieves the details of a specific order from the provider.
   *
   * Transak's Get Order API requires a partner `access-token` (minted from your
   * API secret), which must not be exposed client-side — so the authenticated
   * fetch is delegated to the `getOrder` callback, which runs on your backend.
   * @override
   * @param {string} txId - The unique identifier of the order.
   * @returns {Promise<TransakTransactionDetail>} The transaction details.
   * @throws {ValueError} If `getOrder` is not configured.
   */
  async getTransactionDetail (txId) {
    if (!this._getOrder) {
      throw new ValueError('A \'getOrder\' callback is required to fetch a Transak order')
    }

    const transakOrder = await this._getOrder(txId)

    return {
      status: toWdkStatus(transakOrder.status),
      cryptoAsset: transakOrder.cryptoCurrency,
      fiatCurrency: transakOrder.fiatCurrency,
      metadata: transakOrder
    }
  }

  /** @private */
  async _fetchQuote (params) {
    const url = new URL('/api/v1/pricing/public/quotes', this._apiOrigin)

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
      throw new TransakApiError(`Failed to fetch Transak quote: ${resp.status} ${resp.statusText}`)
    }

    const body = await resp.json()

    return body.response ?? body
  }

  /** @private */
  _toFiatQuote (quote, cryptoInfo, fiatInfo) {
    const fiatDecimals = _getFiatDecimals(fiatInfo)

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

  /** @private */
  async _fetchAndCacheSupportedCryptoAssets () {
    const now = Date.now()

    if (!this._supportedCryptoAssetsCache || (now - this._supportedCryptoAssetsCache.timestamp >= this._cacheThreshold)) {
      const url = new URL('/cryptocoverage/api/v1/public/crypto-currencies', this._apiOrigin)

      const resp = await fetch(url.toString(), {
        headers: {
          accept: 'application/json',
          'x-api-key': this._apiKey
        }
      })

      if (!resp.ok) {
        throw new TransakApiError(`Failed to fetch Transak supported crypto assets: ${resp.status} ${resp.statusText}`)
      }

      const body = await resp.json()
      const data = body.response ?? body

      if (!Array.isArray(data)) {
        throw new TransakApiError('Failed to fetch Transak supported crypto assets')
      }

      this._supportedCryptoAssetsCache = {
        timestamp: now,
        data
      }
    }

    return this._supportedCryptoAssetsCache?.data || []
  }

  /** @private */
  async _fetchAndCacheSupportedFiatCurrencies () {
    const now = Date.now()

    if (!this._supportedFiatCurrenciesCache || (now - this._supportedFiatCurrenciesCache.timestamp >= this._cacheThreshold)) {
      const url = new URL('/fiat/public/v1/currencies/fiat-currencies', this._apiOrigin)

      const resp = await fetch(url.toString(), {
        headers: {
          accept: 'application/json',
          'x-api-key': this._apiKey
        }
      })

      if (!resp.ok) {
        throw new TransakApiError(`Failed to fetch Transak supported fiat currencies: ${resp.status} ${resp.statusText}`)
      }

      const body = await resp.json()
      const data = body.response ?? body

      if (!Array.isArray(data)) {
        throw new TransakApiError('Failed to fetch Transak supported fiat currencies')
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
   * @throws {TransakApiError} If fetching supported crypto assets fails.
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
   * @throws {TransakApiError} If fetching supported fiat currencies fails.
   */
  async getSupportedFiatCurrencies () {
    const fiatCurrencies = await this._fetchAndCacheSupportedFiatCurrencies()

    return fiatCurrencies.map((currencyDetail) => ({
      code: currencyDetail.symbol,
      decimals: _getFiatDecimals(currencyDetail),
      name: currencyDetail.name,
      metadata: currencyDetail
    }))
  }

  /**
   * Retrieves a list of supported countries from the provider.
   * @override
   * @returns {Promise<TransakSupportedCountry[]>} An array of supported countries.
   * @throws {TransakApiError} If fetching supported countries or supported fiat currencies fails.
   */
  async getSupportedCountries () {
    const url = new URL('/api/v2/countries', this._apiOrigin)

    const [resp, fiatCurrencies] = await Promise.all([
      fetch(url.toString(), {
        headers: {
          accept: 'application/json',
          'x-api-key': this._apiKey
        }
      }),
      this._fetchAndCacheSupportedFiatCurrencies()
    ])

    if (!resp.ok) {
      throw new TransakApiError(`Failed to fetch supported countries: ${resp.status} ${resp.statusText}`)
    }

    const body = await resp.json()
    const transakSupportedCountries = body.response ?? body

    if (!Array.isArray(transakSupportedCountries)) {
      throw new TransakApiError('Failed to fetch supported countries')
    }

    const fiatCurrencyByCode = new Map(fiatCurrencies.map((currency) => [currency.symbol, currency]))

    return transakSupportedCountries.map((countryDetail) => {
      const fiatCurrency = fiatCurrencyByCode.get(countryDetail.currencyCode)

      return {
        code: countryDetail.alpha2 || countryDetail.alpha3,
        isBuyAllowed: fiatCurrency?.isAllowed === true,
        isSellAllowed: fiatCurrency?.isPayOutAllowed === true,
        name: countryDetail.name,
        metadata: countryDetail
      }
    })
  }
}
