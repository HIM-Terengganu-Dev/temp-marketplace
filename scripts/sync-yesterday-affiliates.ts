import dotenv from 'dotenv';
import { syncAffiliateMetricsForDate } from '../src/lib/metrics-fetcher';
import { query, pool } from '../src/lib/db';

dotenv.config();

async function run() {
    const yesterday = '2026-05-25';
    console.log(`Force-syncing TikTok affiliate creator metrics from API for yesterday: ${yesterday}...`);

    try {
        const shopNumbers = [1, 2, 3, 4];
        for (const num of shopNumbers) {
            console.log(`Syncing shop ${num}...`);
            await syncAffiliateMetricsForDate(num, yesterday);
        }

        console.log('\n--- Searching for target TikTok accounts in the database for yesterday ---');
        const res = await query(`
            SELECT shop_number, date, creator_username, creator_name, order_count, gmv, commission_amount
            FROM credentials.tiktok_affiliate_performance
            WHERE date = $1::date
              AND (creator_username ILIKE '%himcoffeedrsamhan%' OR creator_username ILIKE '%affliatedrsamhan6%')
        `, [yesterday]);

        if (res.rows.length > 0) {
            console.log(`\n🎉 Found ${res.rows.length} rows for the requested TikTok accounts:`);
            console.log(JSON.stringify(res.rows, null, 2));
        } else {
            console.log('\n⚠️ No rows found for himcoffeedrsamhan or affliatedrsamhan6 for yesterday.');
            
            console.log('\nHere is a list of ALL active affiliate creators for yesterday (top 15 by sales):');
            const allCreators = await query(`
                SELECT creator_username, creator_name, SUM(order_count)::integer as total_orders, SUM(gmv) as total_gmv
                FROM credentials.tiktok_affiliate_performance
                WHERE date = $1::date
                GROUP BY creator_username, creator_name
                ORDER BY total_gmv DESC
                LIMIT 15
            `, [yesterday]);
            
            allCreators.rows.forEach((r, idx) => {
                console.log(`  ${idx + 1}. "${r.creator_username}" (${r.creator_name}) - Orders: ${r.total_orders}, GMV: RM ${parseFloat(r.total_gmv).toFixed(2)}`);
            });
        }

    } catch (e: any) {
        console.error('Error syncing yesterday\'s affiliate data:', e);
    } finally {
        await pool.end();
    }
}

run();
