import { Pool } from 'pg';
import dotenv from 'dotenv';
import { pool as localPool } from './db';

if (typeof window === 'undefined') {
    dotenv.config({ path: '.env.local' });
    dotenv.config();
}

export interface ExternalSystemConfig {
    key: string;
    name: string;
    envVar: string;
    description: string;
    icon: string;
    primaryTables: string[];
    dateColumns: Record<string, string>;
}

export const EXTERNAL_SYSTEMS: ExternalSystemConfig[] = [
    {
        key: 'affiliate',
        name: 'Affiliate Management',
        envVar: 'DB_AFFILIATE_URL',
        description: 'Creator roster, recruitment entries, targets, and affiliate performance',
        icon: 'Users',
        primaryTables: ['affiliates', 'recruitment_entries', 'affiliate_records', 'creator_targets', 'shops'],
        dateColumns: {
            affiliates: 'created_at',
            recruitment_entries: 'updated_at',
            affiliate_records: 'created_at',
            creator_targets: 'updated_at',
            shops: 'created_at',
        }
    },
    {
        key: 'livehost',
        name: 'Live Host Management',
        envVar: 'DB_LIVEHOST_URL',
        description: 'Livestream session reports, host shifts, targets, and account metrics',
        icon: 'Video',
        primaryTables: ['SessionReport', 'Shift', 'HostTarget', 'LiveAccount', 'User'],
        dateColumns: {
            SessionReport: 'updatedAt',
            Shift: 'updatedAt',
            HostTarget: 'updatedAt',
            LiveAccount: 'createdAt',
            User: 'updatedAt',
        }
    },
    {
        key: 'marketing',
        name: 'Marketing & Video Tracking',
        envVar: 'DB_MARKETING_URL',
        description: 'TikTok/Shopee video records, views, likes, creator handles, and upload logs',
        icon: 'Megaphone',
        primaryTables: ['VideoRecord', 'ImportLog', 'InternalHandle'],
        dateColumns: {
            VideoRecord: 'updatedAt',
            ImportLog: 'uploadedAt',
            InternalHandle: 'updatedAt',
        }
    },
    {
        key: 'stock',
        name: 'Stock & Inventory',
        envVar: 'DB_STOCK_URL',
        description: 'Product SKUs, COGS, bundle combinations, upload logs, and marketplace orders',
        icon: 'Boxes',
        primaryTables: ['skus', 'orders', 'combo_components', 'upload_log'],
        dateColumns: {
            skus: 'updated_at',
            orders: 'order_time',
            upload_log: 'upload_timestamp',
        }
    }
];

// Connection pool cache
const pools: Record<string, Pool> = {};

function getPool(key: string): Pool | null {
    if (key === 'local') return localPool;

    if (pools[key]) return pools[key];

    const config = EXTERNAL_SYSTEMS.find(s => s.key === key);
    if (!config) return null;

    const connectionString = process.env[config.envVar];
    if (!connectionString) return null;

    const pool = new Pool({
        connectionString,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: { rejectUnauthorized: false },
    });

    pools[key] = pool;
    return pool;
}

export interface TableSummary {
    tableName: string;
    rowCount: number;
    lastUpdated: string | null;
    columns: { name: string; type: string }[];
}

export interface SystemHealthStatus {
    key: string;
    name: string;
    description: string;
    status: 'connected' | 'disconnected' | 'missing_config';
    latencyMs: number | null;
    totalTables: number;
    totalRows: number;
    latestActivity: string | null;
    tables: TableSummary[];
    error?: string;
}

export async function checkSystemHealth(system: ExternalSystemConfig): Promise<SystemHealthStatus> {
    const connectionString = process.env[system.envVar];
    if (!connectionString) {
        return {
            key: system.key,
            name: system.name,
            description: system.description,
            status: 'missing_config',
            latencyMs: null,
            totalTables: 0,
            totalRows: 0,
            latestActivity: null,
            tables: [],
            error: `Environment variable ${system.envVar} not configured`
        };
    }

    const pool = getPool(system.key);
    if (!pool) {
        return {
            key: system.key,
            name: system.name,
            description: system.description,
            status: 'disconnected',
            latencyMs: null,
            totalTables: 0,
            totalRows: 0,
            latestActivity: null,
            tables: [],
            error: 'Failed to create connection pool'
        };
    }

    const start = Date.now();
    try {
        const client = await pool.connect();
        let latencyMs = 0;
        try {
            await client.query('SELECT 1');
            latencyMs = Date.now() - start;

            // Get tables
            const tablesRes = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            `);

            const tables: TableSummary[] = [];
            let totalRows = 0;
            let latestActivity: string | null = null;

            for (const row of tablesRes.rows) {
                const tableName = row.table_name;
                try {
                    const countRes = await client.query(`SELECT count(*)::int as count FROM "${tableName}"`);
                    const rowCount = countRes.rows[0]?.count || 0;
                    totalRows += rowCount;

                    // Inspect columns
                    const colsRes = await client.query(`
                        SELECT column_name, data_type 
                        FROM information_schema.columns 
                        WHERE table_schema = 'public' AND table_name = $1
                        ORDER BY ordinal_position
                    `, [tableName]);

                    const cols = colsRes.rows.map(c => ({ name: c.column_name, type: c.data_type }));

                    // Find latest date column
                    let lastUpdated: string | null = null;
                    const dateCol = system.dateColumns[tableName] || 
                                    cols.find(c => ['updated_at', 'updatedAt', 'created_at', 'createdAt', 'order_time', 'publishTime', 'upload_timestamp'].includes(c.name))?.name;

                    if (dateCol && rowCount > 0) {
                        try {
                            const dateRes = await client.query(`SELECT MAX("${dateCol}") as latest FROM "${tableName}"`);
                            const rawDate = dateRes.rows[0]?.latest;
                            if (rawDate) {
                                lastUpdated = new Date(rawDate).toISOString();
                                if (!latestActivity || new Date(rawDate) > new Date(latestActivity)) {
                                    latestActivity = lastUpdated;
                                }
                            }
                        } catch {
                            // ignore date parse errors
                        }
                    }

                    tables.push({
                        tableName,
                        rowCount,
                        lastUpdated,
                        columns: cols
                    });
                } catch (tErr: any) {
                    tables.push({
                        tableName,
                        rowCount: 0,
                        lastUpdated: null,
                        columns: []
                    });
                }
            }

            return {
                key: system.key,
                name: system.name,
                description: system.description,
                status: 'connected',
                latencyMs,
                totalTables: tables.length,
                totalRows,
                latestActivity,
                tables
            };
        } finally {
            client.release();
        }
    } catch (err: any) {
        return {
            key: system.key,
            name: system.name,
            description: system.description,
            status: 'disconnected',
            latencyMs: null,
            totalTables: 0,
            totalRows: 0,
            latestActivity: null,
            tables: [],
            error: err.message
        };
    }
}

export async function checkAllSystems(): Promise<{ systems: SystemHealthStatus[]; local: SystemHealthStatus }> {
    const systems = await Promise.all(EXTERNAL_SYSTEMS.map(sys => checkSystemHealth(sys)));

    // Also check local marketplace DB
    let localStatus: SystemHealthStatus;
    const start = Date.now();
    try {
        const client = await localPool.connect();
        try {
            await client.query('SELECT 1');
            const latencyMs = Date.now() - start;

            const localTablesRes = await client.query(`
                SELECT table_schema, table_name 
                FROM information_schema.tables 
                WHERE table_schema IN ('credentials', 'public') AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            `);

            let totalRows = 0;
            const tables: TableSummary[] = [];

            for (const r of localTablesRes.rows) {
                const schema = r.table_schema;
                const tbl = r.table_name;
                try {
                    const cRes = await client.query(`SELECT count(*)::int as count FROM "${schema}"."${tbl}"`);
                    const count = cRes.rows[0]?.count || 0;
                    totalRows += count;
                    tables.push({
                        tableName: `${schema}.${tbl}`,
                        rowCount: count,
                        lastUpdated: null,
                        columns: []
                    });
                } catch {
                    // skip
                }
            }

            localStatus = {
                key: 'local',
                name: 'HP Marketplace (Local)',
                description: 'Core marketplace tracking, synced daily metrics, tokens, and targets',
                status: 'connected',
                latencyMs,
                totalTables: tables.length,
                totalRows,
                latestActivity: new Date().toISOString(),
                tables
            };
        } finally {
            client.release();
        }
    } catch (err: any) {
        localStatus = {
            key: 'local',
            name: 'HP Marketplace (Local)',
            description: 'Core marketplace database',
            status: 'disconnected',
            latencyMs: null,
            totalTables: 0,
            totalRows: 0,
            latestActivity: null,
            tables: [],
            error: err.message
        };
    }

    return { systems, local: localStatus };
}

export async function getTablePreview(systemKey: string, tableName: string, limit = 25, offset = 0) {
    const pool = getPool(systemKey);
    if (!pool) {
        throw new Error(`System ${systemKey} not found or not connected`);
    }

    // Sanitize table name against alphanumeric / underscore
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
        throw new Error('Invalid table name format');
    }

    const client = await pool.connect();
    try {
        const countRes = await client.query(`SELECT count(*)::int as total FROM "${tableName}"`);
        const total = countRes.rows[0]?.total || 0;

        const colsRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
        `, [tableName]);

        const rowsRes = await client.query(`
            SELECT * FROM "${tableName}" 
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        return {
            tableName,
            total,
            columns: colsRes.rows,
            rows: rowsRes.rows
        };
    } finally {
        client.release();
    }
}
