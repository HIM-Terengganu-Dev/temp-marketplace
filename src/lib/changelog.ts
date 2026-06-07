/**
 * CHANGELOG — HIM Marketplace Dashboard
 *
 * HOW TO ADD A NEW UPDATE:
 * 1. Add a new entry at the TOP of the CHANGELOG array (newest first)
 * 2. Update APP_VERSION to match the new entry's version
 * 3. Write changes in plain, friendly language — no technical terms
 * 4. Use these types: "new" | "fix" | "improve" | "remove"
 *
 * The popup will automatically appear for all users on their next visit.
 */

export const APP_VERSION = "1.5.0";

export type ChangeType = "new" | "fix" | "improve" | "remove";

export interface ChangeEntry {
    type: ChangeType;
    text: string;
}

export interface ChangelogEntry {
    version: string;
    date: string;
    title: string;
    emoji: string;
    summary: string;
    changes: ChangeEntry[];
}

export const CHANGELOG: ChangelogEntry[] = [
    {
        version: "1.5.0",
        date: "7 Jun 2026",
        emoji: "✨",
        title: "You Can Now See Every Update We Make",
        summary: "From now on, every time we improve this dashboard, a popup will tell you exactly what changed — in simple language, not technical talk.",
        changes: [
            {
                type: "new",
                text: "This 'What's New' popup! It will appear automatically every time there's an update, so you always know what's been improved",
            },
            {
                type: "new",
                text: "A '✨ What's New' button is now in the toolbar — click it anytime to see the full list of all past updates",
            },
            {
                type: "new",
                text: "A small red dot appears on the button when there's something new you haven't seen yet",
            },
            {
                type: "improve",
                text: "All previous updates are listed here too, so new team members can catch up on everything the dashboard can do",
            },
        ],
    },
    {
        version: "1.4.0",
        date: "7 Jun 2026",
        emoji: "🌙",
        title: "Smarter Data & Auto-Sync Every Night",
        summary: "Sales numbers now always show the right amount — no more waiting 10 minutes for the correct figure to appear.",
        changes: [
            {
                type: "fix",
                text: "Sales numbers for past dates (like yesterday or June 4) now show the correct amount immediately when you open the dashboard — no more refreshing and waiting",
            },
            {
                type: "new",
                text: "The system now automatically syncs all shop data every night at 1:00 AM, so your morning numbers are always accurate and up to date",
            },
            {
                type: "new",
                text: "Added a pulsing yellow 'Stale · Refreshing' badge — if you ever see it, it means the system caught an old number and is fixing it right now",
            },
            {
                type: "improve",
                text: "Past dates that were recorded while a live session was still running will now automatically fetch the final correct totals",
            },
        ],
    },
    {
        version: "1.3.0",
        date: "3 Jun 2026",
        emoji: "🛍️",
        title: "Shopee Integration & Multi-Platform View",
        summary: "Shopee shops are now fully connected alongside TikTok, giving you a complete picture of all your sales in one place.",
        changes: [
            {
                type: "new",
                text: "Shopee shops are now connected and showing real sales data alongside TikTok",
            },
            {
                type: "new",
                text: "Meta CPAS ad spend (Facebook catalog ads that drive Shopee sales) is now included in the ad spend breakdown",
            },
            {
                type: "new",
                text: "Platform contribution breakdown — see what percentage of total sales comes from TikTok vs Shopee",
            },
            {
                type: "improve",
                text: "Ad spend now shows separately as 'Before Tax' and 'After Tax (SST + WHT)' for more accurate profit calculations",
            },
        ],
    },
    {
        version: "1.2.0",
        date: "28 May 2026",
        emoji: "📊",
        title: "Live Sales Notifications & Auto-Refresh",
        summary: "Get notified the moment a new order comes in, and see your numbers update every 30 seconds automatically.",
        changes: [
            {
                type: "new",
                text: "Pop-up alerts appear at the bottom of the screen whenever new orders come in during a live session",
            },
            {
                type: "new",
                text: "Dashboard automatically refreshes every 30 seconds when viewing today's data — no more manual refreshing",
            },
            {
                type: "new",
                text: "Added Pause / Resume button to control the auto-refresh when you don't want the screen to update",
            },
            {
                type: "improve",
                text: "Syncing status badges now show clearly whether data is coming from live API or saved database",
            },
        ],
    },
    {
        version: "1.1.0",
        date: "20 May 2026",
        emoji: "🏪",
        title: "Multiple Shop Support & ROAS Tracking",
        summary: "Track all 4 shops at once and see your return on ad spend calculated automatically.",
        changes: [
            {
                type: "new",
                text: "All 4 TikTok shops (Him.DrSamhan, HIM CLINIC, Vigomax HQ, VigomaxPlus HQ) now show on one screen",
            },
            {
                type: "new",
                text: "ROAS (Return on Ad Spend) is now calculated and displayed for each shop — tells you how much sales you get for every RM1 spent on ads",
            },
            {
                type: "new",
                text: "Filter by company: view all shops together, or switch between HIM Wellness and WEROCA separately",
            },
            {
                type: "new",
                text: "Click on any shop card to see a detailed breakdown of its performance",
            },
        ],
    },
    {
        version: "1.0.0",
        date: "10 May 2026",
        emoji: "🚀",
        title: "Dashboard Launched!",
        summary: "The HIM Marketplace Dashboard is live — one place to see all your sales numbers.",
        changes: [
            {
                type: "new",
                text: "First version of the HIM Marketplace Dashboard is live",
            },
            {
                type: "new",
                text: "See today's total sales (GMV), ad spend, and ROAS at a glance",
            },
            {
                type: "new",
                text: "Pick any date range to view historical sales data",
            },
            {
                type: "new",
                text: "Daily and hourly performance charts to spot trends",
            },
        ],
    },
];
