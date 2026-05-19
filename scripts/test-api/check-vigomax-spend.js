const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const cleanEnv = (val) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

const token = cleanEnv(process.env.TIKTOK_ADS_ACCOUNT3_ACCESS_TOKEN);
const ADVERTISER_ID = '7259935704698929153'; // UWM Lifera

const shops = [
  { name: 'Vigomax HQ', id: '7494799386964364219' },
  { name: 'VigomaxPlus HQ', id: '7495580262600706099' }
];

const baseUrl = 'https://business-api.tiktok.com';
const version = 'v1.3';

async function checkShopSpend(shop) {
  try {
    const queryParams = {
      advertiser_id: ADVERTISER_ID,
      store_ids: JSON.stringify([shop.id]),
      dimensions: JSON.stringify(['stat_time_day', 'campaign_id']),
      metrics: JSON.stringify(['cost', 'orders', 'gross_revenue', 'roi']),
      start_date: '2026-05-10',
      end_date: '2026-05-18',
      page_size: '100'
    };

    const queryString = Object.keys(queryParams)
      .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
      .join('&');

    const url = `${baseUrl}/open_api/${version}/gmv_max/report/get/?${queryString}`;

    const response = await axios.get(url, {
      headers: {
        'Access-Token': token,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.code !== 0) {
      console.error(`❌ Error fetching report for ${shop.name}:`, response.data.message);
      return;
    }

    const list = response.data.data.list || [];
    let totalCost = 0;
    let totalGMV = 0;

    list.forEach(item => {
      totalCost += parseFloat(item.metrics.cost || 0);
      totalGMV += parseFloat(item.metrics.gross_revenue || 0);
    });

    console.log(`✅ ${shop.name}: Found ${list.length} report records.`);
    console.log(`   👉 Total Cost: RM ${totalCost.toFixed(2)} | Total GMV: RM ${totalGMV.toFixed(2)}`);
  } catch (error) {
    console.error(`❌ Exception for ${shop.name}:`, error.message);
  }
}

async function run() {
  console.log("--- Checking GMV Max Spend from TikTok API ---");
  for (const shop of shops) {
    await checkShopSpend(shop);
  }
}

run();
