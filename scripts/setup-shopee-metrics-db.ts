import dotenv from 'dotenv';
import { query } from '../src/lib/db';

// Load environment variables
dotenv.config();

/**
 * Setup script to create table for Daily Shopee Shop Metrics
 */
async function setupShopeeMetricsDatabase() {
    try {
        console.log('Ensuring schema "credentials" exists...');
        await query('CREATE SCHEMA IF NOT EXISTS credentials;');
        console.log('✓ Schema verified');

        console.log('Creating table "credentials.daily_shopee_metrics"...');
        await query(`
            CREATE TABLE IF NOT EXISTS credentials.daily_shopee_metrics (
                id SERIAL PRIMARY KEY,
                shop_id BIGINT NOT NULL,
                shop_name VARCHAR(255) NOT NULL,
                date DATE NOT NULL,
                gmv NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                spend_before_tax NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                spend_after_tax NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                roas_before_tax NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                roas_after_tax NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                order_count INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_shopee_shop_date UNIQUE (shop_id, date)
            );
        `);
        console.log('✓ Table credentials.daily_shopee_metrics created successfully');

        // Create index on (shop_id, date) for faster queries
        console.log('Creating index for lookup and sorting...');
        await query(`
            CREATE INDEX IF NOT EXISTS idx_shopee_metrics_date 
            ON credentials.daily_shopee_metrics(shop_id, date DESC);
        `);
        console.log('✓ Index created successfully!');

        console.log('\n✅ Shopee Metrics database setup completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up Shopee metrics database:', error);
        process.exit(1);
    }
}

setupShopeeMetricsDatabase();
