import { GoogleGenAI } from "@google/genai";

export interface FeedbackPromptInput {
    id?: number;
    type: string;
    title: string;
    description: string;
    page_url?: string | null;
    priority: string;
    sender_name?: string | null;
}

/**
 * Transforms user feedback / bug report into a complete, actionable
 * Engineering Specification & Prompt for an autonomous AI Coding Agent.
 */
export async function generateAgentPromptForFeedback(
    feedback: FeedbackPromptInput
): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are a Principal Software Architect and AI Engineering Lead for "HIM & WEROCA" marketplace analytics platform.
The project stack:
- Framework: Next.js 15+ (App Router) with React 19, TypeScript
- Styling: Tailwind CSS v4, Lucide React icons, Radix UI primitives
- Backend & DB: Next.js Route Handlers (src/app/api), PostgreSQL with connection pool (@/lib/db.ts)
- Main routes: / (Dashboard overview), /tiktok (TikTok analytics & orders), /shopee (Shopee analytics & orders), /ads (Ads ROI/ROAS), /analytics (Performance & AI analysis), /feedback (Feedback Board), /settings (Credentials & configuration)

Your task:
Analyze the submitted user feedback (bug report, feature request, or system improvement) and produce a comprehensive, battle-ready Developer Specification & Prompt specifically crafted for an autonomous AI Coding Agent (e.g., Antigravity, Claude Code, Cursor) to execute directly without confusion.

Structure of the output:
# Task Specification: [Action-oriented title]

## 1. Overview & Business Context
- User/Reporter: [Sender Name]
- Priority: [Priority] | Type: [Type]
- Problem / Feature Requirement summary based on user description.

## 2. Affected System Areas & Probable Target Files
- Captured Page: \`${feedback.page_url || "/"}\`
- Probable frontend files (e.g., \`src/app/...\`, \`src/components/...\`)
- Probable backend/API files (e.g., \`src/app/api/...\`, \`src/lib/...\`)
- Database migrations or table changes if needed.

## 3. Step-by-Step Implementation Plan
- Step 1: Database / Schema (if applicable)
- Step 2: API Route / Server Action updates
- Step 3: Frontend UI & State management updates
- Step 4: Edge cases & error handling

## 4. Technical Constraints & Code Standards
- Strict TypeScript types (no loose \`any\`)
- Preserve existing Tailwind styling and dark/light mode consistency
- Use existing database helper: \`import { query } from '@/lib/db';\`
- Non-breaking changes: maintain backwards compatibility for existing APIs

## 5. Acceptance Criteria & Verification Steps
- Concrete checklist of verifiable outcomes
- Manual verification steps to test the implementation

Write in English with clear technical precision. Output ONLY the clean Markdown specification, ready to paste into an AI agent prompt.`;

    const userMessage = `Here is the user feedback ticket:
${feedback.id ? `- Ticket ID: #${feedback.id}` : ""}
- Feedback Type: ${feedback.type}
- Priority: ${feedback.priority}
- Title: ${feedback.title}
- Details / Description: ${feedback.description}
- Page URL: ${feedback.page_url || "/"}
- Submitted by: ${feedback.sender_name || "Tester"}

Please generate the comprehensive AI Coding Agent specification prompt now:`;

    const candidateModels = ["gemini-3-flash-preview", "gemini-3.8-flash", "gemini-2.5-flash-preview"];
    let lastError: any = null;

    for (const model of candidateModels) {
        try {
            const response = await ai.models.generateContent({
                model,
                contents: [
                    {
                        role: "user",
                        parts: [{ text: `${systemPrompt}\n\n${userMessage}` }],
                    },
                ],
            });

            if (response.text && response.text.trim()) {
                return response.text.trim();
            }
        } catch (err: any) {
            console.warn(`[feedback-ai] Model ${model} failed, attempting next model:`, err.message);
            lastError = err;
        }
    }

    throw new Error(lastError?.message || "Failed to generate AI agent prompt with available Gemini models.");
}
