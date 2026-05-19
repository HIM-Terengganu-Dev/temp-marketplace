const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const token1 = process.env.TIKTOK_ADS_ACCOUNT1_ACCESS_TOKEN;
const token2 = process.env.TIKTOK_ADS_ACCOUNT2_ACCESS_TOKEN;

const advertiserIds1 = [
  "7336853270385770498",
  "7391329013215821840",
  "7505228077656621057"
];

const advertiserIds2 = [
  "7345453377846837249",
  "7391329013215821840",
  "7397975716400513041",
  "7404340904338948112",
  "7404355345587535873",
  "7404387549454008336", // HIM CLINIC
  "7477419423419301889",
  "7493009350928285712"
];

async function checkToken(tokenName, tokenVal, ids) {
  console.log(`Checking advertiser details for ${tokenName}...\n`);
  try {
    const response = await axios.get('https://business-api.tiktok.com/open_api/v1.3/advertiser/info/', {
      headers: {
        'Access-Token': tokenVal,
        'Content-Type': 'application/json'
      },
      params: {
        advertiser_ids: JSON.stringify(ids)
      }
    });

    if (response.data.code !== 0) {
        console.error("TikTok API Error:", response.data.message);
        return;
    }

    const list = response.data.data?.list || [];
    list.forEach(adv => {
        console.log(`- Account Name: ${adv.name}`);
        console.log(`  Advertiser ID: ${adv.advertiser_id}`);
        console.log(`  Status:        ${adv.status}`);
        console.log(`  Currency:      ${adv.currency}`);
        console.log("-----------------------------------------");
    });
  } catch (err) {
    console.error("Error:", err.message);
  }
}

async function run() {
  await checkToken('Account 1', token1, advertiserIds1);
  await checkToken('Account 2', token2, advertiserIds2);
}
run();
