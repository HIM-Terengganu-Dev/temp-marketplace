# TikTok Shop Token Refresh Setup Guide

This guide explains how to set up the automated token refresh system for TikTok Shops.

## Prerequisites

1. PostgreSQL database with DDL access
2. Connection string stored in `.env` as `HP_marketplace_db_ddl`
3. TikTok Shop credentials in `.env`:
   - `TIKTOK_SHOP_APP_KEY`
   - `TIKTOK_SHOP_APP_SECRET`
   - `TIKTOK_SHOP1_ACCESS_TOKEN`
   - `TIKTOK_SHOP1_REFRESH_TOKEN`
   - `TIKTOK_SHOP1_SHOP_CIPHER`
   - (Repeat for shops 2, 3, 4)

## Setup Steps

### 1. Create Database Schema and Table

Run the database setup script to create the `credentials` schema and `refresh_tiktokshops_token` table:

```bash
npm run db:setup
```

This will create:
- Schema: `credentials`
- Table: `credentials.refresh_tiktokshops_token`
- Index on `shop_number` for faster lookups

### 2. Populate Database with Current Tokens

Populate the database with tokens from your `.env` file:

```bash
npm run db:populate
```

This script will:
- Read all TikTok Shop tokens from environment variables
- Insert or update them in the database
- Handle all 4 shops (shop1, shop2, shop3, shop4)

### 3. Access the Refresh Token UI

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the "Refresh Token" page in the sidebar
3. Click "Refresh All Tokens" to refresh all shop tokens at once

## Database Schema

The `credentials.refresh_tiktokshops_token` table stores:

- `shop_number` (INTEGER, UNIQUE) - Shop identifier (1-4)
- `shop_name` (VARCHAR) - Shop display name
- `shop_id` (VARCHAR) - TikTok Shop ID
- `access_token` (TEXT) - Current access token
- `refresh_token` (TEXT) - Current refresh token
- `shop_cipher` (VARCHAR) - Shop cipher identifier
- `access_token_expire_in` (BIGINT) - Access token expiration timestamp
- `refresh_token_expire_in` (BIGINT) - Refresh token expiration timestamp
- `open_id` (VARCHAR) - Open ID
- `seller_name` (VARCHAR) - Seller name
- `seller_base_region` (VARCHAR) - Region code
- `shop_name_tiktok` (VARCHAR) - TikTok shop name
- `created_at` (TIMESTAMP) - Record creation time
- `updated_at` (TIMESTAMP) - Last update time

## API Endpoint

The refresh functionality is available via API:

**POST** `/api/tiktok/refresh-all-tokens`

Returns:
```json
{
  "success": true,
  "summary": {
    "total": 4,
    "successful": 3,
    "failed": 1
  },
  "results": [
    {
      "shopNumber": 1,
      "shopName": "DrSamhanWellness",
      "success": true
    },
    {
      "shopNumber": 2,
      "shopName": "HIM CLINIC",
      "success": false,
      "error": "Error message here"
    }
  ]
}
```

## Notes

- Tokens are refreshed in parallel for all shops
- Failed refreshes are reported individually
- The database is automatically updated with new tokens upon successful refresh
- Expiration times are stored as Unix timestamps (seconds)

