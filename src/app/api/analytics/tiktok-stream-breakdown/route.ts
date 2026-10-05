import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { pool as localPool } from '@/lib/db';
import dotenv from 'dotenv';

if (typeof window === 'undefined') {
    dotenv.config({ path: '.env.local' });
    dotenv.config();
}

export const dynamic = 'force-dynamic';

const livePool = new Pool({
    connectionString: process.env.DB_LIVEHOST_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    ssl: { rejectUnauthorized: false }
});

const affPool = new Pool({
    connectionString: process.env.DB_AFFILIATE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    ssl: { rejectUnauthorized: false }
});

const mktPool = new Pool({
    connectionString: process.env.DB_MARKETING_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    ssl: { rejectUnauthorized: false }
});

const LIVEHOST_CATEGORY_SQL = `
    CASE
        WHEN u.role = 'EXTERNAL_HOST' THEN 'EXTERNAL'
        WHEN u.role = 'AI_LIVE' THEN 'AI_LIVE'
        WHEN u.role = 'RELIVE' THEN 'RELIVE'
        WHEN u.role = 'DR_SAMHAN' THEN 'DR_SAMHAN'
        WHEN s.notes ~* 'Type:\\s*([A-Za-z0-9_ -]+)' THEN
            CASE
                WHEN substring(s.notes from '(?i)Type:\\s*([A-Za-z0-9_ -]+)') ~* 'RELIVE|RE_LIVE' THEN 'RELIVE'
                WHEN substring(s.notes from '(?i)Type:\\s*([A-Za-z0-9_ -]+)') ~* 'EXTERNAL' THEN 'EXTERNAL'
                WHEN substring(s.notes from '(?i)Type:\\s*([A-Za-z0-9_ -]+)') ~* 'AI' THEN 'AI_LIVE'
                WHEN substring(s.notes from '(?i)Type:\\s*([A-Za-z0-9_ -]+)') ~* 'SAMHAN' THEN 'DR_SAMHAN'
                ELSE 'INTERNAL'
            END
        ELSE 'INTERNAL'
    END
`;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate') || '2026-08-01';
        const endDate = searchParams.get('endDate') || '2026-08-31';

        // 1. Fetch Total TikTok GMV from local marketplace DB
        const localPromise = localPool.query(`
            SELECT 
                TO_CHAR(date, 'YYYY-MM-DD') as date_str,
                SUM(gmv::numeric) as total_gmv,
                SUM(order_count::numeric) as order_count
            FROM credentials.daily_shop_metrics
            WHERE DATE(date) >= $1 AND DATE(date) <= $2
            GROUP BY TO_CHAR(date, 'YYYY-MM-DD')
            ORDER BY date_str ASC;
        `, [startDate, endDate]);

        // 2. Fetch Livehost Daily Breakdown by Category for TikTok (using Shift.date + parseStreamType logic)
        const liveDailyPromise = livePool.query(`
            SELECT 
                TO_CHAR(COALESCE(s.date, sr."submittedAt"), 'YYYY-MM-DD') as date_str,
                (${LIVEHOST_CATEGORY_SQL}) as category,
                SUM(sr."directGmv") as gmv,
                COUNT(sr.id) as sessions
            FROM "SessionReport" sr
            JOIN "Shift" s ON sr."shiftId" = s.id
            JOIN "User" u ON sr."userId" = u.id
            JOIN "LiveAccount" la ON sr."accountId" = la.id
            WHERE LOWER(la.platform) = 'tiktok'
              AND COALESCE(s.date, sr."submittedAt") >= $1 
              AND COALESCE(s.date, sr."submittedAt") <= ($2::date + interval '1 day' - interval '1 second')
            GROUP BY TO_CHAR(COALESCE(s.date, sr."submittedAt"), 'YYYY-MM-DD'), category
            ORDER BY date_str ASC;
        `, [startDate, endDate]);

        // 2b. Fetch Livehost Overall Category breakdown across TikTok and Shopee
        const liveCategoriesPromise = livePool.query(`
            SELECT 
                (${LIVEHOST_CATEGORY_SQL}) as category,
                LOWER(la.platform) as platform,
                SUM(sr."directGmv") as gmv,
                COUNT(sr.id) as sessions
            FROM "SessionReport" sr
            JOIN "Shift" s ON sr."shiftId" = s.id
            JOIN "User" u ON sr."userId" = u.id
            JOIN "LiveAccount" la ON sr."accountId" = la.id
            WHERE COALESCE(s.date, sr."submittedAt") >= $1 
              AND COALESCE(s.date, sr."submittedAt") <= ($2::date + interval '1 day' - interval '1 second')
            GROUP BY category, LOWER(la.platform)
            ORDER BY category, platform;
        `, [startDate, endDate]);

        // 2c. Fetch Top Live Hosts for details
        const topHostsPromise = livePool.query(`
            SELECT 
                COALESCE(u."fullName", u.username) as host_name,
                (${LIVEHOST_CATEGORY_SQL}) as category,
                LOWER(la.platform) as platform,
                SUM(sr."directGmv") as total_gmv,
                COUNT(sr.id) as sessions
            FROM "SessionReport" sr
            JOIN "Shift" s ON sr."shiftId" = s.id
            JOIN "User" u ON sr."userId" = u.id
            JOIN "LiveAccount" la ON sr."accountId" = la.id
            WHERE COALESCE(s.date, sr."submittedAt") >= $1 
              AND COALESCE(s.date, sr."submittedAt") <= ($2::date + interval '1 day' - interval '1 second')
            GROUP BY COALESCE(u."fullName", u.username), category, LOWER(la.platform)
            ORDER BY total_gmv DESC
            LIMIT 15;
        `, [startDate, endDate]);

        // 3. Fetch External Affiliate from hw-affiliate-management
        const affPromise = affPool.query(`
            SELECT 
                TO_CHAR(report_date, 'YYYY-MM-DD') as date_str,
                SUM(total_gmv::numeric) as affiliate_gmv,
                SUM(video_sales::numeric) as video_gmv,
                SUM(total_live_gmv::numeric) as live_gmv,
                COUNT(id) as affiliate_count
            FROM affiliate_records
            WHERE platform = 'TikTok Shop'
              AND channel = 'External'
              AND (LOWER(shop) LIKE '%dr%samhan%' OR LOWER(shop) LIKE '%drsamhan%' OR LOWER(shop) LIKE '%himclinic%')
              AND DATE(report_date) >= $1 
              AND DATE(report_date) <= $2
            GROUP BY TO_CHAR(report_date, 'YYYY-MM-DD')
            ORDER BY date_str ASC;
        `, [startDate, endDate]);

        // 3b. Fetch Top External Affiliates
        const topAffPromise = affPool.query(`
            SELECT 
                username,
                SUM(total_gmv::numeric) as total_gmv,
                SUM(video_sales::numeric) as video_gmv,
                SUM(total_live_gmv::numeric) as live_gmv
            FROM affiliate_records
            WHERE platform = 'TikTok Shop'
              AND channel = 'External'
              AND (LOWER(shop) LIKE '%dr%samhan%' OR LOWER(shop) LIKE '%drsamhan%' OR LOWER(shop) LIKE '%himclinic%')
              AND DATE(report_date) >= $1 
              AND DATE(report_date) <= $2
            GROUP BY username
            HAVING SUM(total_gmv::numeric) > 0
            ORDER BY total_gmv DESC
            LIMIT 10;
        `, [startDate, endDate]);

        // 4. Fetch Video Beg Kuning from internal handles in hw-marketing-tracking
        const mktPromise = mktPool.query(`
            SELECT 
                SUBSTRING(il."dataDate" FROM '\\d{4}-\\d{2}-\\d{2}') as date_str,
                SUM(vr."directGmv") as direct_gmv,
                SUM(vr."attributedGmv") as attr_gmv,
                COUNT(vr.id) as video_count
            FROM "VideoRecord" vr
            JOIN "ImportLog" il ON vr."importLogId" = il.id
            WHERE LOWER(vr."creatorName") IN (SELECT LOWER(handle) FROM "InternalHandle")
              AND SUBSTRING(il."dataDate" FROM '\\d{4}-\\d{2}-\\d{2}') >= $1
              AND SUBSTRING(il."dataDate" FROM '\\d{4}-\\d{2}-\\d{2}') <= $2
            GROUP BY SUBSTRING(il."dataDate" FROM '\\d{4}-\\d{2}-\\d{2}')
            ORDER BY date_str ASC;
        `, [startDate, endDate]);

        // 4b. Top Internal Video Creators
        const topMktPromise = mktPool.query(`
            SELECT 
                vr."creatorName" as creator_name,
                SUM(vr."directGmv") as direct_gmv,
                COUNT(vr.id) as video_count
            FROM "VideoRecord" vr
            JOIN "ImportLog" il ON vr."importLogId" = il.id
            WHERE LOWER(vr."creatorName") IN (SELECT LOWER(handle) FROM "InternalHandle")
              AND SUBSTRING(il."dataDate" FROM '\\d{4}-\\d{2}-\\d{2}') >= $1
              AND SUBSTRING(il."dataDate" FROM '\\d{4}-\\d{2}-\\d{2}') <= $2
            GROUP BY vr."creatorName"
            HAVING SUM(vr."directGmv") > 0
            ORDER BY direct_gmv DESC
            LIMIT 10;
        `, [startDate, endDate]);

        // Await all concurrently
        const [
            localRes, 
            liveDailyRes,
            liveCategoriesRes,
            topHostsRes,
            affRes, 
            topAffRes,
            mktRes,
            topMktRes
        ] = await Promise.all([
            localPromise,
            liveDailyPromise,
            liveCategoriesPromise,
            topHostsPromise,
            affPromise,
            topAffPromise,
            mktPromise,
            topMktPromise
        ]);

        // Build Livehost Categories Summary (Internal, External, ReLive, DrSamhan, AiLive)
        const livehostCategories: Record<string, {
            category: string;
            label: string;
            shopeeGmv: number;
            tiktokGmv: number;
            totalGmv: number;
            sessions: number;
        }> = {
            INTERNAL: { category: 'INTERNAL', label: 'Internal Host', shopeeGmv: 0, tiktokGmv: 0, totalGmv: 0, sessions: 0 },
            EXTERNAL: { category: 'EXTERNAL', label: 'External Host', shopeeGmv: 0, tiktokGmv: 0, totalGmv: 0, sessions: 0 },
            RELIVE: { category: 'RELIVE', label: 'ReLive', shopeeGmv: 0, tiktokGmv: 0, totalGmv: 0, sessions: 0 },
            DR_SAMHAN: { category: 'DR_SAMHAN', label: 'DrSamhan', shopeeGmv: 0, tiktokGmv: 0, totalGmv: 0, sessions: 0 },
            AI_LIVE: { category: 'AI_LIVE', label: 'AiLive', shopeeGmv: 0, tiktokGmv: 0, totalGmv: 0, sessions: 0 },
        };

        for (const row of liveCategoriesRes.rows) {
            const cat = row.category || 'INTERNAL';
            if (!livehostCategories[cat]) {
                livehostCategories[cat] = { category: cat, label: cat, shopeeGmv: 0, tiktokGmv: 0, totalGmv: 0, sessions: 0 };
            }
            const gmv = parseFloat(row.gmv || 0);
            const sess = parseInt(row.sessions || 0, 10);
            livehostCategories[cat].sessions += sess;
            livehostCategories[cat].totalGmv += gmv;
            if (row.platform === 'shopee') {
                livehostCategories[cat].shopeeGmv += gmv;
            } else {
                livehostCategories[cat].tiktokGmv += gmv;
            }
        }

        // Daily Trend Map for TikTok Streams
        const dateMap: Record<string, {
            date: string;
            totalGmv: number;
            liveInternal: number;
            liveExternal: number;
            liveReLive: number;
            liveDrSamhan: number;
            liveAiLive: number;
            affiliateExternal: number;
            videoInternal: number;
            others: number;
        }> = {};

        const getOrCreateDate = (d: string) => {
            if (!dateMap[d]) {
                dateMap[d] = {
                    date: d,
                    totalGmv: 0,
                    liveInternal: 0,
                    liveExternal: 0,
                    liveReLive: 0,
                    liveDrSamhan: 0,
                    liveAiLive: 0,
                    affiliateExternal: 0,
                    videoInternal: 0,
                    others: 0,
                };
            }
            return dateMap[d];
        };

        // 1. Process Total TikTok GMV
        for (const row of localRes.rows) {
            if (!row.date_str) continue;
            const item = getOrCreateDate(row.date_str);
            item.totalGmv = parseFloat(row.total_gmv || 0);
        }

        // 2. Process Livehost daily categories for TikTok
        for (const row of liveDailyRes.rows) {
            if (!row.date_str) continue;
            const item = getOrCreateDate(row.date_str);
            const gmv = parseFloat(row.gmv || 0);
            if (row.category === 'INTERNAL') item.liveInternal += gmv;
            else if (row.category === 'EXTERNAL') item.liveExternal += gmv;
            else if (row.category === 'RELIVE') item.liveReLive += gmv;
            else if (row.category === 'DR_SAMHAN') item.liveDrSamhan += gmv;
            else if (row.category === 'AI_LIVE') item.liveAiLive += gmv;
            else item.liveInternal += gmv;
        }

        // 3. Process Affiliate
        for (const row of affRes.rows) {
            if (!row.date_str) continue;
            const item = getOrCreateDate(row.date_str);
            item.affiliateExternal += parseFloat(row.affiliate_gmv || 0);
        }

        // 4. Process Video Internal
        for (const row of mktRes.rows) {
            if (!row.date_str) continue;
            const item = getOrCreateDate(row.date_str);
            item.videoInternal += parseFloat(row.direct_gmv || 0);
        }

        // 5. Calculate Others & sort dates
        const dailyTrend = Object.values(dateMap)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(d => {
                const totalLive = d.liveInternal + d.liveExternal + d.liveReLive + d.liveDrSamhan + d.liveAiLive;
                const accountedFor = totalLive + d.affiliateExternal + d.videoInternal;
                const others = Math.max(0, d.totalGmv - accountedFor);
                return {
                    ...d,
                    totalLive: Number(totalLive.toFixed(2)),
                    others: Number(others.toFixed(2)),
                    liveInternal: Number(d.liveInternal.toFixed(2)),
                    liveExternal: Number(d.liveExternal.toFixed(2)),
                    liveReLive: Number(d.liveReLive.toFixed(2)),
                    liveDrSamhan: Number(d.liveDrSamhan.toFixed(2)),
                    liveAiLive: Number(d.liveAiLive.toFixed(2)),
                    affiliateExternal: Number(d.affiliateExternal.toFixed(2)),
                    videoInternal: Number(d.videoInternal.toFixed(2)),
                    totalGmv: Number(d.totalGmv.toFixed(2)),
                };
            });

        // Compute Aggregates
        let aggTotalGmv = 0;
        let aggLiveInternal = 0;
        let aggLiveExternal = 0;
        let aggLiveReLive = 0;
        let aggLiveDrSamhan = 0;
        let aggLiveAiLive = 0;
        let aggAffiliateExternal = 0;
        let aggVideoInternal = 0;
        let aggOthers = 0;

        for (const d of dailyTrend) {
            aggTotalGmv += d.totalGmv;
            aggLiveInternal += d.liveInternal;
            aggLiveExternal += d.liveExternal;
            aggLiveReLive += d.liveReLive;
            aggLiveDrSamhan += d.liveDrSamhan;
            aggLiveAiLive += d.liveAiLive;
            aggAffiliateExternal += d.affiliateExternal;
            aggVideoInternal += d.videoInternal;
            aggOthers += d.others;
        }

        const aggTotalLive = aggLiveInternal + aggLiveExternal + aggLiveReLive + aggLiveDrSamhan + aggLiveAiLive;
        const pct = (val: number, total: number) => total > 0 ? Number(((val / total) * 100).toFixed(1)) : 0;

        return NextResponse.json({
            success: true,
            dateRange: { startDate, endDate },
            summary: {
                totalGmv: Number(aggTotalGmv.toFixed(2)),
                totalLive: {
                    gmv: Number(aggTotalLive.toFixed(2)),
                    percentage: pct(aggTotalLive, aggTotalGmv)
                },
                liveInternal: {
                    gmv: Number(aggLiveInternal.toFixed(2)),
                    percentage: pct(aggLiveInternal, aggTotalGmv)
                },
                liveExternal: {
                    gmv: Number(aggLiveExternal.toFixed(2)),
                    percentage: pct(aggLiveExternal, aggTotalGmv)
                },
                liveReLive: {
                    gmv: Number(aggLiveReLive.toFixed(2)),
                    percentage: pct(aggLiveReLive, aggTotalGmv)
                },
                liveDrSamhan: {
                    gmv: Number(aggLiveDrSamhan.toFixed(2)),
                    percentage: pct(aggLiveDrSamhan, aggTotalGmv)
                },
                liveAiLive: {
                    gmv: Number(aggLiveAiLive.toFixed(2)),
                    percentage: pct(aggLiveAiLive, aggTotalGmv)
                },
                affiliateExternal: {
                    gmv: Number(aggAffiliateExternal.toFixed(2)),
                    percentage: pct(aggAffiliateExternal, aggTotalGmv)
                },
                videoInternal: {
                    gmv: Number(aggVideoInternal.toFixed(2)),
                    percentage: pct(aggVideoInternal, aggTotalGmv)
                },
                others: {
                    gmv: Number(aggOthers.toFixed(2)),
                    percentage: pct(aggOthers, aggTotalGmv)
                }
            },
            livehostSystemData: Object.values(livehostCategories).map(c => ({
                ...c,
                shopeeGmv: Number(c.shopeeGmv.toFixed(2)),
                tiktokGmv: Number(c.tiktokGmv.toFixed(2)),
                totalGmv: Number(c.totalGmv.toFixed(2)),
            })),
            dailyTrend,
            details: {
                topHosts: topHostsRes.rows.map(h => ({
                    name: h.host_name,
                    category: h.category,
                    platform: h.platform,
                    gmv: parseFloat(h.total_gmv || 0),
                    sessions: parseInt(h.sessions || '0', 10)
                })),
                topAffiliates: topAffRes.rows.map(a => ({
                    username: a.username,
                    totalGmv: parseFloat(a.total_gmv || 0),
                    videoGmv: parseFloat(a.video_gmv || 0),
                    liveGmv: parseFloat(a.live_gmv || 0)
                })),
                topVideoCreators: topMktRes.rows.map(m => ({
                    name: m.creator_name,
                    gmv: parseFloat(m.direct_gmv || 0),
                    videoCount: parseInt(m.video_count || '0', 10)
                }))
            }
        });

    } catch (error: any) {
        console.error('[api/analytics/tiktok-stream-breakdown] Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
