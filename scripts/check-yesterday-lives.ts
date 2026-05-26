import dotenv from 'dotenv';
import { query, pool } from '../src/lib/db';

dotenv.config();

async function run() {
    try {
        console.log('Querying credentials.shop_livestream_performance for yesterday (2026-05-25)...');
        const resPerf = await query(`
            SELECT * FROM credentials.shop_livestream_performance
            WHERE start_time >= '2026-05-25 00:00:00'::timestamp
              AND start_time <= '2026-05-25 23:59:59'::timestamp
            ORDER BY start_time ASC
        `);
        console.log(`Found ${resPerf.rows.length} rows in credentials.shop_livestream_performance:`);
        console.log(JSON.stringify(resPerf.rows, null, 2));

        console.log('\nQuerying credentials.daily_livestream_sessions for yesterday (2026-05-25)...');
        const resSessions = await query(`
            SELECT * FROM credentials.daily_livestream_sessions
            WHERE date = '2026-05-25'::date
        `);
        console.log(`Found ${resSessions.rows.length} rows in credentials.daily_livestream_sessions:`);
        console.log(JSON.stringify(resSessions.rows, null, 2));

        // Let's also search for any rows containing those names in any date, just in case they are registered under different dates
        console.log('\nSearching for any rows containing "coffee" or "affiliate" or "samhan" in live_title or host_name...');
        const searchPerf = await query(`
            SELECT * FROM credentials.shop_livestream_performance
            WHERE live_title ILIKE '%coffee%' 
               OR live_title ILIKE '%affiliate%'
               OR live_title ILIKE '%samhan%'
            LIMIT 10
        `);
        console.log(`Matches in shop_livestream_performance: ${searchPerf.rows.length}`);
        searchPerf.rows.forEach(r => {
            console.log(`  Shop: ${r.shop_number}, ID: ${r.live_id}, Title: "${r.live_title}", GMV: RM ${r.gmv}, Date: ${r.start_time}`);
        });

        const searchSessions = await query(`
            SELECT * FROM credentials.daily_livestream_sessions
            WHERE host_name ILIKE '%coffee%'
               OR host_name ILIKE '%affiliate%'
               OR host_name ILIKE '%samhan%'
            LIMIT 10
        `);
        console.log(`Matches in daily_livestream_sessions: ${searchSessions.rows.length}`);
        searchSessions.rows.forEach(r => {
            console.log(`  Shop: ${r.shop_number}, Date: ${r.date}, Host: "${r.host_name}", Sales: RM ${r.sales}`);
        });

    } catch (e: any) {
        console.error('Error during database check:', e);
    } finally {
        await pool.end();
    }
}

run();
