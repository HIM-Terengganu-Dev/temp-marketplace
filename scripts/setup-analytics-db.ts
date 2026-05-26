import dotenv from 'dotenv';
import { query } from '../src/lib/db';

dotenv.config();

/**
 * Setup script to create tables for daily attribution metrics and daily livestream sessions
 */
async function setupAnalyticsDatabase() {
    try {
        console.log('Ensuring schema "credentials" exists...');
        await query('CREATE SCHEMA IF NOT EXISTS credentials;');
        
        console.log('Creating table "credentials.daily_attribution_metrics"...');
        await query(`
            CREATE TABLE IF NOT EXISTS credentials.daily_attribution_metrics (
                id SERIAL PRIMARY KEY,
                date DATE NOT NULL,
                company_filter VARCHAR(50) NOT NULL, -- ALL, HIMWELLNESS, WEROCA
                channel VARCHAR(50) NOT NULL,        -- Livestream Commerce, Short Video Ads, Product Showcase, Creator Affiliates
                sales NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                spend NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                roas NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                trend NUMERIC(5, 2) NOT NULL DEFAULT 0.00, -- YoY / WoW change
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_date_company_channel UNIQUE (date, company_filter, channel)
            );
        `);
        console.log('✓ Table credentials.daily_attribution_metrics created');

        console.log('Creating table "credentials.daily_livestream_sessions"...');
        await query(`
            CREATE TABLE IF NOT EXISTS credentials.daily_livestream_sessions (
                id SERIAL PRIMARY KEY,
                date DATE NOT NULL,
                company_filter VARCHAR(50) NOT NULL, -- ALL, HIMWELLNESS, WEROCA
                host_name VARCHAR(100) NOT NULL,
                peak_viewers INTEGER NOT NULL DEFAULT 0,
                conversion_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                aov NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                spend NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                gmv NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
                roi NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                trend NUMERIC(5, 2) NOT NULL DEFAULT 0.00, -- WoW change index
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_date_company_host UNIQUE (date, company_filter, host_name)
            );
        `);
        console.log('✓ Table credentials.daily_livestream_sessions created');

        // Create indexes
        console.log('Creating indexes...');
        await query(`
            CREATE INDEX IF NOT EXISTS idx_attribution_date_company 
            ON credentials.daily_attribution_metrics(date, company_filter);
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_livestream_sessions_date_company 
            ON credentials.daily_livestream_sessions(date, company_filter);
        `);
        console.log('✓ Indexes created successfully!');

        console.log('\n✅ Analytics database setup completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up analytics database:', error);
        process.exit(1);
    }
}

setupAnalyticsDatabase();
