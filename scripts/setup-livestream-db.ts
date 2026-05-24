import dotenv from 'dotenv';
import { query } from '../src/lib/db';

dotenv.config();

/**
 * Setup script to create table for Shop Livestream Performance
 */
async function setupLivestreamDatabase() {
    try {
        console.log('Ensuring schema "credentials" exists...');
        await query('CREATE SCHEMA IF NOT EXISTS credentials;');
        
        console.log('Creating table "credentials.shop_livestream_performance"...');
        await query(`
            CREATE TABLE IF NOT EXISTS credentials.shop_livestream_performance (
                id SERIAL PRIMARY KEY,
                shop_number INTEGER NOT NULL,
                live_id VARCHAR(100) NOT NULL,
                live_title VARCHAR(255) NOT NULL,
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                order_count INTEGER NOT NULL DEFAULT 0,
                gmv NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                viewer_count INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_shop_live UNIQUE (shop_number, live_id)
            );
        `);
        console.log('✓ Table created with UNIQUE constraint on (shop_number, live_id)');

        // Create index on (shop_number, order_count DESC) for faster leaderboard queries
        console.log('Creating index for livestream leaderboard sorting...');
        await query(`
            CREATE INDEX IF NOT EXISTS idx_livestream_performance_orders 
            ON credentials.shop_livestream_performance(shop_number, order_count DESC);
        `);
        console.log('✓ Index created successfully!');

        console.log('\n✅ Livestream database setup completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up livestream database:', error);
        process.exit(1);
    }
}

setupLivestreamDatabase();
