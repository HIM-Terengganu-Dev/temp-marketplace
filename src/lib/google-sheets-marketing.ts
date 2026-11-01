/**
 * Google Sheets Marketing Integration (Read-Only)
 *
 * Source Spreadsheet: HIM Creative — Master Database
 * ID: 1rHGIJ0GFYSKbshsPo69OLn9swioSGln_gSQ8qCBEhD0
 *
 * Fetches:
 * 1. Accounts - Full roster of TikTok accounts (Creative + Dr Samhan)
 * 2. Daily_Sales - Authoritative daily GMV per account across all historical months
 * 3. TikTok_Videos - Attributed GMV, units, video views per account
 * 4. Sales_Targets - Monthly targets (Dr Samhan + Team Creative)
 */

export interface SheetAccount {
    id: string;
    name: string;
    username: string;
    creatorId: string;
    content: string;
    live: string;
    type: string;
    product: string;
    isDrSamhan: boolean;
}

export interface SheetDailySale {
    key: string;
    date: string; // 'YYYY-MM-DD'
    accountId: string;
    gmv: number;
}

export interface SheetVideo {
    key: string;
    date: string; // 'YYYY-MM-DD'
    videoId: string;
    accountId: string;
    creatorName: string;
    creatorId: string;
    reportType: string;
    productIds: string;
    productNames: string;
    views: number;
    clicks: number;
    items: number;
    gmv: number;
}

export interface SheetTarget {
    year: number;
    month: number;
    dr: number;
    creative: number;
    total: number;
}

export interface MarketingTeamItem {
    handle: string;
    accountName: string;
    accountId: string;
    username: string;
    category: 'dr' | 'creative';
    videoCount: number;
    directGmv: number;
    attributedGmv: number;
    views: number;
    likes: number;
    directItemsSold: number;
    hasActivity: boolean;
}

export interface MarketingDepartmentData {
    status: 'connected' | 'disconnected' | 'error';
    hasData: boolean;
    targetAmount: number;
    totalSales: number;
    totalVideos: number;
    totalItemsSold: number;
    totalViews: number;
    totalClicks: number;
    attainmentRate: number;
    teams: MarketingTeamItem[];
    message?: string | null;
    error?: string;
    dataSource: 'google_sheets' | 'postgres';
    updatedAt: string;
}

// In-memory cache for Sheet data
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache
const memoryCache: Record<string, CacheEntry<any>> = {};

function getCached<T>(key: string): T | null {
    const entry = memoryCache[key];
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
        return entry.data;
    }
    return null;
}

function setCached<T>(key: string, data: T): void {
    memoryCache[key] = { data, timestamp: Date.now() };
}

export function getSpreadsheetId(): string {
    return process.env.GOOGLE_SHEET_MARKETING_ID || '1rHGIJ0GFYSKbshsPo69OLn9swioSGln_gSQ8qCBEhD0';
}

export function getGoogleApiKey(): string {
    return (process.env.GOOGLE_SHEET_API_KEY || '').trim();
}

/**
 * Fetch raw sheet data via Google Sheets API v4 (if API key available),
 * with fallback to public Google Visualization endpoint.
 */
async function fetchSheetRows(sheetName: string): Promise<any[][]> {
    const cacheKey = `raw_${sheetName}`;
    const cached = getCached<any[][]>(cacheKey);
    if (cached) return cached;

    const spreadsheetId = getSpreadsheetId();
    const apiKey = getGoogleApiKey();

    // 1. Try Google Sheets API v4 if API key is provided
    if (apiKey) {
        try {
            const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?key=${apiKey}`;
            const res = await fetch(apiUrl, { next: { revalidate: 180 } });
            if (res.ok) {
                const json = await res.json();
                const values = json.values || [];
                if (values.length > 1) {
                    // Skip header row
                    const rows = values.slice(1);
                    setCached(cacheKey, rows);
                    return rows;
                }
            } else {
                console.warn(`[google-sheets-marketing] Sheets API error ${res.status}, falling back to gviz query`);
            }
        } catch (err: any) {
            console.warn('[google-sheets-marketing] Sheets API fetch error, falling back to gviz:', err.message);
        }
    }

    // 2. Direct read via Google Visualization endpoint (read-only public viewer access)
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    const gvizRes = await fetch(gvizUrl, { next: { revalidate: 180 } });
    if (!gvizRes.ok) {
        throw new Error(`Failed to fetch sheet ${sheetName} (HTTP ${gvizRes.status})`);
    }

    const text = await gvizRes.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
    if (!match) {
        throw new Error(`Invalid response structure for sheet ${sheetName}`);
    }

    const parsed = JSON.parse(match[1]);
    if (parsed.status === 'error') {
        throw new Error(parsed.errors?.[0]?.message || `Error reading ${sheetName}`);
    }

    const rows = (parsed.table.rows || []).map((r: any) =>
        (r.c || []).map((cell: any) => (cell ? cell.v : null))
    );

    setCached(cacheKey, rows);
    return rows;
}

/**
 * Fetch and parse all Accounts from 'Accounts' sheet
 */
export async function getMarketingAccounts(): Promise<SheetAccount[]> {
    const cached = getCached<SheetAccount[]>('accounts_parsed');
    if (cached) return cached;

    const rows = await fetchSheetRows('Accounts');
    const accounts: SheetAccount[] = rows.map(r => {
        const id = String(r[1] ?? '').trim();
        const name = String(r[2] ?? '').trim();
        const username = String(r[3] ?? '').trim().replace(/^@/, '').toLowerCase();
        const creatorId = String(r[4] ?? '').trim();
        const content = String(r[5] ?? 'ACTIVE').trim().toUpperCase();
        const live = String(r[6] ?? '-').trim();
        const type = String(r[7] ?? 'MARKETING').trim().toUpperCase();
        const product = String(r[8] ?? '').trim();
        const isDrSamhan = username === 'dr.samhan';

        return {
            id,
            name: name || (username ? `@${username}` : `Account #${id}`),
            username,
            creatorId,
            content,
            live,
            type,
            product,
            isDrSamhan
        };
    }).filter(a => a.id && (a.name || a.username));

    setCached('accounts_parsed', accounts);
    return accounts;
}

/**
 * Helper to normalize date strings to standard 'YYYY-MM-DD'
 */
function normalizeDate(rawDate?: string, recordKey?: string): string {
    let d = String(rawDate || '').trim();

    // Check standard YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;

    // Check non-padded YYYY-M-D
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(d)) {
        const p = d.split('-');
        return `${p[0]}-${p[1].padStart(2, '0')}-${p[2].padStart(2, '0')}`;
    }

    // Try parsing from record_key format: YYYY-M-D-accId
    if (recordKey) {
        const match = /^(\d{4})-(\d{1,2})-(\d{1,2})-(.+)$/.exec(recordKey.trim());
        if (match) {
            return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        }
    }

    // Fallback Date object parsing if date is like "Thu Oct 01 2026..."
    if (d.includes('GMT') || d.includes('T')) {
        try {
            const parsed = new Date(d);
            if (!isNaN(parsed.getTime())) {
                const y = parsed.getFullYear();
                const m = String(parsed.getMonth() + 1).padStart(2, '0');
                const day = String(parsed.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            }
        } catch (_) {}
    }

    return d.slice(0, 10);
}

/**
 * Fetch and parse Daily_Sales sheet
 * Contains historical and daily GMV per account across all months
 */
export async function getMarketingDailySales(): Promise<SheetDailySale[]> {
    const cached = getCached<SheetDailySale[]>('daily_sales_parsed');
    if (cached) return cached;

    const rows = await fetchSheetRows('Daily_Sales');
    const accounts = await getMarketingAccounts();
    const drSamhanAcc = accounts.find(a => a.isDrSamhan);

    const dailyList: SheetDailySale[] = [];

    rows.forEach(r => {
        const rawKey = String(r[0] ?? '').trim();
        const rawDate = String(r[1] ?? '').trim();
        let accId = String(r[2] ?? '').trim();
        const gmv = parseFloat(r[3] ?? 0) || 0;

        const date = normalizeDate(rawDate, rawKey);

        // If accId was missing in column 2, extract from record_key (YYYY-M-D-accId)
        if (!accId && rawKey) {
            const match = /^(\d{4})-(\d{1,2})-(\d{1,2})-(.+)$/.exec(rawKey);
            if (match) accId = match[4];
        }

        // Map 'dr' alias to Dr Samhan account ID
        if (accId.toLowerCase() === 'dr' && drSamhanAcc) {
            accId = drSamhanAcc.id;
        }

        if (date && accId && !isNaN(gmv)) {
            dailyList.push({
                key: rawKey || `${date}-${accId}`,
                date,
                accountId: accId,
                gmv
            });
        }
    });

    setCached('daily_sales_parsed', dailyList);
    return dailyList;
}

/**
 * Fetch and parse TikTok_Videos
 */
export async function getMarketingVideos(): Promise<SheetVideo[]> {
    const cached = getCached<SheetVideo[]>('videos_parsed');
    if (cached) return cached;

    const rows = await fetchSheetRows('TikTok_Videos');
    const videos: SheetVideo[] = rows.map(r => {
        const key = String(r[0] ?? '').trim();
        const rawDate = String(r[1] ?? '').trim();
        const date = normalizeDate(rawDate, key);
        const videoId = String(r[2] ?? '').trim();
        const accountId = String(r[3] ?? '').trim();
        const creatorName = String(r[4] ?? '').trim().replace(/^@/, '').toLowerCase();
        const creatorId = String(r[5] ?? '').trim();
        const reportType = String(r[6] ?? '').trim();
        const productIds = String(r[7] ?? '').trim();
        const productNames = String(r[8] ?? '').trim();
        const views = Number(r[9] ?? 0) || 0;
        const clicks = Number(r[10] ?? 0) || 0;
        const items = Number(r[11] ?? 0) || 0;
        const gmv = Number(r[12] ?? 0) || 0;

        return {
            key,
            date,
            videoId,
            accountId,
            creatorName,
            creatorId,
            reportType,
            productIds,
            productNames,
            views,
            clicks,
            items,
            gmv
        };
    }).filter(v => v.date && (v.videoId || v.creatorName || v.accountId));

    setCached('videos_parsed', videos);
    return videos;
}

/**
 * Fetch and parse Sales_Targets
 */
export async function getMarketingTargets(): Promise<SheetTarget[]> {
    const cached = getCached<SheetTarget[]>('targets_parsed');
    if (cached) return cached;

    try {
        const rows = await fetchSheetRows('Sales_Targets');
        const targets: SheetTarget[] = rows.map(r => {
            const year = Number(r[1] ?? 0);
            const month = Number(r[2] ?? 0);
            const dr = Number(r[3] ?? 0) || 0;
            const creative = Number(r[4] ?? 0) || 0;
            return {
                year,
                month,
                dr,
                creative,
                total: dr + creative
            };
        }).filter(t => t.year > 2000 && t.month >= 1 && t.month <= 12);

        setCached('targets_parsed', targets);
        return targets;
    } catch (e) {
        console.warn('[google-sheets-marketing] Error loading Sales_Targets:', e);
        return [];
    }
}

/**
 * Main aggregator for Department Reality Sales (Monthly / Date range).
 *
 * Integrates:
 * - Daily_Sales (for accurate account GMV across all months)
 * - TikTok_Videos (for video counts, views, clicks, items sold attribution)
 * - Accounts (for mapping ID, name, handle, category)
 * - Sales_Targets (for monthly target)
 */
export async function fetchMarketingDepartmentFromSheets(
    month: string,
    startDate: string,
    endDate: string,
    fallbackTarget: number = 0
): Promise<MarketingDepartmentData> {
    try {
        const [accounts, dailySales, videos, targets] = await Promise.all([
            getMarketingAccounts(),
            getMarketingDailySales(),
            getMarketingVideos(),
            getMarketingTargets()
        ]);

        // 1. Resolve Monthly Target
        const [yStr, mStr] = month.split('-');
        const targetYear = parseInt(yStr, 10);
        const targetMonthNum = parseInt(mStr, 10);

        const foundTarget = targets.find(t => t.year === targetYear && t.month === targetMonthNum);
        const targetAmount = foundTarget && foundTarget.total > 0 ? foundTarget.total : fallbackTarget;

        // 2. Filter data in requested Date Range
        const matchedDaily = dailySales.filter(d => d.date >= startDate && d.date <= endDate);
        const matchedVideos = videos.filter(v => v.date >= startDate && v.date <= endDate);

        // 3. Prepare Account Aggregation Map
        // Include ALL accounts (Creative + Dr Samhan)
        const accountMap = new Map<string, {
            account: SheetAccount;
            videoCount: number;
            views: number;
            clicks: number;
            items: number;
            dailyGmv: number;
            videoGmv: number;
        }>();

        accounts.forEach(a => {
            accountMap.set(a.id, {
                account: a,
                videoCount: 0,
                views: 0,
                clicks: 0,
                items: 0,
                dailyGmv: 0,
                videoGmv: 0
            });
        });

        // Fast lookup tables for matching
        const userToAccountId = new Map<string, string>();
        const creatorIdToAccountId = new Map<string, string>();
        accounts.forEach(a => {
            if (a.username) userToAccountId.set(a.username, a.id);
            if (a.creatorId) creatorIdToAccountId.set(a.creatorId, a.id);
        });

        // Helper to get or create an entry in accountMap
        const getOrCreateEntry = (accId: string, fallbackName?: string): {
            account: SheetAccount;
            videoCount: number;
            views: number;
            clicks: number;
            items: number;
            dailyGmv: number;
            videoGmv: number;
        } => {
            let entry = accountMap.get(accId);
            if (!entry) {
                const syntheticAccount: SheetAccount = {
                    id: accId,
                    name: fallbackName || `Account #${accId}`,
                    username: '',
                    creatorId: '',
                    content: 'ACTIVE',
                    live: '-',
                    type: 'AFFILIATE',
                    product: 'UNKNOWN',
                    isDrSamhan: accId.toLowerCase() === 'dr'
                };
                entry = {
                    account: syntheticAccount,
                    videoCount: 0,
                    views: 0,
                    clicks: 0,
                    items: 0,
                    dailyGmv: 0,
                    videoGmv: 0
                };
                accountMap.set(accId, entry);
            }
            return entry;
        };

        // Aggregate Daily_Sales (primary GMV source)
        matchedDaily.forEach(d => {
            const entry = getOrCreateEntry(d.accountId);
            entry.dailyGmv += d.gmv;
        });

        // Aggregate TikTok_Videos (video-level views, clicks, items, attribution)
        matchedVideos.forEach(v => {
            let resolvedId = v.accountId;
            if (!accountMap.has(resolvedId)) {
                if (v.creatorId && creatorIdToAccountId.has(v.creatorId)) {
                    resolvedId = creatorIdToAccountId.get(v.creatorId)!;
                } else if (v.creatorName && userToAccountId.has(v.creatorName)) {
                    resolvedId = userToAccountId.get(v.creatorName)!;
                }
            }

            const entry = getOrCreateEntry(resolvedId || `anon_${v.creatorName}`, v.creatorName ? `@${v.creatorName}` : undefined);
            entry.videoCount += 1;
            entry.views += v.views;
            entry.clicks += v.clicks;
            entry.items += v.items;
            entry.videoGmv += v.gmv;
        });

        // 4. Calculate Totals and Transform Teams
        let totalSales = 0;
        let totalItemsSold = 0;
        let totalViews = 0;
        let totalClicks = 0;
        let totalVideos = 0;

        const teams: MarketingTeamItem[] = Array.from(accountMap.values()).map(item => {
            const a = item.account;
            const cleanHandle = (a.username || a.name || `Account #${a.id}`).replace(/^@/, '').trim();
            const category: 'dr' | 'creative' = a.isDrSamhan ? 'dr' : 'creative';

            // Authoritative GMV: use Daily_Sales if available for this account/range, else TikTok_Videos
            const effectiveGmv = item.dailyGmv > 0 ? item.dailyGmv : item.videoGmv;

            totalSales += effectiveGmv;
            totalItemsSold += item.items;
            totalViews += item.views;
            totalClicks += item.clicks;
            totalVideos += item.videoCount;

            const roundedGmv = parseFloat(effectiveGmv.toFixed(2));

            return {
                handle: cleanHandle,
                accountName: a.name,
                accountId: a.id,
                username: a.username,
                category,
                videoCount: item.videoCount,
                directGmv: roundedGmv,
                attributedGmv: roundedGmv,
                views: item.views,
                likes: item.clicks, // Product clicks mapped to engagement
                directItemsSold: item.items,
                hasActivity: effectiveGmv > 0 || item.videoCount > 0
            };
        }).sort((a, b) => b.attributedGmv - a.attributedGmv || b.videoCount - a.videoCount);

        const hasData = matchedDaily.length > 0 || matchedVideos.length > 0;
        const attainmentRate = targetAmount > 0 ? (totalSales / targetAmount) * 100 : 0;

        return {
            status: 'connected',
            hasData,
            targetAmount,
            totalSales: parseFloat(totalSales.toFixed(2)),
            totalVideos,
            totalItemsSold,
            totalViews,
            totalClicks,
            attainmentRate: parseFloat(attainmentRate.toFixed(2)),
            teams,
            message: hasData ? null : `Tiada data marketing video TikTok dijumpai untuk tempoh ${startDate} hingga ${endDate}.`,
            dataSource: 'google_sheets',
            updatedAt: new Date().toISOString()
        };
    } catch (err: any) {
        console.error('[google-sheets-marketing] Fetch marketing department error:', err);
        return {
            status: 'error',
            hasData: false,
            targetAmount: fallbackTarget,
            totalSales: 0,
            totalVideos: 0,
            totalItemsSold: 0,
            totalViews: 0,
            totalClicks: 0,
            attainmentRate: 0,
            teams: [],
            error: err.message || 'Google Sheets fetch failed',
            dataSource: 'google_sheets',
            updatedAt: new Date().toISOString()
        };
    }
}

/**
 * Fetch historical monthly GMV trends across a given year (Jan - Dec).
 * Reads from Daily_Sales (primary) and TikTok_Videos (supplementary).
 */
export async function fetchMarketingMonthlyTrendsFromSheets(year: number): Promise<Record<string, number>> {
    try {
        const [dailySales, videos] = await Promise.all([
            getMarketingDailySales(),
            getMarketingVideos()
        ]);

        const yearPrefix = `${year}-`;
        const monthlyGmvMap: Record<string, number> = {};

        // 1. Group by month from Daily_Sales
        dailySales.forEach(d => {
            if (d.date && d.date.startsWith(yearPrefix)) {
                const monthKey = d.date.slice(0, 7); // 'YYYY-MM'
                monthlyGmvMap[monthKey] = (monthlyGmvMap[monthKey] || 0) + d.gmv;
            }
        });

        // 2. Fallback to TikTok_Videos for any month missing in Daily_Sales
        videos.forEach(v => {
            if (v.date && v.date.startsWith(yearPrefix)) {
                const monthKey = v.date.slice(0, 7);
                if (!monthlyGmvMap[monthKey] || monthlyGmvMap[monthKey] === 0) {
                    monthlyGmvMap[monthKey] = (monthlyGmvMap[monthKey] || 0) + v.gmv;
                }
            }
        });

        // Round to 2 decimals
        for (const k of Object.keys(monthlyGmvMap)) {
            monthlyGmvMap[k] = parseFloat(monthlyGmvMap[k].toFixed(2));
        }

        return monthlyGmvMap;
    } catch (err) {
        console.error('[google-sheets-marketing] Monthly trends error:', err);
        return {};
    }
}

/**
 * Fetch marketing metrics for a specific event date range.
 */
export async function fetchMarketingEventMetricsFromSheets(startDate: string, endDate: string) {
    try {
        const [dailySales, videos] = await Promise.all([
            getMarketingDailySales(),
            getMarketingVideos()
        ]);

        const matchedDaily = dailySales.filter(d => d.date >= startDate && d.date <= endDate);
        const matchedVideos = videos.filter(v => v.date >= startDate && v.date <= endDate);

        let gmv = 0;
        let itemsSold = 0;
        let views = 0;

        if (matchedDaily.length > 0) {
            matchedDaily.forEach(d => {
                gmv += d.gmv;
            });
        } else {
            matchedVideos.forEach(v => {
                gmv += v.gmv;
            });
        }

        matchedVideos.forEach(v => {
            itemsSold += v.items;
            views += v.views;
        });

        return {
            gmv: parseFloat(gmv.toFixed(2)),
            videos: matchedVideos.length,
            itemsSold,
            views
        };
    } catch (err) {
        console.error('[google-sheets-marketing] Event metrics error:', err);
        return { gmv: 0, videos: 0, itemsSold: 0, views: 0 };
    }
}
