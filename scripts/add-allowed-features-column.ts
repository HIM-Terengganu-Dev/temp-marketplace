import { query } from '../src/lib/db';
import dotenv from 'dotenv';
dotenv.config();

async function addAllowedFeaturesColumn() {
    console.log('Adding allowed_features column to credentials.users...');
    try {
        await query(`
            ALTER TABLE credentials.users 
            ADD COLUMN IF NOT EXISTS allowed_features TEXT[] DEFAULT '{"overview", "tiktok", "shopee", "ads", "analytics", "refresh_token"}';
        `);
        console.log('✅ allowed_features column added successfully.');

        // Update default admin to have access to all features, including debug
        await query(`
            UPDATE credentials.users 
            SET allowed_features = '{"overview", "tiktok", "shopee", "ads", "analytics", "debug", "refresh_token", "settings"}'
            WHERE role = 'admin';
        `);
        console.log('✅ Admin set to all features.');

        // Update default user to have access to standard features (no debug, no settings)
        await query(`
            UPDATE credentials.users 
            SET allowed_features = '{"overview", "tiktok", "shopee", "ads", "analytics"}'
            WHERE email = 'user@example.com';
        `);
        console.log('✅ Standard user set to standard features only.');

    } catch (error) {
        console.error('Error adding allowed_features column:', error);
    }
}

addAllowedFeaturesColumn();
