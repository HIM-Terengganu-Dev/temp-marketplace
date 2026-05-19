import { query } from '../src/lib/db';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    try {
        console.log('Querying credentials.refresh_tiktokshops_token table...');
        const result = await query(`
            SELECT shop_number, shop_name, shop_id, access_token, refresh_token, updated_at
            FROM credentials.refresh_tiktokshops_token
            ORDER BY shop_number
        `);
        
        console.log(`Found ${result.rows.length} rows:`);
        result.rows.forEach((row: any) => {
            console.log(`\nShop #${row.shop_number}: ${row.shop_name}`);
            console.log(`  Shop ID:      ${row.shop_id}`);
            console.log(`  Access Token:  ${row.access_token.substring(0, 15)}...`);
            console.log(`  Refresh Token: ${row.refresh_token.substring(0, 15)}...`);
            console.log(`  Updated At:    ${row.updated_at}`);
        });
        process.exit(0);
    } catch (e) {
        console.error('Error querying DB:', e);
        process.exit(1);
    }
}

main().catch(console.error);
