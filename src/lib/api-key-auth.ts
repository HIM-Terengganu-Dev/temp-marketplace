import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';

export interface ApiKeyAuthResult {
    isValid: boolean;
    companyAccess: 'ALL' | 'HIMWELLNESS' | 'WEROCA';
    keyName?: string;
    errorResponse?: NextResponse;
}

/**
 * Validates external API key from 'x-api-key' or 'Authorization: Bearer <key>'.
 * Checks against MARKETPLACE_API_KEY env var (master) and credentials.api_keys table in DB.
 */
export async function validateApiKey(request: Request): Promise<ApiKeyAuthResult> {
    const configuredMasterKey = process.env.MARKETPLACE_API_KEY;

    const headerKey = request.headers.get('x-api-key');
    const authHeader = request.headers.get('authorization');
    const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    const providedKey = (headerKey || bearerKey || '').trim();

    if (!providedKey) {
        return {
            isValid: false,
            companyAccess: 'ALL',
            errorResponse: NextResponse.json(
                { success: false, error: 'Unauthorized: Missing API key. Provide via x-api-key header or Authorization: Bearer <key>' },
                { status: 401 }
            )
        };
    }

    // 1. Check against Master Key from ENV
    if (configuredMasterKey) {
        const providedBuffer = Buffer.from(providedKey);
        const configuredBuffer = Buffer.from(configuredMasterKey);

        if (providedBuffer.length === configuredBuffer.length && crypto.timingSafeEqual(providedBuffer, configuredBuffer)) {
            return {
                isValid: true,
                companyAccess: 'ALL',
                keyName: 'Master Key'
            };
        }
    }

    // 2. Check against Database Table (credentials.api_keys)
    try {
        const keyHash = crypto.createHash('sha256').update(providedKey).digest('hex');

        const dbRes = await query(`
            SELECT id, name, company_access, is_active
            FROM credentials.api_keys
            WHERE key_hash = $1
            LIMIT 1
        `, [keyHash]);

        if (dbRes.rows.length > 0) {
            const keyRecord = dbRes.rows[0];

            if (!keyRecord.is_active) {
                return {
                    isValid: false,
                    companyAccess: 'ALL',
                    errorResponse: NextResponse.json(
                        { success: false, error: 'Unauthorized: API key has been revoked' },
                        { status: 403 }
                    )
                };
            }

            // Update last_used_at in background (do not wait)
            query('UPDATE credentials.api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [keyRecord.id])
                .catch(err => console.error('[API_AUTH] Failed to update last_used_at:', err.message));

            const access = (keyRecord.company_access || 'ALL').toUpperCase() as 'ALL' | 'HIMWELLNESS' | 'WEROCA';

            return {
                isValid: true,
                companyAccess: ['ALL', 'HIMWELLNESS', 'WEROCA'].includes(access) ? access : 'ALL',
                keyName: keyRecord.name
            };
        }
    } catch (dbErr: any) {
        console.error('[API_AUTH] Database lookup error:', dbErr.message);
    }

    return {
        isValid: false,
        companyAccess: 'ALL',
        errorResponse: NextResponse.json(
            { success: false, error: 'Unauthorized: Invalid API key' },
            { status: 401 }
        )
    };
}
