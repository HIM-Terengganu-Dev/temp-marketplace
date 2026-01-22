import { query } from '../src/lib/db';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const cleanEnv = (val: string | undefined) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

/**
 * Populate database with current token values from .env
 * This script reads from environment variables and inserts/updates the database
 */
async function populateTokens() {
    try {
        console.log('Populating tokens from environment variables...\n');

        const shops = [
            {
                shopNumber: 1,
                shopName: 'DrSamhanWellness',
                shopId: '7495609155379170274',
                accessToken: cleanEnv(process.env.TIKTOK_SHOP1_ACCESS_TOKEN),
                refreshToken: cleanEnv(process.env.TIKTOK_SHOP1_REFRESH_TOKEN),
                shopCipher: cleanEnv(process.env.TIKTOK_SHOP1_SHOP_CIPHER),
            },
            {
                shopNumber: 2,
                shopName: 'HIM CLINIC',
                shopId: '7495102143139318172',
                accessToken: cleanEnv(process.env.TIKTOK_SHOP2_ACCESS_TOKEN),
                refreshToken: cleanEnv(process.env.TIKTOK_SHOP2_REFRESH_TOKEN),
                shopCipher: cleanEnv(process.env.TIKTOK_SHOP2_SHOP_CIPHER),
            },
            {
                shopNumber: 3,
                shopName: 'Vigomax HQ',
                shopId: '7494799386964364219',
                accessToken: cleanEnv(process.env.TIKTOK_SHOP3_ACCESS_TOKEN),
                refreshToken: cleanEnv(process.env.TIKTOK_SHOP3_REFRESH_TOKEN),
                shopCipher: cleanEnv(process.env.TIKTOK_SHOP3_SHOP_CIPHER),
            },
            {
                shopNumber: 4,
                shopName: 'VigomaxPlus HQ',
                shopId: '7495580262600706099',
                accessToken: cleanEnv(process.env.TIKTOK_SHOP4_ACCESS_TOKEN),
                refreshToken: cleanEnv(process.env.TIKTOK_SHOP4_REFRESH_TOKEN),
                shopCipher: cleanEnv(process.env.TIKTOK_SHOP4_SHOP_CIPHER),
            },
        ];

        for (const shop of shops) {
            if (!shop.accessToken || !shop.refreshToken || !shop.shopCipher) {
                console.log(`⚠️  Skipping shop ${shop.shopNumber} (${shop.shopName}) - missing credentials`);
                continue;
            }

            console.log(`Processing shop ${shop.shopNumber} (${shop.shopName})...`);

            // Use UPSERT (INSERT ... ON CONFLICT UPDATE)
            await query(`
                INSERT INTO credentials.refresh_tiktokshops_token (
                    shop_number, shop_name, shop_id, access_token, refresh_token, shop_cipher, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
                ON CONFLICT (shop_number) 
                DO UPDATE SET
                    shop_name = EXCLUDED.shop_name,
                    shop_id = EXCLUDED.shop_id,
                    access_token = EXCLUDED.access_token,
                    refresh_token = EXCLUDED.refresh_token,
                    shop_cipher = EXCLUDED.shop_cipher,
                    updated_at = CURRENT_TIMESTAMP;
            `, [
                shop.shopNumber,
                shop.shopName,
                shop.shopId,
                shop.accessToken,
                shop.refreshToken,
                shop.shopCipher,
            ]);

            console.log(`✓ Shop ${shop.shopNumber} tokens saved`);
        }

        console.log('\n✅ Token population completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error populating tokens:', error);
        process.exit(1);
    }
}

populateTokens();

