"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, XCircle, Loader2, AlertCircle, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface RefreshResult {
    shopNumber: number;
    shopName: string;
    success: boolean;
    error?: string;
}

interface RefreshResponse {
    success: boolean;
    summary: {
        total: number;
        successful: number;
        failed: number;
    };
    results: RefreshResult[];
    error?: string;
}

interface MetaTokenStatus {
    loading: boolean;
    isValid: boolean;
    isExpired: boolean;
    expiresAt: string | null;
    expiresInSeconds: number | null;
    appId?: string;
    message?: string;
    error?: string;
    reauthUrl?: string;
}

export default function RefreshTokenPage() {
    const [loadingTikTok, setLoadingTikTok] = useState(false);
    const [tikTokResults, setTikTokResults] = useState<RefreshResponse | null>(null);

    // Meta token state
    const [metaStatus, setMetaStatus] = useState<MetaTokenStatus>({
        loading: true,
        isValid: false,
        isExpired: false,
        expiresAt: null,
        expiresInSeconds: null
    });
    const [refreshingMeta, setRefreshingMeta] = useState(false);
    const [metaMessage, setMetaMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const checkMetaStatus = async () => {
        setMetaStatus(prev => ({ ...prev, loading: true }));
        try {
            const res = await fetch('/api/auth/facebook/refresh');
            const data = await res.json();
            setMetaStatus({
                loading: false,
                isValid: data.isValid,
                isExpired: data.isExpired,
                expiresAt: data.expiresAt,
                expiresInSeconds: data.expiresInSeconds,
                appId: data.appId,
                message: data.error?.message,
                reauthUrl: data.reauthUrl
            });
        } catch (e: any) {
            setMetaStatus(prev => ({
                ...prev,
                loading: false,
                error: e.message
            }));
        }
    };

    useEffect(() => {
        checkMetaStatus();
    }, []);

    const handleRefreshMeta = async () => {
        setRefreshingMeta(true);
        setMetaMessage(null);
        try {
            const res = await fetch('/api/auth/facebook/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ force: true })
            });
            const data = await res.json();
            if (data.status === 'refreshed' || data.success) {
                setMetaMessage({ type: 'success', text: data.message || 'Meta token refreshed successfully for 60 days!' });
            } else {
                setMetaMessage({ 
                    type: 'error', 
                    text: data.message || data.error || 'Failed to refresh Meta token. Re-authorization required.' 
                });
            }
            await checkMetaStatus();
        } catch (e: any) {
            setMetaMessage({ type: 'error', text: e.message || 'Error communicating with refresh API.' });
        } finally {
            setRefreshingMeta(false);
        }
    };

    const handleRefreshAllTikTok = async () => {
        setLoadingTikTok(true);
        setTikTokResults(null);

        try {
            const response = await fetch('/api/tiktok/refresh-all-tokens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data: RefreshResponse = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to refresh tokens');
            }

            setTikTokResults(data);
        } catch (error: any) {
            setTikTokResults({
                success: false,
                summary: { total: 0, successful: 0, failed: 0 },
                results: [],
                error: error.message || 'An error occurred while refreshing tokens'
            } as any);
        } finally {
            setLoadingTikTok(false);
        }
    };

    const daysRemaining = metaStatus.expiresInSeconds 
        ? Math.round(metaStatus.expiresInSeconds / 86400) 
        : null;

    return (
        <div className="space-y-8 max-w-4xl pb-12">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Token Manager</h1>
                <p className="text-sm text-muted-foreground">
                    Inspect, validate, and refresh tokens across Meta (Facebook) and TikTok Shop APIs.
                </p>
            </div>

            {/* Meta (Facebook) Token Section */}
            <Card className="border-border/70 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/20 border-b border-border/40 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                            </div>
                            <div>
                                <CardTitle className="text-lg">Meta / Facebook Ads Token</CardTitle>
                                <CardDescription className="text-xs">
                                    Long-lived OAuth token powering CPAS and Shopee Analytics
                                </CardDescription>
                            </div>
                        </div>
                        {metaStatus.loading ? (
                            <Badge variant="outline" className="text-xs flex items-center gap-1.5 py-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                            </Badge>
                        ) : metaStatus.isValid ? (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs flex items-center gap-1 py-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {daysRemaining !== null ? `Valid (${daysRemaining}d left)` : 'Active'}
                            </Badge>
                        ) : (
                            <Badge variant="destructive" className="text-xs flex items-center gap-1 py-1">
                                <XCircle className="w-3.5 h-3.5" /> Expired
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    {metaStatus.isExpired && (
                        <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <div className="font-semibold">Access Token Expired</div>
                                <p className="text-muted-foreground leading-relaxed">
                                    {metaStatus.message || 'The Meta access token has expired. If refresh fails, generate a new 60-day token via OAuth.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {metaMessage && (
                        <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                            metaMessage.type === 'success' 
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' 
                                : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                        }`}>
                            {metaMessage.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                            ) : (
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            )}
                            <span>{metaMessage.text}</span>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Button
                            onClick={handleRefreshMeta}
                            disabled={refreshingMeta || metaStatus.loading}
                            className="gap-2"
                        >
                            {refreshingMeta ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Refreshing Token...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    Refresh Meta Token
                                </>
                            )}
                        </Button>

                        <Button
                            asChild
                            variant="outline"
                            className="gap-2"
                        >
                            <Link href="/facebook/callback">
                                <ExternalLink className="w-4 h-4" />
                                Re-Authorize with Meta OAuth
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* TikTok Shops Token Section */}
            <Card className="border-border/70 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">TikTok Shop Tokens</CardTitle>
                    <CardDescription className="text-xs">
                        Click the button below to refresh tokens for all configured TikTok Shops. This updates the database.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={handleRefreshAllTikTok}
                        disabled={loadingTikTok}
                        size="lg"
                        className="w-full sm:w-auto"
                    >
                        {loadingTikTok ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Refreshing Tokens...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Refresh All TikTok Tokens
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {tikTokResults && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">TikTok Refresh Results</CardTitle>
                        <CardDescription className="text-xs">
                            Summary of TikTok token refresh operations
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="rounded-lg border p-4">
                                <div className="text-sm font-medium text-muted-foreground">Total Shops</div>
                                <div className="text-2xl font-bold mt-1">{tikTokResults.summary.total}</div>
                            </div>
                            <div className="rounded-lg border p-4 border-green-500/20 bg-green-500/5">
                                <div className="text-sm font-medium text-muted-foreground">Successful</div>
                                <div className="text-2xl font-bold mt-1 text-green-500">
                                    {tikTokResults.summary.successful}
                                </div>
                            </div>
                            <div className="rounded-lg border p-4 border-red-500/20 bg-red-500/5">
                                <div className="text-sm font-medium text-muted-foreground">Failed</div>
                                <div className="text-2xl font-bold mt-1 text-red-500">
                                    {tikTokResults.summary.failed}
                                </div>
                            </div>
                        </div>

                        {/* Detailed Results */}
                        <div className="space-y-2">
                            <h3 className="font-semibold text-sm">Shop Details:</h3>
                            <div className="space-y-2">
                                {tikTokResults.results.map((result) => (
                                    <div
                                        key={result.shopNumber}
                                        className="flex items-center justify-between p-3 rounded-lg border"
                                    >
                                        <div className="flex items-center gap-3">
                                            {result.success ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-red-500" />
                                            )}
                                            <div>
                                                <div className="font-medium">
                                                    Shop {result.shopNumber}: {result.shopName}
                                                </div>
                                                {result.error && (
                                                    <div className="text-sm text-red-500 mt-1">
                                                        {result.error}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Badge
                                            variant={result.success ? "default" : "destructive"}
                                            className={
                                                result.success
                                                    ? "bg-green-500 hover:bg-green-600"
                                                    : "bg-red-500 hover:bg-red-600"
                                            }
                                        >
                                            {result.success ? "Success" : "Failed"}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
