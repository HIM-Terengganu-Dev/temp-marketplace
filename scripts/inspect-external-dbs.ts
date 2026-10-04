import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const databases = [
    { name: 'hw-affiliate-management', envVar: 'DB_AFFILIATE_URL' },
    { name: 'hw-livehost-management', envVar: 'DB_LIVEHOST_URL' },
    { name: 'hw-marketing-tracking', envVar: 'DB_MARKETING_URL' },
    { name: 'hw-stock-inventory', envVar: 'DB_STOCK_URL' }
];

async function inspectDb(name: string, connectionString: string) {
    console.log(`\n==================================================`);
    console.log(`DATABASE: ${name}`);
    console.log(`==================================================`);
    
    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
    });

    try {
        const client = await pool.connect();
        try {
            // Get public tables
            const tablesRes = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                  AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            `);

            if (tablesRes.rows.length === 0) {
                console.log('No public tables found.');
                return;
            }

            for (const row of tablesRes.rows) {
                const tableName = row.table_name;
                // Get count
                try {
                    const countRes = await client.query(`SELECT count(*)::int as count FROM "${tableName}"`);
                    const count = countRes.rows[0].count;

                    // Get column names
                    const colsRes = await client.query(`
                        SELECT column_name, data_type 
                        FROM information_schema.columns 
                        WHERE table_schema = 'public' AND table_name = $1
                        ORDER BY ordinal_position
                        LIMIT 10;
                    `, [tableName]);
                    const cols = colsRes.rows.map(c => `${c.column_name} (${c.data_type})`).join(', ');

                    console.log(`- ${tableName} [${count} rows]`);
                    console.log(`  Columns: ${cols}`);
                } catch (e: any) {
                    console.log(`- ${tableName} (Error querying: ${e.message})`);
                }
            }
        } finally {
            client.release();
        }
    } catch (err: any) {
        console.error(`Failed to connect to ${name}:`, err.message);
    } finally {
        await pool.end();
    }
}

async function main() {
    for (const db of databases) {
        const url = process.env[db.envVar];
        if (!url) {
            console.warn(`Missing env var ${db.envVar}`);
            continue;
        }
        await inspectDb(db.name, url);
    }
}

main().catch(console.error);
