import { query } from '../src/lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function setupFeedbackDB() {
    console.log('Setting up system_feedback table...');
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS system_feedback (
                id SERIAL PRIMARY KEY,
                type VARCHAR(50) NOT NULL DEFAULT 'improvement',
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                sender_name VARCHAR(255) DEFAULT 'Tester',
                page_url VARCHAR(500),
                priority VARCHAR(50) NOT NULL DEFAULT 'medium',
                status VARCHAR(50) NOT NULL DEFAULT 'Pending',
                admin_notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ system_feedback table created successfully.');
    } catch (error) {
        console.error('❌ Error setting up system_feedback table:', error);
    }
}

setupFeedbackDB();
