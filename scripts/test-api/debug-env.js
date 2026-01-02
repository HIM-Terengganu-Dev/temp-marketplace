const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

console.log('Checking Environment Variables...');
console.log('TIKTOK_SHOP1_ACCESS_TOKEN:', process.env.TIKTOK_SHOP1_ACCESS_TOKEN ? 'Present' : 'MISSING');
console.log('TIKTOK_SHOP_APP_KEY:', process.env.TIKTOK_SHOP_APP_KEY ? 'Present' : 'MISSING');
console.log('TIKTOK_SHOP_APP_SECRET:', process.env.TIKTOK_SHOP_APP_SECRET ? 'Present' : 'MISSING');
console.log('TIKTOK_SHOP1_SHOP_CIPHER:', process.env.TIKTOK_SHOP1_SHOP_CIPHER ? 'Present' : 'MISSING');

if (process.env.TIKTOK_SHOP1_ACCESS_TOKEN) {
    console.log('Token starts with:', process.env.TIKTOK_SHOP1_ACCESS_TOKEN.substring(0, 5) + '...');
}
