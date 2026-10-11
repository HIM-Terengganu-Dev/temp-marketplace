import { query } from '@/lib/db';
import { DepartmentKey, isUserTargetPIC } from './target-permissions';

export type { DepartmentKey };
export { isUserTargetPIC };

export interface DepartmentTargetRecord {
    targetMonth: string;
    department: DepartmentKey;
    targetAmount: number;
    updatedAt?: string | null;
    updatedBy?: string | null;
    isDefault?: boolean;
}

const DEFAULT_TARGETS: Record<DepartmentKey, number> = {
    overall: 4000000,
    marketing: 200000,
    livehost: 300000,
    affiliate: 350000,
};

/**
 * Ensures credentials.department_targets table exists
 */
export async function ensureDepartmentTargetsTable(): Promise<void> {
    await query(`
        CREATE TABLE IF NOT EXISTS credentials.department_targets (
            id SERIAL PRIMARY KEY,
            target_month VARCHAR(7) NOT NULL,
            department VARCHAR(32) NOT NULL,
            target_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            updated_by VARCHAR(255),
            CONSTRAINT uq_dept_targets_month_dept UNIQUE (target_month, department)
        );
    `);
}

/**
 * Retrieves monthly targets for all departments for a given month (YYYY-MM).
 * If target for that month doesn't exist, falls back to latest configured target or default.
 */
export async function getDepartmentTargets(targetMonth: string): Promise<Record<DepartmentKey, DepartmentTargetRecord>> {
    await ensureDepartmentTargetsTable();

    const result: Record<DepartmentKey, DepartmentTargetRecord> = {
        overall: { targetMonth, department: 'overall', targetAmount: DEFAULT_TARGETS.overall, isDefault: true },
        marketing: { targetMonth, department: 'marketing', targetAmount: DEFAULT_TARGETS.marketing, isDefault: true },
        livehost: { targetMonth, department: 'livehost', targetAmount: DEFAULT_TARGETS.livehost, isDefault: true },
        affiliate: { targetMonth, department: 'affiliate', targetAmount: DEFAULT_TARGETS.affiliate, isDefault: true },
    };

    try {
        const rowsRes = await query(
            `SELECT target_month, department, target_amount, updated_at, updated_by
             FROM credentials.department_targets
             WHERE target_month = $1`,
            [targetMonth]
        );

        for (const row of rowsRes.rows) {
            const dept = row.department as DepartmentKey;
            if (result[dept]) {
                result[dept] = {
                    targetMonth: row.target_month,
                    department: dept,
                    targetAmount: parseFloat(row.target_amount) || 0,
                    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
                    updatedBy: row.updated_by || null,
                    isDefault: false,
                };
            }
        }

        // If overall wasn't in department_targets, check credentials.mtd_targets for sync
        if (result.overall.isDefault) {
            try {
                const mtdRes = await query(
                    `SELECT target_month, monthly_target, updated_at, updated_by
                     FROM credentials.mtd_targets
                     WHERE target_month = $1 AND company = 'ALL'
                     LIMIT 1`,
                    [targetMonth]
                );
                if (mtdRes.rows.length > 0) {
                    const row = mtdRes.rows[0];
                    result.overall = {
                        targetMonth,
                        department: 'overall',
                        targetAmount: parseFloat(row.monthly_target) || DEFAULT_TARGETS.overall,
                        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
                        updatedBy: row.updated_by || null,
                        isDefault: false,
                    };
                }
            } catch (_) {}
        }

        // For any department missing this month, try to inherit latest configured target
        for (const dept of ['overall', 'marketing', 'livehost', 'affiliate'] as DepartmentKey[]) {
            if (result[dept].isDefault) {
                const latestRes = await query(
                    `SELECT target_month, department, target_amount, updated_at, updated_by
                     FROM credentials.department_targets
                     WHERE department = $1
                     ORDER BY target_month DESC, id DESC
                     LIMIT 1`,
                    [dept]
                );
                if (latestRes.rows.length > 0) {
                    const row = latestRes.rows[0];
                    result[dept] = {
                        targetMonth,
                        department: dept,
                        targetAmount: parseFloat(row.target_amount) || 0,
                        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
                        updatedBy: row.updated_by || null,
                        isDefault: true,
                    };
                }
            }
        }
    } catch (err) {
        console.error('[department-targets] Failed to fetch department targets:', err);
    }

    return result;
}

/**
 * Saves or updates monthly target for a specific department
 */
export async function saveDepartmentTarget(
    targetMonth: string,
    department: DepartmentKey,
    targetAmount: number,
    updatedBy: string
): Promise<DepartmentTargetRecord> {
    await ensureDepartmentTargetsTable();

    const res = await query(
        `INSERT INTO credentials.department_targets (target_month, department, target_amount, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (target_month, department)
         DO UPDATE SET
             target_amount = EXCLUDED.target_amount,
             updated_by = EXCLUDED.updated_by,
             updated_at = NOW()
         RETURNING target_month, department, target_amount, updated_at, updated_by`,
        [targetMonth, department, targetAmount, updatedBy]
    );

    // If saving overall, also sync credentials.mtd_targets
    if (department === 'overall') {
        try {
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
            await query(
                `INSERT INTO credentials.mtd_targets (target_month, company, monthly_target, tiktok_target_val, updated_by, updated_at)
                 VALUES ($1, 'ALL', $2, $2 * 0.75, $3, NOW())
                 ON CONFLICT (target_month, company)
                 DO UPDATE SET
                     monthly_target = EXCLUDED.monthly_target,
                     updated_by = EXCLUDED.updated_by,
                     updated_at = NOW()`,
                [targetMonth, targetAmount, updatedBy]
            );
        } catch (syncErr) {
            console.error('[department-targets] Failed to sync with mtd_targets:', syncErr);
        }
    }

    const row = res.rows[0];
    return {
        targetMonth: row.target_month,
        department: row.department as DepartmentKey,
        targetAmount: parseFloat(row.target_amount),
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
        updatedBy: row.updated_by,
        isDefault: false,
    };
}

/**
 * Retrieves all configured targets across an entire year for all departments.
 */
export async function getHistoricalDepartmentTargets(year: number): Promise<Record<string, Record<DepartmentKey, number>>> {
    await ensureDepartmentTargetsTable();
    const yearPrefix = `${year}-%`;
    const targetsByMonth: Record<string, Record<DepartmentKey, number>> = {};

    // Initialize 12 months with default/fallback targets
    for (let m = 1; m <= 12; m++) {
        const mKey = `${year}-${String(m).padStart(2, '0')}`;
        targetsByMonth[mKey] = {
            overall: DEFAULT_TARGETS.overall,
            marketing: DEFAULT_TARGETS.marketing,
            livehost: DEFAULT_TARGETS.livehost,
            affiliate: DEFAULT_TARGETS.affiliate,
        };
    }

    try {
        const res = await query(
            `SELECT target_month, department, target_amount
             FROM credentials.department_targets
             WHERE target_month LIKE $1
             ORDER BY target_month ASC`,
            [yearPrefix]
        );

        for (const row of res.rows) {
            const mKey = row.target_month;
            const dept = row.department as DepartmentKey;
            if (targetsByMonth[mKey] && dept in targetsByMonth[mKey]) {
                targetsByMonth[mKey][dept] = parseFloat(row.target_amount) || 0;
            }
        }

        // Also cross-reference credentials.mtd_targets for overall
        try {
            const mtdRes = await query(
                `SELECT target_month, monthly_target
                 FROM credentials.mtd_targets
                 WHERE target_month LIKE $1 AND company = 'ALL'`,
                [yearPrefix]
            );
            for (const row of mtdRes.rows) {
                const mKey = row.target_month;
                if (targetsByMonth[mKey]) {
                    // If overall is still default, use mtd_targets value
                    if (targetsByMonth[mKey].overall === DEFAULT_TARGETS.overall) {
                        targetsByMonth[mKey].overall = parseFloat(row.monthly_target) || DEFAULT_TARGETS.overall;
                    }
                }
            }
        } catch (_) {}
    } catch (err) {
        console.error('[department-targets] Failed to get historical targets:', err);
    }

    return targetsByMonth;
}
