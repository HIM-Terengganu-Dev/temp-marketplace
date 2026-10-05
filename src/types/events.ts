export interface CustomCostItem {
    id: string;
    name: string;
    amount: number;
}

export type EventPlatform = 'combine' | 'tiktok' | 'shopee';
export type EventDepartment = 'marketing' | 'livehost' | 'affiliate' | 'orders';

export interface CampaignEvent {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    targetAmount: number;
    platform: EventPlatform;
    departments: EventDepartment[];
    customCosts: CustomCostItem[];
    platformCostRate?: number;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface WinningSkuItem {
    sku: string;
    name: string;
    orders: number;
    unitsSold: number;
    unitCost: number;
    totalCogs: number;
}

export interface EventAnalysisMetrics {
    sales: number;
    storeSales: number;
    departmentSales: number;
    target: number;
    targetAttainment: number; // percentage
    targetVariance: number; // sales - target
    spend: number; // ad cost from this system
    roas: number; // sales / spend
    totalOrders: number;
    aov: number; // sales / totalOrders
    winningSkus: WinningSkuItem[];
    totalCogs: number;
    cogsPercentage: number; // (totalCogs / sales) * 100
    platformCost: number; // totalSales * (platformCostRate / 100)
    platformCostRate: number; // percentage (e.g. 25)
    customCosts: CustomCostItem[];
    totalCustomCosts: number;
    profit: number; // sales - spend - totalCogs - platformCost - totalCustomCosts
    profitMargin: number; // (profit / sales) * 100
    netRoas: number; // profit / spend
    departmentBreakdown: {
        marketing: {
            gmv: number;
            videos: number;
            itemsSold: number;
            enabled: boolean;
        };
        livehost: {
            gmv: number;
            hours: number;
            orders: number;
            enabled: boolean;
        };
        affiliate: {
            gmv: number;
            orders: number;
            itemsSold: number;
            enabled: boolean;
        };
        storeOrders: {
            orders: number;
            units: number;
            enabled: boolean;
        };
    };
    platformBreakdown: {
        shopee: {
            gmv: number;
            spend: number;
            orders: number;
        };
        tiktok: {
            gmv: number;
            spend: number;
            orders: number;
        };
    };
}
