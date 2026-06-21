const { fetchShopeeShopPerformance } = require('./src/lib/shopee-client');

async function main() {
    try {
        console.log("Fetching performance live from Shopee API for shop 1298030530 on 2026-06-15...");
        const data = await fetchShopeeShopPerformance(1298030530, '2026-06-15', '2026-06-15');
        console.log("SUCCESS:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("FAILED:", e);
    }
}

main();
