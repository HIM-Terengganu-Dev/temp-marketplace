import { query } from '../src/lib/db';
import dotenv from 'dotenv';
dotenv.config();

async function addRbacColumns() {
    console.log('Adding RBAC columns to credentials.users...');
    try {
        await query(`
            ALTER TABLE credentials.users 
            ADD COLUMN IF NOT EXISTS allowed_tiktok_shops INTEGER[] DEFAULT '{1,2,3,4}',
            ADD COLUMN IF NOT EXISTS allowed_shopee_shops INTEGER[] DEFAULT '{1,2,3,4}';
        `);
        console.log('✅ RBAC columns added successfully.');

        // Update default admin to have access to all shops
        await query(`
            UPDATE credentials.users 
            SET allowed_tiktok_shops = '{1,2,3,4}', allowed_shopee_shops = '{1,2,3,4}'
            WHERE role = 'admin';
        `);
        console.log('✅ Admin set to all shops.');

        // Update default user to have access to shop 1 and 2 only as a test
        await query(`
            UPDATE credentials.users 
            SET allowed_tiktok_shops = '{1,2}', allowed_shopee_shops = '{1,2}'
            WHERE email = 'user@example.com';
        `);
        console.log('✅ Standard user set to TikTok/Shopee shops 1 and 2.');

    } catch (error) {
        console.error('Error adding RBAC columns:', error);
    }
}

addRbacColumns();
