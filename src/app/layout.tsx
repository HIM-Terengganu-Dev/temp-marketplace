import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

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
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased bg-background text-foreground`}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-y-auto relative">
            <Header />
            <main className="p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
