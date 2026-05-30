const { fetchShopAnalytics } = require('../src/lib/metrics-fetcher');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    try {
        console.log("Fetching shop 1 analytics...");
        const res = await fetchShopAnalytics(1, '2026-05-20', '2026-05-26');
        console.log("Result:", res);
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
