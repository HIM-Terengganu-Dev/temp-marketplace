"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    FlaskConical, 
    RefreshCw, 
    Play, 
    Pause, 
    DollarSign, 
    BarChart3, 
    PieChart, 
    Terminal, 
    ShieldCheck, 
    AlertTriangle,
    Eye,
    MousePointerClick,
    TrendingUp,
    Share2,
    Building,
    CheckCircle2,
    XCircle,
    SlidersHorizontal,
    ChevronRight,
    Sparkles,
    Image as ImageIcon,
    Video,
    Edit3,
    ArrowLeft,
    Check,
    UploadCloud,
    FolderKanban,
    Link as LinkIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdAccount {
    id: string;
    name: string;
    account_id: string;
    currency: string;
    account_status: number;
    statusLabel: string;
    isCpas: boolean;
    cpasLabel: string | null;
    balance?: string;
    amount_spent?: string;
}

interface PageItem {
    id: string;
    name: string;
    category?: string;
    followers_count?: number;
    tasks?: string[];
}

interface CampaignItem {
    id: string;
    name: string;
    status: string;
    effective_status: string;
    objective: string;
    daily_budget?: string;
    lifetime_budget?: string;
    recentSpend: number;
    recentClicks: number;
    recentImpressions: number;
    recentCtr: number;
    recentCpc: number;
}

interface AdSetItem {
    id: string;
    name: string;
    status: string;
    effectiveStatus: string;
    dailyBudget: number | null;
    lifetimeBudget: number | null;
    optimizationGoal: string;
    billingEvent: string;
    targeting?: any;
}

interface AdItem {
    id: string;
    name: string;
    status: string;
    effectiveStatus: string;
    adSetId: string;
    creativeId: string;
    creativeName: string;
    headline: string;
    body: string;
    destinationUrl: string;
    thumbnailUrl: string;
    isVideo: boolean;
    videoId?: string | null;
    imageHash?: string | null;
}

interface MediaAsset {
    type: "video" | "image";
    id: string;
    videoId?: string;
    hash?: string;
    name: string;
    url: string | null;
    thumbnailUrl: string;
    createdTime?: string;
}

interface InsightRecord {
    campaignId: string;
    campaignName: string;
    spend: number;
    impressions: number;
    clicks: number;
    cpc: number;
    cpm: number;
    ctr: number;
    reach: number;
    frequency: number;
    actions: Record<string, number>;
    publisherPlatform?: string | null;
    devicePlatform?: string | null;
}

interface AccountSummary {
    spend: number;
    impressions: number;
    clicks: number;
    cpc: number;
    cpm: number;
    ctr: number;
    reach: number;
    frequency: number;
    actions: Record<string, number>;
}

export default function TestFieldPage() {
    const [activeTab, setActiveTab] = useState<"performance" | "campaigns" | "placements" | "accounts" | "raw">("campaigns");
    
    // Accounts & identity state
    const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
    const [pages, setPages] = useState<PageItem[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<string>("act_1462603651298383");
    const [tokenUser, setTokenUser] = useState<any>(null);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    // Campaigns state
    const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
    const [loadingCampaigns, setLoadingCampaigns] = useState(false);
    const [mutatingCampaignId, setMutatingCampaignId] = useState<string | null>(null);

    // Drill-down hierarchy state
    const [activeCampaign, setActiveCampaign] = useState<CampaignItem | null>(null);
    const [adsets, setAdsets] = useState<AdSetItem[]>([]);
    const [loadingAdsets, setLoadingAdsets] = useState(false);
    const [activeAdSet, setActiveAdSet] = useState<AdSetItem | null>(null);
    const [ads, setAds] = useState<AdItem[]>([]);
    const [loadingAds, setLoadingAds] = useState(false);

    // Media library & Ad editor state
    const [mediaLibrary, setMediaLibrary] = useState<MediaAsset[]>([]);
    const [loadingMedia, setLoadingMedia] = useState(false);
    const [editingAd, setEditingAd] = useState<AdItem | null>(null);
    const [editForm, setEditForm] = useState<{
        headline: string;
        body: string;
        destinationUrl: string;
        selectedMedia: MediaAsset | null;
        callToAction: string;
    }>({
        headline: "",
        body: "",
        destinationUrl: "",
        selectedMedia: null,
        callToAction: "SHOP_NOW"
    });
    const [savingCreative, setSavingCreative] = useState(false);

    // Insights state
    const [datePreset, setDatePreset] = useState<string>("last_7d");
    const [insights, setInsights] = useState<InsightRecord[]>([]);
    const [summary, setSummary] = useState<AccountSummary | null>(null);
    const [loadingInsights, setLoadingInsights] = useState(false);

    // Breakdowns state
    const [breakdownType, setBreakdownType] = useState<string>("publisher_platform");
    const [breakdownRecords, setBreakdownRecords] = useState<InsightRecord[]>([]);
    const [loadingBreakdown, setLoadingBreakdown] = useState(false);

    // Raw Query Sandbox state
    const [rawEndpoint, setRawEndpoint] = useState<string>("act_1462603651298383/insights?fields=campaign_name,spend,cpc,ctr&date_preset=last_7d");
    const [rawResult, setRawResult] = useState<any>(null);
    const [rawLoading, setRawLoading] = useState(false);

    // Safety confirmation modal state
    const [pendingAction, setPendingAction] = useState<{
        type: "toggle_campaign" | "toggle_adset" | "toggle_ad" | "budget";
        item: any;
        nextStatus?: string;
        nextBudget?: number;
    } | null>(null);

    // Notification message
    const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const showNotice = (type: "success" | "error", text: string) => {
        setNotice({ type, text });
        setTimeout(() => setNotice(null), 5000);
    };

    // 1. Fetch Ad Accounts & Pages
    const fetchAccounts = useCallback(async () => {
        setLoadingAccounts(true);
        try {
            const res = await fetch("/api/test-field/meta/accounts");
            const data = await res.json();
            if (data.success) {
                setAdAccounts(data.adAccounts || []);
                setPages(data.pages || []);
                setTokenUser(data.user);
                if (data.adAccounts?.length > 0 && !selectedAccount) {
                    const defaultAcc = data.adAccounts.find((a: any) => a.isCpas) || data.adAccounts[0];
                    setSelectedAccount(defaultAcc.id);
                }
            } else {
                showNotice("error", data.error || "Failed to load Meta accounts.");
            }
        } catch (err: any) {
            showNotice("error", err.message);
        } finally {
            setLoadingAccounts(false);
        }
    }, [selectedAccount]);

    // 2. Fetch Campaigns
    const fetchCampaigns = useCallback(async () => {
        if (!selectedAccount) return;
        setLoadingCampaigns(true);
        try {
            const res = await fetch(`/api/test-field/meta/campaigns?adAccountId=${selectedAccount}`);
            const data = await res.json();
            if (data.success) {
                setCampaigns(data.campaigns || []);
            } else {
                showNotice("error", data.error || "Failed to fetch campaigns.");
            }
        } catch (err: any) {
            showNotice("error", err.message);
        } finally {
            setLoadingCampaigns(false);
        }
    }, [selectedAccount]);

    // 3. Fetch AdSets for active campaign
    const fetchAdSets = useCallback(async (campaignId: string) => {
        setLoadingAdsets(true);
        try {
            const res = await fetch(`/api/test-field/meta/adsets?campaignId=${campaignId}`);
            const data = await res.json();
            if (data.success) {
                setAdsets(data.adsets || []);
            } else {
                showNotice("error", data.error || "Failed to fetch ad sets.");
            }
        } catch (err: any) {
            showNotice("error", err.message);
        } finally {
            setLoadingAdsets(false);
        }
    }, []);

    // 4. Fetch Ads for active AdSet or Campaign
    const fetchAds = useCallback(async (adSetId?: string, campaignId?: string) => {
        setLoadingAds(true);
        try {
            const queryParam = adSetId ? `adSetId=${adSetId}` : `campaignId=${campaignId}`;
            const res = await fetch(`/api/test-field/meta/ads?${queryParam}`);
            const data = await res.json();
            if (data.success) {
                setAds(data.ads || []);
            } else {
                showNotice("error", data.error || "Failed to fetch ads.");
            }
        } catch (err: any) {
            showNotice("error", err.message);
        } finally {
            setLoadingAds(false);
        }
    }, []);

    // 5. Fetch Media Library for selected ad account
    const fetchMediaLibrary = useCallback(async () => {
        if (!selectedAccount) return;
        setLoadingMedia(true);
        try {
            const res = await fetch(`/api/test-field/meta/media?adAccountId=${selectedAccount}`);
            const data = await res.json();
            if (data.success) {
                setMediaLibrary(data.media || []);
            } else {
                console.warn("Could not load media library:", data.error);
            }
        } catch (err: any) {
            console.warn("Media library fetch error:", err.message);
        } finally {
            setLoadingMedia(false);
        }
    }, [selectedAccount]);

    // 6. Fetch Insights
    const fetchInsights = useCallback(async () => {
        if (!selectedAccount) return;
        setLoadingInsights(true);
        try {
            const res = await fetch(`/api/test-field/meta/insights?adAccountId=${selectedAccount}&datePreset=${datePreset}`);
            const data = await res.json();
            if (data.success) {
                setInsights(data.campaigns || []);
                setSummary(data.accountSummary || null);
            } else {
                showNotice("error", data.error || "Failed to fetch insights.");
            }
        } catch (err: any) {
            showNotice("error", err.message);
        } finally {
            setLoadingInsights(false);
        }
    }, [selectedAccount, datePreset]);

    // 7. Fetch Breakdown Insights
    const fetchBreakdowns = useCallback(async () => {
        if (!selectedAccount) return;
        setLoadingBreakdown(true);
        try {
            const res = await fetch(`/api/test-field/meta/insights?adAccountId=${selectedAccount}&datePreset=${datePreset}&breakdown=${breakdownType}`);
            const data = await res.json();
            if (data.success) {
                setBreakdownRecords(data.campaigns || []);
            } else {
                showNotice("error", data.error || "Failed to fetch breakdown data.");
            }
        } catch (err: any) {
            showNotice("error", err.message);
        } finally {
            setLoadingBreakdown(false);
        }
    }, [selectedAccount, datePreset, breakdownType]);

    // 8. Execute Raw Query
    const handleRunRawQuery = async () => {
        if (!rawEndpoint) return;
        setRawLoading(true);
        setRawResult(null);
        try {
            const res = await fetch("/api/test-field/meta/raw-query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ endpoint: rawEndpoint })
            });
            const data = await res.json();
            setRawResult(data);
        } catch (err: any) {
            setRawResult({ success: false, error: err.message });
        } finally {
            setRawLoading(false);
        }
    };

    // Open Drilldown for a Campaign
    const handleSelectCampaign = (c: CampaignItem) => {
        setActiveCampaign(c);
        setActiveAdSet(null);
        setEditingAd(null);
        fetchAdSets(c.id);
        fetchAds(undefined, c.id);
        fetchMediaLibrary();
    };

    // Open Editor for an Ad
    const handleOpenAdEditor = (ad: AdItem) => {
        // Extract embedded URL if present
        let initialUrl = ad.destinationUrl;
        if (!initialUrl && ad.body) {
            const match = ad.body.match(/https?:\/\/[^\s\n\r]+/i);
            if (match) initialUrl = match[0].trim();
        }

        setEditingAd(ad);
        setEditForm({
            headline: ad.headline || "",
            body: ad.body || "",
            destinationUrl: initialUrl || "https://shopee.com.my",
            selectedMedia: null, // by default keep existing unless swapped
            callToAction: "SHOP_NOW"
        });
        fetchMediaLibrary();
    };

    // Save Creative & Swap Media on Meta
    const handleSaveCreativeMutation = async () => {
        if (!editingAd || !selectedAccount) return;
        setSavingCreative(true);
        try {
            const mediaType = editForm.selectedMedia ? editForm.selectedMedia.type : (editingAd.isVideo ? "video" : "image");
            const mediaId = editForm.selectedMedia 
                ? (editForm.selectedMedia.type === "video" ? editForm.selectedMedia.videoId : editForm.selectedMedia.hash)
                : (editingAd.videoId || editingAd.imageHash);

            const res = await fetch("/api/test-field/meta/media", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    adAccountId: selectedAccount,
                    adId: editingAd.id,
                    name: `Edit_${editingAd.name}_${Date.now()}`,
                    headline: editForm.headline,
                    message: editForm.body,
                    linkUrl: editForm.destinationUrl,
                    mediaType,
                    mediaId,
                    callToActionType: editForm.callToAction
                })
            });

            const data = await res.json();
            if (data.success) {
                showNotice("success", `Ad creative updated and applied to "${editingAd.name}" on Meta!`);
                setEditingAd(null);
                if (activeCampaign) {
                    fetchAds(activeAdSet?.id, activeCampaign.id);
                }
            } else {
                showNotice("error", data.error || "Failed to update ad creative on Meta.");
            }
        } catch (err: any) {
            showNotice("error", err.message);
        } finally {
            setSavingCreative(false);
        }
    };

    // Confirm Toggle or Budget Action
    const handleConfirmAction = async () => {
        if (!pendingAction) return;
        const { type, item, nextStatus, nextBudget } = pendingAction;
        setPendingAction(null);

        try {
            if (type === "toggle_campaign") {
                setMutatingCampaignId(item.id);
                const res = await fetch("/api/test-field/meta/campaigns", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ campaignId: item.id, status: nextStatus })
                });
                const d = await res.json();
                if (d.success) {
                    showNotice("success", `Campaign "${item.name}" updated to ${nextStatus}.`);
                    fetchCampaigns();
                } else throw new Error(d.error);
            } else if (type === "toggle_adset") {
                const res = await fetch("/api/test-field/meta/adsets", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ adSetId: item.id, status: nextStatus })
                });
                const d = await res.json();
                if (d.success) {
                    showNotice("success", `AdSet "${item.name}" updated to ${nextStatus}.`);
                    if (activeCampaign) fetchAdSets(activeCampaign.id);
                } else throw new Error(d.error);
            } else if (type === "toggle_ad") {
                const res = await fetch("/api/test-field/meta/ads", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ adId: item.id, status: nextStatus })
                });
                const d = await res.json();
                if (d.success) {
                    showNotice("success", `Ad "${item.name}" updated to ${nextStatus}.`);
                    if (activeCampaign) fetchAds(activeAdSet?.id, activeCampaign.id);
                } else throw new Error(d.error);
            } else if (type === "budget") {
                const res = await fetch("/api/test-field/meta/adsets", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ adSetId: item.id, dailyBudgetRM: nextBudget })
                });
                const d = await res.json();
                if (d.success) {
                    showNotice("success", `Daily budget for "${item.name}" set to RM ${nextBudget?.toFixed(2)}.`);
                    if (activeCampaign) fetchAdSets(activeCampaign.id);
                } else throw new Error(d.error);
            }
        } catch (err: any) {
            showNotice("error", err.message || "Action failed.");
        } finally {
            setMutatingCampaignId(null);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    useEffect(() => {
        if (selectedAccount) {
            fetchCampaigns();
            fetchInsights();
            fetchBreakdowns();
        }
    }, [selectedAccount, fetchCampaigns, fetchInsights, fetchBreakdowns]);

    const activeAccountObj = adAccounts.find(a => a.id === selectedAccount);

    return (
        <div className="space-y-6 pb-16 font-sans">
            {/* Notification banner */}
            {notice && (
                <div className={cn(
                    "p-4 rounded-xl border flex items-center justify-between shadow-lg transition-all animate-fade-in",
                    notice.type === "success" 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                        : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                )}>
                    <div className="flex items-center gap-3">
                        {notice.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                        <span className="text-sm font-medium">{notice.text}</span>
                    </div>
                    <button onClick={() => setNotice(null)} className="text-xs opacity-70 hover:opacity-100">Dismiss</button>
                </div>
            )}

            {/* Header / Sandbox intro */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-400">
                            <FlaskConical className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    Meta & CPAS Test Field
                                </h1>
                                <Badge variant="outline" className="border-violet-500/40 text-violet-400 bg-violet-500/10 text-[10px] font-mono">
                                    SANDBOX LAB
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Live staging laboratory: inspect campaign content, drill into Ad Sets, and swap media creatives directly on Meta.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Account selector and refresh action */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center bg-card/60 backdrop-blur-md border border-border/60 rounded-xl px-3 py-1.5 shadow-sm">
                        <Building className="h-4 w-4 text-muted-foreground mr-2" />
                        <select
                            value={selectedAccount}
                            onChange={(e) => {
                                setSelectedAccount(e.target.value);
                                setActiveCampaign(null);
                                setActiveAdSet(null);
                                setEditingAd(null);
                            }}
                            className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer max-w-[220px] truncate"
                        >
                            {adAccounts.map((acc) => (
                                <option key={acc.id} value={acc.id} className="bg-background text-foreground">
                                    {acc.name} {acc.isCpas ? "⭐ [CPAS]" : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => { fetchCampaigns(); fetchInsights(); fetchBreakdowns(); }}
                        disabled={loadingCampaigns || loadingInsights}
                        className="h-9 px-3 border-border/60 gap-1.5"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", (loadingCampaigns || loadingInsights) && "animate-spin text-primary")} />
                        <span className="text-xs">Refresh</span>
                    </Button>
                </div>
            </div>

            {/* Token & System Diagnostic Strip */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Card className="bg-card/40 border-border/40 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Active Ad Account</p>
                        <p className="text-sm font-semibold text-foreground truncate max-w-[180px]">
                            {activeAccountObj?.name || selectedAccount}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{selectedAccount}</p>
                    </div>
                    {activeAccountObj?.isCpas && (
                        <Badge className="bg-amber-500/15 border-amber-500/30 text-amber-400 text-[10px]">
                            Shopee CPAS
                        </Badge>
                    )}
                </Card>

                <Card className="bg-card/40 border-border/40 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Currency & Status</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-sm font-bold text-foreground">{activeAccountObj?.currency || "MYR"}</span>
                            <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                                {activeAccountObj?.statusLabel || "ACTIVE"}
                            </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Permissions: Full Management</p>
                    </div>
                    <ShieldCheck className="h-6 w-6 text-emerald-400" />
                </Card>

                <Card className="bg-card/40 border-border/40 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Authorized Profile</p>
                        <p className="text-sm font-semibold text-foreground">{tokenUser?.name || "Connected User"}</p>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">ID: {tokenUser?.id || "N/A"}</p>
                    </div>
                    <CheckCircle2 className="h-6 w-6 text-blue-400" />
                </Card>

                <Card className="bg-card/40 border-border/40 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Linked FB Pages</p>
                        <p className="text-sm font-semibold text-foreground">{pages.length} Pages Available</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Post Engagement & Creatives</p>
                    </div>
                    <Share2 className="h-6 w-6 text-violet-400" />
                </Card>
            </div>

            {/* Navigation Tabs within Test Field */}
            <div className="flex items-center gap-1.5 border-b border-border/30 pb-2 overflow-x-auto">
                {[
                    { id: "campaigns",   label: "Campaigns & Creative Editor", icon: SlidersHorizontal },
                    { id: "performance", label: "Performance Studio", icon: BarChart3 },
                    { id: "placements",  label: "Placements & Breakdowns", icon: PieChart },
                    { id: "accounts",    label: "Accounts & Pages Directory", icon: Building },
                    { id: "raw",         label: "Graph API Inspector", icon: Terminal },
                ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 whitespace-nowrap",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* TAB: CAMPAIGN MANAGER & DRILL-DOWN EDITOR */}
            {activeTab === "campaigns" && (
                <div className="space-y-6 animate-fade-in">
                    {/* BREADCRUMB NAVIGATION IF DRILLING DOWN */}
                    {activeCampaign ? (
                        <div className="flex items-center justify-between bg-card/60 border border-border/50 p-4 rounded-2xl backdrop-blur-md">
                            <div className="flex items-center gap-2 text-xs">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => { setActiveCampaign(null); setActiveAdSet(null); setEditingAd(null); }}
                                    className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    <ArrowLeft className="h-3.5 w-3.5" />
                                    All Campaigns
                                </Button>
                                <span className="text-muted-foreground">/</span>
                                <span className="font-bold text-foreground truncate max-w-[240px]">{activeCampaign.name}</span>
                                {activeAdSet && (
                                    <>
                                        <span className="text-muted-foreground">/</span>
                                        <span className="font-medium text-primary truncate max-w-[180px]">{activeAdSet.name}</span>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Badge 
                                    variant="outline" 
                                    className={cn(
                                        "text-xs font-mono",
                                        activeCampaign.status === "ACTIVE" 
                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                                            : "text-muted-foreground"
                                    )}
                                >
                                    {activeCampaign.status}
                                </Badge>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        fetchAdSets(activeCampaign.id);
                                        fetchAds(activeAdSet?.id, activeCampaign.id);
                                    }}
                                    className="h-8 text-xs"
                                >
                                    <RefreshCw className="h-3 w-3 mr-1" /> Reload Content
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3 text-blue-400 text-xs">
                            <Sparkles className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold">Interactive Creative & Media Lab:</span>
                                <p className="mt-0.5 text-blue-300/80">
                                    Click on any campaign row below to open its <strong>Ad Sets</strong> and <strong>Ads</strong>. You can inspect the running media (video/image), preview copywriting, swap creatives from your media library, and pause/activate ad sets in real time.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* VIEW 1: CAMPAIGNS LIST (If no campaign drilled down) */}
                    {!activeCampaign && (
                        <Card className="bg-card/50 border-border/40 rounded-2xl overflow-hidden shadow-sm">
                            <div className="p-4 border-b border-border/30 flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base font-bold">Campaigns Registry</CardTitle>
                                    <CardDescription className="text-xs">Select any campaign to view contents, ad sets, and swap media creatives</CardDescription>
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={fetchCampaigns} 
                                    disabled={loadingCampaigns}
                                    className="h-8 text-xs gap-1.5"
                                >
                                    <RefreshCw className={cn("h-3 w-3", loadingCampaigns && "animate-spin")} />
                                    Refresh Campaigns
                                </Button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider border-b border-border/30 text-[10px]">
                                        <tr>
                                            <th className="py-3 px-4">Campaign Name</th>
                                            <th className="py-3 px-3">Status</th>
                                            <th className="py-3 px-3">Objective</th>
                                            <th className="py-3 px-3 text-right">Budget</th>
                                            <th className="py-3 px-3 text-right">Last 7D Spend</th>
                                            <th className="py-3 px-4 text-center">Manage Content</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/20">
                                        {loadingCampaigns ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-10 text-muted-foreground">
                                                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                                                    Loading campaigns...
                                                </td>
                                            </tr>
                                        ) : campaigns.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center py-10 text-muted-foreground">
                                                    No campaigns found under this ad account.
                                                </td>
                                            </tr>
                                        ) : (
                                            campaigns.map((c) => {
                                                const isActive = c.status === "ACTIVE";

                                                return (
                                                    <tr 
                                                        key={c.id} 
                                                        onClick={() => handleSelectCampaign(c)}
                                                        className="hover:bg-primary/5 transition-colors cursor-pointer group"
                                                    >
                                                        <td className="py-3.5 px-4 font-semibold text-foreground">
                                                            <div className="flex items-center gap-2">
                                                                <span className="truncate max-w-[280px] group-hover:text-primary transition-colors" title={c.name}>
                                                                    {c.name}
                                                                </span>
                                                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground font-mono">ID: {c.id}</div>
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <Badge 
                                                                variant="outline" 
                                                                className={cn(
                                                                    "text-[10px] font-semibold px-2 py-0.5",
                                                                    isActive 
                                                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                                                                        : "bg-muted border-border text-muted-foreground"
                                                                )}
                                                            >
                                                                {c.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">
                                                            {c.objective || "N/A"}
                                                        </td>
                                                        <td className="py-3 px-3 text-right font-mono font-semibold text-foreground">
                                                            {c.daily_budget ? `RM ${(parseFloat(c.daily_budget) / 100).toFixed(2)}/day` : "AdSet Budgeted"}
                                                        </td>
                                                        <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                                                            RM {c.recentSpend.toFixed(2)}
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSelectCampaign(c);
                                                                }}
                                                                className="h-7 px-3 text-xs gap-1 font-medium bg-muted/40 hover:bg-primary hover:text-primary-foreground"
                                                            >
                                                                <FolderKanban className="h-3 w-3" />
                                                                <span>View Ads & Media</span>
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {/* VIEW 2: DRILLED DOWN VIEW (Ad Sets & Ads) */}
                    {activeCampaign && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Left Column: Ad Sets in Campaign (4 cols) */}
                            <div className="lg:col-span-4 space-y-4">
                                <Card className="bg-card/50 border-border/40 rounded-2xl overflow-hidden">
                                    <div className="p-4 border-b border-border/30 flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-sm font-bold">Ad Sets ({adsets.length})</CardTitle>
                                            <CardDescription className="text-[11px]">Filter ads by specific ad set</CardDescription>
                                        </div>
                                        <Badge variant="outline" className="text-[10px]">Level 2</Badge>
                                    </div>

                                    <div className="divide-y divide-border/20 max-h-[500px] overflow-y-auto">
                                        {/* "All Ad Sets" button */}
                                        <div 
                                            onClick={() => {
                                                setActiveAdSet(null);
                                                fetchAds(undefined, activeCampaign.id);
                                            }}
                                            className={cn(
                                                "p-3.5 cursor-pointer text-xs transition-colors flex items-center justify-between",
                                                activeAdSet === null ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted/30 text-muted-foreground"
                                            )}
                                        >
                                            <span>All Ad Sets Combined</span>
                                            <Badge variant="secondary" className="text-[10px]">{ads.length} Ads</Badge>
                                        </div>

                                        {loadingAdsets ? (
                                            <div className="p-6 text-center text-muted-foreground text-xs">
                                                <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-primary" />
                                                Loading AdSets...
                                            </div>
                                        ) : adsets.map((aset) => {
                                            const isSelected = activeAdSet?.id === aset.id;
                                            const isActive = aset.status === "ACTIVE";

                                            return (
                                                <div 
                                                    key={aset.id}
                                                    onClick={() => {
                                                        setActiveAdSet(aset);
                                                        fetchAds(aset.id, undefined);
                                                    }}
                                                    className={cn(
                                                        "p-3.5 cursor-pointer text-xs transition-colors space-y-1.5",
                                                        isSelected ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-muted/30"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className={cn("font-semibold truncate max-w-[160px]", isSelected ? "text-primary" : "text-foreground")}>
                                                            {aset.name}
                                                        </span>
                                                        <Badge 
                                                            variant="outline" 
                                                            className={cn("text-[9px] px-1.5 py-0.2", isActive ? "text-emerald-400 border-emerald-500/30" : "text-muted-foreground")}
                                                        >
                                                            {aset.status}
                                                        </Badge>
                                                    </div>

                                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                                        <span>Budget:</span>
                                                        <span className="font-mono font-bold text-foreground">
                                                            {aset.dailyBudget ? `RM ${aset.dailyBudget.toFixed(2)}/day` : "Inherited"}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-end gap-1.5 pt-1">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPendingAction({
                                                                    type: "toggle_adset",
                                                                    item: aset,
                                                                    nextStatus: isActive ? "PAUSED" : "ACTIVE"
                                                                });
                                                            }}
                                                            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                                                        >
                                                            {isActive ? "Pause" : "Activate"}
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            </div>

                            {/* Right Column: Ads & Creatives in selected scope (8 cols) */}
                            <div className="lg:col-span-8 space-y-4">
                                <Card className="bg-card/50 border-border/40 rounded-2xl overflow-hidden">
                                    <div className="p-4 border-b border-border/30 flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base font-bold">
                                                Ads & Creatives {activeAdSet ? `for "${activeAdSet.name}"` : `in Campaign`}
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                Active media creatives, copywriting, and media swapping
                                            </CardDescription>
                                        </div>
                                        <Badge variant="outline">{ads.length} Ads Running</Badge>
                                    </div>

                                    {loadingAds ? (
                                        <div className="p-12 text-center text-muted-foreground text-xs">
                                            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                                            Loading ad creatives & media...
                                        </div>
                                    ) : ads.length === 0 ? (
                                        <div className="p-12 text-center text-muted-foreground text-xs">
                                            No ads found under this ad set.
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-border/20">
                                            {ads.map((ad) => {
                                                const isActive = ad.status === "ACTIVE";

                                                return (
                                                    <div key={ad.id} className="p-4 flex flex-col md:flex-row items-start gap-4 hover:bg-muted/20 transition-colors">
                                                        {/* Thumbnail preview */}
                                                        <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-black/40 border border-border/60 flex-shrink-0 flex items-center justify-center">
                                                            {ad.thumbnailUrl ? (
                                                                <img 
                                                                    src={ad.thumbnailUrl} 
                                                                    alt={ad.name} 
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="text-muted-foreground flex flex-col items-center">
                                                                    {ad.isVideo ? <Video className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
                                                                    <span className="text-[9px] mt-1">No Preview</span>
                                                                </div>
                                                            )}
                                                            <div className="absolute top-1 left-1 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-mono text-white flex items-center gap-1">
                                                                {ad.isVideo ? <Video className="h-2.5 w-2.5 text-blue-400" /> : <ImageIcon className="h-2.5 w-2.5 text-amber-400" />}
                                                                <span>{ad.isVideo ? "Video" : "Image"}</span>
                                                            </div>
                                                        </div>

                                                        {/* Ad Content & Copy Details */}
                                                        <div className="flex-1 min-w-0 space-y-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h4 className="font-bold text-sm text-foreground truncate max-w-[280px]">{ad.name}</h4>
                                                                <Badge 
                                                                    variant="outline" 
                                                                    className={cn(
                                                                        "text-[9px] px-1.5", 
                                                                        isActive ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    {ad.status}
                                                                </Badge>
                                                            </div>

                                                            {ad.headline && (
                                                                <p className="text-xs font-semibold text-foreground/90 truncate">
                                                                    {ad.headline}
                                                                </p>
                                                            )}

                                                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                                {ad.body || "No primary body text specified."}
                                                            </p>

                                                            {ad.destinationUrl && (
                                                                <div className="flex items-center gap-1 text-[11px] text-blue-400 truncate pt-0.5">
                                                                    <LinkIcon className="h-3 w-3 flex-shrink-0" />
                                                                    <span className="truncate">{ad.destinationUrl}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Action Buttons */}
                                                        <div className="flex flex-col gap-1.5 flex-shrink-0 self-end md:self-center">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleOpenAdEditor(ad)}
                                                                className="h-8 px-3 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
                                                            >
                                                                <Edit3 className="h-3 w-3" />
                                                                <span>Edit Media & Copy</span>
                                                            </Button>

                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setPendingAction({
                                                                    type: "toggle_ad",
                                                                    item: ad,
                                                                    nextStatus: isActive ? "PAUSED" : "ACTIVE"
                                                                })}
                                                                className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-foreground"
                                                            >
                                                                {isActive ? "Pause Ad" : "Activate Ad"}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* MODAL / DRAWER: EDIT AD & SWAP MEDIA */}
                    {editingAd && (
                        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
                            <div className="bg-card border border-border/80 shadow-2xl rounded-3xl max-w-2xl w-full p-6 space-y-5 animate-scale-in my-8 max-h-[90vh] flex flex-col">
                                <div className="flex items-center justify-between border-b border-border/40 pb-3 flex-shrink-0">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                                            <Edit3 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-foreground">Edit Ad Creative & Media</h3>
                                            <p className="text-xs text-muted-foreground">Ad: <span className="font-semibold text-foreground">{editingAd.name}</span></p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setEditingAd(null)}
                                        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                                    {/* SECTION 1: MEDIA SWAPPER */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                                                Ad Media Asset (Video / Image)
                                            </label>
                                            <span className="text-[11px] text-muted-foreground">Select from Ad Account library</span>
                                        </div>

                                        {/* Current Media vs New Selection */}
                                        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/20 border border-border/40">
                                            <div className="space-y-1">
                                                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Currently Live</p>
                                                <div className="h-24 rounded-lg bg-black/50 border border-border/40 overflow-hidden flex items-center justify-center">
                                                    {editingAd.thumbnailUrl ? (
                                                        <img src={editingAd.thumbnailUrl} alt="Live media" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground">No media</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <p className="text-[10px] uppercase font-semibold text-violet-400">
                                                    {editForm.selectedMedia ? "Selected New Media" : "Keeps Current Media"}
                                                </p>
                                                <div className={cn(
                                                    "h-24 rounded-lg border flex items-center justify-center overflow-hidden",
                                                    editForm.selectedMedia ? "border-violet-500 bg-black/50" : "border-dashed border-border/60 bg-muted/10 text-muted-foreground"
                                                )}>
                                                    {editForm.selectedMedia ? (
                                                        <img src={editForm.selectedMedia.thumbnailUrl} alt="New media" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-[10px] text-center px-2">Click an item below to swap</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Media Library Asset Picker */}
                                        <div className="space-y-1.5 pt-1">
                                            <p className="text-[11px] font-semibold text-muted-foreground">Available Assets in Ad Account:</p>
                                            {loadingMedia ? (
                                                <div className="p-4 text-center text-xs text-muted-foreground">
                                                    <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-primary" />
                                                    Loading account media library...
                                                </div>
                                            ) : mediaLibrary.length === 0 ? (
                                                <p className="text-xs text-muted-foreground p-3 border border-border/40 rounded-xl">
                                                    No media library assets detected in this account.
                                                </p>
                                            ) : (
                                                <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 border border-border/30 rounded-xl bg-muted/10">
                                                    {mediaLibrary.map((item) => {
                                                        const isPicked = editForm.selectedMedia?.id === item.id;

                                                        return (
                                                            <div
                                                                key={item.id}
                                                                onClick={() => setEditForm(prev => ({ ...prev, selectedMedia: item }))}
                                                                className={cn(
                                                                    "relative aspect-square rounded-lg overflow-hidden border cursor-pointer group transition-all",
                                                                    isPicked ? "border-violet-500 ring-2 ring-violet-500/40" : "border-border/40 hover:border-border"
                                                                )}
                                                            >
                                                                {item.thumbnailUrl ? (
                                                                    <img src={item.thumbnailUrl} alt={item.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full bg-black/60 flex items-center justify-center text-white">
                                                                        {item.type === "video" ? <Video className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                                                                    </div>
                                                                )}
                                                                <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] text-white px-1 truncate">
                                                                    {item.name}
                                                                </span>
                                                                {isPicked && (
                                                                    <div className="absolute top-1 right-1 bg-violet-600 rounded-full p-0.5 text-white">
                                                                        <Check className="h-2.5 w-2.5" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* SECTION 2: COPYWRITING & HEADLINE */}
                                    <div className="space-y-3 pt-2">
                                        <div>
                                            <label className="block text-xs font-bold text-foreground mb-1">Headline (Title)</label>
                                            <input
                                                type="text"
                                                value={editForm.headline}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, headline: e.target.value }))}
                                                placeholder="e.g. Kopi Kesihatan Premium Dr Samhan"
                                                className="w-full bg-muted/40 border border-border/60 rounded-xl px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:border-primary"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-foreground mb-1">Primary Ad Copy (Body)</label>
                                            <textarea
                                                rows={4}
                                                value={editForm.body}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, body: e.target.value }))}
                                                placeholder="Write primary copywriting message..."
                                                className="w-full bg-muted/40 border border-border/60 rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary leading-relaxed resize-none"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-foreground mb-1">Destination URL</label>
                                                <input
                                                    type="url"
                                                    value={editForm.destinationUrl}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, destinationUrl: e.target.value }))}
                                                    placeholder="https://shopee.com.my/..."
                                                    className="w-full bg-muted/40 border border-border/60 rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-foreground mb-1">Call To Action Button</label>
                                                <select
                                                    value={editForm.callToAction}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, callToAction: e.target.value }))}
                                                    className="w-full bg-muted/40 border border-border/60 rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-primary cursor-pointer"
                                                >
                                                    <option value="SHOP_NOW">Shop Now (Beli Sekarang)</option>
                                                    <option value="LEARN_MORE">Learn More</option>
                                                    <option value="ORDER_NOW">Order Now</option>
                                                    <option value="GET_OFFER">Get Offer</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3 flex-shrink-0">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditingAd(null)}
                                        disabled={savingCreative}
                                        className="h-9 px-4 text-xs"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleSaveCreativeMutation}
                                        disabled={savingCreative}
                                        className="h-9 px-5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white gap-1.5 shadow-md shadow-violet-600/20"
                                    >
                                        {savingCreative ? (
                                            <>
                                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                <span>Deploying to Meta...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Check className="h-3.5 w-3.5" />
                                                <span>Apply Creative to Meta</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB: PERFORMANCE STUDIO */}
            {activeTab === "performance" && (
                <div className="space-y-5 animate-fade-in">
                    {/* Filter bar */}
                    <div className="flex items-center justify-between flex-wrap gap-3 bg-card/30 border border-border/40 p-3 rounded-xl">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">Time Range:</span>
                            {["today", "yesterday", "last_7d", "last_30d"].map((preset) => (
                                <Button
                                    key={preset}
                                    variant={datePreset === preset ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setDatePreset(preset)}
                                    className={cn("h-7 px-2.5 text-xs capitalize", datePreset === preset ? "bg-violet-600 hover:bg-violet-700 text-white" : "")}
                                >
                                    {preset.replace("_", " ")}
                                </Button>
                            ))}
                        </div>

                        <div className="text-xs text-muted-foreground">
                            Targeting: <span className="font-mono text-foreground font-semibold">{selectedAccount}</span>
                        </div>
                    </div>

                    {/* Aggregate KPI Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Card className="bg-card/50 border-border/40 p-4 rounded-xl">
                            <div className="flex items-center justify-between text-muted-foreground mb-1">
                                <span className="text-xs font-semibold">Total Spend</span>
                                <DollarSign className="h-4 w-4 text-emerald-400" />
                            </div>
                            <p className="text-2xl font-black text-foreground tracking-tight">
                                RM {(summary?.spend || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-1">Preset: {datePreset.replace("_", " ")}</p>
                        </Card>

                        <Card className="bg-card/50 border-border/40 p-4 rounded-xl">
                            <div className="flex items-center justify-between text-muted-foreground mb-1">
                                <span className="text-xs font-semibold">Total Clicks & CTR</span>
                                <MousePointerClick className="h-4 w-4 text-blue-400" />
                            </div>
                            <p className="text-2xl font-black text-foreground tracking-tight">
                                {(summary?.clicks || 0).toLocaleString()}
                            </p>
                            <p className="text-[11px] text-blue-400 font-semibold mt-1">
                                CTR: {(summary?.ctr || 0).toFixed(2)}%
                            </p>
                        </Card>

                        <Card className="bg-card/50 border-border/40 p-4 rounded-xl">
                            <div className="flex items-center justify-between text-muted-foreground mb-1">
                                <span className="text-xs font-semibold">Cost Per Click (CPC)</span>
                                <TrendingUp className="h-4 w-4 text-amber-400" />
                            </div>
                            <p className="text-2xl font-black text-foreground tracking-tight">
                                RM {(summary?.cpc || 0).toFixed(2)}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-1">
                                CPM: RM {(summary?.cpm || 0).toFixed(2)}
                            </p>
                        </Card>

                        <Card className="bg-card/50 border-border/40 p-4 rounded-xl">
                            <div className="flex items-center justify-between text-muted-foreground mb-1">
                                <span className="text-xs font-semibold">Impressions & Reach</span>
                                <Eye className="h-4 w-4 text-purple-400" />
                            </div>
                            <p className="text-2xl font-black text-foreground tracking-tight">
                                {(summary?.impressions || 0).toLocaleString()}
                            </p>
                            <p className="text-[11px] text-purple-400 font-semibold mt-1">
                                Reach: {(summary?.reach || 0).toLocaleString()} (Freq: {(summary?.frequency || 1).toFixed(2)})
                            </p>
                        </Card>
                    </div>

                    {/* Campaign Performance Table */}
                    <Card className="bg-card/50 border-border/40 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-border/30 flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold">Campaign Breakdown</CardTitle>
                                <CardDescription className="text-xs">Live ad metrics returned directly by Meta Graph Insights API</CardDescription>
                            </div>
                            <Badge variant="outline" className="text-xs font-mono">
                                {insights.length} Campaigns
                            </Badge>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider border-b border-border/30 text-[10px]">
                                    <tr>
                                        <th className="py-3 px-4">Campaign Name</th>
                                        <th className="py-3 px-3 text-right">Spend (RM)</th>
                                        <th className="py-3 px-3 text-right">Impressions</th>
                                        <th className="py-3 px-3 text-right">Clicks</th>
                                        <th className="py-3 px-3 text-right">CTR</th>
                                        <th className="py-3 px-3 text-right">Avg CPC</th>
                                        <th className="py-3 px-3 text-right">CPM</th>
                                        <th className="py-3 px-3 text-right">Reach</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {loadingInsights ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-10 text-muted-foreground">
                                                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                                                Querying Meta Insights API...
                                            </td>
                                        </tr>
                                    ) : insights.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-10 text-muted-foreground">
                                                No campaign insights found for this account in selected date range.
                                            </td>
                                        </tr>
                                    ) : (
                                        insights.map((c) => (
                                            <tr key={c.campaignId} className="hover:bg-muted/30 transition-colors">
                                                <td className="py-3 px-4 font-semibold text-foreground">
                                                    <div className="truncate max-w-[260px]" title={c.campaignName}>
                                                        {c.campaignName}
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground font-mono">ID: {c.campaignId}</span>
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                                                    RM {c.spend.toFixed(2)}
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                                                    {c.impressions.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                                                    {c.clicks.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono text-emerald-400 font-semibold">
                                                    {c.ctr.toFixed(2)}%
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                                                    RM {c.cpc.toFixed(2)}
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                                                    RM {c.cpm.toFixed(2)}
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                                                    {c.reach.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB: PLACEMENTS & BREAKDOWNS */}
            {activeTab === "placements" && (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between flex-wrap gap-3 bg-card/30 border border-border/40 p-3 rounded-xl">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">Breakdown Dimension:</span>
                            {[
                                { id: "publisher_platform", label: "Publisher (FB / IG / Audience)" },
                                { id: "device_platform", label: "Device (Mobile / Desktop)" },
                            ].map((item) => (
                                <Button
                                    key={item.id}
                                    variant={breakdownType === item.id ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setBreakdownType(item.id)}
                                    className="h-7 px-3 text-xs"
                                >
                                    {item.label}
                                </Button>
                            ))}
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={fetchBreakdowns}
                            disabled={loadingBreakdown}
                            className="h-7 text-xs"
                        >
                            <RefreshCw className={cn("h-3 w-3 mr-1", loadingBreakdown && "animate-spin")} />
                            Reload Breakdown
                        </Button>
                    </div>

                    <Card className="bg-card/50 border-border/40 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-border/30">
                            <CardTitle className="text-base font-bold">Platform Distribution & Share</CardTitle>
                            <CardDescription className="text-xs">Understand how budget and clicks distribute across Instagram, Facebook, and Messenger</CardDescription>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider border-b border-border/30 text-[10px]">
                                    <tr>
                                        <th className="py-3 px-4">Campaign</th>
                                        <th className="py-3 px-3">Segment ({breakdownType})</th>
                                        <th className="py-3 px-3 text-right">Spend (RM)</th>
                                        <th className="py-3 px-3 text-right">Impressions</th>
                                        <th className="py-3 px-3 text-right">Clicks</th>
                                        <th className="py-3 px-3 text-right">CTR</th>
                                        <th className="py-3 px-3 text-right">CPC</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {loadingBreakdown ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-10 text-muted-foreground">
                                                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                                                Fetching breakdown analysis...
                                            </td>
                                        </tr>
                                    ) : breakdownRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-10 text-muted-foreground">
                                                No breakdown data recorded for this dimension in the past 7 days.
                                            </td>
                                        </tr>
                                    ) : (
                                        breakdownRecords.map((b, idx) => (
                                            <tr key={`${b.campaignId}-${idx}`} className="hover:bg-muted/30 transition-colors">
                                                <td className="py-3 px-4 font-semibold text-foreground truncate max-w-[240px]">
                                                    {b.campaignName}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <Badge variant="secondary" className="font-mono text-[10px] capitalize">
                                                        {b.publisherPlatform || b.devicePlatform || "Unknown"}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                                                    RM {b.spend.toFixed(2)}
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                                                    {b.impressions.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                                                    {b.clicks.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono text-emerald-400 font-semibold">
                                                    {b.ctr.toFixed(2)}%
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                                                    RM {b.cpc.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB: ACCOUNTS & PAGES DIRECTORY */}
            {activeTab === "accounts" && (
                <div className="space-y-5 animate-fade-in">
                    <Card className="bg-card/50 border-border/40 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-border/30 flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold">Accessible Meta Ad Accounts</CardTitle>
                                <CardDescription className="text-xs">All accounts granted under your active token</CardDescription>
                            </div>
                            <Badge className="bg-primary/20 text-primary">{adAccounts.length} Total Accounts</Badge>
                        </div>
                        <div className="divide-y divide-border/20">
                            {adAccounts.map((acc) => (
                                <div 
                                    key={acc.id} 
                                    className={cn(
                                        "p-4 flex items-center justify-between transition-colors",
                                        selectedAccount === acc.id ? "bg-primary/5" : "hover:bg-muted/30"
                                    )}
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-foreground">{acc.name}</span>
                                            {acc.isCpas && (
                                                <Badge className="bg-amber-500/15 border-amber-500/30 text-amber-400 text-[10px]">
                                                    Shopee CPAS Partner
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{acc.id} • Currency: {acc.currency}</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant={selectedAccount === acc.id ? "default" : "outline"}
                                        onClick={() => setSelectedAccount(acc.id)}
                                        className="h-8 text-xs"
                                    >
                                        {selectedAccount === acc.id ? "Selected Active" : "Select Account"}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="bg-card/50 border-border/40 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-border/30 flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold">Linked Facebook Pages</CardTitle>
                                <CardDescription className="text-xs">Pages available for engagement insights and ad post monitoring</CardDescription>
                            </div>
                            <Badge variant="outline">{pages.length} Pages</Badge>
                        </div>
                        <div className="divide-y divide-border/20">
                            {pages.map((p) => (
                                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                    <div>
                                        <span className="font-bold text-sm text-foreground">{p.name}</span>
                                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                            Page ID: {p.id} {p.category ? `• Category: ${p.category}` : ""}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant="secondary" className="text-[10px]">
                                            {p.followers_count !== undefined ? `${p.followers_count} Followers` : "Connected"}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB: GRAPH API INSPECTOR */}
            {activeTab === "raw" && (
                <div className="space-y-4 animate-fade-in">
                    <Card className="bg-card/50 border-border/40 p-5 rounded-2xl">
                        <div className="mb-4">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Terminal className="h-4 w-4 text-primary" />
                                <span>Direct Graph API Inspector</span>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Query any endpoint on <code className="font-mono text-primary">graph.facebook.com/v19.0/</code> using your active session token.
                            </CardDescription>
                        </div>

                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={rawEndpoint}
                                    onChange={(e) => setRawEndpoint(e.target.value)}
                                    placeholder="e.g. act_1462603651298383/insights?fields=campaign_name,spend&date_preset=last_7d"
                                    className="flex-1 bg-muted/40 border border-border/60 rounded-xl px-3.5 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                                />
                                <Button
                                    onClick={handleRunRawQuery}
                                    disabled={rawLoading || !rawEndpoint}
                                    className="px-5 text-xs font-semibold"
                                >
                                    {rawLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Run Query"}
                                </Button>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground pt-1">
                                <span className="font-semibold text-[11px]">Quick Tests:</span>
                                {[
                                    { label: "Token Debug", query: "debug_token?input_token=" + (activeAccountObj ? "self" : "") },
                                    { label: "My Profile", query: "me?fields=id,name,permissions" },
                                    { label: "Shopee CPAS Insights", query: "act_1462603651298383/insights?level=campaign&fields=campaign_name,spend,clicks,cpc&date_preset=last_7d" },
                                    { label: "Ad Creatives", query: "act_1462603651298383/adcreatives?fields=name,title,body,status&limit=5" }
                                ].map((preset, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setRawEndpoint(preset.query)}
                                        className="px-2 py-0.5 rounded-md bg-muted/50 hover:bg-muted border border-border/40 text-[11px] font-mono text-foreground transition-colors"
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {rawResult && (
                            <div className="mt-4 border border-border/40 rounded-xl overflow-hidden bg-zinc-950">
                                <div className="bg-zinc-900 px-4 py-2 flex items-center justify-between border-b border-zinc-800 text-[11px] font-mono text-zinc-400">
                                    <span>Status: {rawResult.status || (rawResult.success ? "200 OK" : "Error")} ({rawResult.durationMs || 0}ms)</span>
                                    <button 
                                        onClick={() => navigator.clipboard.writeText(JSON.stringify(rawResult, null, 2))}
                                        className="hover:text-zinc-200 text-xs"
                                    >
                                        Copy JSON
                                    </button>
                                </div>
                                <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto max-h-[420px] whitespace-pre-wrap">
                                    {JSON.stringify(rawResult.data || rawResult, null, 2)}
                                </pre>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* CONFIRMATION MODAL FOR STATUS / BUDGET ACTION */}
            {pendingAction && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border border-border/80 shadow-2xl rounded-2xl max-w-md w-full p-6 space-y-4 animate-scale-in">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-foreground">Confirm Live Meta Ad Action</h3>
                                <p className="text-xs text-muted-foreground">Action will apply immediately to your live Meta account.</p>
                            </div>
                        </div>

                        <div className="bg-muted/40 p-3.5 rounded-xl text-xs space-y-1.5 border border-border/50">
                            <p><span className="text-muted-foreground">Target:</span> <strong className="text-foreground">{pendingAction.item.name}</strong></p>
                            <p><span className="text-muted-foreground">ID:</span> <span className="font-mono text-foreground">{pendingAction.item.id}</span></p>
                            <p><span className="text-muted-foreground">Action:</span> <strong className={pendingAction.nextStatus === "ACTIVE" ? "text-emerald-400" : "text-amber-400"}>
                                Switch status to {pendingAction.nextStatus}
                            </strong></p>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPendingAction(null)}
                                className="h-9 px-4 text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleConfirmAction}
                                className={cn(
                                    "h-9 px-4 text-xs font-semibold",
                                    pendingAction.nextStatus === "ACTIVE" 
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                                        : "bg-amber-600 hover:bg-amber-700 text-white"
                                )}
                            >
                                Confirm & Apply
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
