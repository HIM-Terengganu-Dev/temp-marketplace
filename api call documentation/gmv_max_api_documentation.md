# TikTok GMV Max API - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Campaign Management](#campaign-management)
5. [Reporting & Analytics](#reporting--analytics)
6. [Available Metrics](#available-metrics)
7. [Dimensions](#dimensions)
8. [Examples](#examples)
9. [Common Use Cases](#common-use-cases)
10. [Troubleshooting](#troubleshooting)

---

## Overview

TikTok GMV Max is a campaign type designed to maximize Gross Merchandise Value (GMV) for TikTok Shop sellers. There are two types of GMV Max campaigns:

- **PRODUCT_GMV_MAX**: Optimizes for product sales through product cards and video ads
- **LIVE_GMV_MAX**: Optimizes for live streaming sales

The GMV Max API allows you to:
- List and manage GMV Max campaigns
- Retrieve performance reports with cost, revenue, and ROI data
- Get campaign-level and daily breakdowns

**Base URL:** `https://business-api.tiktok.com`

---

## Authentication

All API requests require authentication using an Access Token in the request header.

### Header Format
```
Access-Token: YOUR_ACCESS_TOKEN
Content-Type: application/json
```

### Getting Access Token
Access tokens are obtained through TikTok Marketing API OAuth flow. Store your access token securely and include it in every request.

---

## API Endpoints

### 1. Get GMV Max Campaigns

**Endpoint:** `/open_api/v1.3/gmv_max/campaign/get/`

**Method:** `GET`

**Description:** Retrieves a list of GMV Max campaigns filtered by promotion type.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `advertiser_id` | string | Yes | Your TikTok advertiser ID |
| `filtering` | JSON string | Yes | Filter object (see below) |
| `page` | integer | No | Page number (default: 1) |
| `page_size` | integer | No | Items per page (default: 10, max: 100) |

#### Filtering Object

```json
{
  "gmv_max_promotion_types": ["PRODUCT_GMV_MAX"]  // or ["LIVE_GMV_MAX"] or both
}
```

#### Example Request

```bash
curl --location --request GET \
'https://business-api.tiktok.com/open_api/v1.3/gmv_max/campaign/get/?advertiser_id=YOUR_ADVERTISER_ID&filtering={"gmv_max_promotion_types":["PRODUCT_GMV_MAX"]}&page=1&page_size=100' \
--header 'Access-Token: YOUR_ACCESS_TOKEN'
```

#### Example Response

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "list": [
      {
        "campaign_id": "1838876261133522",
        "campaign_name": "HIMC 3 + FREE GIFT",
        "advertiser_id": "7505228077656621057",
        "operation_status": "ENABLE",
        "secondary_status": "CAMPAIGN_STATUS_ENABLE",
        "objective_type": "PRODUCT_SALES",
        "create_time": "2025-07-28 07:51:19",
        "modify_time": "2025-11-22 09:22:12",
        "roi_protection_compensation_status": "IN_EFFECT"
      }
    ],
    "page_info": {
      "page": 1,
      "page_size": 10,
      "total_page": 1,
      "total_number": 5
    }
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `campaign_id` | string | Unique campaign identifier |
| `campaign_name` | string | Campaign name |
| `operation_status` | string | Campaign status: `ENABLE` or `DISABLE` |
| `secondary_status` | string | Detailed status (e.g., `CAMPAIGN_STATUS_ENABLE`) |
| `objective_type` | string | Campaign objective (typically `PRODUCT_SALES`) |
| `create_time` | string | Campaign creation timestamp |
| `modify_time` | string | Last modification timestamp |

**Note:** This endpoint supports pagination. Always check `page_info.total_page` and fetch all pages to get complete campaign lists.

---

### 2. Get GMV Max Report

**Endpoint:** `/open_api/v1.3/gmv_max/report/get/`

**Method:** `GET`

**Description:** Retrieves performance data for GMV Max campaigns with cost, revenue, and ROI metrics.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `advertiser_id` | string | Yes | Your TikTok advertiser ID |
| `store_ids` | JSON array | Yes | Array of shop/store IDs: `["7495609155379170274"]` |
| `gmv_max_promotion_type` | string | Yes | `PRODUCT_GMV_MAX` or `LIVE_GMV_MAX` |
| `dimensions` | JSON array | Yes | Dimensions for grouping (see Dimensions section) |
| `metrics` | JSON array | Yes | Metrics to retrieve (see Metrics section) |
| `start_date` | string | Yes | Start date in `YYYY-MM-DD` format |
| `end_date` | string | Yes | End date in `YYYY-MM-DD` format |
| `page` | integer | No | Page number (default: 1) |
| `page_size` | integer | No | Items per page (default: 100, max: 1000) |

#### Example Request

```bash
curl --location --request GET \
'https://business-api.tiktok.com/open_api/v1.3/gmv_max/report/get/?advertiser_id=YOUR_ADVERTISER_ID&store_ids=["YOUR_SHOP_ID"]&gmv_max_promotion_type=PRODUCT_GMV_MAX&dimensions=["stat_time_day","campaign_id"]&metrics=["cost","orders","gross_revenue","roi"]&start_date=2025-12-25&end_date=2025-12-25&page_size=1000' \
--header 'Access-Token: YOUR_ACCESS_TOKEN'
```

#### Example Response

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "list": [
      {
        "dimensions": {
          "stat_time_day": "2025-12-25 00:00:00",
          "campaign_id": "1838876261133522"
        },
        "metrics": {
          "cost": "368.04",
          "orders": "8",
          "gross_revenue": "1640.89",
          "roi": "4.46",
          "cost_per_order": "46.01",
          "net_cost": "368.04"
        }
      }
    ],
    "page_info": {
      "page": 1,
      "page_size": 1000,
      "total_number": 33,
      "total_page": 1
    }
  }
}
```

#### Important Notes

1. **Dimensions Requirement:** GMV Max reports require at least one main dimension (besides `stat_time_day` or `stat_time_hour`). Common combinations:
   - `["stat_time_day", "campaign_id"]` - Daily campaign breakdown
   - `["stat_time_day"]` - Daily aggregate (requires additional main dimension)

2. **Store IDs:** The `store_ids` parameter is required and must match the shop ID from TikTok Seller Center. This links the Marketing API data to your shop.

3. **Date Range:** Maximum date range is typically 93 days. For longer periods, make multiple requests.

---

## Available Metrics

The following metrics are available in GMV Max reports:

### Cost Metrics

| Metric | Description | Unit |
|--------|-------------|------|
| `cost` | Total ad spend/cost | Currency (e.g., MYR) |
| `net_cost` | Net cost (usually same as cost) | Currency |

### Performance Metrics

| Metric | Description | Unit |
|--------|-------------|------|
| `orders` | Number of orders | Count |
| `cost_per_order` | Average cost per order | Currency |
| `gross_revenue` | Total revenue/GMV generated | Currency |
| `roi` | Return on Investment (revenue/cost) | Ratio |

### Example Metrics Array

```json
["cost", "orders", "gross_revenue", "roi", "cost_per_order", "net_cost"]
```

**Note:** Not all standard Marketing API metrics are available. Metrics like `impressions`, `clicks`, `spend`, `billed_cost` are **NOT** available in GMV Max reports.

---

## Dimensions

Dimensions determine how data is grouped in the report.

### Available Dimensions

| Dimension | Description | Use Case |
|-----------|-------------|----------|
| `stat_time_day` | Date (daily) | Required for time-based reports |
| `stat_time_hour` | Date and hour | Hourly breakdown |
| `campaign_id` | Campaign identifier | Campaign-level breakdown |

### Dimension Requirements

1. **Time Dimension:** Must include either `stat_time_day` or `stat_time_hour`
2. **Main Dimension:** Must include at least 1-3 main dimensions (excluding time dimensions)
3. **Common Combinations:**
   - `["stat_time_day", "campaign_id"]` - Daily campaign performance
   - `["stat_time_day"]` - Daily aggregate (may require additional dimension)

### Example Dimensions Array

```json
["stat_time_day", "campaign_id"]
```

---

## Examples

### Example 1: Get All Product GMV Max Campaigns

```javascript
const advertiserId = '7505228077656621057';
const accessToken = 'YOUR_ACCESS_TOKEN';

// Fetch all pages
async function getAllProductGMVMaxCampaigns() {
  const allCampaigns = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      filtering: JSON.stringify({ gmv_max_promotion_types: ['PRODUCT_GMV_MAX'] }),
      page: page.toString(),
      page_size: '100'
    });
    
    const url = `https://business-api.tiktok.com/open_api/v1.3/gmv_max/campaign/get/?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.code === 0 && data.data && data.data.list) {
      allCampaigns.push(...data.data.list);
      
      const pageInfo = data.data.page_info;
      if (page >= pageInfo.total_page) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }
  
  return allCampaigns;
}
```

### Example 2: Get Daily Cost and Revenue by Campaign

```javascript
async function getGMVMaxReport(advertiserId, shopId, promotionType, startDate, endDate) {
  const params = new URLSearchParams({
    advertiser_id: advertiserId,
    store_ids: JSON.stringify([shopId]),
    gmv_max_promotion_type: promotionType,
    dimensions: JSON.stringify(['stat_time_day', 'campaign_id']),
    metrics: JSON.stringify(['cost', 'orders', 'gross_revenue', 'roi', 'cost_per_order']),
    start_date: startDate,
    end_date: endDate,
    page_size: '1000'
  });
  
  const url = `https://business-api.tiktok.com/open_api/v1.3/gmv_max/report/get/?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Access-Token': accessToken,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (data.code === 0 && data.data && data.data.list) {
    return data.data.list;
  }
  
  throw new Error(data.message || 'Failed to fetch report');
}

// Usage
const reportData = await getGMVMaxReport(
  '7505228077656621057',
  '7495609155379170274',
  'PRODUCT_GMV_MAX',
  '2025-12-25',
  '2025-12-25'
);
```

### Example 3: Complete Workflow - Get Campaigns with Revenue Data

```javascript
async function getCompleteGMVMaxData(advertiserId, shopId, date) {
  // Step 1: Get all campaigns
  const productCampaigns = await getAllCampaigns('PRODUCT_GMV_MAX');
  const liveCampaigns = await getAllCampaigns('LIVE_GMV_MAX');
  
  // Create campaign map
  const campaignMap = new Map();
  [...productCampaigns, ...liveCampaigns].forEach(c => {
    campaignMap.set(c.campaign_id, c);
  });
  
  // Step 2: Get report data
  const productReport = await getGMVMaxReport(
    advertiserId, shopId, 'PRODUCT_GMV_MAX', date, date
  );
  const liveReport = await getGMVMaxReport(
    advertiserId, shopId, 'LIVE_GMV_MAX', date, date
  );
  
  // Step 3: Enrich report data with campaign names
  const enrichedData = [...productReport, ...liveReport].map(item => {
    const campaign = campaignMap.get(item.dimensions.campaign_id);
    return {
      ...item,
      campaign_name: campaign?.campaign_name || 'Unknown',
      gmv_max_type: campaign?.gmv_max_type || 'UNKNOWN',
      operation_status: campaign?.operation_status || 'Unknown'
    };
  });
  
  return enrichedData;
}
```

---

## Common Use Cases

### Use Case 1: Daily Performance Dashboard

**Goal:** Get daily cost, revenue, and ROI for all GMV Max campaigns

```javascript
// Get data for a date range
const startDate = '2025-12-21';
const endDate = '2025-12-27';

const productData = await getGMVMaxReport(
  advertiserId, shopId, 'PRODUCT_GMV_MAX', startDate, endDate
);
const liveData = await getGMVMaxReport(
  advertiserId, shopId, 'LIVE_GMV_MAX', startDate, endDate
);

// Aggregate totals
const totals = {
  cost: 0,
  revenue: 0,
  orders: 0
};

[...productData, ...liveData].forEach(item => {
  totals.cost += parseFloat(item.metrics.cost || 0);
  totals.revenue += parseFloat(item.metrics.gross_revenue || 0);
  totals.orders += parseInt(item.metrics.orders || 0);
});

totals.roi = totals.cost > 0 ? totals.revenue / totals.cost : 0;
```

### Use Case 2: Campaign Performance Comparison

**Goal:** Compare performance across different campaigns

```javascript
// Get campaign-level data
const reportData = await getGMVMaxReport(
  advertiserId, shopId, 'PRODUCT_GMV_MAX', '2025-12-25', '2025-12-25'
);

// Group by campaign
const campaignPerformance = {};
reportData.forEach(item => {
  const campaignId = item.dimensions.campaign_id;
  if (!campaignPerformance[campaignId]) {
    campaignPerformance[campaignId] = {
      cost: 0,
      revenue: 0,
      orders: 0
    };
  }
  
  campaignPerformance[campaignId].cost += parseFloat(item.metrics.cost || 0);
  campaignPerformance[campaignId].revenue += parseFloat(item.metrics.gross_revenue || 0);
  campaignPerformance[campaignId].orders += parseInt(item.metrics.orders || 0);
});

// Calculate ROI for each campaign
Object.keys(campaignPerformance).forEach(campaignId => {
  const perf = campaignPerformance[campaignId];
  perf.roi = perf.cost > 0 ? perf.revenue / perf.cost : 0;
  perf.cost_per_order = perf.orders > 0 ? perf.cost / perf.orders : 0;
});
```

### Use Case 3: Extract Account Names from Live Campaigns

**Goal:** Extract TikTok Shop live account names from campaign names

```javascript
function extractAccountName(campaignName) {
  if (!campaignName) return '';
  // Campaign names often contain account names in brackets: [AccountName]
  const match = campaignName.match(/\[([^\]]+)\]/);
  return match ? match[1] : '';
}

// Usage
const liveCampaigns = await getAllCampaigns('LIVE_GMV_MAX');
liveCampaigns.forEach(campaign => {
  const accountName = extractAccountName(campaign.campaign_name);
  console.log(`Campaign: ${campaign.campaign_name}`);
  console.log(`Account: ${accountName}`);
});
```

---

## Troubleshooting

### Issue 1: "Unknown" Campaign Names

**Problem:** Campaign names appear as "Unknown" in reports.

**Cause:** Not fetching all pages of campaigns from the campaign list endpoint.

**Solution:** Always implement pagination when fetching campaigns:

```javascript
// ❌ Wrong - Only gets first page
const response = await fetch(campaignUrl);
const data = await response.json();
const campaigns = data.data.list; // Only first 10-100 campaigns

// ✅ Correct - Gets all pages
let allCampaigns = [];
let page = 1;
let hasMore = true;

while (hasMore) {
  const response = await fetch(`${campaignUrl}&page=${page}`);
  const data = await response.json();
  allCampaigns.push(...data.data.list);
  
  if (page >= data.data.page_info.total_page) {
    hasMore = false;
  } else {
    page++;
  }
}
```

### Issue 2: "Invalid metric(s)" Error

**Problem:** API returns error about invalid metrics.

**Cause:** Using metrics that are not available in GMV Max reports.

**Solution:** Only use supported metrics:
- ✅ Available: `cost`, `orders`, `gross_revenue`, `roi`, `cost_per_order`, `net_cost`
- ❌ Not Available: `spend`, `impressions`, `clicks`, `billed_cost`, `gmv_max_ads_spend`

### Issue 3: "GMV Max Report must have 1-3 main dimensions" Error

**Problem:** API requires additional dimensions.

**Cause:** Only providing time dimension without main dimensions.

**Solution:** Include at least one main dimension:
```javascript
// ❌ Wrong
dimensions: ["stat_time_day"]

// ✅ Correct
dimensions: ["stat_time_day", "campaign_id"]
```

### Issue 4: "store_ids: parameter is required" Error

**Problem:** Missing store_ids parameter.

**Cause:** Forgot to include shop ID in request.

**Solution:** Always include store_ids:
```javascript
store_ids: JSON.stringify(["7495609155379170274"])
```

### Issue 5: Rate Limiting

**Problem:** "Too many requests" error.

**Cause:** Making too many API calls in a short time.

**Solution:** Implement rate limiting with delays:
```javascript
async function fetchWithDelay(url, delay = 500) {
  await new Promise(resolve => setTimeout(resolve, delay));
  return fetch(url);
}
```

---

## Best Practices

1. **Always Paginate:** Campaign lists are paginated. Always fetch all pages to get complete data.

2. **Cache Campaign Data:** Campaign names don't change frequently. Cache campaign lists to reduce API calls.

3. **Handle Errors Gracefully:** Check `code` field in responses. `code: 0` means success.

4. **Use Appropriate Date Ranges:** Maximum date range is 93 days. Break longer periods into multiple requests.

5. **Store IDs Correctly:** Ensure shop IDs match between Seller Center and Marketing API.

6. **Extract Account Names:** For Live GMV Max campaigns, account names are often in campaign names within brackets `[AccountName]`.

7. **Validate Metrics:** Only use metrics confirmed to work with GMV Max reports.

---

## API Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | Success | Process the data |
| 40002 | Invalid parameter | Check parameter format and values |
| 40003 | Missing required parameter | Add missing parameter |
| 40101 | Invalid access token | Refresh access token |
| 50001 | Internal server error | Retry request |
| 50002 | Service unavailable | Retry after delay |

---

## Rate Limits

- **Campaign List:** ~10 requests per minute
- **Report:** ~5 requests per minute
- **Recommendation:** Implement delays between requests (500ms-1000ms)

---

## Data Retention

- **Campaign Data:** Available for active and recently disabled campaigns
- **Report Data:** Historical data available for up to 2 years
- **Real-time Data:** May have 1-3 hour delay

---

## Support & Resources

- **TikTok Marketing API Documentation:** https://ads.tiktok.com/marketing_api/docs
- **TikTok Seller Center API:** https://developers.tiktok-shops.com/
- **API Status:** Check TikTok API status page for outages

---

## Version History

- **v1.3** (Current): GMV Max report endpoint with `gross_revenue` metric
- **v1.2**: Initial GMV Max campaign endpoint
- **v1.1**: Basic campaign management

---

## Appendix: Complete Example Script

```javascript
require('dotenv').config();

const accessToken = process.env.TIKTOK_ADS_ACCOUNT1_ACCESS_TOKEN;
const advertiserId = '7505228077656621057';
const shopId = '7495609155379170274';
const baseUrl = 'https://business-api.tiktok.com';

// Fetch all campaigns with pagination
async function getAllCampaigns(promotionType) {
  const allCampaigns = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      filtering: JSON.stringify({ gmv_max_promotion_types: [promotionType] }),
      page: page.toString(),
      page_size: '100'
    });
    
    const url = `${baseUrl}/open_api/v1.3/gmv_max/campaign/get/?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.code === 0 && data.data && data.data.list) {
      allCampaigns.push(...data.data.list);
      
      const pageInfo = data.data.page_info;
      if (page >= pageInfo.total_page) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }
  
  return allCampaigns;
}

// Get report data
async function getGMVMaxReport(promotionType, startDate, endDate) {
  const params = new URLSearchParams({
    advertiser_id: advertiserId,
    store_ids: JSON.stringify([shopId]),
    gmv_max_promotion_type: promotionType,
    dimensions: JSON.stringify(['stat_time_day', 'campaign_id']),
    metrics: JSON.stringify(['cost', 'orders', 'gross_revenue', 'roi', 'cost_per_order', 'net_cost']),
    start_date: startDate,
    end_date: endDate,
    page_size: '1000'
  });
  
  const url = `${baseUrl}/open_api/v1.3/gmv_max/report/get/?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Access-Token': accessToken,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (data.code === 0 && data.data && data.data.list) {
    return data.data.list;
  }
  
  throw new Error(data.message || 'Failed to fetch report');
}

// Main function
async function main() {
  // Get all campaigns
  const productCampaigns = await getAllCampaigns('PRODUCT_GMV_MAX');
  const liveCampaigns = await getAllCampaigns('LIVE_GMV_MAX');
  
  // Create campaign map
  const campaignMap = new Map();
  [...productCampaigns, ...liveCampaigns].forEach(c => {
    campaignMap.set(c.campaign_id, c);
  });
  
  // Get report data
  const productReport = await getGMVMaxReport('PRODUCT_GMV_MAX', '2025-12-25', '2025-12-25');
  const liveReport = await getGMVMaxReport('LIVE_GMV_MAX', '2025-12-25', '2025-12-25');
  
  // Enrich with campaign names
  const allData = [...productReport, ...liveReport].map(item => {
    const campaign = campaignMap.get(item.dimensions.campaign_id);
    return {
      date: item.dimensions.stat_time_day,
      campaign_id: item.dimensions.campaign_id,
      campaign_name: campaign?.campaign_name || 'Unknown',
      cost: item.metrics.cost,
      orders: item.metrics.orders,
      gross_revenue: item.metrics.gross_revenue,
      roi: item.metrics.roi
    };
  });
  
  console.log('Total records:', allData.length);
  console.log('Sample:', allData[0]);
}

main().catch(console.error);
```

---

**Last Updated:** December 29, 2025  
**API Version:** v1.3

