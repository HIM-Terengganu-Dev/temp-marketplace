"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    RefreshCw, 
    Play, 
    Pause, 
    ShieldCheck, 
    AlertTriangle, 
    Building, 
    CheckCircle2, 
    XCircle, 
    ChevronRight, 
    Sparkles, 
    Image as ImageIcon, 
    Video, 
    Edit3, 
    ArrowLeft, 
    Check, 
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

interface MetaCpasManagerProps {
    currentShopId?: number | "all";
}

// Map Shopee Shop ID to Meta Ad Account ID
const SHOP_AD_ACCOUNT_MAP: Record<number, string> = {
    1298030530: "act_1462603651298383", // HIM by Dr Samhan
    1077500606: "act_1199749218961620", // HIM by Dr Samhan 1
    1256177782: "act_1199749218961620", // HIM by Dr Samhan 2
};

export function MetaCpasManager({ currentShopId = "all" }: MetaCpasManagerProps) {
    const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<string>("act_1462603651298383");
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

    // Safety confirmation modal state
    const [pendingAction, setPendingAction] = useState<{
        type: "toggle_campaign" | "toggle_adset" | "toggle_ad";
        item: any;
        nextStatus?: string;
    } | null>(null);

    // Notification message
    const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const showNotice = (type: "success" | "error", text: string) => {
        setNotice({ type, text });
        setTimeout(() => setNotice(null), 5000);
    };

    // Auto-select ad account based on active Shopee Shop filter
    useEffect(() => {
        if (typeof currentShopId === "number" && SHOP_AD_ACCOUNT_MAP[currentShopId]) {
            const mappedAcc = SHOP_AD_ACCOUNT_MAP[currentShopId];
            if (mappedAcc !== selectedAccount) {
                setSelectedAccount(mappedAcc);
                setActiveCampaign(null);
                setActiveAdSet(null);
                setEditingAd(null);
            }
        }
    }, [currentShopId]);

    // 1. Fetch Ad Accounts
    const fetchAccounts = useCallback(async () => {
        setLoadingAccounts(true);
        try {
            const res = await fetch("/api/test-field/meta/accounts");
            const data = await res.json();
            if (data.success) {
                const cpasAccs = (data.adAccounts || []).filter((a: any) => a.isCpas);
                setAdAccounts(cpasAccs.length > 0 ? cpasAccs : (data.adAccounts || []));
            }
        } catch (err: any) {
            console.warn("Could not fetch Meta accounts:", err.message);
        } finally {
            setLoadingAccounts(false);
        }
    }, []);

    // 2. Fetch Campaigns for selected account
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
            }
        } catch (err: any) {
            console.warn("Media library fetch error:", err.message);
        } finally {
            setLoadingMedia(false);
        }
    }, [selectedAccount]);

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
            selectedMedia: null,
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
                    name: `ShopeeAds_${editingAd.name}_${Date.now()}`,
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
                showNotice("success", `Ad creative updated and deployed to Meta for "${editingAd.name}"!`);
                setEditingAd(null);
                if (activeCampaign) {
                    fetchAds(activeAdSet?.id, activeCampaign.id);
                }
            } else {
                showNotice("error", data.error || "Failed to deploy ad creative to Meta.");
            }
        } catch (err: any) {
            showNotice("error", err.message);
        } finally {
            setSavingCreative(false);
        }
    };

    // Confirm Toggle Action
    const handleConfirmAction = async () => {
        if (!pendingAction) return;
        const { type, item, nextStatus } = pendingAction;
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
        }
    }, [selectedAccount, fetchCampaigns]);

    const activeAccountObj = adAccounts.find(a => a.id === selectedAccount);

    return (
        <div className="space-y-6 pt-2">
            {/* Notification banner */}
            {notice && (
                <div className={cn(
                    "p-3.5 rounded-xl border flex items-center justify-between shadow-lg transition-all animate-fade-in text-xs",
                    notice.type === "success" 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                        : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                )}>
                    <div className="flex items-center gap-2.5">
                        {notice.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        <span className="font-medium">{notice.text}</span>
                    </div>
                    <button onClick={() => setNotice(null)} className="opacity-70 hover:opacity-100">Dismiss</button>
                </div>
            )}

            {/* CPAS Toolbar: Active Account Selector & Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 border border-border/40 p-3.5 rounded-2xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        <FolderKanban className="h-4 w-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-foreground">
                                {activeCampaign ? activeCampaign.name : "Meta CPAS Campaigns"}
                            </h3>
                            <Badge className="bg-orange-500/15 border-orange-500/30 text-orange-400 text-[10px]">
                                Meta Open API
                            </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {activeCampaign 
                                ? "Inspecting Ad Sets and live creative assets" 
                                : "Click any campaign to inspect ad sets and swap media creatives"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Account Picker */}
                    <div className="flex items-center bg-card/60 backdrop-blur-md border border-border/60 rounded-xl px-2.5 py-1 text-xs">
                        <Building className="h-3.5 w-3.5 text-muted-foreground mr-1.5" />
                        <select
                            value={selectedAccount}
                            onChange={(e) => {
                                setSelectedAccount(e.target.value);
                                setActiveCampaign(null);
                                setActiveAdSet(null);
                                setEditingAd(null);
                            }}
                            className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer max-w-[200px] truncate"
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
                        onClick={() => {
                            fetchCampaigns();
                            if (activeCampaign) {
                                fetchAdSets(activeCampaign.id);
                                fetchAds(activeAdSet?.id, activeCampaign.id);
                            }
                        }}
                        disabled={loadingCampaigns}
                        className="h-8 px-2.5 border-border/60 text-xs"
                    >
                        <RefreshCw className={cn("h-3 w-3 mr-1", loadingCampaigns && "animate-spin text-orange-400")} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* BREADCRUMB IF ACTIVE CAMPAIGN */}
            {activeCampaign && (
                <div className="flex items-center justify-between text-xs bg-card/40 p-2.5 px-4 rounded-xl border border-border/30">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setActiveCampaign(null); setActiveAdSet(null); setEditingAd(null); }}
                        className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-3 w-3" />
                        Back to All Campaigns
                    </Button>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge 
                            variant="outline" 
                            className={cn(
                                "text-[10px] font-semibold", 
                                activeCampaign.status === "ACTIVE" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "text-muted-foreground"
                            )}
                        >
                            {activeCampaign.status}
                        </Badge>
                    </div>
                </div>
            )}

            {/* VIEW 1: CAMPAIGNS LIST */}
            {!activeCampaign && (
                <Card className="border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden shadow-md">
                    <CardHeader className="border-b border-border/30 pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    Live Campaigns Explorer
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Select any row to inspect Ad Sets, copywriting, and media
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="text-xs font-mono">{campaigns.length} Campaigns</Badge>
                        </div>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-muted/30 text-muted-foreground font-semibold uppercase tracking-wider border-b border-border/30 text-[10px]">
                                <tr>
                                    <th className="py-3 px-4">Campaign Name</th>
                                    <th className="py-3 px-3">Status</th>
                                    <th className="py-3 px-3">Objective</th>
                                    <th className="py-3 px-3 text-right">Daily Budget</th>
                                    <th className="py-3 px-3 text-right">Last 7D Spend</th>
                                    <th className="py-3 px-4 text-center">Manage</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {loadingCampaigns ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-10 text-muted-foreground">
                                            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-orange-400" />
                                            Loading Meta CPAS campaigns...
                                        </td>
                                    </tr>
                                ) : campaigns.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-10 text-muted-foreground">
                                            No campaigns found for this Meta CPAS ad account.
                                        </td>
                                    </tr>
                                ) : (
                                    campaigns.map((c) => {
                                        const isActive = c.status === "ACTIVE";

                                        return (
                                            <tr 
                                                key={c.id} 
                                                onClick={() => handleSelectCampaign(c)}
                                                className="hover:bg-orange-500/5 transition-colors cursor-pointer group"
                                            >
                                                <td className="py-3.5 px-4 font-semibold text-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <span className="truncate max-w-[280px] group-hover:text-orange-400 transition-colors" title={c.name}>
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
                                                        className="h-7 px-3 text-xs gap-1 font-medium bg-muted/40 hover:bg-orange-500 hover:text-white"
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

            {/* VIEW 2: DRILL-DOWN INTO ADSETS & ADS */}
            {activeCampaign && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left: Ad Sets List (4 cols) */}
                    <div className="lg:col-span-4 space-y-3">
                        <Card className="border-border/50 bg-card/40 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm">
                            <div className="p-3.5 border-b border-border/30 flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Ad Sets ({adsets.length})
                                    </CardTitle>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Filter ads by ad set</p>
                                </div>
                                <Badge variant="outline" className="text-[9px]">Level 2</Badge>
                            </div>

                            <div className="divide-y divide-border/20 max-h-[500px] overflow-y-auto">
                                <div 
                                    onClick={() => {
                                        setActiveAdSet(null);
                                        fetchAds(undefined, activeCampaign.id);
                                    }}
                                    className={cn(
                                        "p-3 cursor-pointer text-xs transition-colors flex items-center justify-between",
                                        activeAdSet === null ? "bg-orange-500/10 font-bold text-orange-400" : "hover:bg-muted/30 text-muted-foreground"
                                    )}
                                >
                                    <span>All Ad Sets</span>
                                    <Badge variant="secondary" className="text-[9px]">{ads.length} Ads</Badge>
                                </div>

                                {loadingAdsets ? (
                                    <div className="p-6 text-center text-muted-foreground text-xs">
                                        <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-orange-400" />
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
                                                "p-3 cursor-pointer text-xs transition-colors space-y-1",
                                                isSelected ? "bg-orange-500/10 border-l-2 border-orange-500" : "hover:bg-muted/30"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={cn("font-semibold truncate max-w-[160px]", isSelected ? "text-orange-400" : "text-foreground")}>
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

                                            <div className="flex items-center justify-end gap-1 pt-1">
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
                                                    className="h-5 px-2 text-[10px] text-muted-foreground hover:text-foreground"
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

                    {/* Right: Ads & Creatives (8 cols) */}
                    <div className="lg:col-span-8 space-y-3">
                        <Card className="border-border/50 bg-card/40 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm">
                            <div className="p-3.5 border-b border-border/30 flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        Ads & Creatives {activeAdSet ? `for "${activeAdSet.name}"` : `in Campaign`}
                                    </CardTitle>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">Inspect media, copy, and swap creatives</p>
                                </div>
                                <Badge variant="outline" className="text-xs">{ads.length} Ads</Badge>
                            </div>

                            {loadingAds ? (
                                <div className="p-12 text-center text-muted-foreground text-xs">
                                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-orange-400" />
                                    Loading ad creatives...
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
                                                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-black/40 border border-border/60 flex-shrink-0 flex items-center justify-center">
                                                    {ad.thumbnailUrl ? (
                                                        <img 
                                                            src={ad.thumbnailUrl} 
                                                            alt={ad.name} 
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="text-muted-foreground flex flex-col items-center">
                                                            {ad.isVideo ? <Video className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
                                                            <span className="text-[8px] mt-1">No Preview</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute top-1 left-1 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-mono text-white flex items-center gap-1">
                                                        {ad.isVideo ? <Video className="h-2 w-2 text-blue-400" /> : <ImageIcon className="h-2 w-2 text-amber-400" />}
                                                        <span>{ad.isVideo ? "Video" : "Image"}</span>
                                                    </div>
                                                </div>

                                                {/* Copy Details */}
                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="font-bold text-xs text-foreground truncate max-w-[260px]">{ad.name}</h4>
                                                        <Badge 
                                                            variant="outline" 
                                                            className={cn(
                                                                "text-[8px] px-1.5", 
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

                                                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                                        {ad.body || "No body text specified."}
                                                    </p>

                                                    {ad.destinationUrl && (
                                                        <div className="flex items-center gap-1 text-[10px] text-orange-400 truncate pt-0.5">
                                                            <LinkIcon className="h-2.5 w-2.5 flex-shrink-0" />
                                                            <span className="truncate">{ad.destinationUrl}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex flex-col gap-1.5 flex-shrink-0 self-end md:self-center">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleOpenAdEditor(ad)}
                                                        className="h-7 px-3 text-xs gap-1.5 bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
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
                                                        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
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

            {/* MODAL: EDIT AD & SWAP MEDIA */}
            {editingAd && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-card border border-border/80 shadow-2xl rounded-3xl max-w-2xl w-full p-6 space-y-5 animate-scale-in my-8 max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between border-b border-border/40 pb-3 flex-shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                                    <Edit3 className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-foreground">Edit Meta CPAS Creative & Media</h3>
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
                                        <p className="text-[10px] uppercase font-semibold text-orange-400">
                                            {editForm.selectedMedia ? "Selected New Media" : "Keeps Current Media"}
                                        </p>
                                        <div className={cn(
                                            "h-24 rounded-lg border flex items-center justify-center overflow-hidden",
                                            editForm.selectedMedia ? "border-orange-500 bg-black/50" : "border-dashed border-border/60 bg-muted/10 text-muted-foreground"
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
                                            <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-orange-400" />
                                            Loading account media library...
                                        </div>
                                    ) : mediaLibrary.length === 0 ? (
                                        <p className="text-xs text-muted-foreground p-3 border border-border/40 rounded-xl">
                                            No media assets detected in this account library.
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
                                                            isPicked ? "border-orange-500 ring-2 ring-orange-500/40" : "border-border/40 hover:border-border"
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
                                                            <div className="absolute top-1 right-1 bg-orange-500 rounded-full p-0.5 text-white">
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
                                        className="w-full bg-muted/40 border border-border/60 rounded-xl px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:border-orange-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-foreground mb-1">Primary Ad Copy (Body)</label>
                                    <textarea
                                        rows={4}
                                        value={editForm.body}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, body: e.target.value }))}
                                        placeholder="Write primary copywriting message..."
                                        className="w-full bg-muted/40 border border-border/60 rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-orange-500 leading-relaxed resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-foreground mb-1">Destination URL</label>
                                        <input
                                            type="url"
                                            value={editForm.destinationUrl}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, destinationUrl: e.target.value }))}
                                            placeholder="https://shopee.com.my/shop/..."
                                            className="w-full bg-muted/40 border border-border/60 rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-orange-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-foreground mb-1">Call To Action Button</label>
                                        <select
                                            value={editForm.callToAction}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, callToAction: e.target.value }))}
                                            className="w-full bg-muted/40 border border-border/60 rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-orange-500 cursor-pointer"
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
                                className="h-9 px-5 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white gap-1.5 shadow-md shadow-orange-500/20"
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

            {/* CONFIRMATION MODAL */}
            {pendingAction && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border border-border/80 shadow-2xl rounded-2xl max-w-md w-full p-6 space-y-4 animate-scale-in">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-foreground">Confirm Live Meta CPAS Action</h3>
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
