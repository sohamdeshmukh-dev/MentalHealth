"use client";
import { useState, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const router = useRouter();

    const supabase = useMemo(() => createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), []);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                router.refresh();
                router.push('/');
            }
        });

        return () => subscription.unsubscribe();
    }, [router, supabase.auth]);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
            // onAuthStateChange will handle redirection
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : 'An error occurred during authentication');
        } finally {
            setLoading(false);
        }
    };

    const handleOAuth = async (provider: 'google' | 'facebook') => {
        await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#050913] p-4 text-slate-200">
            <div className="w-full max-w-md rounded-[24px] border border-slate-800 bg-[#0A0F1C] p-8 shadow-2xl">
                <h1 className="mb-2 text-2xl font-bold text-white">MentalMap Dashboard</h1>
                <p className="mb-8 text-sm text-slate-400">
                    {isSignUp ? 'Create an account to join the anonymous network.' : 'Sign in to access anonymous location-based analytics.'}
                </p>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-300">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 p-2.5 text-slate-100 placeholder-slate-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="admin@example.com"
                        />
                    </div>
                    <div>
                        <div className="mb-1 flex items-center justify-between">
                            <label className="block text-sm font-medium text-slate-300">Password</label>
                            <a href="#" className="text-xs font-medium text-indigo-400 hover:text-indigo-300">
                                Forgot password?
                            </a>
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 p-2.5 text-slate-100 placeholder-slate-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="••••••••"
                        />
                    </div>

                    {!isSignUp && (
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-400">
                                Remember me
                            </label>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? (isSignUp ? 'Signing up...' : 'Signing in...') : (isSignUp ? 'Sign Up' : 'Sign In')}
                    </button>
                </form>

                <p className="mt-4 text-center text-sm text-slate-400">
                    {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="font-medium text-indigo-400 hover:text-indigo-300 focus:outline-none"
                    >
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                </p>

                <div className="relative mt-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-800"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="bg-[#0A0F1C] px-2 text-slate-500">Or continue with</span>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                        onClick={() => handleOAuth('google')}
                        className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-1.02 7.28-2.76l-3.57-2.77c-.99.66-2.25 1.05-3.71 1.05-2.85 0-5.27-1.92-6.13-4.51H2.18v2.86C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.87 14.01c-.22-.66-.35-1.37-.35-2.01s.13-1.35.35-2.01V7.13H2.18C1.43 8.62 1 10.25 1 12s.43 3.38 1.18 4.87l3.69-2.86z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.13l3.69 2.86c.86-2.59 3.28-4.61 6.13-4.61z" />
                        </svg>
                        Google
                    </button>
                    <button
                        onClick={() => handleOAuth('facebook')}
                        className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
                    >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-1.11 9-5.53 9-11.05z" />
                        </svg>
                        Facebook
                    </button>
                </div>
            </div>
        </div>
    );
}
