import { query } from '@/lib/db';

export type DepartmentKey = 'marketing' | 'livehost' | 'affiliate';

export interface DepartmentTargetRecord {
    targetMonth: string;
    department: DepartmentKey;
    targetAmount: number;
    updatedAt?: string | null;
    updatedBy?: string | null;
    isDefault?: boolean;
}

const DEFAULT_TARGETS: Record<DepartmentKey, number> = {
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

        // For any department missing this month, try to inherit latest configured target
        for (const dept of ['marketing', 'livehost', 'affiliate'] as DepartmentKey[]) {
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
