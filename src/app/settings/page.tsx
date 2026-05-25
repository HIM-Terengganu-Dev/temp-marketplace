"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
    Users, 
    Shield, 
    Store, 
    ShoppingBag, 
    Plus, 
    Trash2, 
    Save, 
    UserPlus, 
    Check, 
    AlertTriangle 
} from "lucide-react";

// Definitions of existing shops in the ecosystem
const TIKTOK_SHOPS = [
    { id: 1, name: "Himclinic Official" },
    { id: 2, name: "HIM CLINIC" },
    { id: 3, name: "Vigomax HQ" },
    { id: 4, name: "VigomaxPlus HQ" },
];

const SHOPEE_SHOPS = [
    { id: 1, name: "Himclinic Official" },
    { id: 2, name: "Him Clinic by Dr Samhan" },
    { id: 3, name: "Forhimclinic" },
    { id: 4, name: "HIMWELLNESS" },
];

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    allowed_tiktok_shops: number[];
    allowed_shopee_shops: number[];
    allowed_features?: string[];
    created_at: string;
}

// Features that can be toggled
const FEATURES = [
    { id: "overview", name: "Overview (Dashboard)" },
    { id: "tiktok", name: "TikTok Shops Page" },
    { id: "shopee", name: "Shopee Shop Page" },
    { id: "ads", name: "Ad Accounts Page" },
    { id: "analytics", name: "Analytics Page" },
    { id: "debug", name: "Debug Tables (TikTok)" },
    { id: "refresh_token", name: "Refresh Token Manager" },
    { id: "settings", name: "Settings (RBAC Controls)" }
];

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Form states
    const [formName, setFormName] = useState("");
    const [formEmail, setFormEmail] = useState("");
    const [formPassword, setFormPassword] = useState("");
    const [formRole, setFormRole] = useState("user");
    const [formTiktokShops, setFormTiktokShops] = useState<number[]>([]);
    const [formShopeeShops, setFormShopeeShops] = useState<number[]>([]);
    const [formFeatures, setFormFeatures] = useState<string[]>([]);

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
                if (data.length > 0 && !selectedUser) {
                    handleSelectUser(data[0]);
                }
            } else {
                setError("Failed to fetch users");
            }
        } catch (e) {
            setError("An error occurred while loading users");
        }
    };

    useEffect(() => {
        if (session && (session.user as any).role === "admin") {
            fetchUsers();
        }
    }, [session]);

    const handleSelectUser = (user: User) => {
        setSelectedUser(user);
        setIsCreating(false);
        setFormName(user.name);
        setFormEmail(user.email);
        setFormPassword("");
        setFormRole(user.role);
        setFormTiktokShops(user.allowed_tiktok_shops || []);
        setFormShopeeShops(user.allowed_shopee_shops || []);
        setFormFeatures(user.allowed_features || ["overview", "tiktok", "shopee", "ads", "analytics"]);
        setError("");
        setSuccess("");
    };

    const handleStartCreate = () => {
        setIsCreating(true);
        setSelectedUser(null);
        setFormName("");
        setFormEmail("");
        setFormPassword("");
        setFormRole("user");
        setFormTiktokShops([1, 2]); // Default standard shops
        setFormShopeeShops([1, 2]);
        setFormFeatures(["overview", "tiktok", "shopee", "ads", "analytics"]);
        setError("");
        setSuccess("");
    };

    const handleToggleTiktokShop = (id: number) => {
        setFormTiktokShops(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleToggleShopeeShop = (id: number) => {
        setFormShopeeShops(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleToggleFeature = (id: string) => {
        setFormFeatures(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setIsLoading(true);

        try {
            if (isCreating) {
                const res = await fetch("/api/users", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: formName,
                        email: formEmail,
                        password: formPassword,
                        role: formRole,
                        allowed_tiktok_shops: formTiktokShops,
                        allowed_shopee_shops: formShopeeShops,
                        allowed_features: formFeatures
                    })
                });

                if (res.ok) {
                    const newUser = await res.json();
                    setSuccess("User created successfully!");
                    await fetchUsers();
                    handleSelectUser(newUser);
                } else {
                    const data = await res.json();
                    setError(data.error || "Failed to create user");
                }
            } else if (selectedUser) {
                const res = await fetch(`/api/users/${selectedUser.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: formName,
                        email: formEmail,
                        password: formPassword || undefined,
                        role: formRole,
                        allowed_tiktok_shops: formTiktokShops,
                        allowed_shopee_shops: formShopeeShops,
                        allowed_features: formFeatures
                    })
                });

                if (res.ok) {
                    const updated = await res.json();
                    setSuccess("Permissions updated successfully!");
                    await fetchUsers();
                    setSelectedUser(updated);
                } else {
                    const data = await res.json();
                    setError(data.error || "Failed to update permissions");
                }
            }
        } catch (e) {
            setError("Failed to save changes");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedUser) return;
        if (!confirm(`Are you sure you want to delete ${selectedUser.name}?`)) return;

        setError("");
        setSuccess("");
        setIsLoading(true);

        try {
            const res = await fetch(`/api/users/${selectedUser.id}`, {
                method: "DELETE"
            });

            if (res.ok) {
                setSuccess("User deleted successfully");
                setSelectedUser(null);
                await fetchUsers();
            } else {
                const data = await res.json();
                setError(data.error || "Failed to delete user");
            }
        } catch (e) {
            setError("Failed to delete user");
        } finally {
            setIsLoading(false);
        }
    };

    // Protection logic
    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
            </div>
        );
    }

    if (!session || (session.user as any).role !== "admin") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 space-y-4">
                <div className="p-4 bg-destructive/10 rounded-full text-destructive">
                    <AlertTriangle className="h-12 w-12" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Access Denied</h1>
                <p className="text-muted-foreground max-w-md">
                    Only administrators are permitted to view and manage role-based permissions (RBAC) and user access controls.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                        Role-Based Access Control (RBAC)
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Configure roles and access rights for store metrics dashboards.
                    </p>
                </div>
                <Button onClick={handleStartCreate} className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    New User
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-12">
                {/* Left panel: User List */}
                <Card className="md:col-span-4 border-border/40 bg-card/30 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            System Users
                        </CardTitle>
                        <CardDescription>
                            All registered dashboard users
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border/40 max-h-[500px] overflow-y-auto">
                            {users.map((u) => (
                                <button
                                    key={u.id}
                                    onClick={() => handleSelectUser(u)}
                                    className={`w-full text-left p-4 transition-all hover:bg-muted/30 flex items-center justify-between border-l-2 ${
                                        selectedUser?.id === u.id
                                            ? "border-primary bg-primary/5"
                                            : "border-transparent"
                                    }`}
                                >
                                    <div className="space-y-1">
                                        <div className="font-semibold text-sm flex items-center gap-2">
                                            {u.name || "Unnamed"}
                                            {u.role === "admin" && (
                                                <Shield className="h-3.5 w-3.5 text-purple-400" />
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{u.email}</div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <Badge variant="outline" className={u.role === "admin" ? "border-purple-500/30 text-purple-400" : "border-primary/30 text-primary"}>
                                            {u.role}
                                        </Badge>
                                        <div className="text-[10px] text-muted-foreground">
                                            TT: {u.allowed_tiktok_shops?.length || 0} | SP: {u.allowed_shopee_shops?.length || 0}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Right panel: User details & Settings */}
                <div className="md:col-span-8 space-y-6">
                    <Card className="border-border/40 bg-card/30 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">
                                {isCreating ? "Create New User Profile" : `Permissions: ${selectedUser?.name}`}
                            </CardTitle>
                            <CardDescription>
                                {isCreating 
                                    ? "Add credentials and customize allowed stores" 
                                    : "Modify this user's profile and authorized metrics data"}
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleSave}>
                            <CardContent className="space-y-6">
                                {error && (
                                    <div className="p-3 rounded-md bg-destructive/15 text-destructive text-sm font-medium">
                                        {error}
                                    </div>
                                )}
                                {success && (
                                    <div className="p-3 rounded-md bg-green-500/15 text-green-400 text-sm font-medium flex items-center gap-2">
                                        <Check className="h-4 w-4" />
                                        {success}
                                    </div>
                                )}

                                {/* Profile info */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase">Full Name</label>
                                        <input
                                            type="text"
                                            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            value={formName}
                                            onChange={(e) => setFormName(e.target.value)}
                                            placeholder="John Doe"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase">Email Address</label>
                                        <input
                                            type="email"
                                            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            value={formEmail}
                                            onChange={(e) => setFormEmail(e.target.value)}
                                            placeholder="john@example.com"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase">
                                            {isCreating ? "Password" : "Reset Password (leave empty to keep current)"}
                                        </label>
                                        <input
                                            type="password"
                                            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            value={formPassword}
                                            onChange={(e) => setFormPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required={isCreating}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase">System Role</label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            value={formRole}
                                            onChange={(e) => setFormRole(e.target.value)}
                                        >
                                            <option value="user">Standard User (Metrics Only)</option>
                                            <option value="admin">Administrator (Full Access)</option>
                                        </select>
                                    </div>
                                </div>

                                <Separator className="bg-border/40" />

                                {/* Permissions Grid */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-primary" />
                                        Dashboard Data Visibility Controls
                                    </h3>
                                    
                                    <div className="grid gap-6 md:grid-cols-2">
                                        {/* TikTok Shops Visibility */}
                                        <div className="space-y-3 p-4 bg-muted/10 rounded-lg border border-border/40">
                                            <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                                                <Store className="h-4 w-4 text-purple-400" />
                                                TikTok Shop Authorization
                                            </div>
                                            <p className="text-xs text-muted-foreground">Select which TikTok stores this user is permitted to monitor.</p>
                                            <div className="space-y-2 pt-2">
                                                {TIKTOK_SHOPS.map((shop) => (
                                                    <label 
                                                        key={shop.id} 
                                                        className="flex items-center gap-3 p-2 rounded hover:bg-muted/30 cursor-pointer text-sm"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-border bg-background text-primary focus:ring-primary h-4 w-4"
                                                            checked={formTiktokShops.includes(shop.id)}
                                                            onChange={() => handleToggleTiktokShop(shop.id)}
                                                        />
                                                        <div>
                                                            <div className="font-medium">{shop.name}</div>
                                                            <div className="text-[10px] text-muted-foreground">Shop ID: {shop.id}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Shopee Shops Visibility */}
                                        <div className="space-y-3 p-4 bg-muted/10 rounded-lg border border-border/40">
                                            <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                                                <ShoppingBag className="h-4 w-4 text-amber-500" />
                                                Shopee Shop Authorization
                                            </div>
                                            <p className="text-xs text-muted-foreground">Select which Shopee stores this user is permitted to monitor.</p>
                                            <div className="space-y-2 pt-2">
                                                {SHOPEE_SHOPS.map((shop) => (
                                                    <label 
                                                        key={shop.id} 
                                                        className="flex items-center gap-3 p-2 rounded hover:bg-muted/30 cursor-pointer text-sm"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-border bg-background text-primary focus:ring-primary h-4 w-4"
                                                            checked={formShopeeShops.includes(shop.id)}
                                                            onChange={() => handleToggleShopeeShop(shop.id)}
                                                        />
                                                        <div>
                                                            <div className="font-medium">{shop.name}</div>
                                                            <div className="text-[10px] text-muted-foreground">Shop ID: {shop.id}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Navigation Feature Access Authorization */}
                                    <div className="space-y-3 p-4 bg-muted/10 rounded-lg border border-border/40">
                                        <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                                            <Shield className="h-4 w-4 text-primary" />
                                            Dashboard Page & Navigation Sidebar Access
                                        </div>
                                        <p className="text-xs text-muted-foreground">Select which navigation tabs and pages this user is permitted to open.</p>
                                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                                            {FEATURES.map((feat) => (
                                                <label 
                                                    key={feat.id} 
                                                    className="flex items-center gap-3 p-2 rounded hover:bg-muted/30 cursor-pointer text-sm"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-border bg-background text-primary focus:ring-primary h-4 w-4"
                                                        checked={formFeatures.includes(feat.id)}
                                                        onChange={() => handleToggleFeature(feat.id)}
                                                    />
                                                    <div>
                                                        <div className="font-medium text-xs">{feat.name}</div>
                                                        <div className="text-[9px] text-muted-foreground">Key: {feat.id}</div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex items-center justify-between border-t border-border/40 pt-6">
                                {!isCreating && selectedUser && (
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        onClick={handleDelete}
                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        disabled={isLoading}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete User
                                    </Button>
                                )}
                                <div className="flex items-center gap-3 ml-auto">
                                    {isCreating && (
                                        <Button 
                                            type="button" 
                                            variant="ghost"
                                            onClick={() => users.length > 0 && handleSelectUser(users[0])}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                    <Button type="submit" disabled={isLoading} className="gap-2">
                                        <Save className="h-4 w-4" />
                                        {isCreating ? "Create User" : "Save Changes"}
                                    </Button>
                                </div>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            </div>
        </div>
    );
}
