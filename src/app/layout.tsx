import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";
import { Providers } from "@/components/Providers";
import { LiteModeProvider } from "@/context/LiteModeContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HIM Marketplace Tracking - Shopee, TikTok & Meta Analytics",
  description: "Advanced real-time analytics dashboard for TikTok Shop, Shopee, and Meta Ads. Monitor your sales, ad spend, and overall store performance in one unified platform.",
  alternates: {
    canonical: "https://temp-marketplace.vercel.app/",
  },
  openGraph: {
    title: "HIM Marketplace Tracking - Shopee, TikTok & Meta Analytics",
    description: "Advanced real-time analytics dashboard for TikTok Shop, Shopee, and Meta Ads. Monitor your sales, ad spend, and overall store performance in one unified platform.",
    url: "https://temp-marketplace.vercel.app/",
    siteName: "HIM Marketplace Tracking",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HIM Marketplace Tracking - Shopee, TikTok & Meta Analytics",
    description: "Advanced real-time analytics dashboard for TikTok Shop, Shopee, and Meta Ads. Monitor your sales, ad spend, and overall store performance in one unified platform.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  if (saved === 'light' || (!saved && !window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                  if (localStorage.getItem('him_lite_mode') === 'true') {
                    document.documentElement.classList.add('lite-mode');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body className={`${inter.className} antialiased bg-background text-foreground`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">
          Skip to content
        </a>
        <Providers>
          <LiteModeProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </LiteModeProvider>
        </Providers>
      </body>
    </html>
  );
}
