import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables if not already loaded (for scripts)
if (typeof window === 'undefined') {
    dotenv.config({ path: '.env.local' });
    dotenv.config();
}

// Get database connection string from environment
const connectionString = process.env.HP_marketplace_db_ddl;

if (!connectionString) {
    throw new Error('HP_marketplace_db_ddl environment variable is not set');
}

// Create a connection pool with performance bounds
export const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Helper function to execute queries
export async function query(text: string, params?: any[]) {
    const client = await pool.connect();
    try {
        const result = await client.query(text, params);
        return result;
    } finally {
        client.release();
    }
}

