import dotenv from 'dotenv';
import { query } from '../src/lib/db';

dotenv.config({ path: '.env.local' });

async function addCommentCountColumn() {
    try {
        console.log('Adding comment_count column to credentials.shop_livestream_performance...');
        await query(`
            ALTER TABLE credentials.shop_livestream_performance
            ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;
        `);
        console.log('✓ comment_count column added (or already exists)');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

addCommentCountColumn();
