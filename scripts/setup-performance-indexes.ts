import { pool } from '../src/lib/db';

async function setupIndexes() {
    console.log('⚡ Setting up performance database indexes...');
    
    try {
        // 1. Index on credentials.daily_shop_metrics for date range and shop lookups
        console.log('Creating index idx_daily_metrics_shop_date...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_daily_metrics_shop_date 
            ON credentials.daily_shop_metrics(shop_number, date DESC);
        `);

        // 2. Index on credentials.daily_shop_metrics by date
        console.log('Creating index idx_daily_metrics_date_desc...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_daily_metrics_date_desc 
            ON credentials.daily_shop_metrics(date DESC);
        `);

        // 3. Index on system_feedback for status & timestamp filtering
        console.log('Creating index idx_feedback_status_created...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_feedback_status_created 
            ON system_feedback(status, created_at DESC);
        `);

        console.log('Creating index idx_feedback_type...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_feedback_type 
            ON system_feedback(type);
        `);

        // 4. Index on credentials.sku_cogs for SKU joins
        console.log('Creating index idx_sku_cogs_sku_id...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_sku_cogs_sku_id 
            ON credentials.sku_cogs(sku_id);
        `);

        // 5. Index on shop_livestream_performance
        console.log('Creating index idx_livestream_shop_start_time...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_livestream_shop_start_time 
            ON credentials.shop_livestream_performance(shop_number, start_time DESC);
        `);

        console.log('✅ All performance database indexes created successfully!');
    } catch (error) {
        console.error('❌ Error setting up performance indexes:', error);
    } finally {
        await pool.end();
    }
}

setupIndexes();
