import { query, pool } from '../src/lib/db';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
    try {
        console.log('Creating credentials.sku_cogs database table locally...');
        
        await query(`
            CREATE TABLE IF NOT EXISTS credentials.sku_cogs (
                id SERIAL PRIMARY KEY,
                marketplace VARCHAR(50) NOT NULL, -- 'shopee' or 'tiktok'
                shop_id VARCHAR(100) NOT NULL,
                sku_id VARCHAR(255) UNIQUE NOT NULL,
                seller_sku VARCHAR(255),
                product_name VARCHAR(255),
                price NUMERIC(10, 2) DEFAULT 0.00,
                cogs_cost NUMERIC(10, 2) DEFAULT 0.00,
                is_mapped BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ credentials.sku_cogs table successfully created/verified!');
        
        // Also create index for fast lookups
        await query(`
            CREATE INDEX IF NOT EXISTS idx_sku_cogs_sku_id ON credentials.sku_cogs(sku_id);
        `);
        console.log('✅ Index created on sku_id column.');

    } catch (e: any) {
        console.error('❌ Failed to create table:', e);
    } finally {
        await pool.end();
    }
}

run();
