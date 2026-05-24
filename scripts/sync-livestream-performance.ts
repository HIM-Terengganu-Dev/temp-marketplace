import dotenv from 'dotenv';
import { syncLivestreamMetricsForDate } from '../src/lib/metrics-fetcher';

dotenv.config();

/**
 * Script to backfill/sync livestream performance metrics for the last 7 days.
 * Uses Asia/Kuala_Lumpur timezone to compute dates correctly.
 */
async function backfillLivestreamMetrics() {
    try {
        console.log('Starting backfill for TikTok Shop livestream metrics (past 7 days)...');

        // Compute today in KL time (UTC+8)
        const nowKL = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));

        for (let i = 0; i <= 7; i++) {
            const d = new Date(nowKL);
            d.setDate(nowKL.getDate() - i);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            console.log(`\n--- Syncing Date: ${dateStr} (KL) ---`);

            for (const shopNum of [1, 2, 3, 4]) {
                await syncLivestreamMetricsForDate(shopNum, dateStr);
            }
        }

        console.log('\n✅ Livestream metrics backfill completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error in livestream metrics backfill:', error);
        process.exit(1);
    }
}

backfillLivestreamMetrics();
