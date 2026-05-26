import dotenv from 'dotenv';
import { GET } from '../src/app/api/shop-metrics/summary/route';

dotenv.config();

async function run() {
    try {
        console.log('Mocking GET request to /api/shop-metrics/summary...');
        
        // Define mock search parameters
        const url = 'http://localhost:3000/api/shop-metrics/summary?startDate=2026-05-25&endDate=2026-05-25&prevStartDate=2026-05-24&prevEndDate=2026-05-24';
        const request = new Request(url);

        const response = await GET(request);
        const data = await response.json();

        console.log('\nResponse Keys:', Object.keys(data));
        
        if (data.shopeeCurResults) {
            console.log(`\nShopee Current Results Length: ${data.shopeeCurResults.length}`);
            console.log('First Shopee current result item:');
            console.log(JSON.stringify(data.shopeeCurResults[0], null, 2));
        } else {
            console.log('\nNo shopeeCurResults found in response.');
        }

        if (data.error) {
            console.error('\nAPI returned error:', data.error);
        }

        process.exit(0);
    } catch (e: any) {
        console.error('Error in direct API test:', e);
        process.exit(1);
    }
}

run();
