# TikTok Shop API - Order Search (Get Order List)

This document describes how to call the TikTok Shop API to search and retrieve a list of orders.

## Overview

The Order Search API endpoint allows you to retrieve a paginated list of orders with filtering and sorting capabilities.

**Endpoint**: `/order/202309/orders/search`  
**Method**: `POST`  
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
| `version` | string | Yes | API version (`202309`) |
| `timestamp` | integer | Yes | Unix timestamp in seconds (generated automatically) |
| `sign` | string | Yes | Generated signature (generated automatically) |

### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `PageSize` | integer | Yes | Number of orders per page |
| `SortOrder` | string | No | Sort direction: `ASC` or `DESC` (default: `DESC`) |
| `SortField` | string | No | Field to sort by (e.g., `CREATE_TIME`) |
| `CreateTimeFrom` | integer | No | Start timestamp for order creation time filter |
| `CreateTimeTo` | integer | No | End timestamp for order creation time filter |
| `UpdateTimeFrom` | integer | No | Start timestamp for order update time filter |
| `UpdateTimeTo` | integer | No | End timestamp for order update time filter |
| `OrderStatus` | string | No | Filter by order status |
| `PackageStatus` | string | No | Filter by package status |
| `NextPageToken` | string | No | Token for pagination (from previous response) |

### Headers

| Header | Value | Required |
|--------|-------|----------|
| `x-tts-access-token` | OAuth access token | Yes |
| `Content-Type` | `application/json` | Yes |

## Example Request

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
const endpoint = '/order/202309/orders/search';
const version = '202309';

// Build query parameters
const queryParams = {
  access_token: accessToken,
  app_key: appKey,
  shop_cipher: shopCipher,
  shop_id: '',
  version: version
};

// Build query string for signature
const sortedKeys = Object.keys(queryParams).sort();
const queryString = sortedKeys
  .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
  .join('&');

const urlForSignature = `${baseUrl}${endpoint}?${queryString}`;

// Request body
const requestBody = {
  PageSize: 10,
  SortOrder: 'DESC',
  SortField: 'CREATE_TIME'
};

// Generate signature (body is included in signature)
const signatureResult = tiktokShop.signByUrl(urlForSignature, appSecret, requestBody);

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
  'x-tts-access-token': accessToken,
  'Content-Type': 'application/json'
};

const response = await axios.post(finalUrl, requestBody, { headers });
```

## Response Format

### Success Response

```json
{
  "code": 0,
  "data": {
    "next_page_token": "aDV5MHIyaVNaVTVJVEdGTStpNklidXEzaHY4NUJDVE5mTitwRnJmQ3F1T290UT09",
    "orders": [
      {
        "id": "576672422510560515",
        "status": "CANCELLED",
        "create_time": 1709384720,
        "update_time": 1709405634,
        "buyer_email": "v4bG2UXXVDVR62NCNTPMBCEFHVK2Y@scs2.tiktok.com",
        "buyer_message": "",
        "cancel_reason": "Need to change color or size",
        "cancel_time": 1709405634,
        "cancellation_initiator": "BUYER",
        "commerce_platform": "TIKTOK_SHOP",
        "delivery_option_id": "7057025459980076802",
        "delivery_option_name": "Standard shipping",
        "delivery_type": "HOME_DELIVERY",
        "fulfillment_type": "FULFILLMENT_BY_SELLER",
        "has_updated_recipient_address": false,
        "is_cod": false,
        "is_on_hold_order": false,
        "is_replacement_order": false,
        "is_sample_order": false,
        "order_type": "NORMAL",
        "line_items": [
          {
            "id": "576672422510691587",
            "product_id": "1729556489100298210",
            "product_name": "Him Coffee- Energy Booster...",
            "sku_id": "1729556497383196642",
            "sku_name": "Buy 1",
            "seller_sku": "COF1",
            "currency": "MYR",
            "original_price": "149",
            "sale_price": "119",
            "seller_discount": "30",
            "platform_discount": "0",
            "display_status": "CANCELLED",
            "cancel_reason": "Need to change color or size",
            "cancel_user": "BUYER"
          }
        ],
        "payment": {
          "currency": "MYR",
          "original_total_product_price": "149",
          "original_shipping_fee": "4.9",
          "sub_total": "119",
          "shipping_fee": "0",
          "seller_discount": "30",
          "platform_discount": "0",
          "shipping_fee_platform_discount": "4.9",
          "shipping_fee_seller_discount": "0",
          "tax": "0",
          "total_amount": "119"
        },
        "recipient_address": {
          "name": "A*** F***i",
          "phone_number": "(+60)113*****36",
          "full_address": "Malaysia, Perak, Lumut,BL**********************************",
          "address_detail": "BL**********************************",
          "postal_code": "32***",
          "region_code": "MY",
          "district_info": [
            {
              "address_level": "L0",
              "address_level_name": "Country",
              "address_name": "Malaysia",
              "iso_code": "MY"
            }
          ]
        },
        "shipping_type": "TIKTOK",
        "payment_method_name": "Internet Banking",
        "user_id": "7494690250735257859",
        "warehouse_id": "7336763380981860097"
      }
    ],
    "total_count": 43103
  },
  "message": "Success",
  "request_id": "20251228120440A34C454B71C6FD725364"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `code` | integer | Response code (0 = success) |
| `data.next_page_token` | string | Token for next page (if more results available) |
| `data.orders[]` | array | Array of order objects |
| `data.total_count` | integer | Total number of orders matching the criteria |
| `orders[].id` | string | Order ID |
| `orders[].status` | string | Order status (e.g., `CANCELLED`, `COMPLETED`, `UNPAID`) |
| `orders[].create_time` | integer | Order creation timestamp (Unix) |
| `orders[].update_time` | integer | Order last update timestamp (Unix) |
| `orders[].line_items[]` | array | Array of items in the order |
| `orders[].payment` | object | Payment information |
| `orders[].recipient_address` | object | Shipping address |
| `message` | string | Response message |
| `request_id` | string | Unique request ID |

### Order Status Values

Common order statuses include:
- `UNPAID` - Order not yet paid
- `AWAITING_SHIPMENT` - Paid, waiting for shipment
- `AWAITING_COLLECTION` - Ready for pickup
- `IN_TRANSIT` - Order in transit
- `DELIVERED` - Order delivered
- `COMPLETED` - Order completed
- `CANCELLED` - Order cancelled
- `REFUNDED` - Order refunded

## Pagination

To get the next page of results, include the `NextPageToken` from the previous response in the request body:

```javascript
const requestBody = {
  PageSize: 10,
  NextPageToken: response.data.data.next_page_token
};
```

If `next_page_token` is not present in the response, you've reached the last page.

## Error Responses

### Common Error Codes

| Code | Message | Description |
|------|---------|-------------|
| `36009004` | Invalid credentials / PageSize is a required field | Missing or invalid parameters |
| `36009009` | Invalid path | Incorrect endpoint URL |
| `36009010` | Invalid method | Wrong HTTP method (should be POST) |
| `401` | Expired credentials | Access token needs to be refreshed |

## Important Notes

1. **Case Sensitivity**: Request body parameters use PascalCase (e.g., `PageSize`, `SortOrder`)

2. **Pagination**: Use `next_page_token` from the response to get subsequent pages

3. **Filtering**: You can filter orders by:
   - Creation time range (`CreateTimeFrom`, `CreateTimeTo`)
   - Update time range (`UpdateTimeFrom`, `UpdateTimeTo`)
   - Order status (`OrderStatus`)
   - Package status (`PackageStatus`)

4. **Sorting**: Use `SortField` and `SortOrder` to sort results (e.g., by `CREATE_TIME`)

5. **Data Privacy**: Sensitive information like addresses and phone numbers are masked in the response

## Related Endpoints

- **[Order Details API](./tiktok-shop-order-details.md)** - Get detailed information for specific orders by ID
- **[Order Endpoints Comparison](./tiktok-shop-order-endpoints-comparison.md)** - Compare different order endpoints

## References

- TikTok Shop API Documentation: https://partner.tiktokshop.com/doc
- tiktok-shop npm package: https://www.npmjs.com/package/tiktok-shop

