import { pool, query } from '../src/lib/db';

async function run() {
    console.log('Adding buyer_user_id column to credentials.orders if not exists...');
    try {
        await query(`
            ALTER TABLE credentials.orders 
            ADD COLUMN IF NOT EXISTS buyer_user_id VARCHAR;
        `);
        console.log('Creating index on credentials.orders(buyer_user_id)...');
        await query(`
            CREATE INDEX IF NOT EXISTS idx_orders_buyer_user_id 
            ON credentials.orders(buyer_user_id);
        `);
        console.log('Creating index on credentials.orders(created_at)...');
        await query(`
            CREATE INDEX IF NOT EXISTS idx_orders_created_at 
            ON credentials.orders(created_at);
        `);
        console.log('✅ Column and indexes added successfully.');
    } catch (e: any) {
        console.error('Error adding buyer_user_id column:', e.message);
    } finally {
        await pool.end();
    }
}

run();
