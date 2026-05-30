import { fetchShopAnalytics } from '../src/lib/metrics-fetcher';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        console.log("Fetching shop 1 analytics via fetchShopAnalytics...");
        const res = await fetchShopAnalytics(1, '2026-05-20', '2026-05-26');
        console.log("Result:", JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.error("Error fetching analytics:", e.message || e);
    }
}
run();
