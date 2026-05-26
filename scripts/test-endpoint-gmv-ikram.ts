import { GET } from '../src/app/api/tiktok/gmv-ikram/route';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
    try {
        console.log('Invoking GET handler for /api/tiktok/gmv-ikram directly...');
        
        // Mock a NextJS Request object
        const req = new Request('http://localhost:3000/api/tiktok/gmv-ikram?startDate=2026-05-25&endDate=2026-05-25&shopNumber=1');
        
        const response = await GET(req);
        console.log('Response Status:', response.status);
        
        const data = await response.json();
        console.log('Response Data:', JSON.stringify(data, null, 2));

    } catch (e: any) {
        console.error('Failed to execute endpoint:', e);
    }
}

run();
