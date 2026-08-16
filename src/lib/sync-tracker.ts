import { query } from './db';

export interface SyncSourceStatus {
    lastFetch: string | null;
    status: 'success' | 'error' | 'syncing' | 'idle';
    latestDate?: string | null;
    totalRecords?: number;
    message?: string;
}

export interface SystemSyncStatusResponse {
    api: {
        tiktok: SyncSourceStatus;
        shopee: SyncSourceStatus;
    };
    database: {
        tiktok: SyncSourceStatus;
        shopee: SyncSourceStatus;
    };
    serverTime: string;
}

let isTableInitialized = false;

export async function ensureSyncStatusTable() {
    if (isTableInitialized) return;
    try {
        await query(`
            CREATE SCHEMA IF NOT EXISTS credentials;
            CREATE TABLE IF NOT EXISTS credentials.system_sync_status (
                source_key VARCHAR(50) PRIMARY KEY,
                last_fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(50) DEFAULT 'success',
                meta JSONB DEFAULT '{}'::jsonb,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        isTableInitialized = true;
    } catch (e: any) {
        console.error('[sync-tracker] Failed to ensure system_sync_status table:', e.message);
    }
}

/**
 * Records an API or DB sync event
 */
export async function recordSyncEvent(
    sourceKey: 'tiktok_api' | 'shopee_api' | 'tiktok_db' | 'shopee_db',
    status: 'success' | 'error' | 'syncing' = 'success',
    meta: Record<string, any> = {}
) {
    try {
        await ensureSyncStatusTable();
        await query(`
            INSERT INTO credentials.system_sync_status (source_key, last_fetched_at, status, meta, updated_at)
            VALUES ($1, CURRENT_TIMESTAMP, $2, $3, CURRENT_TIMESTAMP)
            ON CONFLICT (source_key) DO UPDATE SET
                last_fetched_at = CURRENT_TIMESTAMP,
                status = EXCLUDED.status,
                meta = EXCLUDED.meta,
                updated_at = CURRENT_TIMESTAMP;
        `, [sourceKey, status, JSON.stringify(meta)]);
    } catch (e: any) {
        console.error(`[sync-tracker] Failed to record sync event for ${sourceKey}:`, e.message);
    }
}

/**
 * Retrieves comprehensive sync status for both API and Database (TikTok + Shopee)
 */
export async function getSystemSyncStatus(): Promise<SystemSyncStatusResponse> {
    await ensureSyncStatusTable();

    // Default fallback values
    let tiktokApiStatus: SyncSourceStatus = { lastFetch: null, status: 'idle' };
    let shopeeApiStatus: SyncSourceStatus = { lastFetch: null, status: 'idle' };
    let tiktokDbStatus: SyncSourceStatus = { lastFetch: null, status: 'idle', latestDate: null, totalRecords: 0 };
    let shopeeDbStatus: SyncSourceStatus = { lastFetch: null, status: 'idle', latestDate: null, totalRecords: 0 };

    try {
        // 1. Fetch system_sync_status table records
        const statusResult = await query(`
            SELECT source_key, last_fetched_at, status, meta, updated_at
            FROM credentials.system_sync_status
        `);

        statusResult.rows.forEach(row => {
            const dateIso = row.last_fetched_at ? new Date(row.last_fetched_at).toISOString() : null;
            if (row.source_key === 'tiktok_api') {
                tiktokApiStatus = {
                    lastFetch: dateIso,
                    status: (row.status as any) || 'success',
                    message: row.meta?.message
                };
            } else if (row.source_key === 'shopee_api') {
                shopeeApiStatus = {
                    lastFetch: dateIso,
                    status: (row.status as any) || 'success',
                    message: row.meta?.message
                };
            }
        });

        // 2. Query TikTok database metrics
        const tiktokDbResult = await query(`
            SELECT 
                MAX(updated_at) as last_updated,
                TO_CHAR(MAX(date), 'YYYY-MM-DD') as latest_date,
                COUNT(*)::int as total_records
            FROM credentials.daily_shop_metrics
        `);

        if (tiktokDbResult.rows[0]) {
            const row = tiktokDbResult.rows[0];
            const lastUpdatedIso = row.last_updated ? new Date(row.last_updated).toISOString() : null;
            tiktokDbStatus = {
                lastFetch: lastUpdatedIso,
                status: row.total_records > 0 ? 'success' : 'idle',
                latestDate: row.latest_date,
                totalRecords: row.total_records
            };

            // If tiktok_api has never been recorded separately, fallback to last DB update
            if (!tiktokApiStatus.lastFetch && lastUpdatedIso) {
                tiktokApiStatus.lastFetch = lastUpdatedIso;
                tiktokApiStatus.status = 'success';
            }
        }

        // 3. Query Shopee database metrics
        const shopeeDbResult = await query(`
            SELECT 
                MAX(updated_at) as last_updated,
                TO_CHAR(MAX(date), 'YYYY-MM-DD') as latest_date,
                COUNT(*)::int as total_records
            FROM credentials.daily_shopee_metrics
        `);

        if (shopeeDbResult.rows[0]) {
            const row = shopeeDbResult.rows[0];
            const lastUpdatedIso = row.last_updated ? new Date(row.last_updated).toISOString() : null;
            shopeeDbStatus = {
                lastFetch: lastUpdatedIso,
                status: row.total_records > 0 ? 'success' : 'idle',
                latestDate: row.latest_date,
                totalRecords: row.total_records
            };

            // If shopee_api has never been recorded separately, fallback to last DB update
            if (!shopeeApiStatus.lastFetch && lastUpdatedIso) {
                shopeeApiStatus.lastFetch = lastUpdatedIso;
                shopeeApiStatus.status = 'success';
            }
        }

    } catch (e: any) {
        console.error('[sync-tracker] Error fetching system sync status:', e.message);
    }

    return {
        api: {
            tiktok: tiktokApiStatus,
            shopee: shopeeApiStatus
        },
        database: {
            tiktok: tiktokDbStatus,
            shopee: shopeeDbStatus
        },
        serverTime: new Date().toISOString()
    };
}
