"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Search,
    RefreshCw,
    MessageSquare,
    Bug,
    Zap,
    Sparkles,
    CheckCircle2,
    Clock,
    XCircle,
    Edit3,
    Trash2,
    MessageSquarePlus,
    X,
    Save,
    User,
    Calendar,
    Globe,
    AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackItem {
    id: number;
    type: "bug" | "improvement" | "feature" | "other";
    title: string;
    description: string;
    sender_name: string;
    page_url: string;
    priority: "low" | "medium" | "high" | "critical";
    status: "Pending" | "In Progress" | "Resolved" | "Closed";
    admin_notes: string | null;
    created_at: string;
    updated_at: string;
}

export default function FeedbackAdminPage() {
    const [items, setItems] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [typeFilter, setTypeFilter] = useState("All");

    // Modal state for editing or status update
    const [activeModalItem, setActiveModalItem] = useState<FeedbackItem | null>(null);
    const [activeModalType, setActiveModalType] = useState<"status" | "edit" | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

    // Form inputs inside modals
    const [statusForm, setStatusForm] = useState({
        status: "Pending" as FeedbackItem["status"],
        admin_notes: "",
    });

    const [editForm, setEditForm] = useState({
        title: "",
        description: "",
        type: "improvement" as FeedbackItem["type"],
        priority: "medium" as FeedbackItem["priority"],
    });

    const fetchFeedback = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== "All") params.append("status", statusFilter);
            if (typeFilter !== "All") params.append("type", typeFilter);
            if (searchQuery.trim()) params.append("search", searchQuery.trim());

            const res = await fetch(`/api/feedback?${params.toString()}`);
            const json = await res.json();
            if (json.success) {
                setItems(json.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch feedback:", error);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, typeFilter, searchQuery]);

    useEffect(() => {
        fetchFeedback();
    }, [fetchFeedback]);

    // Open Status Update Modal
    const handleOpenStatusModal = (item: FeedbackItem) => {
        setActiveModalItem(item);
        setActiveModalType("status");
        setStatusForm({
            status: item.status,
            admin_notes: item.admin_notes || "",
        });
    };

    // Open Edit Content Modal
    const handleOpenEditModal = (item: FeedbackItem) => {
        setActiveModalItem(item);
        setActiveModalType("edit");
        setEditForm({
            title: item.title,
            description: item.description,
            type: item.type,
            priority: item.priority,
        });
    };

    // Save Status Patch
    const handleSaveStatus = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeModalItem) return;
        setIsSaving(true);
        try {
            const res = await fetch("/api/feedback", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: activeModalItem.id,
                    status: statusForm.status,
                    admin_notes: statusForm.admin_notes,
                }),
            });
            const json = await res.json();
            if (json.success) {
                setActiveModalItem(null);
                setActiveModalType(null);
                fetchFeedback();
            }
        } catch (error) {
            console.error("Error patching status:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Save Content Edit (PUT)
    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeModalItem) return;
        setIsSaving(true);
        try {
            const res = await fetch("/api/feedback", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: activeModalItem.id,
                    title: editForm.title,
                    description: editForm.description,
                    type: editForm.type,
                    priority: editForm.priority,
                }),
            });
            const json = await res.json();
            if (json.success) {
                setActiveModalItem(null);
                setActiveModalType(null);
                fetchFeedback();
            }
        } catch (error) {
            console.error("Error editing feedback:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Delete Feedback (DELETE)
    const handleDelete = async (id: number) => {
        try {
            const res = await fetch(`/api/feedback?id=${id}`, { method: "DELETE" });
            const json = await res.json();
            if (json.success) {
                setDeleteConfirmId(null);
                fetchFeedback();
            }
        } catch (error) {
            console.error("Error deleting feedback:", error);
        }
    };

    // Stats count computation
    const totalCount = items.length;
    const pendingCount = items.filter((i) => i.status === "Pending").length;
    const inProgressCount = items.filter((i) => i.status === "In Progress").length;
    const resolvedCount = items.filter((i) => i.status === "Resolved" || i.status === "Closed").length;

    // Helper Badges
    const getTypeBadge = (type: FeedbackItem["type"]) => {
        switch (type) {
            case "bug":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                        <Bug className="h-3.5 w-3.5" /> Bug Report
                    </span>
                );
            case "improvement":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                        <Zap className="h-3.5 w-3.5" /> Improvement
                    </span>
                );
            case "feature":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30">
                        <Sparkles className="h-3.5 w-3.5" /> Feature Request
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-muted-foreground border border-border">
                        <MessageSquare className="h-3.5 w-3.5" /> General
                    </span>
                );
        }
    };

    const getStatusBadge = (status: FeedbackItem["status"]) => {
        switch (status) {
            case "Pending":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Clock className="h-3 w-3" /> Pending
                    </span>
                );
            case "In Progress":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                        <RefreshCw className="h-3 w-3 animate-spin" /> In Progress
                    </span>
                );
            case "Resolved":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" /> Resolved
                    </span>
                );
            case "Closed":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                        <XCircle className="h-3 w-3" /> Closed
                    </span>
                );
        }
    };

    const getPriorityBadge = (priority: FeedbackItem["priority"]) => {
        switch (priority) {
            case "critical":
                return (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40 animate-pulse">
                        🔥 Critical
                    </span>
                );
            case "high":
                return (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                        High
                    </span>
                );
            case "medium":
                return (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-foreground border border-border">
                        Medium
                    </span>
                );
            case "low":
                return (
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                        Low
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 dark:from-violet-400 dark:via-purple-300 dark:to-indigo-400 bg-clip-text text-transparent">
                        Feedback & Bug Management
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                        Track system issues, feature requests, and tester submissions in real-time.
                    </p>
                </div>
                <button
                    onClick={() => fetchFeedback()}
                    className="self-start md:self-auto px-3.5 py-2 rounded-xl bg-card hover:bg-muted border border-border text-foreground text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
                >
                    <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                    Refresh Data
                </button>
            </div>

            {/* Summary Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
                    <p className="text-xs font-medium text-muted-foreground">Total Submissions</p>
                    <p className="text-2xl font-black text-foreground mt-1">{totalCount}</p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 shadow-sm">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Pending Review</p>
                    <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">{pendingCount}</p>
                </div>
                <div className="p-4 rounded-2xl bg-sky-500/10 dark:bg-sky-500/5 border border-sky-500/20 shadow-sm">
                    <p className="text-xs font-medium text-sky-700 dark:text-sky-400">In Progress</p>
                    <p className="text-2xl font-black text-sky-700 dark:text-sky-400 mt-1">{inProgressCount}</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 shadow-sm">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Resolved / Closed</p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{resolvedCount}</p>
                </div>
            </div>

            {/* Controls Row: Search & Filters */}
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search feedback title, details, sender, or URL path..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Status Filter */}
                    <div className="flex items-center bg-muted p-1 rounded-xl border border-border text-xs">
                        {["All", "Pending", "In Progress", "Resolved"].map((st) => (
                            <button
                                key={st}
                                onClick={() => setStatusFilter(st)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                    statusFilter === st
                                        ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {st}
                            </button>
                        ))}
                    </div>

                    {/* Type Filter Dropdown */}
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="All">All Types</option>
                        <option value="bug">🐛 Bug Report</option>
                        <option value="improvement">⚡ Improvement</option>
                        <option value="feature">✨ Feature Request</option>
                        <option value="other">💬 General</option>
                    </select>
                </div>
            </div>

            {/* Content List / Cards */}
            {loading ? (
                <div className="py-20 text-center text-muted-foreground space-y-3">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-violet-500" />
                    <p className="text-xs">Loading feedback entries...</p>
                </div>
            ) : items.length === 0 ? (
                <div className="py-20 text-center bg-card rounded-2xl border border-border space-y-3 shadow-sm">
                    <MessageSquarePlus className="h-10 w-10 mx-auto text-muted-foreground" />
                    <h3 className="text-sm font-bold text-foreground">No Feedback Items Found</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        No feedback matched your active search or filters. Submit one using the bottom floating button!
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="p-5 rounded-2xl bg-card border border-border hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm space-y-3"
                        >
                            {/* Card Top Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                                        #{item.id}
                                    </span>
                                    {getTypeBadge(item.type)}
                                    {getStatusBadge(item.status)}
                                    {getPriorityBadge(item.priority)}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleOpenStatusModal(item)}
                                        className="px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors border border-border"
                                    >
                                        <RefreshCw className="h-3 w-3 text-sky-500" />
                                        Update Status
                                    </button>
                                    <button
                                        onClick={() => handleOpenEditModal(item)}
                                        className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors border border-border"
                                        title="Edit Content"
                                    >
                                        <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirmId(item.id)}
                                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors border border-rose-500/20"
                                        title="Delete Feedback"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Title & Description */}
                            <div>
                                <h3 className="text-base font-bold text-foreground">{item.title}</h3>
                                <p className="text-xs text-muted-foreground dark:text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">
                                    {item.description}
                                </p>
                            </div>

                            {/* Admin Notes Box (if present) */}
                            {item.admin_notes && (
                                <div className="p-3 rounded-xl bg-violet-500/10 dark:bg-violet-950/40 border border-violet-500/20 text-xs text-violet-900 dark:text-violet-200 space-y-1">
                                    <p className="font-semibold text-[11px] text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                                        <Sparkles className="h-3 w-3" /> Admin Resolution Notes:
                                    </p>
                                    <p className="whitespace-pre-wrap">{item.admin_notes}</p>
                                </div>
                            )}

                            {/* Footer Meta info */}
                            <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border gap-2">
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1 text-foreground font-medium">
                                        <User className="h-3 w-3 text-muted-foreground" />
                                        {item.sender_name || "Tester"}
                                    </span>
                                    <span className="flex items-center gap-1 font-mono text-violet-600 dark:text-violet-400">
                                        <Globe className="h-3 w-3 text-muted-foreground" />
                                        {item.page_url || "/"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(item.created_at).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Status Update Modal ─────────────────────────────────────────── */}
            {activeModalType === "status" && activeModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-md bg-card border border-border text-card-foreground rounded-2xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-sm font-bold text-foreground">
                                Update Status for #{activeModalItem.id}
                            </h3>
                            <button onClick={() => setActiveModalType(null)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveStatus} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1.5">Status</label>
                                <select
                                    value={statusForm.status}
                                    onChange={(e) =>
                                        setStatusForm({ ...statusForm, status: e.target.value as FeedbackItem["status"] })
                                    }
                                    className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Resolved">Resolved</option>
                                    <option value="Closed">Closed</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1.5">
                                    Admin Notes / Resolution Details
                                </label>
                                <textarea
                                    rows={4}
                                    placeholder="Add progress notes or resolution info..."
                                    value={statusForm.admin_notes}
                                    onChange={(e) => setStatusForm({ ...statusForm, admin_notes: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveModalType(null)}
                                    className="px-4 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground bg-muted"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    Save Status
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Edit Content Modal ─────────────────────────────────────────── */}
            {activeModalType === "edit" && activeModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-lg bg-card border border-border text-card-foreground rounded-2xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-sm font-bold text-foreground">Edit Feedback #{activeModalItem.id}</h3>
                            <button onClick={() => setActiveModalType(null)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1.5">Type</label>
                                    <select
                                        value={editForm.type}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, type: e.target.value as FeedbackItem["type"] })
                                        }
                                        className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="bug">🐛 Bug Report</option>
                                        <option value="improvement">⚡ Improvement</option>
                                        <option value="feature">✨ Feature Request</option>
                                        <option value="other">💬 General</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1.5">Priority</label>
                                    <select
                                        value={editForm.priority}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, priority: e.target.value as FeedbackItem["priority"] })
                                        }
                                        className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical 🔥</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1.5">Title</label>
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1.5">Description</label>
                                <textarea
                                    rows={4}
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveModalType(null)}
                                    className="px-4 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground bg-muted"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-sm bg-card border border-border text-card-foreground rounded-2xl p-6 text-center space-y-4 shadow-2xl">
                        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
                        <div>
                            <h3 className="text-sm font-bold text-foreground">Delete Feedback #{deleteConfirmId}?</h3>
                            <p className="text-xs text-muted-foreground mt-1">This action cannot be undone.</p>
                        </div>
                        <div className="flex items-center justify-center gap-3 pt-2">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-4 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground bg-muted border border-border"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirmId)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
                            >
                                Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
