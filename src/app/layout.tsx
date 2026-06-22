import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";
import { Providers } from "@/components/Providers";
import { LiteModeProvider } from "@/context/LiteModeContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HIM Marketplace Tracking",
  description: "Advanced analytics dashboard for TikTok, Shopee, and Meta.",
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
