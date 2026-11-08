import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import crypto from 'crypto';
import { query } from '../src/lib/db';

async function setup() {
    try {
        console.log('Creating table credentials.api_keys...');
        await query(`
            CREATE TABLE IF NOT EXISTS credentials.api_keys (
                id SERIAL PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                key_prefix VARCHAR(25) NOT NULL,
                key_hash VARCHAR(255) NOT NULL UNIQUE,
                company_access VARCHAR(30) DEFAULT 'ALL',
                created_by VARCHAR(100) DEFAULT 'admin',
                is_active BOOLEAN DEFAULT TRUE,
                last_used_at TIMESTAMP WITH TIME ZONE NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('credentials.api_keys table ready.');

        const masterKey = 'mk_live_7814a9cd126860a8aa0ccc839bdfbdb8bed0b5caa48e969a';
        const hash = crypto.createHash('sha256').update(masterKey).digest('hex');
        const prefix = masterKey.slice(0, 16) + '...';

        const existing = await query('SELECT id FROM credentials.api_keys WHERE key_hash = $1', [hash]);
        if (existing.rows.length === 0) {
            await query(`
                INSERT INTO credentials.api_keys (name, key_prefix, key_hash, company_access, created_by)
                VALUES ($1, $2, $3, $4, $5)
            `, ['Master Initial Key (Vercel ENV)', prefix, hash, 'ALL', 'system']);
            console.log('Master initial key added to credentials.api_keys.');
        } else {
            console.log('Master initial key already present.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Setup failed:', err);
        process.exit(1);
    }
}

setup();
