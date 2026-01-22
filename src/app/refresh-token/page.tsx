"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, XCircle, Loader2 } from "lucide-react";

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

export default function RefreshTokenPage() {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<RefreshResponse | null>(null);

    const handleRefreshAll = async () => {
        setLoading(true);
        setResults(null);

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

            setResults(data);
        } catch (error: any) {
            setResults({
                success: false,
                summary: { total: 0, successful: 0, failed: 0 },
                results: [],
                error: error.message || 'An error occurred while refreshing tokens'
            } as any);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Refresh TikTok Shop Tokens</h1>
                <p className="text-muted-foreground">
                    Manually refresh access tokens and refresh tokens for all TikTok Shops.
                </p>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Token Refresh</CardTitle>
                    <CardDescription>
                        Click the button below to refresh tokens for all configured TikTok Shops.
                        This will update the tokens in the database.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={handleRefreshAll}
                        disabled={loading}
                        size="lg"
                        className="w-full sm:w-auto"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Refreshing Tokens...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Refresh All Tokens
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {results && (
                <Card>
                    <CardHeader>
                        <CardTitle>Refresh Results</CardTitle>
                        <CardDescription>
                            Summary of token refresh operations
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="rounded-lg border p-4">
                                <div className="text-sm font-medium text-muted-foreground">Total Shops</div>
                                <div className="text-2xl font-bold mt-1">{results.summary.total}</div>
                            </div>
                            <div className="rounded-lg border p-4 border-green-500/20 bg-green-500/5">
                                <div className="text-sm font-medium text-muted-foreground">Successful</div>
                                <div className="text-2xl font-bold mt-1 text-green-500">
                                    {results.summary.successful}
                                </div>
                            </div>
                            <div className="rounded-lg border p-4 border-red-500/20 bg-red-500/5">
                                <div className="text-sm font-medium text-muted-foreground">Failed</div>
                                <div className="text-2xl font-bold mt-1 text-red-500">
                                    {results.summary.failed}
                                </div>
                            </div>
                        </div>

                        {/* Detailed Results */}
                        <div className="space-y-2">
                            <h3 className="font-semibold text-sm">Shop Details:</h3>
                            <div className="space-y-2">
                                {results.results.map((result) => (
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

