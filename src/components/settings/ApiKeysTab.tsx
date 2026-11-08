"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Key, Copy, Check, Plus, Trash2, Power, Terminal, AlertTriangle, ShieldCheck } from "lucide-react";

interface ApiKeyRecord {
    id: number;
    name: string;
    key_prefix: string;
    company_access: 'ALL' | 'HIMWELLNESS' | 'WEROCA';
    created_by: string;
    is_active: boolean;
    last_used_at: string | null;
    created_at: string;
}

export default function ApiKeysTab() {
    const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Create modal state
    const [isCreating, setIsCreating] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [newKeyCompany, setNewKeyCompany] = useState<'ALL' | 'HIMWELLNESS' | 'WEROCA'>('ALL');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Newly generated key modal display
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const fetchKeys = async () => {
        setIsLoading(true);
        setError("");
        try {
            const res = await fetch("/api/system/api-keys");
            const data = await res.json();
            if (res.ok && data.success) {
                setKeys(data.keys || []);
            } else {
                setError(data.error || "Failed to load API keys");
            }
        } catch (e: any) {
            setError(e.message || "Network error loading API keys");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchKeys();
    }, []);

    const handleCreateKey = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKeyName.trim()) return;

        setIsSubmitting(true);
        setError("");
        try {
            const res = await fetch("/api/system/api-keys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newKeyName.trim(),
                    company_access: newKeyCompany
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setGeneratedKey(data.apiKey);
                setNewKeyName("");
                setNewKeyCompany("ALL");
                setIsCreating(false);
                fetchKeys();
            } else {
                setError(data.error || "Failed to generate API key");
            }
        } catch (e: any) {
            setError(e.message || "Network error generating key");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleActive = async (id: number, currentStatus: boolean) => {
        try {
            const res = await fetch("/api/system/api-keys", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, is_active: !currentStatus })
            });
            if (res.ok) {
                fetchKeys();
            }
        } catch (e: any) {
            setError("Failed to update key status");
        }
    };

    const handleDeleteKey = async (id: number) => {
        if (!confirm("Are you sure you want to permanently delete this API key? Systems using it will immediately lose access.")) {
            return;
        }

        try {
            const res = await fetch(`/api/system/api-keys?id=${id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                fetchKeys();
            }
        } catch (e: any) {
            setError("Failed to delete key");
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <div className="space-y-6">
            {/* Header & Create Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <Key className="h-5 w-5 text-primary" />
                        External System Access Keys
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Manage API credentials for external integrations (ERP, Google Sheets, Make, n8n, BI dashboards).
                    </p>
                </div>
                <Button onClick={() => setIsCreating(true)} className="gap-2 bg-primary text-primary-foreground">
                    <Plus className="h-4 w-4" />
                    Generate New Key
                </Button>
            </div>

            {/* Error & Success Alerts */}
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}
            {success && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-sm text-emerald-400 flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0" />
                    {success}
                </div>
            )}

            {/* Generated Key Modal / Banner */}
            {generatedKey && (
                <Card className="border-emerald-500/50 bg-emerald-950/20 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 text-emerald-400">
                            <ShieldCheck className="h-5 w-5" />
                            <CardTitle className="text-base font-bold">New API Key Generated Successfully</CardTitle>
                        </div>
                        <CardDescription className="text-emerald-300/80">
                            Copy this key right now. For security purposes, it will never be shown again in full.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 bg-background/80 p-3 rounded-lg border border-border font-mono text-sm break-all text-foreground">
                            <span className="flex-1 select-all">{generatedKey}</span>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopy(generatedKey)}
                                className="shrink-0 gap-1.5 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                            >
                                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                {copied ? "Copied" : "Copy"}
                            </Button>
                        </div>
                        <div className="flex justify-end">
                            <Button variant="ghost" size="sm" onClick={() => setGeneratedKey(null)} className="text-xs text-muted-foreground">
                                Done / Dismiss
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Create Key Form (Collapsible) */}
            {isCreating && (
                <Card className="border-primary/40 bg-card/40 backdrop-blur-sm animate-in fade-in-50 duration-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">Generate New Access Key</CardTitle>
                        <CardDescription>Specify the system name and company scope for the new key.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateKey} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">System / Client Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. ERP Odoo, Looker Studio, Google Sheets Sync"
                                        value={newKeyName}
                                        onChange={(e) => setNewKeyName(e.target.value)}
                                        required
                                        className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-foreground"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">Company Permission Scope</label>
                                    <select
                                        value={newKeyCompany}
                                        onChange={(e) => setNewKeyCompany(e.target.value as any)}
                                        className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-foreground"
                                    >
                                        <option value="ALL">ALL (HIM Wellness + WEROCA)</option>
                                        <option value="HIMWELLNESS">HIMWELLNESS Only (TikTok 1-2 & Shopee HIM)</option>
                                        <option value="WEROCA">WEROCA Only (TikTok 3-4 & Shopee WEROCA)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreating(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5">
                                    <Plus className="h-4 w-4" />
                                    {isSubmitting ? "Generating..." : "Generate Key"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Keys Table */}
            <Card className="border-border/40 bg-card/30 backdrop-blur-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold flex items-center justify-between">
                        <span>Active Keys ({keys.length})</span>
                    </CardTitle>
                    <CardDescription>
                        API keys grant read access to sales, ad spend, and order metrics via <code className="text-primary font-mono text-xs">/api/v1/metrics</code>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">Loading access keys...</div>
                    ) : keys.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            No API keys generated yet. Click "Generate New Key" to create one.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-border/40 bg-muted/20 text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="p-3">System Name</th>
                                        <th className="p-3">Key Prefix</th>
                                        <th className="p-3">Scope</th>
                                        <th className="p-3">Created By</th>
                                        <th className="p-3">Last Used</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {keys.map((k) => (
                                        <tr key={k.id} className="hover:bg-muted/10 transition-colors">
                                            <td className="p-3 font-medium text-foreground">
                                                {k.name}
                                            </td>
                                            <td className="p-3 font-mono text-xs text-muted-foreground">
                                                {k.key_prefix}
                                            </td>
                                            <td className="p-3">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        k.company_access === 'ALL'
                                                            ? 'border-purple-500/30 text-purple-400 bg-purple-500/10'
                                                            : k.company_access === 'HIMWELLNESS'
                                                            ? 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                                                            : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                                                    }
                                                >
                                                    {k.company_access}
                                                </Badge>
                                            </td>
                                            <td className="p-3 text-xs text-muted-foreground">
                                                {k.created_by}
                                            </td>
                                            <td className="p-3 text-xs text-muted-foreground">
                                                {k.last_used_at || 'Never'}
                                            </td>
                                            <td className="p-3">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        k.is_active
                                                            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                                                            : 'border-red-500/30 text-red-400 bg-red-500/10'
                                                    }
                                                >
                                                    {k.is_active ? 'Active' : 'Revoked'}
                                                </Badge>
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleToggleActive(k.id, k.is_active)}
                                                        title={k.is_active ? "Revoke access" : "Activate key"}
                                                        className={k.is_active ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"}
                                                    >
                                                        <Power className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteKey(k.id)}
                                                        title="Delete key"
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Integration Guide Card */}
            <Card className="border-border/40 bg-card/20 backdrop-blur-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-primary" />
                        Quick Integration Reference
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground font-mono">
                    <div className="p-3 bg-background/60 rounded-lg border border-border/40 space-y-2">
                        <p className="text-foreground font-sans text-xs font-semibold">How external systems make requests:</p>
                        <p className="text-primary">
                            GET /api/v1/metrics?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&company=ALL&platform=all
                        </p>
                        <p className="text-muted-foreground">
                            Header: <span className="text-foreground">x-api-key: mk_live_...</span>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
