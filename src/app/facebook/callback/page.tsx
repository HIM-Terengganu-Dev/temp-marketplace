'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';

function FacebookCallbackContent() {
    const searchParams = useSearchParams();
    const code = searchParams.get('code');

    // States for custom user input
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [showCredentialsForm, setShowCredentialsForm] = useState(false);

    // Flow states
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [token, setToken] = useState<string>('');
    const [expiresIn, setExpiresIn] = useState<number | null>(null);
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [copied, setCopied] = useState(false);

    // OAuth Link generator states
    const [genClientId, setGenClientId] = useState('');
    const [authLink, setAuthLink] = useState('');

    // Trigger token exchange
    const exchangeToken = async (manualId?: string, manualSecret?: string) => {
        if (!code) return;
        setStatus('loading');
        setErrorMsg('');

        try {
            const response = await axios.post('/api/auth/facebook/token', {
                code,
                clientId: manualId || clientId || undefined,
                clientSecret: manualSecret || clientSecret || undefined
            });

            if (response.data?.access_token) {
                setToken(response.data.access_token);
                setExpiresIn(response.data.expires_in);
                setStatus('success');
            } else {
                throw new Error('No access token returned from exchange endpoint.');
            }
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.error || err.message || 'An error occurred during token exchange.';
            setErrorMsg(msg);
            setStatus('error');
            
            // If server-side credentials are missing, automatically open the manual override form
            if (msg.includes('Client ID') || msg.includes('configured')) {
                setShowCredentialsForm(true);
            }
        }
    };

    // Auto-trigger exchange when code is detected in URL
    useEffect(() => {
        if (code) {
            exchangeToken();
        }
    }, [code]);

    // Handle copying to clipboard
    const copyToClipboard = () => {
        if (!token) return;
        navigator.clipboard.writeText(token);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Generate OAuth auth url
    useEffect(() => {
        if (genClientId) {
            const redirectUri = 'https://temp-marketplace.vercel.app/facebook/callback';
            const scope = 'ads_read,pages_read_engagement,business_management';
            const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${genClientId.trim()}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
            setAuthLink(url);
        } else {
            setAuthLink('');
        }
    }, [genClientId]);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Ultra-premium background gradients */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[150px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 blur-[150px]" />

            <div className="w-full max-w-2xl bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 shadow-2xl rounded-3xl p-8 md:p-10 relative z-10">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl mb-4 border border-blue-500/20">
                        <svg className="w-8 h-8 text-blue-500 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                        Meta CPAS Token Center
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm">
                        Generate and exchange Facebook Developer credentials for 60-day access tokens.
                    </p>
                </div>

                {/* Status Indicator */}
                {code && (
                    <div className="mb-6 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                            <span className="text-sm font-medium text-slate-300">Auth Code Received</span>
                        </div>
                        <span className="text-xs bg-slate-900 px-2.5 py-1 rounded-md text-slate-400 font-mono select-all">
                            {code.substring(0, 12)}...
                        </span>
                    </div>
                )}

                {/* Primary Card States */}
                {status === 'idle' && !code && (
                    <div className="space-y-6">
                        <div className="bg-slate-800/20 border border-slate-800/80 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-slate-200 mb-2 flex items-center">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs mr-2 font-extrabold">1</span>
                                Generate Facebook Login URL
                            </h3>
                            <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                                Enter your **Meta App ID (Client ID)** below to generate the custom OAuth link. Make sure your Meta App has **Facebook Login for Business** or **Facebook Login** enabled with redirect URI set to:
                                <code className="block mt-2 p-2 bg-slate-950/80 rounded-lg text-xs font-mono text-violet-400 select-all border border-slate-800/50">
                                    https://temp-marketplace.vercel.app/facebook/callback
                                </code>
                            </p>

                            <div className="space-y-3">
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Meta App ID</label>
                                <input
                                    type="text"
                                    placeholder="Enter your Client ID / App ID"
                                    value={genClientId}
                                    onChange={(e) => setGenClientId(e.target.value)}
                                    className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm focus:outline-none text-slate-100 transition-colors"
                                />
                            </div>

                            {authLink && (
                                <a
                                    href={authLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-5 w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold transition-all duration-300 transform hover:scale-[1.01] shadow-lg shadow-blue-500/10 text-sm"
                                >
                                    <span>Log in with Facebook</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {status === 'loading' && (
                    <div className="text-center py-10">
                        <div className="relative w-16 h-16 mx-auto mb-6">
                            <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin" />
                            <div className="absolute inset-0 w-16 h-16 rounded-full bg-blue-500/10 blur-[10px]" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-200">Connecting Meta Graph API...</h3>
                        <p className="text-slate-400 text-sm mt-1">
                            Exchanging authorization code for long-lived 60-day access token.
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start space-x-3 text-sm">
                            <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h4 className="font-bold">Upgrade Successful!</h4>
                                <p className="text-slate-300 mt-1 text-xs leading-relaxed">
                                    Facebook verified your authorization code and returned a long-lived User Access Token. This token will remain active for **60 days** before requiring a refresh.
                                </p>
                            </div>
                        </div>

                        {/* Token Card */}
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Long-Lived FB_ACCESS_TOKEN
                            </label>
                            <div 
                                onClick={copyToClipboard}
                                className="relative bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 font-mono text-xs text-blue-400 cursor-pointer break-all select-all transition-all group max-h-[160px] overflow-y-auto"
                            >
                                {token}
                                <div className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-900 border border-slate-800 group-hover:border-slate-700 text-slate-400 group-hover:text-slate-200 transition-all">
                                    {copied ? (
                                        <span className="text-[10px] text-emerald-400 font-bold px-1">Copied!</span>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </div>

                        {expiresIn && (
                            <p className="text-xs text-slate-500">
                                Expires in: <span className="font-mono text-slate-400">{Math.round(expiresIn / 86400)} days</span> (~{(expiresIn / 3600).toFixed(0)} hours)
                            </p>
                        )}

                        {/* Instructions */}
                        <div className="bg-slate-800/10 border border-slate-800 rounded-2xl p-5">
                            <h5 className="text-sm font-bold text-slate-300 mb-2">Next Steps:</h5>
                            <ol className="list-decimal list-inside text-xs text-slate-400 space-y-2 leading-relaxed">
                                <li>Click the token box above to copy the generated access token.</li>
                                <li>Open your project's <code className="text-blue-400 font-mono">.env</code> file.</li>
                                <li>Paste the token into the <code className="text-violet-400 font-mono">FB_ACCESS_TOKEN</code> field:
                                    <pre className="mt-2 p-3 bg-slate-950/80 rounded-lg text-[11px] font-mono text-emerald-400 select-all border border-slate-900">
                                        FB_ACCESS_TOKEN="{token.substring(0, 18)}..."
                                    </pre>
                                </li>
                                <li>Save the file and restart your dev server.</li>
                            </ol>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-6">
                        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-start space-x-3 text-sm">
                            <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h4 className="font-bold">Token Exchange Failed</h4>
                                <p className="text-slate-300 mt-1 text-xs leading-relaxed">
                                    {errorMsg}
                                </p>
                            </div>
                        </div>

                        {code && (
                            <button
                                onClick={() => exchangeToken()}
                                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-all"
                            >
                                Try Again
                            </button>
                        )}
                    </div>
                )}

                {/* Manual Credentials Overlay Panel */}
                {code && (
                    <div className="mt-6 border-t border-slate-800/80 pt-6">
                        <button
                            onClick={() => setShowCredentialsForm(!showCredentialsForm)}
                            className="flex items-center justify-between w-full text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
                        >
                            <span>Override App Credentials</span>
                            <svg className={`w-4 h-4 transform transition-transform ${showCredentialsForm ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {showCredentialsForm && (
                            <div className="mt-4 p-5 rounded-2xl bg-slate-950/40 border border-slate-850/80 space-y-4 animate-slideDown">
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    If your Facebook App credentials are not defined in the server's <code className="text-blue-400">.env</code> file yet, you can input your **App ID** and **App Secret** below to exchange the code immediately:
                                </p>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Facebook App ID (Client ID)</label>
                                        <input
                                            type="text"
                                            placeholder="Enter Client ID"
                                            value={clientId}
                                            onChange={(e) => setClientId(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Facebook App Secret (Client Secret)</label>
                                        <input
                                            type="password"
                                            placeholder="Enter Client Secret"
                                            value={clientSecret}
                                            onChange={(e) => setClientSecret(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => exchangeToken(clientId, clientSecret)}
                                    disabled={!clientId || !clientSecret}
                                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white text-xs font-semibold transition-all transform active:scale-95"
                                >
                                    Exchange and Upgrade Token
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function FacebookCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
                <div className="w-10 h-10 rounded-full border-4 border-slate-800 border-t-blue-500 animate-spin" />
            </div>
        }>
            <FacebookCallbackContent />
        </Suspense>
    );
}
