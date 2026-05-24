import dotenv from 'dotenv';
import { query } from '../src/lib/db';

dotenv.config();

/**
 * Setup script to create table for TikTok Shop Affiliate Creator Performance
 */
async function setupAffiliateDatabase() {
    try {
        console.log('Ensuring schema "credentials" exists...');
        await query('CREATE SCHEMA IF NOT EXISTS credentials;');
        
        console.log('Creating table "credentials.tiktok_affiliate_performance"...');
        await query(`
            CREATE TABLE IF NOT EXISTS credentials.tiktok_affiliate_performance (
                id SERIAL PRIMARY KEY,
                shop_number INTEGER NOT NULL,
                date DATE NOT NULL,
                creator_username VARCHAR(100) NOT NULL,
                creator_name VARCHAR(150),
                order_count INTEGER NOT NULL DEFAULT 0,
                gmv NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                commission_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_shop_date_creator UNIQUE (shop_number, date, creator_username)
            );
        `);
        console.log('✓ Table created with UNIQUE constraint on (shop_number, date, creator_username)');

        // Create index on (shop_number, date, gmv DESC) for faster loading/leaderboard queries
        console.log('Creating index for affiliate sorting...');
        await query(`
            CREATE INDEX IF NOT EXISTS idx_affiliate_performance_sorting 
            ON credentials.tiktok_affiliate_performance(shop_number, date, gmv DESC);
        `);
        console.log('✓ Index created successfully!');

        console.log('\n✅ TikTok Affiliate database setup completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up affiliate database:', error);
        process.exit(1);
    }
}

setupAffiliateDatabase();
