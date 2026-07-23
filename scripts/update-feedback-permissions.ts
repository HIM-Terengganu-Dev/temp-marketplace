import { query } from '../src/lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function updateFeedbackPermissions() {
    console.log('Updating allowed_features for all users in credentials.users to include feedback...');
    try {
        await query(`
            UPDATE credentials.users 
            SET allowed_features = array_append(allowed_features, 'feedback')
            WHERE NOT ('feedback' = ANY(allowed_features));
        `);
        console.log('✅ Updated users without feedback feature permission.');

        // Update NULL allowed_features to default array with feedback
        await query(`
            UPDATE credentials.users 
            SET allowed_features = '{"overview", "tiktok", "shopee", "ads", "analytics", "debug", "refresh_token", "settings", "feedback"}'
            WHERE allowed_features IS NULL;
        `);
        console.log('✅ Updated NULL allowed_features.');

    } catch (error) {
        console.error('❌ Error updating feedback permissions:', error);
    }
}

updateFeedbackPermissions();
