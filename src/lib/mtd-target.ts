import { query } from '@/lib/db';

export interface MtdTargetRecord {
    targetMonth: string;
    company: string;
    monthlyTarget: number;
    tiktokTargetVal: number;
    updatedAt?: string | null;
    updatedBy?: string | null;
    isDefault?: boolean;
}

const DEFAULT_TARGET = 4000000;
const DEFAULT_TIKTOK_SPLIT = 3000000;

/**
 * Retrieves the MTD target and TikTok split from database for the specified month and company stream.
 * Falls back to company 'ALL', latest set target, or default if not configured.
 */
export async function getMtdTarget(targetMonth: string, company: string = 'ALL'): Promise<MtdTargetRecord> {
    const comp = (company || 'ALL').toUpperCase();

    try {
        // Ensure table exists
        await query(`
            CREATE TABLE IF NOT EXISTS credentials.mtd_targets (
                id SERIAL PRIMARY KEY,
                target_month VARCHAR(7) NOT NULL,
                company VARCHAR(32) NOT NULL DEFAULT 'ALL',
                monthly_target NUMERIC(15, 2) NOT NULL DEFAULT 4000000,
                tiktok_target_val NUMERIC(15, 2) NOT NULL DEFAULT 3000000,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                updated_by VARCHAR(255),
                CONSTRAINT uq_mtd_targets_month_company UNIQUE (target_month, company)
            );
        `);

        // 1. Exact match for target_month and company
        const exactRes = await query(
            `SELECT target_month, company, monthly_target, tiktok_target_val, updated_at, updated_by
             FROM credentials.mtd_targets
             WHERE target_month = $1 AND company = $2
             LIMIT 1`,
            [targetMonth, comp]
        );

        if (exactRes.rows.length > 0) {
            const row = exactRes.rows[0];
            return {
                targetMonth: row.target_month,
                company: row.company,
                monthlyTarget: parseFloat(row.monthly_target),
                tiktokTargetVal: parseFloat(row.tiktok_target_val),
                updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
                updatedBy: row.updated_by || null,
                isDefault: false
            };
        }

        // 2. If specific company not found, try matching 'ALL' for the same month
        if (comp !== 'ALL') {
            const allRes = await query(
                `SELECT target_month, company, monthly_target, tiktok_target_val, updated_at, updated_by
                 FROM credentials.mtd_targets
                 WHERE target_month = $1 AND company = 'ALL'
                 LIMIT 1`,
                [targetMonth]
            );
            if (allRes.rows.length > 0) {
                const row = allRes.rows[0];
                return {
                    targetMonth,
                    company: comp,
                    monthlyTarget: parseFloat(row.monthly_target),
                    tiktokTargetVal: parseFloat(row.tiktok_target_val),
                    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
                    updatedBy: row.updated_by || null,
                    isDefault: true
                };
            }
        }

        // 3. Fall back to latest configured target across recent months
        const latestRes = await query(
            `SELECT target_month, company, monthly_target, tiktok_target_val, updated_at, updated_by
             FROM credentials.mtd_targets
             ORDER BY (company = $1) DESC, target_month DESC, id DESC
             LIMIT 1`,
            [comp]
        );

        if (latestRes.rows.length > 0) {
            const row = latestRes.rows[0];
            return {
                targetMonth,
                company: comp,
                monthlyTarget: parseFloat(row.monthly_target),
                tiktokTargetVal: parseFloat(row.tiktok_target_val),
                updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
                updatedBy: row.updated_by || null,
                isDefault: true
            };
        }
    } catch (err) {
        console.error('Error fetching MTD target from DB:', err);
    }

    // 4. Default baseline fallback
    return {
        targetMonth,
        company: comp,
        monthlyTarget: DEFAULT_TARGET,
        tiktokTargetVal: DEFAULT_TIKTOK_SPLIT,
        updatedAt: null,
        updatedBy: null,
        isDefault: true
    };
}

/**
 * Saves or updates the MTD target and TikTok split in database.
 */
export async function saveMtdTarget(
    targetMonth: string,
    company: string = 'ALL',
    monthlyTarget: number,
    tiktokTargetVal: number,
    updatedBy?: string | null
): Promise<MtdTargetRecord> {
    const comp = (company || 'ALL').toUpperCase();

    // Ensure table exists
    await query(`
        CREATE TABLE IF NOT EXISTS credentials.mtd_targets (
            id SERIAL PRIMARY KEY,
            target_month VARCHAR(7) NOT NULL,
            company VARCHAR(32) NOT NULL DEFAULT 'ALL',
            monthly_target NUMERIC(15, 2) NOT NULL DEFAULT 4000000,
            tiktok_target_val NUMERIC(15, 2) NOT NULL DEFAULT 3000000,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            updated_by VARCHAR(255),
            CONSTRAINT uq_mtd_targets_month_company UNIQUE (target_month, company)
        );
    `);

    const res = await query(
        `INSERT INTO credentials.mtd_targets (target_month, company, monthly_target, tiktok_target_val, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (target_month, company)
         DO UPDATE SET
            monthly_target = EXCLUDED.monthly_target,
            tiktok_target_val = EXCLUDED.tiktok_target_val,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
         RETURNING target_month, company, monthly_target, tiktok_target_val, updated_at, updated_by;`,
        [targetMonth, comp, monthlyTarget, tiktokTargetVal, updatedBy || null]
    );

    const row = res.rows[0];
    return {
        targetMonth: row.target_month,
        company: row.company,
        monthlyTarget: parseFloat(row.monthly_target),
        tiktokTargetVal: parseFloat(row.tiktok_target_val),
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
        updatedBy: row.updated_by || null,
        isDefault: false
    };
}
