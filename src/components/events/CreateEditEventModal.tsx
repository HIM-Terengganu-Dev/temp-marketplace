"use client";

import React, { useState, useEffect } from "react";
import {
    X,
    Calendar,
    Target,
    DollarSign,
    Layers,
    Plus,
    Trash2,
    Loader2,
    AlertCircle,
    CheckCircle2,
    ShoppingBag,
    Megaphone,
    Radio,
    Share2,
    Boxes,
    Percent
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    CampaignEvent,
    CustomCostItem,
    EventPlatform,
    EventDepartment
} from "@/types/events";

interface CreateEditEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: (event: CampaignEvent) => void;
    eventToEdit?: CampaignEvent | null;
}

export default function CreateEditEventModal({
    isOpen,
    onClose,
    onSaved,
    eventToEdit,
}: CreateEditEventModalProps) {
    const isEditing = !!eventToEdit;

    const [name, setName] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [targetAmount, setTargetAmount] = useState<string>("100000");
    const [platformCostRate, setPlatformCostRate] = useState<string>("25");
    const [platform, setPlatform] = useState<EventPlatform>("combine");
    const [departments, setDepartments] = useState<EventDepartment[]>([
        "marketing",
        "livehost",
        "affiliate",
        "orders",
    ]);
    const [customCosts, setCustomCosts] = useState<CustomCostItem[]>([]);
    const [notes, setNotes] = useState("");

    const [newCostName, setNewCostName] = useState("");
    const [newCostAmount, setNewCostAmount] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize or reset form state
    useEffect(() => {
        if (eventToEdit) {
            setName(eventToEdit.name || "");
            setStartDate(eventToEdit.startDate || "");
            setEndDate(eventToEdit.endDate || "");
            setTargetAmount(eventToEdit.targetAmount?.toString() || "0");
            setPlatformCostRate(
                eventToEdit.platformCostRate !== undefined ? eventToEdit.platformCostRate.toString() : "25"
            );
            setPlatform(eventToEdit.platform || "combine");
            setDepartments(eventToEdit.departments || ["marketing", "livehost", "affiliate", "orders"]);
            setCustomCosts(eventToEdit.customCosts ? [...eventToEdit.customCosts] : []);
            setNotes(eventToEdit.notes || "");
        } else {
            // Default new event
            const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
            setName("");
            setStartDate(today);
            setEndDate(today);
            setTargetAmount("200000");
            setPlatformCostRate("25");
            setPlatform("combine");
            setDepartments(["marketing", "livehost", "affiliate", "orders"]);
            setCustomCosts([]);
            setNotes("");
        }
        setError(null);
    }, [eventToEdit, isOpen]);

    if (!isOpen) return null;

    const toggleDepartment = (dept: EventDepartment) => {
        if (departments.includes(dept)) {
            if (departments.length === 1) {
                setError("At least one department must be selected");
                return;
            }
            setDepartments(departments.filter((d) => d !== dept));
        } else {
            setDepartments([...departments, dept]);
        }
        setError(null);
    };

    const handleAddCost = () => {
        if (!newCostName.trim()) {
            setError("Please enter a custom cost item name");
            return;
        }
        const amt = parseFloat(newCostAmount);
        if (isNaN(amt) || amt < 0) {
            setError("Please enter a valid cost amount (>= 0)");
            return;
        }

        const newItem: CustomCostItem = {
            id: `cost_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: newCostName.trim(),
            amount: amt,
        };

        setCustomCosts([...customCosts, newItem]);
        setNewCostName("");
        setNewCostAmount("");
        setError(null);
    };

    const handleRemoveCost = (id: string) => {
        setCustomCosts(customCosts.filter((c) => c.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError("Event name is required");
            return;
        }
        if (!startDate || !endDate) {
            setError("Start date and end date are required");
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            setError("Start date cannot be after end date");
            return;
        }
        const target = parseFloat(targetAmount);
        if (isNaN(target) || target < 0) {
            setError("Target amount must be a valid number >= 0");
            return;
        }

        const costRate = parseFloat(platformCostRate);
        if (isNaN(costRate) || costRate < 0 || costRate > 100) {
            setError("Platform cost percentage must be between 0% and 100%");
            return;
        }

        setLoading(true);
        try {
            const url = "/api/centralised-data/events";
            const method = isEditing ? "PUT" : "POST";
            const payload: any = {
                name: name.trim(),
                startDate,
                endDate,
                targetAmount: target,
                platformCostRate: costRate,
                platform,
                departments,
                customCosts,
                notes: notes.trim(),
            };
            if (isEditing && eventToEdit?.id) {
                payload.id = eventToEdit.id;
            }

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to save event");
            }

            onSaved(data.event);
            onClose();
        } catch (err: any) {
            setError(err.message || "An error occurred while saving the event");
        } finally {
            setLoading(false);
        }
    };

    const totalCustomCost = customCosts.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const estimatedPlatformCost = ((parseFloat(targetAmount) || 0) * (parseFloat(platformCostRate) || 0)) / 100;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200">
            <div className="relative w-full max-w-2xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/20">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-foreground">
                                {isEditing ? "Edit Campaign Event" : "Create New Campaign Event"}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Configure date range, target, platform costs, channels, included departments, and custom costs.
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        disabled={loading}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
                    {error && (
                        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Event Name */}
                    <div className="space-y-1.5">
                        <Label htmlFor="eventName" className="text-xs font-semibold">
                            Event Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="eventName"
                            placeholder="e.g. 9.9 Mega Shopping Day, Payday Sale, Super Brand Day"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="h-9 text-xs"
                        />
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="startDate" className="text-xs font-semibold">
                                Start Date <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                required
                                className="h-9 text-xs font-mono"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="endDate" className="text-xs font-semibold">
                                End Date <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                required
                                className="h-9 text-xs font-mono"
                            />
                        </div>
                    </div>

                    {/* Target Sales & Platform Cost */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="targetAmount" className="text-xs font-semibold">
                                Target Sales (RM)
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">
                                    RM
                                </span>
                                <Input
                                    id="targetAmount"
                                    type="number"
                                    min="0"
                                    step="1000"
                                    placeholder="200000"
                                    value={targetAmount}
                                    onChange={(e) => setTargetAmount(e.target.value)}
                                    className="h-9 pl-9 text-xs font-mono font-semibold"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="platformCostRate" className="text-xs font-semibold flex items-center gap-1">
                                    <Percent className="h-3 w-3 text-sky-400" />
                                    <span>Platform Cost (%)</span>
                                </Label>
                                <span className="text-[10px] font-mono text-sky-400 font-medium">
                                    Est. RM {estimatedPlatformCost.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="relative">
                                <Input
                                    id="platformCostRate"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    placeholder="25"
                                    value={platformCostRate}
                                    onChange={(e) => setPlatformCostRate(e.target.value)}
                                    className="h-9 pr-8 text-xs font-mono font-semibold"
                                />
                                <span className="absolute right-3 top-2 text-xs font-bold text-muted-foreground">
                                    %
                                </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                Currently 25% from total sales. Can increase or decrease.
                            </p>
                        </div>
                    </div>

                    {/* Platform Selector */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold">
                            Marketplace Platform Channel <span className="text-destructive">*</span>
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setPlatform("combine")}
                                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                                    platform === "combine"
                                        ? "bg-primary/10 border-primary text-primary shadow-xs"
                                        : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                                }`}
                            >
                                <Layers className="h-4 w-4" />
                                <span>Combine (All)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPlatform("tiktok")}
                                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                                    platform === "tiktok"
                                        ? "bg-purple-500/10 border-purple-500 text-purple-400 shadow-xs"
                                        : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                                }`}
                            >
                                <Radio className="h-4 w-4 text-purple-400" />
                                <span>TikTok Only</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPlatform("shopee")}
                                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                                    platform === "shopee"
                                        ? "bg-amber-500/10 border-amber-500 text-amber-500 shadow-xs"
                                        : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                                }`}
                            >
                                <ShoppingBag className="h-4 w-4 text-amber-500" />
                                <span>Shopee Only</span>
                            </button>
                        </div>
                    </div>

                    {/* Department Inclusions */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">
                                Included Departments & Telemetry Sources
                            </Label>
                            <span className="text-[10px] text-muted-foreground">
                                Select which department sales to include
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {/* 1. Marketing */}
                            <div
                                onClick={() => toggleDepartment("marketing")}
                                className={`cursor-pointer flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                                    departments.includes("marketing")
                                        ? "bg-primary/10 border-primary/60 text-foreground"
                                        : "border-border/40 opacity-50 bg-muted/20"
                                }`}
                            >
                                <div className="h-4 w-4 rounded border flex items-center justify-center border-primary bg-primary/20">
                                    {departments.includes("marketing") && (
                                        <CheckCircle2 className="h-3 w-3 text-primary" />
                                    )}
                                </div>
                                <Megaphone className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span className="truncate">Marketing</span>
                            </div>

                            {/* 2. Live Host */}
                            <div
                                onClick={() => toggleDepartment("livehost")}
                                className={`cursor-pointer flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                                    departments.includes("livehost")
                                        ? "bg-blue-500/10 border-blue-500/60 text-foreground"
                                        : "border-border/40 opacity-50 bg-muted/20"
                                }`}
                            >
                                <div className="h-4 w-4 rounded border flex items-center justify-center border-blue-500 bg-blue-500/20">
                                    {departments.includes("livehost") && (
                                        <CheckCircle2 className="h-3 w-3 text-blue-500" />
                                    )}
                                </div>
                                <Radio className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                <span className="truncate">Live Host</span>
                            </div>

                            {/* 3. Affiliate */}
                            <div
                                onClick={() => toggleDepartment("affiliate")}
                                className={`cursor-pointer flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                                    departments.includes("affiliate")
                                        ? "bg-emerald-500/10 border-emerald-500/60 text-foreground"
                                        : "border-border/40 opacity-50 bg-muted/20"
                                }`}
                            >
                                <div className="h-4 w-4 rounded border flex items-center justify-center border-emerald-500 bg-emerald-500/20">
                                    {departments.includes("affiliate") && (
                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    )}
                                </div>
                                <Share2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span className="truncate">Affiliate</span>
                            </div>

                            {/* 4. Store / Orders */}
                            <div
                                onClick={() => toggleDepartment("orders")}
                                className={`cursor-pointer flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                                    departments.includes("orders")
                                        ? "bg-purple-500/10 border-purple-500/60 text-foreground"
                                        : "border-border/40 opacity-50 bg-muted/20"
                                }`}
                            >
                                <div className="h-4 w-4 rounded border flex items-center justify-center border-purple-500 bg-purple-500/20">
                                    {departments.includes("orders") && (
                                        <CheckCircle2 className="h-3 w-3 text-purple-400" />
                                    )}
                                </div>
                                <Boxes className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                                <span className="truncate">Store Orders</span>
                            </div>
                        </div>
                    </div>

                    {/* Custom Costs Section */}
                    <div className="space-y-2 border-t border-border/40 pt-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                                <DollarSign className="h-3.5 w-3.5 text-amber-500" />
                                <span>Custom Operational Costs (Item Name & Amount)</span>
                            </Label>
                            <Badge variant="outline" className="text-[10px] font-mono text-amber-500 border-amber-500/30">
                                Total: RM {totalCustomCost.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
                            </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Add specific event costs like studio rentals, talent appearance fees, giveaway hampers, or vouchers.
                        </p>

                        {/* Cost List */}
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {customCosts.length === 0 ? (
                                <div className="p-3 text-center border border-dashed border-border/60 rounded-xl text-[11px] text-muted-foreground">
                                    No custom costs added yet. Add items below.
                                </div>
                            ) : (
                                customCosts.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50 text-xs"
                                    >
                                        <span className="font-medium text-foreground truncate pr-2">
                                            {item.name}
                                        </span>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="font-mono font-bold text-amber-400">
                                                RM {Number(item.amount).toLocaleString("en-MY", { minimumFractionDigits: 2 })}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveCost(item.id)}
                                                className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                                title="Remove Cost"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add Cost Input Row */}
                        <div className="flex items-center gap-2 pt-1">
                            <Input
                                placeholder="Cost item name (e.g. Talent Fee, Studio Props)"
                                value={newCostName}
                                onChange={(e) => setNewCostName(e.target.value)}
                                className="h-8 text-xs flex-1"
                            />
                            <div className="relative w-32 shrink-0">
                                <span className="absolute left-2.5 top-1.5 text-xs text-muted-foreground font-bold">
                                    RM
                                </span>
                                <Input
                                    type="number"
                                    min="0"
                                    step="10"
                                    placeholder="Amount"
                                    value={newCostAmount}
                                    onChange={(e) => setNewCostAmount(e.target.value)}
                                    className="h-8 pl-8 text-xs font-mono"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddCost();
                                        }
                                    }}
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddCost}
                                className="h-8 px-3 text-xs shrink-0 gap-1 border-border/60"
                            >
                                <Plus className="h-3.5 w-3.5 text-primary" />
                                <span>Add</span>
                            </Button>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5 border-t border-border/40 pt-4">
                        <Label htmlFor="eventNotes" className="text-xs font-semibold">
                            Campaign Strategy & Notes (Optional)
                        </Label>
                        <textarea
                            id="eventNotes"
                            rows={2}
                            placeholder="Add strategic focus, voucher codes, or key broadcast highlights..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                </form>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-border/60 bg-muted/20">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        disabled={loading}
                        className="text-xs h-8"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="text-xs h-8 gap-1.5 shadow-sm"
                    >
                        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        <span>{isEditing ? "Update Campaign Event" : "Create Event"}</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
