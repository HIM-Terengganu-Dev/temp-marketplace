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
   - Dimensions: `['campaign_id', 'room_id']`
   - Metrics: `['cost', 'orders', 'gross_revenue', 'roi', 'live_name', 'live_status', 'live_launched_time', 'live_duration']`
   - Used for live session granularity

### Response Structure

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
      "roi": 5.00,
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
   - Click on a campaign row to expand and see live sessions

6. **View Live Sessions**
   - Individual livestream rooms are displayed
   - Each row represents one livestream session
   - Shows detailed metrics for that specific session

## Technical Details

### API Dimensions Used

According to [TikTok GMV Max API Documentation](https://business-api.tiktok.com/portal/docs?id=1824722485971009), the following dimension groupings are supported for livestream-level metrics:

- `["room_id"]`
- `["room_id","stat_time_day"]`
- `["room_id","stat_time_hour"]`
- `["campaign_id","room_id"]`
- `["campaign_id","room_id","stat_time_day"]`
- `["campaign_id","room_id","stat_time_hour"]`

**Current Implementation:** Uses `["campaign_id","room_id"]` to get unique livestream sessions per campaign.

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
- Both states are cleared when:
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

## Related Documentation

- [TikTok GMV Max API Documentation](https://business-api.tiktok.com/portal/docs?id=1824722485971009)
- [GMV Max API Documentation](./gmv_max_api_documentation.md)
- [Debug Table (Ikram) Implementation](../src/app/debug-table-ikram/page.tsx)

## Code References

- **API Route**: `src/app/api/tiktok/gmv-max/route.ts`
- **UI Component**: `src/app/debug-table-ikram/page.tsx`
- **State Management**: React useState hooks for expansion tracking

