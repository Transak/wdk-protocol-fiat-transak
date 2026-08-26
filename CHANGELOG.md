# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-08-26

### Added

- Exported several public types from the package root that were previously only reachable indirectly (`TransakWidgetParams`, `TransakBuyOptions`/`TransakSellOptions`, `TransakBuyQuote`/`TransakSellQuote`, `TransakQuoteBuyOptions`/`TransakQuoteSellOptions`, `TransakWidgetUiBuyParams`/`TransakWidgetUiSellParams`, `TransakSupportedCryptoAsset`/`TransakSupportedFiatCurrency`/`TransakSupportedCountry`, `TransakWalletAddressesData`/`TransakWalletAddressEntry`, and `TransakUserData`/`TransakUserAddress`).

### Fixed

- `referrerDomain` is now correctly typed as required on the widget config, instead of optional.
- `widgetUrl`'s parameter type now reflects the buy- or sell-specific UI fields actually passed to it at runtime, instead of the narrower shared base type.
- `walletAddressesData` and `userData` widget config fields now have proper structured types instead of `Object`.
- Added missing `@see` API documentation links for `TransakCountryDetail`, `TransakQuote`, and `TransakOrder`.

## [1.0.1] - 2026-08-24

### Added

- Additional Transak widget UI parameters supported under `config` for `buy`/`sell` (e.g. `disablePaymentMethods`, `userData`, `isAutoFillUserData`, `exchangeScreenTitle`, and sell's `walletRedirection`).

### Fixed

- `getSupportedCountries` — `isBuyAllowed`/`isSellAllowed` are now derived solely from the country's own `isAllowed` flag, instead of also depending on the matching fiat currency's flags.
- `hideMenu` widget parameter type corrected from `string` to `boolean`.
- Corrected headers on the `refresh-token` example in the README/backend integration guidance (`x-api-key` added; `x-user-ip` limited to the Create Session call, where Transak actually requires it).

## [1.0.0] - 2026-08-12

### Added

- Initial release of `TransakProtocol`, implementing the `IFiatProtocol` interface from `@tetherto/wdk-wallet/protocols`.
- `buy` / `sell` — generate Transak widget URLs for on-ramp and off-ramp flows.
- `quoteBuy` / `quoteSell` — preview buy/sell economics (amount, fee, rate) without opening the widget.
- `getTransactionDetail` — look up an order by Transak order ID and normalize its status to `'in_progress' | 'failed' | 'completed'`.
- `getSupportedCryptoAssets` / `getSupportedFiatCurrencies` / `getSupportedCountries` — fetch the account's supported values, cached per `cacheTime`.
- TypeScript type definitions for all public methods and options.
