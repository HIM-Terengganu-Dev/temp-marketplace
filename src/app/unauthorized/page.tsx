"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
            {/* Elegant glowing background element */}
            <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-20 blur-[120px]">
                <div className="h-[300px] w-[300px] rounded-full bg-destructive animate-pulse" />
                <div className="h-[250px] w-[250px] rounded-full bg-purple-500 ml-[-50px]" />
            </div>

            <div className="max-w-md w-full space-y-6 bg-card/40 backdrop-blur-xl border border-destructive/20 p-8 rounded-2xl shadow-2xl relative">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive border border-destructive/30">
                    <ShieldAlert className="h-8 w-8" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-destructive to-red-400 bg-clip-text text-transparent">
                        Access Denied
                    </h1>
                    <p className="text-sm text-muted-foreground pt-1">
                        You do not have the role-based features permission (RBAC) required to view this dashboard page.
                    </p>
                    <p className="text-xs text-muted-foreground/75 italic">
                        Please contact your system administrator if you believe this is an error.
                    </p>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                    <Link href="/">
                        <Button className="w-full gap-2">
                            <LayoutDashboard className="h-4 w-4" />
                            Return to Overview
                        </Button>
                    </Link>
                    <button 
                        onClick={() => window.history.back()}
                        className="w-full flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground py-2 border border-border/50 rounded-md transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );
}
