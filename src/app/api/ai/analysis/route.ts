import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { 
          error: "API_KEY_MISSING",
          message: "GEMINI_API_KEY environment variable is not set. Please add it to your .env.local file to enable AI analysis." 
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { startDate, endDate, activePreset, totals, shops, comparison } = body;

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an expert e-commerce data analyst for "HIM & WEROCA" marketplace shops. 
Analyze the performance data below and provide a concise, high-impact business analysis in simple, non-technical Malay (Bahasa Melayu yang mudah difahami, santai, dan tiada istilah teknikal yang rumit).

Date Range: ${startDate} to ${endDate} (${activePreset})

Overall Performance Totals:
- Total Revenue/GMV: RM ${totals.revenue.toFixed(2)} (change: ${comparison.gmv.toFixed(1)}%)
- Total Ad Spend: RM ${totals.spend.toFixed(2)} (change: ${comparison.spend.toFixed(1)}%)
- Overall ROAS: ${totals.roas.toFixed(2)}x (change: ${comparison.roas.toFixed(1)}%)
- Total COGS: RM ${totals.cogs.toFixed(2)}
- Net Profit: RM ${totals.profit.toFixed(2)}
- Net Margin: ${totals.margin.toFixed(1)}%

Shop-by-Shop Performance Breakdown:
${shops.map((s: any) => `
- ${s.name} (${s.platform}):
  * Status: ${s.status}
  * Revenue: RM ${(s.revenue || 0).toFixed(2)} ${s.change?.gmv ? `(change: ${s.change.gmv.toFixed(1)}%)` : ''}
  * Ad Spend: RM ${(s.spend || 0).toFixed(2)} ${s.change?.spend ? `(change: ${s.change.spend.toFixed(1)}%)` : ''}
  * ROAS: ${(s.roas || 0).toFixed(2)}x ${s.change?.roas ? `(change: ${s.change.roas.toFixed(1)}%)` : ''}
  * Orders: ${s.orders || 0} ${s.change?.orders ? `(change: ${s.change.orders.toFixed(1)}%)` : ''}
`).join('\n')}

Format your response in professional, beautiful, and highly scannable Markdown:
1. Write entirely in non-technical Malay (Bahasa Melayu biasa/mudah). Avoid complex English or financial jargon (e.g., use terms like "untung bersih", "modal iklan", "kos barang").
2. Use brief headings and lists.
3. Provide a **Ringkasan Prestasi** (1-2 sentences).
4. Highlight **Kejayaan Utama** (which shop/metric performed best).
5. Identify **Masalah Kritikal & Kebocoran Wang** (e.g. low ROAS, high spend, drop in sales).
6. Give **3 Cadangan Tindakan** for immediate execution to improve profitability/ROAS.

Be direct, objective, and action-oriented. Keep the analysis short enough to read in 30 seconds. Do not mention that you are an AI.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return NextResponse.json({ analysis: response.text });
  } catch (error: any) {
    console.error("AI Analysis error:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message || "Failed to generate AI analysis." },
      { status: 500 }
    );
  }
}
