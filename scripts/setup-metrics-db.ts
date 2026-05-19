import dotenv from 'dotenv';
import { query } from '../src/lib/db';

dotenv.config();

/**
 * Setup script to create table for Daily Shop Metrics
 */
async function setupMetricsDatabase() {
    try {
        console.log('Ensuring schema "credentials" exists...');
        await query('CREATE SCHEMA IF NOT EXISTS credentials;');
        
        console.log('Creating table "credentials.daily_shop_metrics"...');
        await query(`
            CREATE TABLE IF NOT EXISTS credentials.daily_shop_metrics (
                id SERIAL PRIMARY KEY,
                shop_number INTEGER NOT NULL,
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
                CONSTRAINT unique_shop_date UNIQUE (shop_number, date)
            );
        `);
        console.log('✓ Table created with UNIQUE constraint on (shop_number, date)');

        // Create index on (shop_number, date) for faster queries
        console.log('Creating index for lookup and sorting...');
        await query(`
            CREATE INDEX IF NOT EXISTS idx_shop_metrics_date 
            ON credentials.daily_shop_metrics(shop_number, date DESC);
        `);
        console.log('✓ Index created successfully!');

        console.log('\n✅ Metrics database setup completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up metrics database:', error);
        process.exit(1);
    }
}

setupMetricsDatabase();
