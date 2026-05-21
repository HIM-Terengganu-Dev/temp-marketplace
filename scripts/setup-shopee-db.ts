import dotenv from 'dotenv';
import { query } from '../src/lib/db';

// Load environment variables
dotenv.config();

/**
 * Setup script to create table for Shopee Shop tokens
 * Run this once to initialize the database structure
 */
async function setupShopeeDatabase() {
    try {
        console.log('Ensuring schema "credentials" exists...');
        await query('CREATE SCHEMA IF NOT EXISTS credentials;');
        console.log('✓ Schema verified');

        console.log('Creating table "credentials.refresh_shopeeshops_token"...');
        await query(`
            CREATE TABLE IF NOT EXISTS credentials.refresh_shopeeshops_token (
                id SERIAL PRIMARY KEY,
                shop_id BIGINT NOT NULL UNIQUE,
                shop_name VARCHAR(255),
                access_token TEXT NOT NULL,
                refresh_token TEXT NOT NULL,
                access_token_expires_at TIMESTAMP NOT NULL,
                refresh_token_expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✓ Table created successfully');

        // Create index on shop_id for faster lookups
        console.log('Creating index for shop_id...');
        await query(`
            CREATE INDEX IF NOT EXISTS idx_shopee_shop_id 
            ON credentials.refresh_shopeeshops_token(shop_id);
        `);
        console.log('✓ Index created successfully');

        console.log('\n✅ Shopee Database setup completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up Shopee database:', error);
        process.exit(1);
    }
}

setupShopeeDatabase();
