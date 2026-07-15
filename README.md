# @tetherto/wdk-protocol-fiat-transak

Note: This package is in beta. Please test in a dev setup first.

A simple way to integrate the Transak widget for on-ramp and off-ramp services. You can generate secure, session-based or direct query-parameter widget URLs, get quotes for buying and selling crypto, and read protocol-related data. This package can be used in both frontend and backend environments.

## 🔍 About WDK

This is part of WDK (Wallet Development Kit). WDK helps you build safe, non‑custody wallets. Read more at https://docs.wallet.tether.io.

## 🌟 Features

- Generate a secure (session-based) or direct widget URL to buy Crypto (On-ramp)
- Generate a secure (session-based) or direct widget URL to sell Crypto (Off-ramp)
- Get quotes (buy and sell)
- Get supported currencies, countries
- Get order (transaction) details

## ⬇️ Installation

```bash
npm install @tetherto/wdk-protocol-fiat-transak
```

## 🚀 Quick Start

### Basic Usage

```javascript
import TransakProtocol from '@tetherto/wdk-protocol-fiat-transak'

const widgetUrl = async (url) => {
  const response = await fetch('https://your-backend.example.com/transak/widget-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url })
  })

  if (!response.ok) {
    throw new Error(`Failed to create Transak widget URL: ${response.status} ${response.statusText}`)
  }

  const { widgetUrl } = await response.json()

  return widgetUrl
}

// Initialize protocol without a wallet account.
// You then pass `recipient`/`refundAddress` explicitly on buy/sell (see below).
const transak = new TransakProtocol(undefined, {
  apiKey: 'YOUR_TRANSAK_PARTNER_KEY',
  widgetUrl,
  environment: 'STAGING'
})

// Get a buy quote
const buyQuote = await transak.quoteBuy({
  fiatCurrency: 'usd',
  cryptoAsset: 'eth',
  fiatAmount: 100_00n // 100 USD, in the smallest fiat unit (cents)
})

// Generate a buy widget URL
const { buyUrl } = await transak.buy({
  fiatCurrency: 'usd',
  cryptoAsset: 'eth',
  fiatAmount: 100_00n,
  recipient: '0xabc'
})

console.log('Buy URL:', buyUrl)

// Get a sell quote
const sellQuote = await transak.quoteSell({
  fiatCurrency: 'usd',
  cryptoAsset: 'eth',
  cryptoAmount: 100_000_000_000_000_000n // 0.1 ETH, in wei
})

// Generate a sell widget URL
const { sellUrl } = await transak.sell({
  fiatCurrency: 'usd',
  cryptoAsset: 'eth',
  cryptoAmount: 100_000_000_000_000_000n,
  refundAddress: '0xabc'
})
```

### Using a Wallet Account

The first constructor argument is an optional WDK wallet account. When you bind one, `buy` and `sell` automatically use the account's address, so you don't need to pass `recipient`/`refundAddress` on every call:

```javascript
import TransakProtocol from '@tetherto/wdk-protocol-fiat-transak'

// `walletManager` is your app's WDK wallet manager (chain-specific).
// getAccount() returns an IWalletAccount exposing getAddress().
const account = await walletManager.getAccount(0)

const transak = new TransakProtocol(account, {
  apiKey: 'YOUR_TRANSAK_PARTNER_KEY',
  widgetUrl,
  environment: 'STAGING'
})

// No `recipient` needed — the account's address is filled in automatically.
const { buyUrl } = await transak.buy({
  fiatCurrency: 'usd',
  cryptoAsset: 'eth',
  fiatAmount: 100_00n
})

// Likewise, no `refundAddress` needed for sell.
const { sellUrl } = await transak.sell({
  fiatCurrency: 'usd',
  cryptoAsset: 'eth',
  cryptoAmount: 100_000_000_000_000_000n
})

// An explicit recipient/refundAddress still wins over the account address:
const { buyUrl: toOther } = await transak.buy({
  fiatCurrency: 'usd',
  cryptoAsset: 'eth',
  fiatAmount: 100_00n,
  recipient: '0xSomeOtherAddress'
})
```

#### Choosing an account type

The `account` argument accepts three forms:

- **`undefined`** — no wallet is bound. Pass `recipient`/`refundAddress` explicitly on `buy`/`sell`, or omit them to let the Transak widget prompt the user for the address. Ideal for quotes, backend/server usage, or when the destination address comes from elsewhere.
- **`IWalletAccountReadOnly`** — a read-only account. Its `getAddress()` is used to pre-fill the wallet address on `buy`/`sell`.
- **`IWalletAccount`** — a full wallet account. Behaves the same as a read-only account here, since the fiat on/off-ramp flow does not sign transactions (the Transak widget handles the crypto side).

Only `buy` and `sell` read the account — and only to derive the wallet address when you don't pass one. `quoteBuy`, `quoteSell`, `getTransactionDetail`, and the `getSupported*` methods never use it, so `undefined` is sufficient for those.

## 💱 Amounts & Units

Following WDK conventions, all amounts cross the interface in **base units**, as `bigint` or `number`:

- `fiatAmount` is in the currency's smallest unit — e.g. `100_00` for 100 USD (cents).
- `cryptoAmount` is in the asset's on-chain base unit — e.g. `1_000_000_000_000_000_000` for 1 ETH (wei).

The module reads each asset's `decimals` from Transak's supported-currencies endpoints to convert between base units and the human-readable amounts Transak's APIs expect. Quotes are likewise returned in base units (`bigint`).

## 🌐 Assets & Networks

WDK identifies a crypto asset by a single `cryptoAsset` code (e.g. `'usdt'`). Transak identifies an asset by its `cryptoCurrencyCode` **and** `network` (USDT exists on ethereum, tron, solana, …).

By default, the module resolves the network for a symbol from Transak's supported-crypto list (the first match). If a symbol exists on multiple networks, pass `config.network` to disambiguate:

```javascript
await transak.buy({
  cryptoAsset: 'usdt',
  fiatCurrency: 'usd',
  fiatAmount: 100_00n,
  config: { network: 'tron' }
})
```

`getSupportedCryptoAssets()` exposes both the `code` and `networkCode` for every supported asset.

## 📚 API Reference

### TransakProtocol

Main class for Transak integration.

#### Constructor

```javascript
new TransakProtocol(account, config)
```

Parameters:
- `account` (IWalletAccount | IWalletAccountReadOnly | undefined): The wallet account to bind to the protocol. Used only by `buy`/`sell` to auto-fill the wallet address when `recipient`/`refundAddress` is omitted. Pass `undefined` for an unbound instance. See [Choosing an account type](#choosing-an-account-type).
- `config` (object): The protocol config
  - `apiKey` (string): Your Transak partner API key.
  - `widgetUrl` (function, optional): Callback used to turn the generated widget URL into a secure, session-based Transak widget URL via a trusted provider (e.g. a backend service that calls Transak's Create Widget URL API). If not provided, the protocol returns the direct query-parameter URL.
  - `cacheTime` (number, optional): The duration in milliseconds to cache supported currencies.
  - `environment` ("PRODUCTION" | "STAGING", optional): The environment to use for Transak endpoints and widget URLs. Defaults to "PRODUCTION". Use "PRODUCTION" for live transactions and "STAGING" for testing with non-real funds.

### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `buy(options)` | Generates a widget URL to purchase crypto | `Promise<BuyResult>` |
| `sell(options)` | Generates a widget URL to sell crypto | `Promise<SellResult>` |
| `quoteBuy(options)` | Gets a quote for a crypto asset purchase | `Promise<TransakBuyQuote>` |
| `quoteSell(options)` | Gets a quote for a crypto asset sale | `Promise<TransakSellQuote>` |
| `getTransactionDetail(txId)` | Retrieves the details of an order | `Promise<TransakTransactionDetail>` |
| `getSupportedCryptoAssets()` | Retrieves a list of supported crypto assets | `Promise<TransakSupportedCryptoAsset[]>` |
| `getSupportedFiatCurrencies()` | Retrieves a list of supported fiat currencies | `Promise<TransakSupportedFiatCurrency[]>` |
| `getSupportedCountries()` | Retrieves a list of supported countries | `Promise<TransakSupportedCountry[]>` |

#### `buy(options)`
Generates a widget URL to purchase crypto.

Options:
- `fiatCurrency` (string): The fiat currency code (e.g., 'usd').
- `cryptoAsset` (string): The crypto asset code (e.g., 'eth').
- `fiatAmount` (number | bigint, optional): The amount in fiat currency, in its smallest unit.
- `cryptoAmount` (number | bigint, optional): The amount in crypto asset, in its base unit.
- `recipient` (string, optional): The wallet address to receive funds. If not provided, uses the account address.
- `config` (object, optional): Additional Transak widget parameters (including `network`).

#### `sell(options)`
Generates a widget URL to sell crypto.

Options:
- `fiatCurrency` (string): The fiat currency code (e.g., 'usd').
- `cryptoAsset` (string): The crypto asset code (e.g., 'eth').
- `fiatAmount` (number | bigint, optional): The amount in fiat currency, in its smallest unit.
- `cryptoAmount` (number | bigint, optional): The amount in crypto asset, in its base unit.
- `refundAddress` (string, optional): The wallet address for refunds. If not provided, uses the account address.
- `config` (object, optional): Additional Transak widget parameters (including `network`).

#### `quoteBuy(options)`
Gets a quote for a crypto asset purchase.

Options:
- `fiatCurrency` (string): The fiat currency code.
- `cryptoAsset` (string): The crypto asset code.
- `fiatAmount` (number | bigint, optional): The amount in fiat currency, in its smallest unit.
- `cryptoAmount` (number | bigint, optional): The amount in crypto asset, in its base unit.
- `config` (object, optional): Additional Transak quote parameters (`paymentMethod`, `network`, `quoteCountryCode`).

#### `quoteSell(options)`
Gets a quote for a crypto asset sale.

Options:
- `fiatCurrency` (string): The fiat currency code.
- `cryptoAsset` (string): The crypto asset code.
- `cryptoAmount` (number | bigint): The amount in crypto asset, in its base unit (Required).
- `config` (object, optional): Additional Transak quote parameters (`paymentMethod`, `network`, `quoteCountryCode`).

#### `getTransactionDetail(txId)`
Retrieves the details of an order.

Parameters:
- `txId` (string): The Transak order ID.

#### `getSupportedCryptoAssets()`
Retrieves a list of supported crypto assets.

#### `getSupportedFiatCurrencies()`
Retrieves a list of supported fiat currencies.

#### `getSupportedCountries()`
Retrieves a list of supported countries.

## 📝 Notes

- Works with networks and currencies supported by Transak.
- Check the Transak documentation for the full list of widget parameters, supported cryptocurrencies and regions.
- The package provides the baseline for Transak integration. To fully utilize the power of the Transak widget, take a look at the [Transak query parameters documentation](https://docs.transak.com/customization/query-parameters) for the full list of parameters.
- The `apiKey` can be retrieved through the [Transak Partner dashboard](https://dashboard.transak.com/).
- It is highly recommended to test the entire buy/sell flow in the `STAGING` environment.

## 🔒 Security Considerations

- Keep your Transak API secret / access token safe on your backend. Expose a backend API to clients, and have `widgetUrl` call that API (which calls Transak's Create Widget URL API) to retrieve the secure widget URL. See [Transak's migration to API-based widget URLs](https://docs.transak.com/guides/migration-to-api-based-transak-widget-url).

## 🛠️ Development

### Building

```bash
# Install dependencies
npm install

# Build TypeScript definitions
npm run build:types

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📜 License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🆘 Support

For support, please open an issue on the GitHub repository.
