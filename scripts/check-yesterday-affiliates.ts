import dotenv from 'dotenv';
import { query, pool } from '../src/lib/db';

dotenv.config();

async function run() {
    try {
        console.log('Querying credentials.tiktok_affiliate_performance for yesterday (2026-05-25)...');
        const res = await query(`
            SELECT * FROM credentials.tiktok_affiliate_performance
            WHERE date = '2026-05-25'::date
              AND (creator_username ILIKE '%himcoffeedrsamhan%' OR creator_username ILIKE '%affliatedrsamhan6%')
        `);
        console.log(`Found ${res.rows.length} rows for requested accounts:`);
        console.log(JSON.stringify(res.rows, null, 2));

        // Let's also print ALL records in credentials.tiktok_affiliate_performance for yesterday to see what creators actually had data
        console.log('\nPrinting ALL affiliate records for yesterday (2026-05-25)...');
        const allRes = await query(`
            SELECT * FROM credentials.tiktok_affiliate_performance
            WHERE date = '2026-05-25'::date
            ORDER BY gmv DESC
        `);
        console.log(`Found ${allRes.rows.length} total rows for yesterday in DB:`);
        allRes.rows.forEach(r => {
            console.log(`  Shop: ${r.shop_number}, Creator: "${r.creator_username}" ("${r.creator_name}"), Orders: ${r.order_count}, GMV: RM ${r.gmv}, Commission: RM ${r.commission_amount}`);
        });

        // Let's search if these creators exist on any other date in the database
        console.log('\nSearching for requested creators on ANY date...');
        const anyDateRes = await query(`
            SELECT * FROM credentials.tiktok_affiliate_performance
            WHERE creator_username ILIKE '%himcoffeedrsamhan%' OR creator_username ILIKE '%affliatedrsamhan6%'
            ORDER BY date DESC
        `);
        console.log(`Found ${anyDateRes.rows.length} total rows across all dates:`);
        anyDateRes.rows.forEach(r => {
            console.log(`  Date: ${r.date.toISOString().split('T')[0]}, Shop: ${r.shop_number}, Creator: "${r.creator_username}", Orders: ${r.order_count}, GMV: RM ${r.gmv}`);
        });

    } catch (e: any) {
        console.error('Error querying affiliate database:', e);
    } finally {
        await pool.end();
    }
}

run();
