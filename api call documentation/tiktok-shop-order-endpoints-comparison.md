# TikTok Shop API - Order Endpoints Comparison

This document compares two TikTok Shop order endpoints and explains their key differences.

## Overview

| Endpoint | Version | Method | Purpose |
|----------|---------|--------|---------|
| `/order/202309/orders/search` | 202309 (Sept 2023) | POST | Search and filter orders with criteria |
| `/order/202507/orders` | 202507 (July 2025) | GET | Retrieve specific orders by ID |

## Key Differences

### 1. `/order/202309/orders/search` (Older Version)

**Purpose**: Search and filter orders based on various criteria

**HTTP Method**: `POST`

**Base URL**: `https://open-api.tiktokglobalshop.com`

**Request Structure**:
- **Authentication**: 
  - Header: `x-tts-access-token`
  - Query params: `access_token`, `app_key`, `shop_cipher`, `sign`, `timestamp`, `version`
- **Body Parameters**: JSON object with search criteria

**Required Parameters (Body)**:
- `PageSize` - Number of results per page (case-sensitive)

**Optional Parameters (Body)**:
- `SortOrder` - Sort direction (ASC/DESC)
- `SortField` - Field to sort by (e.g., CREATE_TIME)
- Date range filters
- Status filters
- Other search criteria

**Example Request**:
```javascript
const body = {
  PageSize: 10,
  SortOrder: 'DESC',
  SortField: 'CREATE_TIME'
};

// POST request with body
const response = await axios.post(url, body, { headers });
```

**Use Case**: 
- Search orders by date range
- Filter orders by status
- Get paginated list of orders with sorting
- General order discovery and search

---

### 2. `/order/202507/orders` (Newer Version)

**Purpose**: Retrieve specific orders when you already know the order IDs

**HTTP Method**: `GET`

**Base URL**: `https://open-api.tiktokglobalshop.com`

**Request Structure**:
- **Authentication**: 
  - Header: `x-tts-access-token`
  - Query params: `access_token`, `app_key`, `shop_cipher`, `sign`, `timestamp`, `version`
- **Query Parameters**: Order IDs passed as query parameters

**Required Parameters (Query)**:
- `ids` - Comma-separated list of order IDs

**Example Request**:
```javascript
const queryParams = {
  ids: 'ORDER_ID_1,ORDER_ID_2,ORDER_ID_3'
};

// GET request with query parameters
const response = await axios.get(url, { params: queryParams, headers });
```

**Use Case**:
- Get details of specific orders you already know
- Retrieve order information for known order IDs
- Batch retrieval of specific orders

---

## Detailed Comparison Table

| Feature | `/order/202309/orders/search` | `/order/202507/orders` |
|---------|-------------------------------|------------------------|
| **API Version** | 202309 (Sept 2023) | 202507 (July 2025) |
| **HTTP Method** | POST | GET |
| **Endpoint Type** | Search/Filter | Retrieve by ID |
| **Parameters Location** | Request Body | Query String |
| **Primary Use** | Find orders with criteria | Get known orders |
| **Pagination** | Supported (via PageSize) | Not applicable |
| **Sorting** | Supported | Not applicable |
| **Filtering** | Multiple filter options | None (ID-based only) |
| **Required Parameter** | PageSize (in body) | ids (in query) |
| **When to Use** | When you need to search/filter orders | When you have specific order IDs |

## When to Use Which Endpoint

### Use `/order/202309/orders/search` when:
- ✅ You need to find orders based on criteria (date range, status, etc.)
- ✅ You want to list orders with pagination
- ✅ You need to sort orders
- ✅ You're doing general order discovery
- ✅ You don't know the specific order IDs

### Use `/order/202507/orders` when:
- ✅ You already have specific order IDs
- ✅ You need to retrieve details for known orders
- ✅ You're doing batch lookups of specific orders
- ✅ You don't need search/filter functionality

## Important Notes

1. **Not Interchangeable**: These endpoints serve different purposes and cannot be used as replacements for each other.

2. **API Versioning**: The version numbers (202309 vs 202507) indicate when the API version was released. Newer versions may have:
   - Different features
   - Different parameter requirements
   - Different response formats
   - Performance improvements

3. **Authentication**: Both endpoints use the same authentication method:
   - OAuth Bearer token in `x-tts-access-token` header
   - Signature-based authentication with `app_key`, `app_secret`, and generated signature

4. **Parameter Naming**: The 202309 endpoint uses PascalCase for body parameters (e.g., `PageSize`), while query parameters typically use snake_case.

5. **Future Considerations**: Always check the latest API documentation to see if newer versions are available or if endpoints have been deprecated.

## Authentication Example

Both endpoints require the same authentication setup:

```javascript
const tiktokShop = require('tiktok-shop');
require('dotenv').config();

const accessToken = process.env.TIKTOK_SHOP1_ACCESS_TOKEN;
const shopCipher = process.env.TIKTOK_SHOP1_SHOP_CIPHER;
const appKey = process.env.TIKTOK_SHOP_APP_KEY;
const appSecret = process.env.TIKTOK_SHOP_APP_SECRET;

// Build query parameters for signature
const queryParams = {
  access_token: accessToken,
  app_key: appKey,
  shop_cipher: shopCipher,
  shop_id: '',
  version: '202309' // or '202507' depending on endpoint
};

// Generate signature
const urlForSignature = `${baseUrl}${endpoint}?${queryString}`;
const signatureResult = tiktokShop.signByUrl(urlForSignature, appSecret, body || {});

// Add signature and timestamp
queryParams.sign = signatureResult.signature;
queryParams.timestamp = signatureResult.timestamp;

// Headers
const headers = {
  'x-tts-access-token': accessToken,
  'Content-Type': 'application/json'
};
```

## Error Codes

Both endpoints may return similar error codes:

| Code | Message | Description |
|------|---------|-------------|
| `36009004` | Invalid credentials / Missing required field | Missing or invalid parameters |
| `36009009` | Invalid path | Incorrect endpoint URL |
| `36009010` | Invalid method | Wrong HTTP method used |
| `401` | Expired credentials | Access token needs refresh |

## Related Documentation

For detailed implementation guides:

- **[Order Search API Documentation](./tiktok-shop-orders-search.md)** - Complete guide for `/order/202309/orders/search`
- **[Order Details API Documentation](./tiktok-shop-order-details.md)** - Complete guide for `/order/202507/orders`

## References

- TikTok Shop API Documentation: https://partner.tiktokshop.com/doc
- tiktok-shop npm package: https://www.npmjs.com/package/tiktok-shop
- See [GMV Performance API Documentation](./tiktok-shop-gmv-performance.md) for similar endpoint examples

