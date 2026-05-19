const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const token = process.env.TIKTOK_ADS_ACCOUNT3_ACCESS_TOKEN;
const advertiserId = "7584105149931292434";

async function run() {
  console.log("Validating Advertiser ID with the new token...\n");
  try {
    const response = await axios.get('https://business-api.tiktok.com/open_api/v1.3/advertiser/info/', {
      headers: {
        'Access-Token': token,
        'Content-Type': 'application/json'
      },
      params: {
        advertiser_ids: JSON.stringify([advertiserId])
      }
    });

    console.log("TikTok API Response:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error("Error calling API:", err.message);
  }
}
run();
