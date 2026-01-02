export type Platform = 'TikTok' | 'Shopee' | 'Meta';
export type ConnectionStatus = 'connected' | 'under_development' | 'error';

export interface ShopData {
    id: string;
    name: string;
    platform: Platform;
    type: 'shop' | 'ad_account';
    roas?: number;
    spend?: number;
    revenue?: number;
    status: ConnectionStatus;
}

export const MOCK_DATA: ShopData[] = [
    // TikTok Shops (x4)
    { id: 'tts_1', name: 'HIM Wellness Main', platform: 'TikTok', type: 'shop', roas: 3.5, spend: 5000, revenue: 17500, status: 'connected' },
    { id: 'tts_2', name: 'HIM Beauty', platform: 'TikTok', type: 'shop', roas: 2.8, spend: 2000, revenue: 5600, status: 'connected' },
    { id: 'tts_3', name: 'HIM Lifestyle', platform: 'TikTok', type: 'shop', roas: 4.1, spend: 1500, revenue: 6150, status: 'connected' },
    { id: 'tts_4', name: 'HIM Essentials', platform: 'TikTok', type: 'shop', status: 'under_development' },

    // Shopee Shop (x1)
    { id: 'shp_1', name: 'HIM Official Store', platform: 'Shopee', type: 'shop', roas: 5.2, spend: 3000, revenue: 15600, status: 'connected' },

    // Ad Accounts (2 TikTok, 1 Meta)
    { id: 'ad_tt_1', name: 'TikTok Ads Main', platform: 'TikTok', type: 'ad_account', roas: 2.1, spend: 12000, revenue: 25200, status: 'connected' },
    { id: 'ad_tt_2', name: 'TikTok Ads Creative', platform: 'TikTok', type: 'ad_account', status: 'under_development' },
    { id: 'ad_meta_1', name: 'Meta Business Portfolio', platform: 'Meta', type: 'ad_account', roas: 3.8, spend: 8000, revenue: 30400, status: 'connected' },
];
