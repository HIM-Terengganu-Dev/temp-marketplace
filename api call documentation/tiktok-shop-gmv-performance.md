# TikTok Shop API - GMV Performance

This document describes how to call the TikTok Shop API to fetch Gross Merchandise Value (GMV) performance data for a shop.

## Overview

The GMV Performance API endpoint allows you to retrieve sales performance metrics including GMV, orders, buyers, and other analytics for a specific date range.

**Endpoint**: `/analytics/202405/shop/performance`  
**Method**: `GET`  
**Base URL**: `https://open-api.tiktokglobalshop.com`

## Prerequisites

### Required Credentials

You need the following credentials from your `.env` file:

- `TIKTOK_SHOP_APP_KEY` - Your TikTok Shop application key
- `TIKTOK_SHOP_APP_SECRET` - Your TikTok Shop application secret
- `TIKTOK_SHOP1_ACCESS_TOKEN` - OAuth access token for the shop
- `TIKTOK_SHOP1_SHOP_CIPHER` - Shop cipher identifier

For other shops, use:
- `TIKTOK_SHOP2_ACCESS_TOKEN`, `TIKTOK_SHOP2_SHOP_CIPHER`
- `TIKTOK_SHOP3_ACCESS_TOKEN`, `TIKTOK_SHOP3_SHOP_CIPHER`
- `TIKTOK_SHOP4_ACCESS_TOKEN`, `TIKTOK_SHOP4_SHOP_CIPHER`

## Authentication

This API uses **dual authentication**:

1. **OAuth Bearer Token** - Sent in the `x-tts-access-token` header
2. **Signature-based Authentication** - Requires `app_key`, `app_secret`, and a generated signature

### Signature Generation

The signature must be generated using the `tiktok-shop` npm package. The signature is based on:
- All query parameters (sorted alphabetically)
- The API path
- The `app_secret`
- A timestamp

## Request Parameters

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `access_token` | string | Yes | OAuth access token for the shop |
| `app_key` | string | Yes | Your TikTok Shop application key |
| `shop_cipher` | string | Yes | Shop cipher identifier |
| `shop_id` | string | Yes | Shop ID (can be empty string) |
| `start_date_ge` | string | Yes | Start date (inclusive) in format `YYYY-MM-DD` |
| `end_date_lt` | string | Yes | End date (exclusive) in format `YYYY-MM-DD` |
| `version` | string | Yes | API version (e.g., `202405`) |
| `timestamp` | integer | Yes | Unix timestamp in seconds (generated automatically) |
| `sign` | string | Yes | Generated signature (generated automatically) |

### Headers

| Header | Value | Required |
|--------|-------|----------|
| `x-tts-access-token` | OAuth access token | Yes |

## Example Request

### Using cURL

```bash
curl -k -X 'GET' \
  -H 'x-tts-access-token: YOUR_ACCESS_TOKEN' \
  'https://open-api.tiktokglobalshop.com/analytics/202405/shop/performance?access_token=YOUR_ACCESS_TOKEN&app_key=YOUR_APP_KEY&end_date_lt=2025-12-22&shop_cipher=YOUR_SHOP_CIPHER&shop_id=&sign=GENERATED_SIGNATURE&start_date_ge=2025-12-21&timestamp=1766892725&version=202405'
```

### Using Node.js

```javascript
const axios = require('axios');
const tiktokShop = require('tiktok-shop');
require('dotenv').config();

const accessToken = process.env.TIKTOK_SHOP1_ACCESS_TOKEN;
const shopCipher = process.env.TIKTOK_SHOP1_SHOP_CIPHER;
const appKey = process.env.TIKTOK_SHOP_APP_KEY;
const appSecret = process.env.TIKTOK_SHOP_APP_SECRET;
const targetDate = '2025-12-21';

const baseUrl = 'https://open-api.tiktokglobalshop.com';
const urlPath = '/analytics/202405/shop/performance';
const API_VERSION = '202405';

// Build query parameters (without signature and timestamp)
const nextDay = new Date(new Date(targetDate).getTime() + 86400000)
  .toISOString().split('T')[0];

const queryParams = {
  access_token: accessToken,
  app_key: appKey,
  shop_cipher: shopCipher,
  shop_id: '',
  start_date_ge: targetDate,
  end_date_lt: nextDay,
  version: API_VERSION
};

// Build query string for signature generation
const sortedKeys = Object.keys(queryParams).sort();
const queryString = sortedKeys
  .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
  .join('&');

const urlForSignature = `${baseUrl}${urlPath}?${queryString}`;

// Generate signature
const signatureResult = tiktokShop.signByUrl(urlForSignature, appSecret, {});

// Add signature and timestamp
queryParams.sign = signatureResult.signature;
queryParams.timestamp = signatureResult.timestamp;

// Build final query string
const finalSortedKeys = Object.keys(queryParams).sort();
const finalQueryString = finalSortedKeys
  .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
  .join('&');

const finalUrl = `${baseUrl}${urlPath}?${finalQueryString}`;

// Make request
const headers = {
  'x-tts-access-token': accessToken
};

const response = await axios.get(finalUrl, { headers });
```

## Response Format

### Success Response

```json
{
  "code": 0,
  "data": {
    "latest_available_date": "2025-12-25",
    "performance": {
      "intervals": [
        {
          "start_date": "2025-12-21",
          "end_date": "2025-12-22",
          "gmv": {
            "amount": "13898.76",
            "currency": "MYR"
          },
          "gmv_breakdowns": [
            {
              "amount": "7382.87",
              "currency": "MYR",
              "type": "LIVE"
            },
            {
              "amount": "3515.89",
              "currency": "MYR",
              "type": "VIDEO"
            },
            {
              "amount": "3000.00",
              "currency": "MYR",
              "type": "PRODUCT_CARD"
            }
          ],
          "orders": 123,
          "buyers": 122,
          "units_sold": 145,
          "avg_order_value": {
            "amount": "113.00",
            "currency": "MYR"
          }
        }
      ]
    }
  },
  "message": "Success",
  "request_id": "2025122811305930102A24BA35BE6A00E1"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `code` | integer | Response code (0 = success) |
| `data.latest_available_date` | string | Latest date for which data is available |
| `data.performance.intervals[]` | array | Array of performance intervals |
| `intervals[].start_date` | string | Start date of the interval |
| `intervals[].end_date` | string | End date of the interval |
| `intervals[].gmv.amount` | string | GMV amount |
| `intervals[].gmv.currency` | string | Currency code |
| `intervals[].gmv_breakdowns[]` | array | GMV breakdown by type (LIVE, VIDEO, PRODUCT_CARD) |
| `intervals[].orders` | integer | Number of orders |
| `intervals[].buyers` | integer | Number of buyers |
| `intervals[].units_sold` | integer | Number of units sold |
| `intervals[].avg_order_value` | object | Average order value |

## Error Responses

### Common Error Codes

| Code | Message | Description |
|------|---------|-------------|
| `36009004` | Invalid credentials. Invalid 'app_key' query parameter | Missing or invalid app_key |
| `36009009` | Invalid path. The specified path does not match any available endpoint | Incorrect endpoint URL |
| `36009010` | Invalid method. The HTTP method used is not supported | Wrong HTTP method (should be GET) |
| `401` | Expired credentials. The 'access_token' or 'x-tts-access-token' header has expired | Access token needs to be refreshed |

### Example Error Response

```json
{
  "code": 36009004,
  "data": null,
  "message": "Invalid credentials. Invalid 'app_key' query parameter.",
  "request_id": "2025122811305930102A24BA35BE6A00E1"
}
```

## Date Range Notes

- **`start_date_ge`**: Greater than or equal to (inclusive)
- **`end_date_lt`**: Less than (exclusive)

For a single date query:
- `start_date_ge`: `2025-12-21`
- `end_date_lt`: `2025-12-22` (next day)

This will return data for December 21, 2025 only.

## Important Notes

1. **Data Availability**: Check `latest_available_date` in the response to see the most recent date with available data. Data for future dates or very recent dates may not be finalized yet.

2. **Token Expiration**: Access tokens expire. If you receive a 401 error, you need to refresh the token using the refresh token flow.

3. **Rate Limiting**: Be mindful of API rate limits. Add delays between requests if making multiple calls.

4. **Signature Generation**: The signature must be generated with all query parameters sorted alphabetically (excluding `sign` itself).

5. **Timestamp**: The timestamp used in the signature generation should match the timestamp in the query parameters.

## Working Example Script

See `fetch-gmv.js` in the project root for a complete working example that:
- Loads credentials from `.env`
- Generates signatures automatically
- Handles errors gracefully
- Saves responses to JSON files

## Related Files

- `fetch-gmv.js` - Single shop GMV fetcher
- `fetch-gmv-all-shops.js` - All shops GMV fetcher
- `.env` - Credentials configuration

## References

- TikTok Shop API Documentation: https://partner.tiktokshop.com/doc
- tiktok-shop npm package: https://www.npmjs.com/package/tiktok-shop

