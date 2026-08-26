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

/** @typedef {import('./src/transak-protocol.js').TransakProtocolConfig} TransakProtocolConfig */
/** @typedef {import('./src/transak-protocol.js').TransakWidgetParams} TransakWidgetParams */
/** @typedef {import('./src/transak-protocol.js').TransakWidgetUiParams} TransakWidgetUiParams */
/** @typedef {import('./src/transak-protocol.js').TransakWidgetUiBuyParams} TransakWidgetUiBuyParams */
/** @typedef {import('./src/transak-protocol.js').TransakWalletAddressesData} TransakWalletAddressesData */
/** @typedef {import('./src/transak-protocol.js').TransakWalletAddressEntry} TransakWalletAddressEntry */
/** @typedef {import('./src/transak-protocol.js').TransakUserData} TransakUserData */
/** @typedef {import('./src/transak-protocol.js').TransakUserAddress} TransakUserAddress */
/** @typedef {import('./src/transak-protocol.js').TransakBuyParams} TransakBuyParams */
/** @typedef {import('./src/transak-protocol.js').TransakWidgetUiSellParams} TransakWidgetUiSellParams */
/** @typedef {import('./src/transak-protocol.js').TransakSellParams} TransakSellParams */
/** @typedef {import('./src/transak-protocol.js').TransakQuoteBuyParams} TransakQuoteBuyParams */
/** @typedef {import('./src/transak-protocol.js').TransakBuyOptions} TransakBuyOptions */
/** @typedef {import('./src/transak-protocol.js').TransakQuoteBuyOptions} TransakQuoteBuyOptions */
/** @typedef {import('./src/transak-protocol.js').TransakBuyQuote} TransakBuyQuote */
/** @typedef {import('./src/transak-protocol.js').TransakQuoteSellParams} TransakQuoteSellParams */
/** @typedef {import('./src/transak-protocol.js').TransakQuoteSellOptions} TransakQuoteSellOptions */
/** @typedef {import('./src/transak-protocol.js').TransakSellQuote} TransakSellQuote */
/** @typedef {import('./src/transak-protocol.js').TransakSellOptions} TransakSellOptions */
/** @typedef {import('./src/transak-protocol.js').TransakFiatCurrencyDetails} TransakFiatCurrencyDetails */
/** @typedef {import('./src/transak-protocol.js').TransakSupportedFiatCurrency} TransakSupportedFiatCurrency */
/** @typedef {import('./src/transak-protocol.js').TransakCryptoCurrencyDetails} TransakCryptoCurrencyDetails */
/** @typedef {import('./src/transak-protocol.js').TransakSupportedCryptoAsset} TransakSupportedCryptoAsset */
/** @typedef {import('./src/transak-protocol.js').TransakNetworkDetails} TransakNetworkDetails */
/** @typedef {import('./src/transak-protocol.js').TransakPaymentOption} TransakPaymentOption */
/** @typedef {import('./src/transak-protocol.js').TransakOrderStatus} TransakOrderStatus */
/** @typedef {import('./src/transak-protocol.js').TransakOrder} TransakOrder */
/** @typedef {import('./src/transak-protocol.js').TransakQuote} TransakQuote */
/** @typedef {import('./src/transak-protocol.js').TransakFeeBreakdown} TransakFeeBreakdown */
/** @typedef {import('./src/transak-protocol.js').TransakCountryPartner} TransakCountryPartner */
/** @typedef {import('./src/transak-protocol.js').TransakCountryDetail} TransakCountryDetail */
/** @typedef {import('./src/transak-protocol.js').TransakSupportedCountry} TransakSupportedCountry */
/** @typedef {import('./src/transak-protocol.js').TransakTransactionDetail} TransakTransactionDetail */

export { default, TransakProtocol, IFiatProtocol } from './src/transak-protocol.js'

export { TransakApiError } from './src/errors.js'
