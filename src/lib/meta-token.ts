import axios from 'axios';
import { query } from './db';

export interface MetaTokenInspection {
    isValid: boolean;
    isExpired: boolean;
    expiresAt: Date | null;
    expiresInSeconds: number | null;
    dataAccessExpiresAt: Date | null;
    appId?: string;
    userId?: string;
    scopes?: string[];
    error?: {
        message: string;
        code: number;
        subcode?: number;
    };
}

export interface RefreshMetaTokenResult {
    success: boolean;
    accessToken?: string;
    tokenType?: string;
    expiresIn?: number;
    expiresAt?: Date;
    isExpired?: boolean;
    requiresReauth?: boolean;
    reauthUrl?: string;
    error?: string;
    errorCode?: number;
}

export interface GetValidMetaTokenResult {
    token: string | null;
    status: 'valid' | 'refreshed' | 'token_expired' | 'unconfigured' | 'error';
    expiresAt?: Date | null;
    message?: string;
    reauthUrl?: string;
}

const DEFAULT_REDIRECT_URI = 'https://temp-marketplace.vercel.app/facebook/callback';
const DEFAULT_SCOPES = ['ads_read', 'pages_read_engagement', 'business_management'];

/**
 * Generate Facebook OAuth authorization URL for manual or re-authentication
 */
export function generateMetaOAuthUrl(
    clientId?: string,
    redirectUri: string = DEFAULT_REDIRECT_URI,
    scopes: string[] = DEFAULT_SCOPES
): string {
    const finalClientId = clientId || process.env.FB_CLIENT_ID || '';
    if (!finalClientId) return '';
    const scopeStr = scopes.join(',');
    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${finalClientId.trim()}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopeStr}&response_type=code`;
}

/**
 * Ensure the credentials.meta_tokens table exists in PostgreSQL
 */
export async function ensureMetaTokenTable(): Promise<void> {
    try {
        await query(`
            CREATE SCHEMA IF NOT EXISTS credentials;
            CREATE TABLE IF NOT EXISTS credentials.meta_tokens (
                id SERIAL PRIMARY KEY,
                app_id VARCHAR(100),
                user_id VARCHAR(100),
                access_token TEXT NOT NULL,
                token_type VARCHAR(50) DEFAULT 'bearer',
                expires_in INTEGER,
                expires_at TIMESTAMP WITH TIME ZONE,
                data_access_expires_at TIMESTAMP WITH TIME ZONE,
                status VARCHAR(50) DEFAULT 'active',
                last_refreshed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_meta_tokens_status ON credentials.meta_tokens(status);
        `);
    } catch (err: any) {
        console.warn('[meta-token] Failed to ensure meta_tokens table:', err.message);
    }
}

/**
 * Save or update Meta token in database
 */
export async function saveMetaToken(params: {
    accessToken: string;
    expiresIn?: number;
    appId?: string;
    userId?: string;
    tokenType?: string;
}): Promise<void> {
    try {
        await ensureMetaTokenTable();
        const expiresInSec = params.expiresIn || 5184000; // default 60 days in seconds
        const expiresAt = new Date(Date.now() + expiresInSec * 1000);

        // Deactivate older tokens
        await query(`UPDATE credentials.meta_tokens SET status = 'replaced' WHERE status = 'active'`);

        // Insert new active token
        await query(`
            INSERT INTO credentials.meta_tokens (
                app_id,
                user_id,
                access_token,
                token_type,
                expires_in,
                expires_at,
                status,
                last_refreshed_at,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
            params.appId || process.env.FB_CLIENT_ID || null,
            params.userId || null,
            params.accessToken,
            params.tokenType || 'bearer',
            expiresInSec,
            expiresAt
        ]);
        console.log(`[meta-token] Token saved to database successfully. Expires at: ${expiresAt.toISOString()}`);
    } catch (err: any) {
        console.error('[meta-token] Error saving token to database:', err.message);
    }
}

/**
 * Retrieve active token from database (falls back to null if none found)
 */
export async function getMetaTokenFromDb(): Promise<{
    accessToken: string;
    expiresAt: Date | null;
    status: string;
    appId: string | null;
} | null> {
    try {
        await ensureMetaTokenTable();
        const res = await query(`
            SELECT access_token, expires_at, status, app_id 
            FROM credentials.meta_tokens 
            WHERE status = 'active' 
            ORDER BY id DESC 
            LIMIT 1
        `);

        if (res.rows.length > 0) {
            const row = res.rows[0];
            return {
                accessToken: row.access_token,
                expiresAt: row.expires_at ? new Date(row.expires_at) : null,
                status: row.status,
                appId: row.app_id
            };
        }
        return null;
    } catch (err: any) {
        console.warn('[meta-token] Failed reading token from DB:', err.message);
        return null;
    }
}

/**
 * Inspect a Meta token using Meta Graph API debug_token endpoint or /me fallback
 */
export async function inspectMetaToken(
    token?: string,
    clientId?: string,
    clientSecret?: string
): Promise<MetaTokenInspection> {
    const finalToken = token || (await getMetaTokenFromDb())?.accessToken || process.env.FB_ACCESS_TOKEN;
    const finalClientId = clientId || process.env.FB_CLIENT_ID;
    const finalClientSecret = clientSecret || process.env.FB_CLIENT_SECRET;

    if (!finalToken) {
        return {
            isValid: false,
            isExpired: true,
            expiresAt: null,
            expiresInSeconds: null,
            dataAccessExpiresAt: null,
            error: {
                message: 'No Meta token provided or configured.',
                code: 0
            }
        };
    }

    // Try debug_token endpoint if App ID & Secret are available
    if (finalClientId && finalClientSecret) {
        try {
            const appAccessToken = `${finalClientId}|${finalClientSecret}`;
            const url = `https://graph.facebook.com/v19.0/debug_token?input_token=${encodeURIComponent(finalToken)}&access_token=${encodeURIComponent(appAccessToken)}`;
            const response = await axios.get(url);
            const data = response.data?.data;

            if (data) {
                const expiresAtTimestamp = data.expires_at ? data.expires_at * 1000 : null;
                const expiresAt = expiresAtTimestamp && expiresAtTimestamp > 0 ? new Date(expiresAtTimestamp) : null;
                const now = Date.now();
                const isExpired = !data.is_valid || (expiresAt ? expiresAt.getTime() <= now : false);
                const expiresInSeconds = expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - now) / 1000)) : null;
                const dataAccessExpiresAt = data.data_access_expires_at ? new Date(data.data_access_expires_at * 1000) : null;

                return {
                    isValid: data.is_valid && !isExpired,
                    isExpired,
                    expiresAt,
                    expiresInSeconds,
                    dataAccessExpiresAt,
                    appId: data.app_id,
                    userId: data.user_id,
                    scopes: data.scopes || [],
                    error: data.error
                };
            }
        } catch (err: any) {
            console.warn('[meta-token] debug_token API call failed, falling back to /me check:', err.response?.data || err.message);
        }
    }

    // Fallback: Test token directly via /me
    try {
        const response = await axios.get(`https://graph.facebook.com/v19.0/me?access_token=${encodeURIComponent(finalToken)}`);
        return {
            isValid: true,
            isExpired: false,
            expiresAt: null,
            expiresInSeconds: null,
            dataAccessExpiresAt: null,
            userId: response.data?.id
        };
    } catch (err: any) {
        const errorData = err.response?.data?.error;
        const code = errorData?.code || 0;
        const subcode = errorData?.error_subcode;
        const isExpired = code === 190 || err.response?.status === 401;

        return {
            isValid: false,
            isExpired,
            expiresAt: null,
            expiresInSeconds: 0,
            dataAccessExpiresAt: null,
            error: {
                message: errorData?.message || err.message,
                code,
                subcode
            }
        };
    }
}

/**
 * Refresh an existing Meta access token using Meta's fb_exchange_token flow.
 * Note: Per Meta OAuth rules:
 * - A valid token can be refreshed/extended for another 60 days when at least 24 hours old.
 * - If a token has completely expired or was invalidated (Error 190), Meta requires user re-authorization.
 */
export async function refreshMetaAccessToken(options?: {
    token?: string;
    clientId?: string;
    clientSecret?: string;
    saveToDatabase?: boolean;
}): Promise<RefreshMetaTokenResult> {
    const dbToken = await getMetaTokenFromDb();
    const currentToken = options?.token || dbToken?.accessToken || process.env.FB_ACCESS_TOKEN;
    const finalClientId = options?.clientId || dbToken?.appId || process.env.FB_CLIENT_ID;
    const finalClientSecret = options?.clientSecret || process.env.FB_CLIENT_SECRET;
    const shouldSave = options?.saveToDatabase !== false;

    if (!currentToken) {
        return {
            success: false,
            isExpired: true,
            error: 'No Meta access token provided or found in database/environment.'
        };
    }

    if (!finalClientId || !finalClientSecret) {
        const reauthUrl = generateMetaOAuthUrl(finalClientId);
        return {
            success: false,
            error: 'Meta Client ID (FB_CLIENT_ID) and Client Secret (FB_CLIENT_SECRET) are required to refresh token.',
            reauthUrl
        };
    }

    const exchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${finalClientId.trim()}&client_secret=${finalClientSecret.trim()}&fb_exchange_token=${currentToken.trim()}`;

    try {
        console.log(`[meta-token] Exchanging Meta token with fb_exchange_token (App ID: ${finalClientId})...`);
        const response = await axios.get(exchangeUrl);
        const data = response.data;

        if (!data?.access_token) {
            throw new Error('Meta API returned response without access_token.');
        }

        const expiresIn = data.expires_in || 5184000; // ~60 days default
        const expiresAt = new Date(Date.now() + expiresIn * 1000);

        if (shouldSave) {
            await saveMetaToken({
                accessToken: data.access_token,
                expiresIn,
                appId: finalClientId,
                tokenType: data.token_type
            });
        }

        console.log(`[meta-token] Meta token refreshed successfully! Expires in ${Math.round(expiresIn / 86400)} days.`);

        return {
            success: true,
            accessToken: data.access_token,
            tokenType: data.token_type || 'bearer',
            expiresIn,
            expiresAt
        };
    } catch (err: any) {
        const errorData = err.response?.data?.error;
        const code = errorData?.code || 0;
        const subcode = errorData?.error_subcode;
        const errorMsg = errorData?.message || err.message || 'Failed to exchange Meta access token.';
        const isExpired = code === 190 || subcode === 463 || subcode === 467 || err.response?.status === 401;

        console.warn(`[meta-token] Token refresh failed: Code ${code} (subcode ${subcode}) - ${errorMsg}`);

        // If expired or invalidated, update database status
        if (isExpired && shouldSave) {
            try {
                await query(`UPDATE credentials.meta_tokens SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE status = 'active'`);
            } catch (e: any) {
                console.warn('[meta-token] Failed marking token expired in DB:', e.message);
            }
        }

        const reauthUrl = generateMetaOAuthUrl(finalClientId);

        return {
            success: false,
            isExpired,
            requiresReauth: isExpired,
            reauthUrl,
            error: errorMsg,
            errorCode: code
        };
    }
}

/**
 * Returns a valid Meta access token.
 * Automatically checks expiry and refreshes if expiring soon (< 7 days) or if forceRefresh is true.
 * If expired and cannot be auto-refreshed, returns status 'token_expired' with reauthUrl.
 */
export async function getValidMetaToken(forceRefresh = false): Promise<GetValidMetaTokenResult> {
    const dbRecord = await getMetaTokenFromDb();
    const token = dbRecord?.accessToken || process.env.FB_ACCESS_TOKEN;

    if (!token) {
        return {
            token: null,
            status: 'unconfigured',
            message: 'No Meta access token configured in database or environment.'
        };
    }

    const now = Date.now();
    let expiresAt = dbRecord?.expiresAt || null;

    // If expiration date is unknown (e.g., initial token from .env), inspect it
    if (!expiresAt) {
        const inspection = await inspectMetaToken(token);
        if (inspection.isExpired) {
            console.log('[meta-token] Token inspected as expired. Attempting refresh...');
            const refreshRes = await refreshMetaAccessToken({ token, saveToDatabase: true });
            if (refreshRes.success && refreshRes.accessToken) {
                return {
                    token: refreshRes.accessToken,
                    status: 'refreshed',
                    expiresAt: refreshRes.expiresAt,
                    message: `Token refreshed successfully. Valid until ${refreshRes.expiresAt?.toISOString()}.`
                };
            }
            return {
                token: null,
                status: 'token_expired',
                expiresAt: inspection.expiresAt,
                message: inspection.error?.message || refreshRes.error || 'Meta access token has expired and requires re-authorization.',
                reauthUrl: refreshRes.reauthUrl || generateMetaOAuthUrl()
            };
        } else if (inspection.isValid) {
            expiresAt = inspection.expiresAt;
            // Cache verified token into database
            if (inspection.expiresInSeconds) {
                await saveMetaToken({
                    accessToken: token,
                    expiresIn: inspection.expiresInSeconds,
                    appId: inspection.appId
                });
            }
        }
    }

    // Check if refresh is needed: forceRefresh OR expiring within 7 days
    const EXPIRY_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    const isCloseToExpiry = expiresAt ? (expiresAt.getTime() - now < EXPIRY_THRESHOLD_MS) : false;
    const isPastExpiry = expiresAt ? (expiresAt.getTime() <= now) : false;

    if (forceRefresh || isCloseToExpiry || isPastExpiry) {
        console.log(`[meta-token] Token needs refresh (force=${forceRefresh}, close=${isCloseToExpiry}, expired=${isPastExpiry}). Refreshing...`);
        const refreshRes = await refreshMetaAccessToken({ token, saveToDatabase: true });

        if (refreshRes.success && refreshRes.accessToken) {
            return {
                token: refreshRes.accessToken,
                status: 'refreshed',
                expiresAt: refreshRes.expiresAt,
                message: `Token refreshed successfully. Valid until ${refreshRes.expiresAt?.toISOString()}.`
            };
        }

        // If refresh failed because session is expired
        if (refreshRes.isExpired) {
            return {
                token: null,
                status: 'token_expired',
                expiresAt,
                message: refreshRes.error || 'Meta access token has expired and requires re-authorization.',
                reauthUrl: refreshRes.reauthUrl || generateMetaOAuthUrl()
            };
        }

        // Other error during refresh
        return {
            token,
            status: 'error',
            expiresAt,
            message: refreshRes.error || 'Failed to refresh token.'
        };
    }

    // Token is still within valid period
    return {
        token,
        status: 'valid',
        expiresAt,
        message: 'Active Meta token valid.'
    };
}
