import dotenv from 'dotenv';
import { query } from '../src/lib/db';

dotenv.config();

async function addAdsColumns() {
    try {
        console.log('Adding granular ads cost columns to credentials.daily_shop_metrics...');
        
        // Add live_gmv_max_cost
        await query(`
            ALTER TABLE credentials.daily_shop_metrics 
            ADD COLUMN IF NOT EXISTS live_gmv_max_cost NUMERIC(15, 2) NOT NULL DEFAULT 0.00;
        `);
        console.log('✓ Added column live_gmv_max_cost');

        // Add product_gmv_max_cost
        await query(`
            ALTER TABLE credentials.daily_shop_metrics 
            ADD COLUMN IF NOT EXISTS product_gmv_max_cost NUMERIC(15, 2) NOT NULL DEFAULT 0.00;
        `);
        console.log('✓ Added column product_gmv_max_cost');

        // Add manual_campaign_spend
        await query(`
            ALTER TABLE credentials.daily_shop_metrics 
            ADD COLUMN IF NOT EXISTS manual_campaign_spend NUMERIC(15, 2) NOT NULL DEFAULT 0.00;
        `);
        console.log('✓ Added column manual_campaign_spend');

        console.log('✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating database schema:', error);
        process.exit(1);
    }
}

addAdsColumns();
