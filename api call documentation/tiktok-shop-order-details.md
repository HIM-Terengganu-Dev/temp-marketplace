# TikTok Shop API - Order Details (Get Order by ID)

This document describes how to call the TikTok Shop API to retrieve detailed information for specific orders by their IDs.

## Overview

The Order Details API endpoint allows you to retrieve detailed information for one or more specific orders when you know their order IDs.

**Endpoint**: `/order/202507/orders`  
**Method**: `GET`  
**Base URL**: `https://open-api.tiktokglobalshop.com`

## Prerequisites

### Required Credentials

You need the following credentials from your `.env` file:

- `TIKTOK_SHOP_APP_KEY` - Your TikTok Shop application key
- `TIKTOK_SHOP_APP_SECRET` - Your TikTok Shop application secret
- `TIKTOK_SHOP1_ACCESS_TOKEN` - OAuth access token for the shop
- `TIKTOK_SHOP1_SHOP_CIPHER` - Shop cipher identifier

## Authentication

This API uses **dual authentication**:

1. **OAuth Bearer Token** - Sent in the `x-tts-access-token` header
2. **Signature-based Authentication** - Requires `app_key`, `app_secret`, and a generated signature

## Request Parameters

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `access_token` | string | Yes | OAuth access token for the shop |
| `app_key` | string | Yes | Your TikTok Shop application key |
| `shop_cipher` | string | Yes | Shop cipher identifier |
| `shop_id` | string | Yes | Shop ID (can be empty string) |
| `ids` | string | Yes | Comma-separated list of order IDs |
| `version` | string | Yes | API version (`202507`) |
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
  'https://open-api.tiktokglobalshop.com/order/202507/orders?access_token=YOUR_ACCESS_TOKEN&app_key=YOUR_APP_KEY&ids=581850656786974668&shop_cipher=YOUR_SHOP_CIPHER&shop_id=&sign=GENERATED_SIGNATURE&timestamp=1766895398&version=202507'
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

const baseUrl = 'https://open-api.tiktokglobalshop.com';
const endpoint = '/order/202507/orders';
const version = '202507';

// Order IDs (comma-separated)
const orderIds = '581850656786974668'; // Single ID or multiple: 'ID1,ID2,ID3'

// Build query parameters
const queryParams = {
  access_token: accessToken,
  app_key: appKey,
  shop_cipher: shopCipher,
  shop_id: '',
  ids: orderIds,
  version: version
};

// Build query string for signature
const sortedKeys = Object.keys(queryParams).sort();
const queryString = sortedKeys
  .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
  .join('&');

const urlForSignature = `${baseUrl}${endpoint}?${queryString}`;

// Generate signature (no body for GET request)
const signatureResult = tiktokShop.signByUrl(urlForSignature, appSecret, {});

// Add signature and timestamp
queryParams.sign = signatureResult.signature;
queryParams.timestamp = signatureResult.timestamp;

// Build final query string
const finalSortedKeys = Object.keys(queryParams).sort();
const finalQueryString = finalSortedKeys
  .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
  .join('&');

const finalUrl = `${baseUrl}${endpoint}?${finalQueryString}`;

// Make request
const headers = {
  'x-tts-access-token': accessToken
};

const response = await axios.get(finalUrl, { headers });
```

## Response Format

The response format is similar to the Order Search API, returning detailed order information. The structure includes:

- Order identification (ID, status, timestamps)
- Buyer information
- Line items with product details
- Payment information
- Shipping address
- Delivery and tracking information
- Package information

### Example Response Structure

```json
{
  "code": 0,
  "data": {
    "orders": [
      {
        "id": "581850656786974668",
        "status": "COMPLETED",
        "create_time": 1709384720,
        "update_time": 1709405634,
        "buyer_email": "...",
        "line_items": [...],
        "payment": {...},
        "recipient_address": {...},
        "shipping_provider": "J&T Express",
        "tracking_number": "687005130197",
        "packages": [...]
      }
    ]
  },
  "message": "Success",
  "request_id": "..."
}
```

## Multiple Order IDs

You can retrieve multiple orders at once by providing comma-separated order IDs:

```javascript
const orderIds = '581850656786974668,581850656786974669,581850656786974670';
```

The API will return all matching orders in the response.

## Error Responses

### Common Error Codes

| Code | Message | Description |
|------|---------|-------------|
| `36009004` | Invalid credentials / Ids is a required field | Missing or invalid `ids` parameter |
| `36009009` | Invalid path | Incorrect endpoint URL |
| `36009010` | Invalid method | Wrong HTTP method (should be GET) |
| `401` | Expired credentials | Access token needs to be refreshed |

## Important Notes

1. **Single vs Multiple IDs**: You can pass one or multiple order IDs (comma-separated)

2. **No Pagination**: This endpoint doesn't support pagination since it retrieves specific orders by ID

3. **Order Not Found**: If an order ID doesn't exist or doesn't belong to your shop, it will not be included in the response (no error thrown)

4. **Use Case**: This endpoint is best used when you already know the order IDs, not for searching or listing orders

5. **Performance**: For retrieving multiple orders, this endpoint is more efficient than making individual API calls

## Comparison with Order Search Endpoint

| Feature | Order Details (202507) | Order Search (202309) |
|---------|----------------------|---------------------|
| **Method** | GET | POST |
| **Parameters** | Query string | Request body |
| **Use Case** | Known order IDs | Search/filter orders |
| **Pagination** | No | Yes |
| **Filtering** | No | Yes |
| **Sorting** | No | Yes |

## Related Endpoints

- **[Order Search API](./tiktok-shop-orders-search.md)** - Search and list orders with filters
- **[Order Endpoints Comparison](./tiktok-shop-order-endpoints-comparison.md)** - Compare different order endpoints

## References

- TikTok Shop API Documentation: https://partner.tiktokshop.com/doc
- tiktok-shop npm package: https://www.npmjs.com/package/tiktok-shop

