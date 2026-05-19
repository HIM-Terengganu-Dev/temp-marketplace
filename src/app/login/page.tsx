"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Globe, HelpCircle, BarChart3, Activity, PieChart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
        setError("You must accept the Terms of Use and Privacy Policy.");
        return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password");
      } else {
        // If remember me is set, we can store a cookie or state (handled by NextAuth or custom if needed, but visually fully functional as standard login flow)
        if (rememberMe) {
          localStorage.setItem("remembered_email", email);
        } else {
          localStorage.removeItem("remembered_email");
        }
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill remembered email if present
  useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("remembered_email");
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    }
  });

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row bg-background text-foreground absolute inset-0 z-50">
      
      {/* Top Right Utility (Visible primarily on desktop, positioned absolutely over the right panel) */}
      <div className="absolute top-6 right-8 z-10 flex items-center gap-4 text-sm font-medium text-muted-foreground hidden lg:flex">
        <button className="flex items-center gap-2 hover:text-foreground transition-colors">
            <HelpCircle className="w-4 h-4" />
            Help
        </button>
        <button className="flex items-center gap-2 hover:text-foreground transition-colors">
            <Globe className="w-4 h-4" />
            English
        </button>
      </div>

      {/* Left Panel: Feature Showcase */}
      <section className="relative hidden lg:flex w-full lg:w-1/2 flex-col justify-center items-center p-12 bg-muted/30 border-r border-border/50">
        
        {/* Header Area: Logo Placeholder */}
        <div className="absolute top-8 left-10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight">HIM Tracking</span>
        </div>

        <div className="w-full max-w-lg space-y-10">
            {/* Text Hierarchy */}
            <div className="space-y-3">
                <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
                    Data-driven insights <br /> for your business.
                </h1>
                <p className="text-lg text-muted-foreground">
                    Monitor your sales, ad spend, and overall performance across all your stores in one unified dashboard.
                </p>
            </div>

            {/* Visual Dashboard Preview Mockup */}
            <div className="relative w-full aspect-[4/3] rounded-xl bg-card border border-border shadow-xl overflow-hidden flex flex-col">
                {/* Mockup Header */}
                <div className="h-10 w-full border-b border-border bg-muted/40 flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-destructive/60" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                
                {/* Mockup Body */}
                <div className="flex-1 flex p-4 gap-4">
                    {/* Left Graphic Area */}
                    <div className="w-1/2 bg-muted/30 rounded-lg border border-border/50 flex items-center justify-center p-4">
                        <PieChart className="w-full h-full max-w-[120px] max-h-[120px] text-primary/20" />
                    </div>
                    {/* Right Status Badges / List Area */}
                    <div className="w-1/2 flex flex-col gap-3">
                        <div className="h-8 w-full bg-muted/40 rounded border border-border/50 animate-pulse" />
                        <div className="h-8 w-[80%] bg-muted/40 rounded border border-border/50 animate-pulse" />
                        <div className="h-8 w-[90%] bg-muted/40 rounded border border-border/50 animate-pulse" />
                        <div className="h-8 w-[60%] bg-muted/40 rounded border border-border/50 animate-pulse" />
                    </div>
                </div>

                {/* Overlapping Pop-up Card */}
                <div className="absolute -bottom-4 -right-4 w-[60%] bg-background border border-border shadow-2xl rounded-xl p-5 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        Live Metrics
                    </h3>
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Revenue</span>
                            <span className="font-bold">RM 45,231</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Active Campaigns</span>
                            <span className="font-bold">12</span>
                        </div>
                    </div>
                    <Button size="sm" className="w-full text-xs h-8">
                        View Full Report <ArrowRight className="w-3 h-3 ml-2" />
                    </Button>
                </div>
            </div>

            {/* Carousel Indicators */}
            <div className="flex justify-center gap-2 pt-4">
                <div className="w-6 h-1.5 rounded-full bg-primary" />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>
        </div>
      </section>

      {/* Right Panel: Authentication Form */}
      <section className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12">
        
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="w-full flex justify-between items-center mb-12 lg:hidden">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <BarChart3 className="w-3 h-3 text-primary" />
                </div>
                <span className="font-bold tracking-tight">HIM</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <HelpCircle className="w-4 h-4" />
                <Globe className="w-4 h-4" />
            </div>
        </div>

        <div className="w-full max-w-md">
            <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight">Log In</h2>
                <p className="text-muted-foreground mt-2 text-sm">Enter your account details to continue.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="p-3 rounded-md bg-destructive/15 text-destructive text-sm font-medium">
                        {error}
                    </div>
                )}

                {/* Identifier Field */}
                <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="identifier">Email or Username</label>
                    <input
                        id="identifier"
                        type="email"
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="password">Password</label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 pr-10 transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Remember Me & Terms & Agreement Checkboxes */}
                <div className="space-y-3 pt-2">
                    {/* Remember Me Checkbox */}
                    <label className="flex items-center gap-3 cursor-pointer group w-fit">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <div className="w-4 h-4 rounded border border-input peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-checked:bg-primary peer-checked:border-primary flex items-center justify-center transition-all">
                                {rememberMe && <div className="w-2 h-2 bg-primary-foreground rounded-sm" />}
                            </div>
                        </div>
                        <span className="text-sm text-muted-foreground leading-none font-medium select-none">
                            Remember me
                        </span>
                    </label>

                    {/* Terms & Agreement Checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="mt-0.5">
                            <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                            />
                            <div className="w-4 h-4 rounded border border-input peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-checked:bg-primary peer-checked:border-primary flex items-center justify-center transition-all">
                                {termsAccepted && <div className="w-2 h-2 bg-primary-foreground rounded-sm" />}
                            </div>
                        </div>
                        <span className="text-sm text-muted-foreground leading-snug select-none">
                            By logging in, you agree to our{" "}
                            <a href="#" className="text-primary hover:underline font-medium">Terms of Use</a>
                            {" "}and{" "}
                            <a href="#" className="text-primary hover:underline font-medium">Privacy Policy</a>.
                        </span>
                    </label>
                </div>

                {/* Action Button */}
                <div className="pt-4">
                    <Button 
                        className="w-full h-11 text-base font-semibold" 
                        type="submit" 
                        disabled={loading}
                    >
                        {loading ? "Logging in..." : "Log In"}
                    </Button>
                </div>
            </form>
        </div>
      </section>

    </main>
  );
}
