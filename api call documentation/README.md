# TikTok Shop API Documentation

This directory contains documentation for various TikTok Shop API endpoints and how to call them.

## Available Documentation

### Performance & Analytics APIs

- **[GMV Performance API](./tiktok-shop-gmv-performance.md)** - Fetch Gross Merchandise Value (GMV) and performance metrics for shops

### Order Management APIs

- **[Order Search API](./tiktok-shop-orders-search.md)** - Search and list orders with filtering and pagination
- **[Order Details API](./tiktok-shop-order-details.md)** - Get detailed information for specific orders by ID
- **[Order Endpoints Comparison](./tiktok-shop-order-endpoints-comparison.md)** - Compare different order endpoints and their use cases

### Coming Soon

More API documentation will be added here as additional endpoints are implemented:
- Product Management APIs
- Inventory APIs
- Shipping APIs
- And more...

## Quick Start

1. Ensure you have the required credentials in your `.env` file
2. Install dependencies: `npm install`
3. Review the specific API documentation for the endpoint you want to use
4. Use the provided example scripts or create your own

## Common Setup

All API calls require:

1. **Environment Variables** in `.env`:
   ```
   TIKTOK_SHOP_APP_KEY=your_app_key
   TIKTOK_SHOP_APP_SECRET=your_app_secret
   TIKTOK_SHOP1_ACCESS_TOKEN=your_access_token
   TIKTOK_SHOP1_SHOP_CIPHER=your_shop_cipher
   ```

2. **Dependencies**:
   ```bash
   npm install axios tiktok-shop dotenv
   ```

3. **Authentication**: Most endpoints use dual authentication:
   - OAuth Bearer token in `x-tts-access-token` header
   - Signature-based authentication with `app_key`, `app_secret`, and generated signature

## Getting Help

- Check the specific API documentation for detailed examples
- Review error codes and messages in the API responses
- Refer to official TikTok Shop API documentation: https://partner.tiktokshop.com/doc

