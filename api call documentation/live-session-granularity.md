# Live Session Granularity Documentation

## Overview

The Live Session Granularity feature provides a three-level hierarchical breakdown for LIVE GMV MAX campaigns in the Debug Table (Ikram) page. This allows users to drill down from account-level data to campaign-level data, and finally to individual livestream session (room) data.

## Feature Location

**Page:** Debug Table (Ikram)  
**Metric:** LIVE GMV MAX  
**Path:** `/debug-table-ikram`

## Hierarchy Structure

```
Account Level (Expandable)
  └── Campaign Level (Expandable for LIVE GMV MAX)
      └── Live Session Level (Livestream Rooms)
```

## API Implementation

### Endpoint
`GET /api/tiktok/gmv-max`

### Parameters
- `startDate` (YYYY-MM-DD): Start date for the date range
- `endDate` (YYYY-MM-DD): End date for the date range
- `promotion_type`: `LIVE_GMV_MAX` (required for live session data)
- `shopNumber`: Shop number (1, 2, etc.)

### Data Fetching

The API makes two requests for LIVE GMV MAX campaigns:

1. **Campaign-level data** (daily aggregation):
   - Dimensions: `['stat_time_day', 'campaign_id']`
   - Used for account and campaign breakdowns

2. **Livestream room data** (session-level):
   - Dimensions: `['campaign_id', 'room_id', 'stat_time_day']`
   - Metrics: `['live_name', 'live_status', 'live_launched_time', 'live_duration', 'cost', 'net_cost', 'orders', 'cost_per_order', 'gross_revenue', 'roi', 'live_views', 'cost_per_live_view', '10_second_live_views', 'cost_per_10_second_live_view', 'live_follows']`
   - Filtering: Uses `filtering={"campaign_ids": [...]}` to filter by specific campaigns
   - Used for live session granularity

### Response Structure

#### Campaign-Level Response (`/api/tiktok/gmv-max`)
```json
{
  "campaigns": [
    {
      "campaignId": "123456789",
      "campaignName": "Campaign Name",
      "accountName": "Account Name",
      "cost": 1000.00,
      "gmv": 5000.00,
      "orders": 50,
      "roi": 5.00
      // Note: liveSessions is NOT included here
    }
  ]
}
```

#### Live Sessions Response (`/api/tiktok/gmv-max/rooms`)
```json
{
  "campaignId": "123456789",
  "liveSessions": [
    {
      "roomId": "room_123",
      "liveName": "Live Stream Name",
      "liveStatus": "END",
      "liveDuration": "2h 30m",
      "launchedTime": "2025-01-13 14:00:00",
      "cost": 200.00,
      "gmv": 1000.00,
      "orders": 10,
      "roi": 5.00
    }
  ]
}
```

## UI/UX Features

### Account Level
- **Expandable rows** with chevron icons (▶ / ▼)
- Click to expand/collapse campaign details
- Shows aggregated metrics: Cost, GMV, Orders, ROI

### Campaign Level
- **Expandable rows** (only for LIVE GMV MAX campaigns)
- Click to expand/collapse live session details
- Shows campaign-level metrics: Cost, GMV, Orders, ROI
- Chevron icon indicates if sessions are available

### Live Session Level
- **Nested table** showing individual livestream rooms
- Columns:
  - **Live Name**: Name of the livestream
  - **Room ID**: Unique identifier for the livestream room
  - **Launched Time**: When the livestream was launched (full timestamp)
  - **Status**: ONGOING (green badge) or END (gray badge)
  - **Duration**: Length of the livestream
  - **Cost**: Ad spend for that session
  - **GMV**: Revenue generated during that session
  - **Orders**: Number of orders
  - **ROI**: Return on investment

## Data Grouping

### Room ID Grouping
- Each `room_id` represents a unique livestream session
- Data is aggregated by `room_id` across the date range
- If a room appears on multiple days, metrics are summed
- The earliest `live_launched_time` is kept as the session's launched time

### Launched Time
- Uses `live_launched_time` metric from the API response
- Timezone: Ad account timezone (GMT+8 for Malaysian accounts)
- Format: `yyyy-MM-dd HH:mm:ss`
- Sessions are sorted by launched time (most recent first)

## Usage Instructions

1. **Navigate to Debug Table (Ikram)**
   - Go to `/debug-table-ikram`

2. **Select LIVE GMV MAX Metric**
   - Choose "LIVE GMV MAX (Marketing API)" from the Metric dropdown

3. **Select Date Range**
   - Choose start and end dates
   - Click "Fetch Data"

4. **View Account Breakdown**
   - Accounts are listed in the "Breakdown by Account" table
   - Click on an account row to expand and see campaigns

5. **View Campaign Breakdown**
   - Campaigns for the selected account are shown
   - Click on a campaign row to expand and fetch live sessions
   - **Note:** Live session data is fetched on-demand when you click a campaign

6. **View Live Sessions**
   - When you click a campaign, it will:
     - Show "Loading live sessions..." while fetching
     - Fetch room data from `/api/tiktok/gmv-max/rooms` endpoint
     - Display individual livestream rooms
   - Each row represents one livestream session
   - Shows detailed metrics including:
     - Live Name (from API)
     - Room ID
     - Launched Time (from `live_launched_time` metric)
     - Status (ONGOING/END)
     - Duration
     - Cost, GMV, Orders, ROI

## Technical Details

### API Dimensions Used

According to [TikTok GMV Max API Documentation](https://business-api.tiktok.com/portal/docs?id=1824722485971009), the following dimension groupings are supported for livestream-level metrics:

- `["room_id"]`
- `["room_id","stat_time_day"]`
- `["room_id","stat_time_hour"]`
- `["campaign_id","room_id"]`
- `["campaign_id","room_id","stat_time_day"]`
- `["campaign_id","room_id","stat_time_hour"]`

**Current Implementation:** 
- **Campaign-level data:** Uses `["stat_time_day", "campaign_id"]` dimensions
- **Live session data (on-demand):** Uses `["room_id", "stat_time_day"]` dimensions with `filtering={"campaign_ids": [campaignId]}` to fetch data for a single campaign when expanded. This approach ensures we get all the livestream-specific metrics (`live_name`, `live_status`, `live_launched_time`, `live_duration`) which are only available when filtering by a specific campaign.

### Available Metrics

The following livestream-level metrics are available:

| Metric | Type | Description |
|--------|------|-------------|
| `live_name` | string | LIVE name |
| `live_status` | string | Livestream status (ONGOING/END) |
| `live_launched_time` | string | Livestream launched time (ad account timezone) |
| `live_duration` | string | Livestream duration |
| `cost` | string | Total ad spend |
| `orders` | string | Number of orders |
| `gross_revenue` | string | Total GMV/revenue |
| `roi` | string | Return on investment |

### State Management

- `expandedAccounts`: Tracks which accounts are expanded
- `expandedCampaigns`: Tracks which campaigns are expanded (for live sessions)
- `campaignLiveSessions`: Stores fetched live session data per campaign (fetched on-demand)
- `loadingLiveSessions`: Tracks which campaigns are currently loading live session data
- All states are cleared when:
  - Metric changes
  - Date range changes
  - "Yesterday" button is clicked
  - New data is fetched

## Limitations

1. **Only for LIVE GMV MAX**: Live session granularity is only available for LIVE GMV MAX campaigns, not PRODUCT GMV MAX
2. **Date Range**: Maximum date range is typically 93 days per TikTok API limits
3. **Data Latency**: Some metrics may have up to 11 hours of latency
4. **Shop-Specific**: Only shops with GMV campaigns activated will have data (Shop 2 returns 0 for GMV costs)

## Troubleshooting

### No Live Sessions Appearing
- Verify the date range includes dates with active livestreams
- Check that the campaign is a LIVE GMV MAX campaign
- Ensure the shop has GMV campaigns activated (Shop 1 only, currently)

### Launched Time Not Showing
- The API may not return `live_launched_time` for all sessions
- Fallback to `stat_time_day` if `live_launched_time` is not available

### Status Not Displaying
- Status field may be empty for older livestreams
- Only shows ONGOING or END status when available

## API Request Examples

### Campaign-Level Data Request
```bash
curl --location --request GET \
  'https://business-api.tiktok.com/open_api/v1.3/gmv_max/report/get/?advertiser_id={{advertiser_id}}&store_ids=["{{store_id}}"]&start_date={{start_date}}&end_date={{end_date}}&dimensions=["stat_time_day","campaign_id"]&metrics=["cost", "orders", "gross_revenue", "roi", "cost_per_order", "net_cost"]&gmv_max_promotion_type=LIVE_GMV_MAX&page_size=1000' \
  --header 'Access-Token: {{Access-Token}}'
```

### Live Session Data Request (On-Demand)
```bash
curl --location --request GET \
  'https://business-api.tiktok.com/open_api/v1.3/gmv_max/report/get/?advertiser_id={{advertiser_id}}&store_ids=["{{store_id}}"]&start_date={{start_date}}&end_date={{end_date}}&dimensions=["room_id","stat_time_day"]&metrics=["live_name", "live_status", "live_launched_time", "live_duration", "cost", "net_cost", "orders", "cost_per_order", "gross_revenue", "roi", "live_views", "cost_per_live_view", "10_second_live_views", "cost_per_10_second_live_view", "live_follows"]&filtering={"campaign_ids":["{{campaign_id}}"]}&gmv_max_promotion_type=LIVE_GMV_MAX&page_size=1000&page=1' \
  --header 'Access-Token: {{Access-Token}}'
```

### Key Parameters for Live Sessions:
- **dimensions**: `["room_id", "stat_time_day"]` - Groups data by room and day (campaign_id not needed in dimensions when using filtering)
- **filtering**: `{"campaign_ids": ["{{campaign_id}}"]}` - **Must filter by a single campaign ID** to get livestream-specific metrics
- **metrics**: Includes all livestream-specific metrics (`live_name`, `live_status`, `live_launched_time`, `live_duration`) plus standard performance metrics
- **gmv_max_promotion_type**: `LIVE_GMV_MAX` - Required to specify promotion type
- **page_size**: 1000 (maximum allowed)

**Important:** The livestream-specific metrics (`live_name`, `live_status`, `live_launched_time`, `live_duration`) are only available when filtering by a single campaign ID. Filtering by multiple campaigns will result in an API error.

## Related Documentation

- [TikTok GMV Max API Documentation](https://business-api.tiktok.com/portal/docs?id=1824722485971009)
- [GMV Max API Documentation](./gmv_max_api_documentation.md)
- [Debug Table (Ikram) Implementation](../src/app/debug-table-ikram/page.tsx)

## Code References

- **Campaign-Level API Route**: `src/app/api/tiktok/gmv-max/route.ts`
- **Live Sessions API Route**: `src/app/api/tiktok/gmv-max/rooms/route.ts`
- **UI Component**: `src/app/debug-table-ikram/page.tsx`
- **State Management**: React useState hooks for expansion tracking and on-demand data fetching

