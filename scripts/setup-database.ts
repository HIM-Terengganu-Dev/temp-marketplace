import dotenv from 'dotenv';
import { query } from '../src/lib/db';

// Load environment variables
dotenv.config();

/**
 * Setup script to create schema and table for TikTok Shop tokens
 * Run this once to initialize the database structure
 */
async function setupDatabase() {
    try {
        console.log('Creating schema "credentials"...');
        await query('CREATE SCHEMA IF NOT EXISTS credentials;');
        console.log('✓ Schema created');

        console.log('Creating table "credentials.refresh_tiktokshops_token"...');
        await query(`
            CREATE TABLE IF NOT EXISTS credentials.refresh_tiktokshops_token (
                id SERIAL PRIMARY KEY,
                shop_number INTEGER NOT NULL UNIQUE,
                shop_name VARCHAR(255) NOT NULL,
                shop_id VARCHAR(255) NOT NULL,
                access_token TEXT NOT NULL,
                refresh_token TEXT NOT NULL,
                shop_cipher VARCHAR(255) NOT NULL,
                access_token_expire_in BIGINT,
                refresh_token_expire_in BIGINT,
                open_id VARCHAR(255),
                seller_name VARCHAR(255),
                seller_base_region VARCHAR(10),
                shop_name_tiktok VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✓ Table created');

        // Create index on shop_number for faster lookups
        console.log('Creating index...');
        await query(`
            CREATE INDEX IF NOT EXISTS idx_shop_number 
            ON credentials.refresh_tiktokshops_token(shop_number);
        `);
        console.log('✓ Index created');

        console.log('\n✅ Database setup completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up database:', error);
        process.exit(1);
    }
}

setupDatabase();

