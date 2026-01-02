# TikTok Manual Campaign Cost API - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Campaign Types](#campaign-types)
5. [Cost Metrics](#cost-metrics)
6. [Dimensions & Data Levels](#dimensions--data-levels)
7. [Examples](#examples)
8. [Common Use Cases](#common-use-cases)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Overview

TikTok Manual Campaigns (also called Regular Campaigns) are standard advertising campaigns that you manage manually. Unlike GMV Max campaigns, these campaigns use the standard Marketing API reporting endpoints.

This documentation focuses on retrieving **cost data** for manual campaigns, including:
- Ad spend (`spend`)
- Billed cost (`billed_cost`)
- Cost per click (CPC)
- Cost per mille (CPM)
- Other cost-related metrics

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

### 1. Get Integrated Report (Cost Data)

**Endpoint:** `/open_api/v1.3/report/integrated/get/`

**Method:** `GET`

**Description:** Retrieves performance data including cost metrics for campaigns, ad groups, or ads. This is the primary endpoint for getting cost data from manual campaigns.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `advertiser_id` | string | Yes | Your TikTok advertiser ID |
| `report_type` | string | Yes | Report type: `BASIC` or `AUDIENCE` |
| `data_level` | string | Yes | Data aggregation level (see Data Levels) |
| `dimensions` | JSON array | Yes | Dimensions for grouping (see Dimensions) |
| `metrics` | JSON array | Yes | Metrics to retrieve (see Metrics) |
| `start_date` | string | Yes | Start date in `YYYY-MM-DD` format |
| `end_date` | string | Yes | End date in `YYYY-MM-DD` format |
| `page` | integer | No | Page number (default: 1) |
| `page_size` | integer | No | Items per page (default: 100, max: 1000) |
| `filtering` | JSON object | No | Filter criteria (see Filtering) |

#### Example Request

```bash
curl --location --request GET \
'https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?advertiser_id=YOUR_ADVERTISER_ID&report_type=BASIC&data_level=AUCTION_CAMPAIGN&dimensions=["stat_time_day","campaign_id"]&metrics=["spend","billed_cost","impressions","clicks"]&start_date=2025-12-21&end_date=2025-12-27&page_size=1000' \
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
          "stat_time_day": "2025-12-21",
          "campaign_id": "1852272277112002"
        },
        "metrics": {
          "spend": "123.45",
          "billed_cost": "123.45",
          "impressions": "50000",
          "clicks": "1200",
          "ctr": "2.40",
          "cpm": "2.47",
          "cpc": "0.10"
        }
      }
    ],
    "page_info": {
      "page": 1,
      "page_size": 1000,
      "total_number": 89,
      "total_page": 1
    }
  }
}
```

---

## Campaign Types

Manual campaigns can have various objective types:

| Objective Type | Description |
|----------------|-------------|
| `REACH` | Maximize reach |
| `VIDEO_VIEWS` | Maximize video views |
| `TRAFFIC` | Drive website traffic |
| `CONVERSIONS` | Drive conversions |
| `ENGAGEMENT` | Maximize engagement |
| `LEAD_GENERATION` | Generate leads |
| `APP_INSTALL` | Drive app installs |
| `PRODUCT_SALES` | Drive product sales (non-GMV Max) |

**Note:** GMV Max campaigns use a different endpoint (`/open_api/v1.3/gmv_max/report/get/`). This documentation is for manual/regular campaigns only.

---

## Cost Metrics

### Primary Cost Metrics

| Metric | Description | Unit | Notes |
|--------|-------------|------|-------|
| `spend` | Total ad spend | Currency | **Primary cost metric** - This is the "Cost" column from Ads Manager |
| `billed_cost` | Amount actually billed | Currency | May differ from spend due to adjustments |
| `cost_per_conversion` | Cost per conversion | Currency | Only available if conversion tracking is set up |

### Cost Efficiency Metrics

| Metric | Description | Unit | Formula |
|--------|-------------|------|---------|
| `cpm` | Cost per mille (1000 impressions) | Currency | `spend / (impressions / 1000)` |
| `cpc` | Cost per click | Currency | `spend / clicks` |
| `ctr` | Click-through rate | Percentage | `(clicks / impressions) * 100` |

### Example Metrics Array

```json
["spend", "billed_cost", "impressions", "clicks", "ctr", "cpm", "cpc", "conversion", "cost_per_conversion"]
```

### Important Notes

1. **`spend` is the primary cost metric** - This matches the "Cost" column in TikTok Ads Manager
2. **`billed_cost`** may differ from `spend` due to billing adjustments
3. **Cost efficiency metrics** (`cpm`, `cpc`) are calculated automatically
4. **Conversion metrics** require conversion tracking setup

---

## Dimensions & Data Levels

### Data Levels

Data can be aggregated at different levels:

| Data Level | Description | Use Case |
|------------|-------------|----------|
| `AUCTION_AD` | Individual ad level | Most granular, ad-by-ad performance |
| `AUCTION_ADGROUP` | Ad group level | Ad group performance |
| `AUCTION_CAMPAIGN` | Campaign level | Campaign performance (most common) |
| `AUCTION_ADVERTISER` | Advertiser level | Account-wide totals |

### Available Dimensions

| Dimension | Description | Compatible Data Levels |
|-----------|-------------|----------------------|
| `stat_time_day` | Date (daily) | All levels |
| `stat_time_hour` | Date and hour | All levels |
| `campaign_id` | Campaign identifier | Campaign, AdGroup, Ad |
| `campaign_name` | Campaign name | Campaign, AdGroup, Ad |
| `adgroup_id` | Ad group identifier | AdGroup, Ad |
| `adgroup_name` | Ad group name | AdGroup, Ad |
| `ad_id` | Ad identifier | Ad |
| `ad_name` | Ad name | Ad |

### Common Dimension Combinations

```javascript
// Campaign-level daily breakdown
dimensions: ["stat_time_day", "campaign_id", "campaign_name"]

// Ad group-level daily breakdown
dimensions: ["stat_time_day", "campaign_id", "adgroup_id", "adgroup_name"]

// Ad-level daily breakdown
dimensions: ["stat_time_day", "campaign_id", "adgroup_id", "ad_id", "ad_name"]

// Daily aggregate (all campaigns)
dimensions: ["stat_time_day"]
```

---

## Examples

### Example 1: Get Daily Cost by Campaign

```javascript
async function getDailyCostByCampaign(advertiserId, accessToken, startDate, endDate) {
  const params = new URLSearchParams({
    advertiser_id: advertiserId,
    report_type: 'BASIC',
    data_level: 'AUCTION_CAMPAIGN',
    dimensions: JSON.stringify(['stat_time_day', 'campaign_id', 'campaign_name']),
    metrics: JSON.stringify(['spend', 'billed_cost', 'impressions', 'clicks', 'cpm', 'cpc']),
    start_date: startDate,
    end_date: endDate,
    page_size: '1000'
  });
  
  const url = `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${params.toString()}`;
  
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
const costData = await getDailyCostByCampaign(
  '7505228077656621057',
  'YOUR_ACCESS_TOKEN',
  '2025-12-21',
  '2025-12-27'
);
```

### Example 2: Get Cost with Pagination

```javascript
async function getAllCostData(advertiserId, accessToken, startDate, endDate) {
  const allData = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      report_type: 'BASIC',
      data_level: 'AUCTION_CAMPAIGN',
      dimensions: JSON.stringify(['stat_time_day', 'campaign_id']),
      metrics: JSON.stringify(['spend', 'billed_cost', 'impressions', 'clicks']),
      start_date: startDate,
      end_date: endDate,
      page: page.toString(),
      page_size: '1000'
    });
    
    const url = `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.code === 0 && data.data && data.data.list) {
      allData.push(...data.data.list);
      
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
  
  return allData;
}
```

### Example 3: Get Cost by Ad Group

```javascript
async function getCostByAdGroup(advertiserId, accessToken, startDate, endDate) {
  const params = new URLSearchParams({
    advertiser_id: advertiserId,
    report_type: 'BASIC',
    data_level: 'AUCTION_ADGROUP',
    dimensions: JSON.stringify(['stat_time_day', 'campaign_id', 'campaign_name', 'adgroup_id', 'adgroup_name']),
    metrics: JSON.stringify(['spend', 'billed_cost', 'impressions', 'clicks', 'cpm', 'cpc']),
    start_date: startDate,
    end_date: endDate,
    page_size: '1000'
  });
  
  const url = `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${params.toString()}`;
  
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
```

### Example 4: Get Cost with Filtering

```javascript
async function getFilteredCostData(advertiserId, accessToken, campaignIds, startDate, endDate) {
  const params = new URLSearchParams({
    advertiser_id: advertiserId,
    report_type: 'BASIC',
    data_level: 'AUCTION_CAMPAIGN',
    dimensions: JSON.stringify(['stat_time_day', 'campaign_id']),
    metrics: JSON.stringify(['spend', 'billed_cost']),
    start_date: startDate,
    end_date: endDate,
    filtering: JSON.stringify({
      campaign_ids: campaignIds
    }),
    page_size: '1000'
  });
  
  const url = `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${params.toString()}`;
  
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

// Usage - Get cost for specific campaigns
const costData = await getFilteredCostData(
  '7505228077656621057',
  'YOUR_ACCESS_TOKEN',
  ['1852272277112002', '1851545516520530'],
  '2025-12-21',
  '2025-12-27'
);
```

---

## Common Use Cases

### Use Case 1: Daily Cost Summary

**Goal:** Get total daily cost across all campaigns

```javascript
async function getDailyCostSummary(advertiserId, accessToken, startDate, endDate) {
  const params = new URLSearchParams({
    advertiser_id: advertiserId,
    report_type: 'BASIC',
    data_level: 'AUCTION_ADVERTISER',
    dimensions: JSON.stringify(['stat_time_day']),
    metrics: JSON.stringify(['spend', 'billed_cost']),
    start_date: startDate,
    end_date: endDate,
    page_size: '1000'
  });
  
  const url = `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${params.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Access-Token': accessToken,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (data.code === 0 && data.data && data.data.list) {
    return data.data.list.map(item => ({
      date: item.dimensions.stat_time_day,
      spend: parseFloat(item.metrics.spend || 0),
      billed_cost: parseFloat(item.metrics.billed_cost || 0)
    }));
  }
  
  return [];
}
```

### Use Case 2: Campaign Cost Comparison

**Goal:** Compare cost across different campaigns

```javascript
async function compareCampaignCosts(advertiserId, accessToken, startDate, endDate) {
  const costData = await getDailyCostByCampaign(advertiserId, accessToken, startDate, endDate);
  
  // Aggregate by campaign
  const campaignTotals = {};
  
  costData.forEach(item => {
    const campaignId = item.dimensions.campaign_id;
    const campaignName = item.dimensions.campaign_name || 'Unknown';
    
    if (!campaignTotals[campaignId]) {
      campaignTotals[campaignId] = {
        campaign_id: campaignId,
        campaign_name: campaignName,
        total_spend: 0,
        total_billed_cost: 0,
        total_impressions: 0,
        total_clicks: 0
      };
    }
    
    campaignTotals[campaignId].total_spend += parseFloat(item.metrics.spend || 0);
    campaignTotals[campaignId].total_billed_cost += parseFloat(item.metrics.billed_cost || 0);
    campaignTotals[campaignId].total_impressions += parseInt(item.metrics.impressions || 0);
    campaignTotals[campaignId].total_clicks += parseInt(item.metrics.clicks || 0);
  });
  
  // Calculate efficiency metrics
  Object.values(campaignTotals).forEach(campaign => {
    campaign.avg_cpm = campaign.total_impressions > 0 
      ? (campaign.total_spend / campaign.total_impressions) * 1000 
      : 0;
    campaign.avg_cpc = campaign.total_clicks > 0 
      ? campaign.total_spend / campaign.total_clicks 
      : 0;
  });
  
  return Object.values(campaignTotals);
}
```

### Use Case 3: Export Cost Data to CSV

**Goal:** Export cost data to CSV format

```javascript
function exportCostToCSV(costData, filename) {
  const fs = require('fs');
  
  const headers = ['date', 'campaign_id', 'campaign_name', 'spend', 'billed_cost', 'impressions', 'clicks', 'cpm', 'cpc'];
  const rows = [headers.join(',')];
  
  costData.forEach(item => {
    const row = [
      item.dimensions.stat_time_day || '',
      item.dimensions.campaign_id || '',
      item.dimensions.campaign_name || '',
      item.metrics.spend || '0',
      item.metrics.billed_cost || '0',
      item.metrics.impressions || '0',
      item.metrics.clicks || '0',
      item.metrics.cpm || '0',
      item.metrics.cpc || '0'
    ];
    
    rows.push(row.map(v => {
      const str = String(v);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(','));
  });
  
  fs.writeFileSync(filename, rows.join('\n'), 'utf8');
  console.log(`✅ CSV exported: ${filename}`);
}

// Usage
const costData = await getDailyCostByCampaign(advertiserId, accessToken, '2025-12-21', '2025-12-27');
exportCostToCSV(costData, 'campaign_cost_2025-12-21_to_2025-12-27.csv');
```

---

## Filtering

You can filter data using the `filtering` parameter:

### Filter by Campaign IDs

```javascript
filtering: JSON.stringify({
  campaign_ids: ['1852272277112002', '1851545516520530']
})
```

### Filter by Campaign Status

```javascript
filtering: JSON.stringify({
  campaign_status: 'ENABLE'  // or 'DISABLE'
})
```

### Filter by Objective Type

```javascript
filtering: JSON.stringify({
  objective_type: 'REACH'  // or 'VIDEO_VIEWS', 'TRAFFIC', etc.
})
```

### Combined Filters

```javascript
filtering: JSON.stringify({
  campaign_ids: ['1852272277112002'],
  campaign_status: 'ENABLE',
  objective_type: 'REACH'
})
```

---

## Troubleshooting

### Issue 1: "Invalid metric(s)" Error

**Problem:** API returns error about invalid metrics.

**Cause:** Using metrics not available for the selected data level or report type.

**Solution:** 
- Use only supported metrics: `spend`, `billed_cost`, `impressions`, `clicks`, `ctr`, `cpm`, `cpc`
- Some metrics may not be available at all data levels

### Issue 2: Missing Campaign Names

**Problem:** Campaign names appear as empty or missing.

**Cause:** Not including `campaign_name` in dimensions.

**Solution:** Include `campaign_name` in dimensions:
```javascript
dimensions: ["stat_time_day", "campaign_id", "campaign_name"]
```

### Issue 3: Data Not Matching Ads Manager

**Problem:** Cost data doesn't match TikTok Ads Manager.

**Possible Causes:**
1. **Time zone differences** - API uses UTC, Ads Manager may use local time
2. **Data delay** - API data may have 1-3 hour delay
3. **Billing vs Spend** - Check if you're comparing `spend` vs `billed_cost`
4. **Date range** - Ensure date range matches exactly

**Solution:**
- Use `spend` metric (not `billed_cost`) for comparison with Ads Manager "Cost" column
- Account for time zone differences
- Allow for data processing delays

### Issue 4: Empty Results

**Problem:** API returns empty list.

**Possible Causes:**
1. No campaigns active in date range
2. No spend occurred
3. Date range too far in future
4. Wrong advertiser ID

**Solution:**
- Verify campaigns exist and are active
- Check date range is valid (not future dates)
- Verify advertiser ID is correct
- Check if campaigns have any spend in the date range

### Issue 5: Pagination Issues

**Problem:** Not getting all data.

**Cause:** Not handling pagination correctly.

**Solution:** Always check `page_info.total_page` and fetch all pages:
```javascript
let page = 1;
let allData = [];

while (page <= totalPages) {
  // Fetch page
  // Add to allData
  page++;
}
```

---

## Best Practices

1. **Use `spend` for Cost Data:** The `spend` metric matches the "Cost" column in TikTok Ads Manager.

2. **Include Campaign Names:** Always include `campaign_name` in dimensions to avoid needing separate lookups.

3. **Handle Pagination:** Reports can have multiple pages. Always implement pagination logic.

4. **Cache Campaign Data:** Campaign names don't change frequently. Cache campaign lists to reduce API calls.

5. **Use Appropriate Data Levels:**
   - Use `AUCTION_CAMPAIGN` for campaign-level analysis
   - Use `AUCTION_ADGROUP` for ad group optimization
   - Use `AUCTION_AD` for ad-level performance

6. **Date Range Limits:** Maximum date range is typically 93 days. Break longer periods into multiple requests.

7. **Rate Limiting:** Implement delays between requests (500ms-1000ms) to avoid rate limits.

8. **Error Handling:** Always check `code` field in responses. `code: 0` means success.

9. **Time Zone Awareness:** API returns data in UTC. Convert to local timezone if needed.

10. **Data Validation:** Validate that `spend` and `billed_cost` are reasonable (not negative, within expected range).

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

- **Report Endpoint:** ~5-10 requests per minute
- **Recommendation:** Implement delays between requests (500ms-1000ms)
- **Bulk Operations:** Use pagination to fetch large datasets efficiently

---

## Data Retention & Availability

- **Historical Data:** Available for up to 2 years
- **Real-time Data:** May have 1-3 hour delay
- **Data Processing:** Daily data is typically finalized by 3 AM UTC the next day

---

## Cost vs Billed Cost

### Spend
- **Definition:** Total amount spent on ads
- **When Calculated:** Real-time during campaign
- **Use Case:** Performance analysis, budget tracking
- **Matches:** "Cost" column in Ads Manager

### Billed Cost
- **Definition:** Amount actually billed to your account
- **When Calculated:** After billing cycle
- **Use Case:** Financial reconciliation, invoicing
- **May Differ From Spend:** Due to billing adjustments, refunds, or corrections

**Recommendation:** Use `spend` for performance analysis and `billed_cost` for financial reporting.

---

## Complete Example Script

```javascript
require('dotenv').config();

const accessToken = process.env.TIKTOK_ADS_ACCOUNT1_ACCESS_TOKEN;
const advertiserId = '7505228077656621057';
const baseUrl = 'https://business-api.tiktok.com';

// Get all cost data with pagination
async function getAllCostData(startDate, endDate) {
  const allData = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const params = new URLSearchParams({
      advertiser_id: advertiserId,
      report_type: 'BASIC',
      data_level: 'AUCTION_CAMPAIGN',
      dimensions: JSON.stringify(['stat_time_day', 'campaign_id', 'campaign_name']),
      metrics: JSON.stringify(['spend', 'billed_cost', 'impressions', 'clicks', 'cpm', 'cpc']),
      start_date: startDate,
      end_date: endDate,
      page: page.toString(),
      page_size: '1000'
    });
    
    const url = `${baseUrl}/open_api/v1.3/report/integrated/get/?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.code === 0 && data.data && data.data.list) {
      allData.push(...data.data.list);
      
      const pageInfo = data.data.page_info;
      if (page >= pageInfo.total_page) {
        hasMore = false;
      } else {
        page++;
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } else {
      console.error('Error:', data.message);
      hasMore = false;
    }
  }
  
  return allData;
}

// Export to CSV
function exportToCSV(data, filename) {
  const fs = require('fs');
  
  const headers = ['date', 'campaign_id', 'campaign_name', 'spend', 'billed_cost', 'impressions', 'clicks', 'cpm', 'cpc'];
  const rows = [headers.join(',')];
  
  data.forEach(item => {
    const row = [
      item.dimensions.stat_time_day || '',
      item.dimensions.campaign_id || '',
      item.dimensions.campaign_name || '',
      item.metrics.spend || '0',
      item.metrics.billed_cost || '0',
      item.metrics.impressions || '0',
      item.metrics.clicks || '0',
      item.metrics.cpm || '0',
      item.metrics.cpc || '0'
    ];
    
    rows.push(row.map(v => {
      const str = String(v);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(','));
  });
  
  fs.writeFileSync(filename, rows.join('\n'), 'utf8');
  console.log(`✅ CSV exported: ${filename}`);
}

// Main function
async function main() {
  const startDate = '2025-12-21';
  const endDate = '2025-12-27';
  
  console.log(`Fetching cost data from ${startDate} to ${endDate}...`);
  const costData = await getAllCostData(startDate, endDate);
  
  console.log(`Retrieved ${costData.length} records`);
  
  // Calculate totals
  const totals = {
    spend: 0,
    billed_cost: 0,
    impressions: 0,
    clicks: 0
  };
  
  costData.forEach(item => {
    totals.spend += parseFloat(item.metrics.spend || 0);
    totals.billed_cost += parseFloat(item.metrics.billed_cost || 0);
    totals.impressions += parseInt(item.metrics.impressions || 0);
    totals.clicks += parseInt(item.metrics.clicks || 0);
  });
  
  console.log('\nTotals:');
  console.log(`  Spend: ${totals.spend.toFixed(2)}`);
  console.log(`  Billed Cost: ${totals.billed_cost.toFixed(2)}`);
  console.log(`  Impressions: ${totals.impressions.toLocaleString()}`);
  console.log(`  Clicks: ${totals.clicks.toLocaleString()}`);
  
  // Export to CSV
  exportToCSV(costData, `campaign_cost_${advertiserId}_${startDate}_to_${endDate}.csv`);
}

main().catch(console.error);
```

---

## Comparison: Manual Campaigns vs GMV Max

| Feature | Manual Campaigns | GMV Max Campaigns |
|---------|------------------|-------------------|
| **Endpoint** | `/open_api/v1.3/report/integrated/get/` | `/open_api/v1.3/gmv_max/report/get/` |
| **Cost Metric** | `spend` | `cost` |
| **Revenue Metric** | Not available | `gross_revenue` |
| **ROI Metric** | Not available | `roi` |
| **Store ID Required** | No | Yes |
| **Campaign Types** | All objective types | Only PRODUCT_GMV_MAX, LIVE_GMV_MAX |
| **Data Levels** | AUCTION_AD, AUCTION_ADGROUP, AUCTION_CAMPAIGN, AUCTION_ADVERTISER | Campaign level only |
| **Standard Metrics** | impressions, clicks, ctr, cpm, cpc | orders, cost_per_order |

---

## Support & Resources

- **TikTok Marketing API Documentation:** https://ads.tiktok.com/marketing_api/docs
- **API Status:** Check TikTok API status page for outages
- **Rate Limits:** Monitor your API usage to avoid rate limiting

---

**Last Updated:** December 29, 2025  
**API Version:** v1.3

