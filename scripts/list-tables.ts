import dotenv from 'dotenv';
import { query, pool } from '../src/lib/db';

dotenv.config();

async function run() {
    try {
        console.log('Querying credentials schema tables...');
        const res = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'credentials'
            ORDER BY table_name;
        `);
        
        console.log(`Found ${res.rows.length} tables in credentials schema:`);
        res.rows.forEach(r => console.log(`  - ${r.table_name}`));

    } catch (e: any) {
        console.error('Error listing tables:', e);
    } finally {
        await pool.end();
    }
}

run();
