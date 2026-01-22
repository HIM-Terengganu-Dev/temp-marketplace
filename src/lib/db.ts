import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables if not already loaded (for scripts)
if (typeof window === 'undefined') {
    dotenv.config();
}

// Get database connection string from environment
const connectionString = process.env.HP_marketplace_db_ddl;

if (!connectionString) {
    throw new Error('HP_marketplace_db_ddl environment variable is not set');
}

// Create a connection pool
export const pool = new Pool({
    connectionString,
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

