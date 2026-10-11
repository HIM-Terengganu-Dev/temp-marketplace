export type DepartmentKey = 'overall' | 'marketing' | 'livehost' | 'affiliate';

/**
 * Check if the user's role permits setting targets for a department or overall.
 * Client-safe pure function: does not depend on database or Node.js built-ins.
 */
export function isUserTargetPIC(role?: string, department?: string): boolean {
    if (!role) return false;
    const r = role.toLowerCase().trim();
    if (r === 'admin' || r === 'super_admin') return true;
    if (r === 'pic' || r === 'manager' || r === 'head') return true;
    if (department) {
        const dept = department.toLowerCase().trim();
        if (r === `pic_${dept}` || r === `pic-${dept}`) return true;
        if ((dept === 'marketing' || dept === 'creative') && (r === 'pic_marketing' || r === 'pic_creative')) return true;
        if ((dept === 'livehost' || dept === 'live') && (r === 'pic_live' || r === 'pic_livehost')) return true;
        if (dept === 'affiliate' && r === 'pic_affiliate') return true;
        if (dept === 'overall' && (r === 'pic_overall' || r === 'admin' || r === 'super_admin')) return true;
    }
    return false;
}
