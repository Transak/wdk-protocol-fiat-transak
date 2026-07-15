export default class TransakProtocol extends FiatProtocol {
    /**
     * Creates a new interface to interact with the Transak protocol without binding it to a wallet account.
     *
     * @overload
     * @param {undefined} account - The wallet account to use to interact with the protocol.
     * @param {TransakProtocolConfig} config - The Transak protocol configuration.
     */
    constructor(account: undefined, config: TransakProtocolConfig);
    /**
     * Creates a new read-only interface to interact with the Transak protocol.
     *
     * @overload
     * @param {IWalletAccountReadOnly} account - The wallet account to use to interact with the protocol.
     * @param {TransakProtocolConfig} config - The Transak protocol configuration.
     */
    constructor(account: IWalletAccountReadOnly, config: TransakProtocolConfig);
    /**
     * Creates a new interface to interact with the Transak protocol.
     *
     * @overload
     * @param {IWalletAccount} account - The wallet account to use to interact with the protocol.
     * @param {TransakProtocolConfig} config - The Transak protocol configuration.
     */
    constructor(account: IWalletAccount, config: TransakProtocolConfig);
    /** @private */
    private _apiKey;
    /** @private */
    private _widgetUrl;
    /** @private */
    private _environment;
    /** @private */
    private _supportedCryptoAssetsCache;
    /** @private */
    private _supportedFiatCurrenciesCache;
    /** @private */
    private _cacheThreshold;
    /** @private */
    private get _apiOrigin();
    /** @private */
    private get _widgetOrigin();
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
    private _getAssetDetails;
    /**
     * Generates a widget URL for a user to purchase a crypto asset with fiat currency.
     * `options.fiatAmount`/`options.cryptoAmount` are decimals in standard units
     * (e.g. 100.5 for 100.50 USD, 0.5 for 0.5 ETH), matching Transak's API — not base units.
     * @override
     * @param {TransakBuyOptions} options - The options for the purchase.
     * @returns {Promise<BuyResult>} The URL for the user to complete the purchase.
     */
    override buy(options: TransakBuyOptions): Promise<BuyResult>;
    /**
     * Gets a quote for a crypto asset purchase.
     * @override
     * @param {TransakQuoteBuyParams} config - The parameters for the quote.
     * @returns {Promise<TransakBuyQuote>} A quote for the transaction.
     */
    override quoteBuy(config: TransakQuoteBuyParams): Promise<TransakBuyQuote>;
    /**
     * Gets a quote for a crypto asset sale.
     * @override
     * @param {TransakQuoteSellParams} config - The parameters for the quote.
     * @returns {Promise<TransakSellQuote>} A quote for the transaction.
     */
    override quoteSell(config: TransakQuoteSellParams): Promise<TransakSellQuote>;
    /**
     * Generates a widget URL for a user to sell a crypto asset for fiat currency.
     * `options.fiatAmount`/`options.cryptoAmount` are decimals in standard units
     * (e.g. 100.5 for 100.50 USD, 0.5 for 0.5 ETH), matching Transak's API — not base units.
     * @override
     * @param {TransakSellOptions} options - The options for the sale.
     * @returns {Promise<SellResult>} The URL for the user to complete the sale.
     */
    override sell(options: TransakSellOptions): Promise<SellResult>;
    /**
     * Retrieves the details of a specific order from the provider.
     * @override
     * @param {string} txId - The unique identifier of the order.
     * @returns {Promise<TransakTransactionDetail>} The transaction details.
     */
    override getTransactionDetail(txId: string): Promise<TransakTransactionDetail>;
    /**
     * Fetches a quote from the Transak pricing API.
     * @private
     * @param {Record<string, unknown>} params - The query parameters for the quote.
     * @returns {Promise<TransakQuote>}
     */
    private _fetchQuote;
    /**
     * Normalises a Transak quote into WDK's standardized FiatQuote format.
     * @private
     * @param {TransakQuote} quote
     * @param {TransakCryptoCurrencyDetails} cryptoInfo
     * @param {TransakFiatCurrencyDetails} fiatInfo
     * @returns {FiatQuote & { metadata: TransakQuote }}
     */
    private _toFiatQuote;
    /**
     * Fetches and caches supported crypto assets from Transak.
     * @private
     * @returns {Promise<Array<TransakCryptoCurrencyDetails>>}
     */
    private _fetchAndCacheSupportedCryptoAssets;
    /**
     * Fetches and caches supported fiat currencies from Transak.
     * @private
     * @returns {Promise<Array<TransakFiatCurrencyDetails>>}
     */
    private _fetchAndCacheSupportedFiatCurrencies;
    /**
     * Retrieves a list of supported crypto assets from the provider.
     * @override
     * @returns {Promise<TransakSupportedCryptoAsset[]>} An array of supported crypto assets.
     */
    override getSupportedCryptoAssets(): Promise<TransakSupportedCryptoAsset[]>;
    /**
     * Retrieves a list of supported fiat currencies from the provider.
     * @override
     * @returns {Promise<TransakSupportedFiatCurrency[]>} An array of supported fiat currencies.
     */
    override getSupportedFiatCurrencies(): Promise<TransakSupportedFiatCurrency[]>;
    /**
     * Retrieves a list of supported countries from the provider.
     * @override
     * @returns {Promise<TransakSupportedCountry[]>} An array of supported countries.
     */
    override getSupportedCountries(): Promise<TransakSupportedCountry[]>;
}
export type IWalletAccount = import("@tetherto/wdk-wallet").IWalletAccount;
export type IWalletAccountReadOnly = import("@tetherto/wdk-wallet").IWalletAccountReadOnly;
export type BuyOptions = import("@tetherto/wdk-wallet/protocols").BuyOptions;
export type BuyResult = import("@tetherto/wdk-wallet/protocols").BuyResult;
export type SellOptions = import("@tetherto/wdk-wallet/protocols").SellOptions;
export type SellCommonOptions = import("@tetherto/wdk-wallet/protocols").SellCommonOptions;
export type SellExactCryptoAmountOptions = import("@tetherto/wdk-wallet/protocols").SellExactCryptoAmountOptions;
export type SellResult = import("@tetherto/wdk-wallet/protocols").SellResult;
export type FiatQuote = import("@tetherto/wdk-wallet/protocols").FiatQuote;
export type FiatTransactionStatus = import("@tetherto/wdk-wallet/protocols").FiatTransactionStatus;
export type FiatTransactionDetail = import("@tetherto/wdk-wallet/protocols").FiatTransactionDetail;
export type SupportedCountry = import("@tetherto/wdk-wallet/protocols").SupportedCountry;
export type SupportedFiatCurrency = import("@tetherto/wdk-wallet/protocols").SupportedFiatCurrency;
export type SupportedCryptoAsset = import("@tetherto/wdk-wallet/protocols").SupportedCryptoAsset;
/**
 * Widget UI parameters shared by the buy and sell flows.
 * See https://docs.transak.com/customization/query-parameters for the full list.
 */
export type TransakWidgetUiParams = {
    /**
     * - The primary color of the widget, as a hex code without the leading '#'.
     */
    themeColor?: string;
    /**
     * - A comma-separated list of hex colors used for the widget background.
     */
    backgroundColors?: string;
    /**
     * - A comma-separated list of hex colors used for the widget borders.
     */
    borderColors?: string;
    /**
     * - The default appearance for the widget.
     */
    colorMode?: "DARK" | "LIGHT";
    /**
     * - The fiat currency code selected by default. The customer can still select another currency.
     */
    defaultFiatCurrency?: string;
    /**
     * - Locks the fiat currency the customer can transact with.
     */
    fiatCurrency?: string;
    /**
     * - The ISO 3166-1 alpha-2 country code used to pre-select the customer's country.
     */
    countryCode?: string;
    /**
     * - A URL to redirect the customer to after the flow is complete. Must use 'https://'.
     */
    redirectURL?: string;
    /**
     * - Your domain URL (web) or application package name (mobile). Recommended for allow-listing.
     */
    referrerDomain?: string;
    /**
     * - If 'true', hides the widget navigation menu.
     */
    hideMenu?: string;
    /**
     * - The ID of the theme created for your application or website.
     */
    themeId?: string;
};
/**
 * Widget UI parameters specific to the buy (on-ramp) flow.
 */
export type TransakWidgetUiBuyParams = {
    /**
     * - The crypto currency code you would prefer the customer to purchase. The customer can still select another currency.
     */
    defaultCryptoCurrency?: string;
    /**
     * - The cryptocurrency wallet address the purchased funds will be sent to. If you pass a valid wallet address the customer won't be prompted to enter one.
     */
    walletAddress?: string;
    /**
     * - A JSON string representing the wallet addresses you want to use for multiple networks/coins.
     */
    walletAddressesData?: string;
    /**
     * - If 'true', the customer cannot edit the destination wallet address.
     */
    disableWalletAddressForm?: boolean;
    /**
     * - If 'true', skips the exchange screen and takes the customer straight to the payment screen.
     */
    hideExchangeScreen?: boolean;
    /**
     * - If 'true', hides the fee breakdown from the customer.
     */
    isFeeCalculationHidden?: boolean;
    /**
     * - If 'true', locks the fiat/crypto amount and prevents the customer from modifying it.
     */
    lockAmount?: boolean;
    /**
     * - Pre-select the payment method you want the customer to use.
     */
    defaultPaymentMethod?: string;
    /**
     * - Restrict the customer to a single payment method.
     */
    paymentMethod?: string;
    /**
     * - The customer's email address. If you pass a valid email address, the customer won't be prompted to enter one.
     */
    email?: string;
    /**
     * - An identifier you would like to associate with the order. It is returned in webhooks and order data.
     */
    partnerOrderId?: string;
    /**
     * - An identifier you would like to associate with the customer. It is returned in webhooks and order data.
     */
    partnerCustomerId?: string;
    /**
     * - Restrict the customer to a single network for the selected crypto currency.
     */
    network?: string;
};
export type TransakBuyParams = TransakWidgetUiParams & TransakWidgetUiBuyParams;
/**
 * Widget UI parameters specific to the sell (off-ramp) flow.
 */
export type TransakWidgetUiSellParams = {
    /**
     * - The crypto currency code you would prefer the customer to sell. The customer can still select another currency.
     */
    defaultCryptoCurrency?: string;
    /**
     * - The wallet address the customer will send the crypto from.
     */
    walletAddress?: string;
    /**
     * - A JSON string representing the wallet addresses you want to use for multiple networks/coins.
     */
    walletAddressesData?: string;
    /**
     * - If 'true', the customer cannot edit the source wallet address.
     */
    disableWalletAddressForm?: boolean;
    /**
     * - If 'true', skips the exchange screen and takes the customer straight to the payout screen.
     */
    hideExchangeScreen?: boolean;
    /**
     * - If 'true', hides the fee breakdown from the customer.
     */
    isFeeCalculationHidden?: boolean;
    /**
     * - If 'true', locks the fiat/crypto amount and prevents the customer from modifying it.
     */
    lockAmount?: boolean;
    /**
     * - Pre-select the payout method you want the customer to use.
     */
    defaultPaymentMethod?: string;
    /**
     * - Restrict the customer to a single payout method.
     */
    paymentMethod?: string;
    /**
     * - The customer's email address. If you pass a valid email address, the customer won't be prompted to enter one.
     */
    email?: string;
    /**
     * - An identifier you would like to associate with the order. It is returned in webhooks and order data.
     */
    partnerOrderId?: string;
    /**
     * - An identifier you would like to associate with the customer. It is returned in webhooks and order data.
     */
    partnerCustomerId?: string;
    /**
     * - Restrict the customer to a single network for the selected crypto currency.
     */
    network?: string;
};
export type TransakSellParams = TransakWidgetUiParams & TransakWidgetUiSellParams;
/**
 * The complete set of parameters for a buy quote from the Transak pricing API.
 */
export type TransakQuoteBuyParams = {
    /**
     * - The crypto asset code to price (e.g. 'ETH'). Required.
     */
    cryptoAsset: string;
    /**
     * - The fiat currency's ISO 4217 code (e.g. 'USD'). Required.
     */
    fiatCurrency: string;
    /**
     * - The fiat amount to spend, as a decimal in standard units (e.g. 100.5 for 100.50 USD). Required.
     */
    fiatAmount: number;
    /**
     * - The payment method to price the quote against (e.g. 'credit_debit_card'). Required.
     */
    paymentMethod: string;
    /**
     * - The network of the crypto currency (e.g. 'ethereum'). Required.
     */
    network: string;
};
/**
 * The complete set of parameters for a sell quote from the Transak pricing API.
 */
export type TransakQuoteSellParams = {
    /**
     * - The crypto asset code to price (e.g. 'ETH'). Required.
     */
    cryptoAsset: string;
    /**
     * - The fiat currency's ISO 4217 code (e.g. 'USD'). Required.
     */
    fiatCurrency: string;
    /**
     * - The crypto amount to sell, as a decimal in standard units (e.g. 0.5 for 0.5 ETH). Required.
     */
    cryptoAmount: number;
    /**
     * - The payout method to price the quote against (e.g. 'sepa_bank_transfer'). Required.
     */
    paymentMethod: string;
    /**
     * - The network of the crypto currency (e.g. 'ethereum'). Required.
     */
    network: string;
};
export type TransakNetworkDetails = {
    /**
     * - The network's Transak identifier (e.g. 'ethereum', 'tron').
     */
    name: string;
    /**
     * - The chain ID, when applicable.
     */
    chainId?: string;
    /**
     * - Fiat/payment-method combinations not supported on this network.
     */
    fiatCurrenciesNotSupported?: Array<{
        fiatCurrency: string;
        paymentMethod: string;
    }>;
};
/**
 * A crypto currency as returned by Transak's Get Crypto Currencies API.
 * See https://docs.transak.com/api/public/get-crypto-currencies.
 */
export type TransakCryptoCurrencyDetails = {
    /**
     * - Transak's internal coin identifier.
     */
    coinId: string;
    /**
     * - The crypto currency's name.
     */
    name: string;
    /**
     * - The crypto currency's symbol (e.g. 'USDT').
     */
    symbol: string;
    /**
     * - A unique identifier derived from the symbol and network.
     */
    uniqueId: string;
    /**
     * - The on-chain number of decimal places for the asset's base unit.
     */
    decimals: number;
    /**
     * - The number of decimal places used when displaying amounts.
     */
    roundOff: number;
    /**
     * - The network the asset lives on.
     */
    network: TransakNetworkDetails;
    /**
     * - Whether buy (on-ramp) transactions are supported for this asset.
     */
    isAllowed: boolean;
    /**
     * - Whether sell (off-ramp) transactions are supported for this asset.
     */
    isPayInAllowed?: boolean;
    /**
     * - Whether the asset is a stablecoin.
     */
    isStable?: boolean;
    /**
     * - Whether the asset is flagged as popular.
     */
    isPopular?: boolean;
    /**
     * - The token contract address, when applicable.
     */
    address?: string | null;
    /**
     * - The token standard/classification (e.g. 'ERC20').
     */
    tokenType?: string;
    /**
     * - The token classification identifier.
     */
    tokenIdentifier?: any;
    /**
     * - The minimum amount accepted for sell (pay-in) transactions.
     */
    minAmountForPayIn?: number;
    /**
     * - The maximum amount accepted for sell (pay-in) transactions.
     */
    maxAmountForPayIn?: number;
    /**
     * - Country codes where this asset is not supported.
     */
    kycCountriesNotSupported?: Array<string>;
    /**
     * - Icon URLs for the asset.
     */
    image?: {
        large?: string;
        small?: string;
        thumb?: string;
    };
};
export type TransakPaymentOption = {
    /**
     * - The payment option's identifier (e.g. 'credit_debit_card').
     */
    id: string;
    /**
     * - The payment option's display name.
     */
    name: string;
    /**
     * - Whether the payment option is currently active.
     */
    isActive: boolean;
    /**
     * - The minimum transaction amount for this payment option.
     */
    minAmount?: number;
    /**
     * - The maximum transaction amount for this payment option.
     */
    maxAmount?: number;
    /**
     * - Whether the payment option supports off-ramp payouts.
     */
    isPayOutAllowed?: boolean;
};
/**
 * A fiat currency as returned by Transak's Get Fiat Currencies API.
 * See https://docs.transak.com/api/public/get-fiat-currencies.
 * Note: the fiat schema has no `decimals` field — `roundOff` is the number of
 * decimal places for the currency's smallest unit.
 */
export type TransakFiatCurrencyDetails = {
    /**
     * - The currency's code (e.g. 'USD').
     */
    symbol: string;
    /**
     * - The currency's name.
     */
    name: string;
    /**
     * - Whether buy (on-ramp) transactions using this currency are supported.
     */
    isAllowed: boolean;
    /**
     * - Whether sell (off-ramp) payouts to this currency are supported.
     */
    isPayOutAllowed?: boolean;
    /**
     * - The number of decimal places for this currency's smallest unit.
     */
    roundOff: number;
    /**
     * - Whether the currency is flagged as popular.
     */
    isPopular?: boolean;
    /**
     * - ISO 3166-1 alpha-2 country codes that support this currency.
     */
    supportingCountries?: Array<string>;
    /**
     * - The country/region code used for the currency's logo.
     */
    logoSymbol?: string;
    /**
     * - The currency's icon (SVG markup or URL).
     */
    icon?: string;
    /**
     * - The default country used for NFT flows.
     */
    defaultCountryForNFT?: string;
    /**
     * - A message shown when the currency is unavailable.
     */
    displayMessage?: string;
    /**
     * - The payment options available for this currency.
     */
    paymentOptions?: Array<TransakPaymentOption>;
};
export type TransakCountryDetail = {
    /**
     * - The country's ISO 3166-1 alpha-2 code.
     */
    alpha2: string;
    /**
     * - The country's ISO 3166-1 alpha-3 code.
     */
    alpha3: string;
    /**
     * - Whether residents of this country can use the service.
     */
    isAllowed: boolean;
    /**
     * - Whether residents of this country are eligible for light KYC.
     */
    isLightKycAllowed?: boolean;
    /**
     * - The country's name.
     */
    name: string;
    /**
     * - The country's default fiat currency code.
     */
    currencyCode?: string;
    /**
     * - A list of supported identity documents for the country.
     */
    supportedDocuments?: Array<string>;
    /**
     * - The payment partners available in the country.
     */
    partners?: Array<object>;
};
/**
 * Type definition for the status of a Transak order.
 */
export type TransakOrderStatus = "AWAITING_PAYMENT_FROM_USER" | "PAYMENT_DONE_MARKED_BY_USER" | "PROCESSING" | "PENDING_DELIVERY_FROM_TRANSAK" | "ON_HOLD_PENDING_DELIVERY_FROM_TRANSAK" | "COMPLETED" | "CANCELLED" | "FAILED" | "REFUNDED" | "EXPIRED";
export type TransakFeeBreakdown = {
    /**
     * - The human readable name of the fee component.
     */
    name: string;
    /**
     * - The fee amount, denominated in the fiat currency.
     */
    value: number;
    /**
     * - The fee component's identifier.
     */
    id?: string;
    /**
     * - The identifiers of the sub-components rolled up into this fee.
     */
    ids?: Array<string>;
};
export type TransakQuote = {
    /**
     * - Unique identifier for the quote.
     */
    quoteId: string;
    /**
     * - The exchange rate between the crypto currency and the fiat currency.
     */
    conversionPrice: number;
    /**
     * - The mid-market exchange rate at quote time.
     */
    marketConversionPrice?: number;
    /**
     * - The slippage applied to the quote.
     */
    slippage?: number;
    /**
     * - The fiat currency code.
     */
    fiatCurrency: string;
    /**
     * - The crypto currency symbol.
     */
    cryptoCurrency: string;
    /**
     * - The payment method the quote was priced against.
     */
    paymentMethod?: string;
    /**
     * - The fiat amount, expressed in standard units (e.g. dollars).
     */
    fiatAmount: number;
    /**
     * - The crypto amount, expressed in standard units (e.g. ETH).
     */
    cryptoAmount: number;
    /**
     * - The direction of the quote.
     */
    isBuyOrSell: "BUY" | "SELL";
    /**
     * - The network the crypto currency lives on.
     */
    network: string;
    /**
     * - The total fee expressed as a decimal fraction.
     */
    feeDecimal?: number;
    /**
     * - The total fee, denominated in the fiat currency.
     */
    totalFee: number;
    /**
     * - A breakdown of the individual fee components.
     */
    feeBreakdown?: Array<TransakFeeBreakdown>;
    /**
     * - A nonce associated with the quote.
     */
    nonce?: string;
    /**
     * - The liquidity provider used for the quote.
     */
    cryptoLiquidityProvider?: string;
    /**
     * - Additional notes returned with the quote.
     */
    notes?: Array<object>;
};
export type TransakOrder = {
    /**
     * - Unique identifier for the order.
     */
    id: string;
    /**
     * - The order's status.
     */
    status: TransakOrderStatus;
    /**
     * - The crypto currency symbol.
     */
    cryptoCurrency: string;
    /**
     * - The fiat currency code.
     */
    fiatCurrency: string;
    /**
     * - The fiat amount, expressed in standard units.
     */
    fiatAmount: number;
    /**
     * - The crypto amount, expressed in standard units.
     */
    cryptoAmount?: number;
    /**
     * - The direction of the order.
     */
    isBuyOrSell: "BUY" | "SELL";
    /**
     * - The network the crypto currency lives on.
     */
    network: string;
    /**
     * - The wallet address associated with the order.
     */
    walletAddress?: string;
    /**
     * - The on-chain transaction hash, once available.
     */
    transactionHash?: string;
    /**
     * - The fiat amount actually paid by the customer.
     */
    amountPaid?: number;
    /**
     * - Time at which the order was created. Returned as an ISO 8601 string.
     */
    createdAt?: string;
    /**
     * - Time at which the order was completed. Returned as an ISO 8601 string.
     */
    completedAt?: string;
};
export type TransakTransactionDetail = FiatTransactionDetail & {
    metadata: TransakOrder;
};
export type TransakSupportedCountry = SupportedCountry & {
    metadata: TransakCountryDetail;
};
export type TransakSupportedCryptoAsset = SupportedCryptoAsset & {
    metadata: TransakCryptoCurrencyDetails;
};
export type TransakSupportedFiatCurrency = SupportedFiatCurrency & {
    metadata: TransakFiatCurrencyDetails;
};
export type TransakBuyOptions = BuyOptions & {
    config?: TransakBuyParams;
};
export type TransakBuyQuote = FiatQuote & {
    metadata: TransakQuote;
};
export type TransakSellQuote = FiatQuote & {
    metadata: TransakQuote;
};
export type TransakSellOptions = SellOptions & {
    config?: TransakSellParams;
};
export type TransakProtocolConfig = {
    /**
     * - Your Transak partner API key.
     */
    apiKey: string;
    /**
     * - Callback used to turn the generated widget URL into a secure, session-based Transak widget URL via a trusted provider (e.g. a backend service that calls Transak's Create Widget URL API). If not provided, the protocol returns the unsigned query-parameter URL.
     */
    widgetUrl?: (url: string) => Promise<string>;
    /**
     * - The duration in milliseconds to cache supported currencies.
     */
    cacheTime?: number;
    /**
     * - The environment to use for Transak endpoints and widget URLs. Defaults to "PRODUCTION". Use "PRODUCTION" for live transactions and "STAGING" for testing with non-real funds.
     */
    environment?: "PRODUCTION" | "STAGING";
};
import { FiatProtocol } from '@tetherto/wdk-wallet/protocols';
