import { NextResponse } from 'next/server';
import { fetchShopROAS, ensureDailyMetricsSynced } from '@/lib/metrics-fetcher';
import { query } from '@/lib/db';

function getKLToday(): string {
    const now = new Date();
    return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }); 
}

export async function GET(request: Request) {
    // Trigger daily metric background sync for 2 weeks ago if missing
    ensureDailyMetricsSynced().catch(err => console.error('[Auto-Sync Trigger] Background sync failed:', err));

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // YYYY-MM-DD
    const endDate = searchParams.get('endDate');     // YYYY-MM-DD
    const shopNumberParam = searchParams.get('shopNumber') || '1';
    const shopNumber = parseInt(shopNumberParam, 10);

    if (!startDate || !endDate) {
        return NextResponse.json({ error: 'Missing required parameters: startDate, endDate' }, { status: 400 });
    }

    if (isNaN(shopNumber) || shopNumber < 1 || shopNumber > 4) {
        return NextResponse.json({ error: `Invalid shop number: ${shopNumberParam}. Valid options: 1, 2, 3, 4` }, { status: 400 });
    }

    try {
        const today = getKLToday();
        const isToday = startDate === today || endDate === today;

        // Try DB cache first for non-today requests
        if (!isToday) {
            try {
                const dbResult = await query(`
                    SELECT SUM(spend_before_tax) as spend, SUM(spend_after_tax) as spend_tax,
                           SUM(live_gmv_max_cost) as live_cost, SUM(product_gmv_max_cost) as prod_cost,
                           SUM(manual_campaign_spend) as manual_cost, MAX(shop_name) as shop_name
                    FROM credentials.daily_shop_metrics
                    WHERE shop_number = $1 AND date >= $2::date AND date <= $3::date
                `, [shopNumber, startDate, endDate]);

                if (dbResult.rows.length > 0 && dbResult.rows[0].spend !== null) {
                    const dbSpend = parseFloat(dbResult.rows[0].spend);
                    const dbSpendTax = parseFloat(dbResult.rows[0].spend_tax || '0');
                    const liveGMVMaxCost = parseFloat(dbResult.rows[0].live_cost || '0');
                    const productGMVMaxCost = parseFloat(dbResult.rows[0].prod_cost || '0');
                    const manualCampaignSpend = parseFloat(dbResult.rows[0].manual_cost || '0');
                    const shopName = dbResult.rows[0].shop_name || `Shop ${shopNumber}`;
                    
                    if (dbSpend > 0) {
                        return NextResponse.json({
                            shopName,
                            liveGMVMaxCost,
                            productGMVMaxCost,
                            gmvMaxCost: liveGMVMaxCost + productGMVMaxCost,
                            manualCampaignSpend,
                            totalAdsSpend: dbSpend,
                            sst: dbSpend * 0.08,
                            wht: dbSpend * 0.08,
                            totalCostWithTaxes: dbSpendTax || (dbSpend * 1.16),
                            shopNumber,
                            metricType: 'roas',
                            currency: 'MYR',
                            dateRange: { start: startDate, end: endDate },
                            roasFormula: 'ROAS = GMV / (GMV Max Cost + Manual Campaign Spend)',
                            dataSource: 'database_cache'
                        });
                    }
                }
            } catch (dbErr) {
                console.warn('DB Cache lookup failed in tiktok/roas route:', dbErr);
            }
        }

        // Live fetch fallback
        let result;
        try {
            result = await fetchShopROAS(shopNumber, startDate, endDate);
        } catch (apiErr: any) {
            console.warn(`TikTok live roas fetch failed for shop ${shopNumber}:`, apiErr.message);
            // Attempt DB recovery fallback
            const dbResult = await query(`
                SELECT SUM(spend_before_tax) as spend, SUM(spend_after_tax) as spend_tax,
                       SUM(live_gmv_max_cost) as live_cost, SUM(product_gmv_max_cost) as prod_cost,
                       SUM(manual_campaign_spend) as manual_cost, MAX(shop_name) as shop_name
                FROM credentials.daily_shop_metrics
                WHERE shop_number = $1 AND date >= $2::date AND date <= $3::date
            `, [shopNumber, startDate, endDate]);

            if (dbResult.rows.length > 0 && dbResult.rows[0].spend !== null) {
                const dbSpend = parseFloat(dbResult.rows[0].spend);
                const dbSpendTax = parseFloat(dbResult.rows[0].spend_tax || '0');
                const liveGMVMaxCost = parseFloat(dbResult.rows[0].live_cost || '0');
                const productGMVMaxCost = parseFloat(dbResult.rows[0].prod_cost || '0');
                const manualCampaignSpend = parseFloat(dbResult.rows[0].manual_cost || '0');
                const shopName = dbResult.rows[0].shop_name || `Shop ${shopNumber}`;
                return NextResponse.json({
                    shopName,
                    liveGMVMaxCost,
                    productGMVMaxCost,
                    gmvMaxCost: liveGMVMaxCost + productGMVMaxCost,
                    manualCampaignSpend,
                    totalAdsSpend: dbSpend,
                    sst: dbSpend * 0.08,
                    wht: dbSpend * 0.08,
                    totalCostWithTaxes: dbSpendTax || (dbSpend * 1.16),
                    shopNumber,
                    metricType: 'roas',
                    currency: 'MYR',
                    dateRange: { start: startDate, end: endDate },
                    roasFormula: 'ROAS = GMV / (GMV Max Cost + Manual Campaign Spend)',
                    dataSource: 'database_recovery'
                });
            }
            throw apiErr;
        }

        // If live API returned 0 but DB has non-zero, fall back to DB to prevent 0-metric display bug
        if (result.totalAdsSpend === 0) {
            const dbResult = await query(`
                SELECT SUM(spend_before_tax) as spend, SUM(spend_after_tax) as spend_tax,
                       SUM(live_gmv_max_cost) as live_cost, SUM(product_gmv_max_cost) as prod_cost,
                       SUM(manual_campaign_spend) as manual_cost, MAX(shop_name) as shop_name
                FROM credentials.daily_shop_metrics
                WHERE shop_number = $1 AND date >= $2::date AND date <= $3::date
            `, [shopNumber, startDate, endDate]);

            if (dbResult.rows.length > 0 && dbResult.rows[0].spend !== null && parseFloat(dbResult.rows[0].spend) > 0) {
                const dbSpend = parseFloat(dbResult.rows[0].spend);
                const dbSpendTax = parseFloat(dbResult.rows[0].spend_tax || '0');
                const liveGMVMaxCost = parseFloat(dbResult.rows[0].live_cost || '0');
                const productGMVMaxCost = parseFloat(dbResult.rows[0].prod_cost || '0');
                const manualCampaignSpend = parseFloat(dbResult.rows[0].manual_cost || '0');
                return NextResponse.json({
                    shopName: result.shopName || dbResult.rows[0].shop_name,
                    liveGMVMaxCost,
                    productGMVMaxCost,
                    gmvMaxCost: liveGMVMaxCost + productGMVMaxCost,
                    manualCampaignSpend,
                    totalAdsSpend: dbSpend,
                    sst: dbSpend * 0.08,
                    wht: dbSpend * 0.08,
                    totalCostWithTaxes: dbSpendTax || (dbSpend * 1.16),
                    shopNumber,
                    metricType: 'roas',
                    currency: 'MYR',
                    dateRange: { start: startDate, end: endDate },
                    roasFormula: 'ROAS = GMV / (GMV Max Cost + Manual Campaign Spend)',
                    dataSource: 'database_recovery_zero'
                });
            }
        }

        return NextResponse.json({
            ...result,
            shopNumber,
            metricType: 'roas',
            currency: 'MYR',
            dateRange: { start: startDate, end: endDate },
            roasFormula: 'ROAS = GMV / (GMV Max Cost + Manual Campaign Spend)',
            dataSource: 'live_api'
        });
    } catch (error: any) {
        console.error('ROAS API Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
