/**
 * Fetch Manual/Bidding Campaign Ad Spend
 * 
 * This script fetches ad spend data for manual/bidding campaigns (non-GMV Max)
 * from two TikTok Ads accounts for ROAS calculation.
 * 
 * Advertiser IDs:
 * - Account 1: 7505228077656621057
 * - Account 2: 7404387549454008336
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const cleanEnv = (val) => val ? val.trim().replace(/^["']|["']$/g, '') : '';

// Configuration for both accounts
const accounts = [
    {
        name: 'Account 1',
        advertiserId: '7505228077656621057',
        accessTokenEnv: 'TIKTOK_ADS_ACCOUNT1_ACCESS_TOKEN'
    },
    {
        name: 'Account 2',
        advertiserId: '7404387549454008336',
        accessTokenEnv: 'TIKTOK_ADS_ACCOUNT2_ACCESS_TOKEN'
    }
];

const baseUrl = 'https://business-api.tiktok.com';
const version = 'v1.3';

// Date range - adjust as needed
const startDate = '2025-12-21';
const endDate = '2025-12-30';

/**
 * Fetch all campaigns for an advertiser (to identify manual vs GMV Max)
 */
async function fetchAllCampaigns(advertiserId, accessToken) {
    const allCampaigns = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const params = new URLSearchParams({
            advertiser_id: advertiserId,
            page: page.toString(),
            page_size: '100'
        });

        const url = `${baseUrl}/open_api/${version}/campaign/get/?${params.toString()}`;

        try {
            const response = await axios.get(url, {
                headers: {
                    'Access-Token': accessToken,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.code !== 0) {
                console.error('Error fetching campaigns:', response.data);
                break;
            }

            const list = response.data.data?.list || [];
            allCampaigns.push(...list);

            const pageInfo = response.data.data?.page_info;
            if (page >= (pageInfo?.total_page || 1)) {
                hasMore = false;
            } else {
                page++;
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        } catch (error) {
            console.error('Exception fetching campaigns:', error.message);
            break;
        }
    }

    return allCampaigns;
}

/**
 * Fetch GMV Max campaign IDs to exclude them from manual campaigns
 */
async function getGMVMaxCampaignIds(advertiserId, accessToken) {
    const gmvMaxIds = new Set();

    for (const promotionType of ['PRODUCT_GMV_MAX', 'LIVE_GMV_MAX']) {
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const params = new URLSearchParams({
                advertiser_id: advertiserId,
                filtering: JSON.stringify({ gmv_max_promotion_types: [promotionType] }),
                page: page.toString(),
                page_size: '100'
            });

            const url = `${baseUrl}/open_api/${version}/gmv_max/campaign/get/?${params.toString()}`;

            try {
                const response = await axios.get(url, {
                    headers: {
                        'Access-Token': accessToken,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.data.code !== 0) break;

                const list = response.data.data?.list || [];
                list.forEach(c => gmvMaxIds.add(c.campaign_id));

                const pageInfo = response.data.data?.page_info;
                if (page >= (pageInfo?.total_page || 1)) {
                    hasMore = false;
                } else {
                    page++;
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            } catch (error) {
                console.error('Exception fetching GMV Max campaigns:', error.message);
                break;
            }
        }
    }

    return gmvMaxIds;
}

/**
 * Fetch ad spend report for manual/bidding campaigns using integrated report API
 */
async function fetchManualCampaignSpend(advertiserId, accessToken, accountName) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Fetching Manual Campaign Spend for ${accountName}`);
    console.log(`Advertiser ID: ${advertiserId}`);
    console.log(`Date Range: ${startDate} to ${endDate}`);
    console.log('='.repeat(60));

    // First, get GMV Max campaign IDs to exclude
    console.log('\n1. Fetching GMV Max campaign IDs to exclude...');
    const gmvMaxIds = await getGMVMaxCampaignIds(advertiserId, accessToken);
    console.log(`   Found ${gmvMaxIds.size} GMV Max campaigns to exclude`);

    // Fetch the integrated report for all campaigns
    console.log('\n2. Fetching integrated report for all campaigns...');

    const allReportData = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const params = new URLSearchParams({
            advertiser_id: advertiserId,
            report_type: 'BASIC',
            data_level: 'AUCTION_CAMPAIGN',
            dimensions: JSON.stringify(['stat_time_day', 'campaign_id']),
            metrics: JSON.stringify(['spend', 'billed_cost', 'impressions', 'clicks', 'cpm', 'cpc', 'ctr']),
            start_date: startDate,
            end_date: endDate,
            page: page.toString(),
            page_size: '1000'
        });

        const url = `${baseUrl}/open_api/${version}/report/integrated/get/?${params.toString()}`;

        try {
            const response = await axios.get(url, {
                headers: {
                    'Access-Token': accessToken,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.code !== 0) {
                console.error('   Error:', response.data);
                break;
            }

            const list = response.data.data?.list || [];
            allReportData.push(...list);

            const pageInfo = response.data.data?.page_info;
            console.log(`   Page ${page}/${pageInfo?.total_page || 1}: fetched ${list.length} records`);

            if (page >= (pageInfo?.total_page || 1)) {
                hasMore = false;
            } else {
                page++;
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error('   Exception:', error.message);
            break;
        }
    }

    console.log(`   Total records fetched: ${allReportData.length}`);

    // Filter out GMV Max campaigns - keep only manual/bidding campaigns
    console.log('\n3. Filtering to manual/bidding campaigns only...');
    const manualCampaignData = allReportData.filter(item => {
        const campaignId = item.dimensions?.campaign_id;
        return campaignId && !gmvMaxIds.has(campaignId);
    });
    console.log(`   Manual campaign records: ${manualCampaignData.length}`);

    // Aggregate totals
    let totalSpend = 0;
    let totalBilledCost = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    const campaignBreakdown = {};
    const dailyBreakdown = {};

    manualCampaignData.forEach(item => {
        const campaignId = item.dimensions.campaign_id;
        const campaignName = 'Campaign ' + campaignId;
        const date = item.dimensions.stat_time_day;
        const spend = parseFloat(item.metrics.spend || 0);
        const billedCost = parseFloat(item.metrics.billed_cost || 0);
        const impressions = parseInt(item.metrics.impressions || 0, 10);
        const clicks = parseInt(item.metrics.clicks || 0, 10);

        totalSpend += spend;
        totalBilledCost += billedCost;
        totalImpressions += impressions;
        totalClicks += clicks;

        // Campaign breakdown
        if (!campaignBreakdown[campaignId]) {
            campaignBreakdown[campaignId] = {
                name: campaignName,
                spend: 0,
                billedCost: 0,
                impressions: 0,
                clicks: 0
            };
        }
        campaignBreakdown[campaignId].spend += spend;
        campaignBreakdown[campaignId].billedCost += billedCost;
        campaignBreakdown[campaignId].impressions += impressions;
        campaignBreakdown[campaignId].clicks += clicks;

        // Daily breakdown
        if (!dailyBreakdown[date]) {
            dailyBreakdown[date] = {
                spend: 0,
                billedCost: 0
            };
        }
        dailyBreakdown[date].spend += spend;
        dailyBreakdown[date].billedCost += billedCost;
    });

    // Print results
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY - MANUAL/BIDDING CAMPAIGNS');
    console.log('='.repeat(60));
    console.log(`Total Ad Spend: RM ${totalSpend.toFixed(2)}`);
    console.log(`Total Billed Cost: RM ${totalBilledCost.toFixed(2)}`);
    console.log(`Total Impressions: ${totalImpressions.toLocaleString()}`);
    console.log(`Total Clicks: ${totalClicks.toLocaleString()}`);
    console.log(`Number of Campaigns: ${Object.keys(campaignBreakdown).length}`);

    console.log('\n' + '-'.repeat(60));
    console.log('DAILY BREAKDOWN');
    console.log('-'.repeat(60));
    Object.keys(dailyBreakdown).sort().forEach(date => {
        console.log(`  ${date}: RM ${dailyBreakdown[date].spend.toFixed(2)}`);
    });

    console.log('\n' + '-'.repeat(60));
    console.log('CAMPAIGN BREAKDOWN (Top 10 by Spend)');
    console.log('-'.repeat(60));
    const sortedCampaigns = Object.entries(campaignBreakdown)
        .sort((a, b) => b[1].spend - a[1].spend)
        .slice(0, 10);

    sortedCampaigns.forEach(([id, data]) => {
        console.log(`  ID: ${id}`);
        console.log(`    Spend: RM ${data.spend.toFixed(2)} | Clicks: ${data.clicks.toLocaleString()}`);
    });

    return {
        accountName,
        advertiserId,
        dateRange: { startDate, endDate },
        summary: {
            totalSpend,
            totalBilledCost,
            totalImpressions,
            totalClicks,
            campaignCount: Object.keys(campaignBreakdown).length,
            avgCPM: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
            avgCPC: totalClicks > 0 ? totalSpend / totalClicks : 0
        },
        dailyBreakdown,
        campaignBreakdown
    };
}

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('MANUAL/BIDDING CAMPAIGN AD SPEND FETCHER');
    console.log('For ROAS Calculation');
    console.log('='.repeat(60));

    const results = {};

    for (const account of accounts) {
        const accessToken = cleanEnv(process.env[account.accessTokenEnv]);

        if (!accessToken) {
            console.error(`\n❌ No access token found for ${account.name} (env: ${account.accessTokenEnv})`);
            results[account.name] = { error: 'Missing access token' };
            continue;
        }

        try {
            results[account.name] = await fetchManualCampaignSpend(
                account.advertiserId,
                accessToken,
                account.name
            );
        } catch (error) {
            console.error(`\n❌ Error processing ${account.name}:`, error.message);
            results[account.name] = { error: error.message };
        }
    }

    // Combined summary
    console.log('\n' + '='.repeat(60));
    console.log('COMBINED SUMMARY - ALL ACCOUNTS');
    console.log('='.repeat(60));

    let grandTotalSpend = 0;
    Object.entries(results).forEach(([name, data]) => {
        if (data.summary) {
            console.log(`${name}: RM ${data.summary.totalSpend.toFixed(2)}`);
            grandTotalSpend += data.summary.totalSpend;
        } else {
            console.log(`${name}: Error - ${data.error}`);
        }
    });
    console.log('-'.repeat(60));
    console.log(`GRAND TOTAL AD SPEND: RM ${grandTotalSpend.toFixed(2)}`);

    // Save results
    const outputPath = path.resolve(__dirname, 'manual_campaign_spend_results.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n✅ Results saved to: ${outputPath}`);
}

main().catch(console.error);
