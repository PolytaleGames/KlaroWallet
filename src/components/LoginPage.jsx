import React, { useState } from 'react';
import { Mail, Lock, Loader2, LogIn, UserPlus, FolderOpen, Eye, EyeOff, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const LoginPage = () => {
    const { signIn, signUp, loginAsGuest } = useAuth();
    const { t, i18n } = useTranslation();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); // New State
    const [showPassword, setShowPassword] = useState(false); // New State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'fr' : 'en';
        i18n.changeLanguage(newLang);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await signIn(email, password);
                // Redirect/App state change happens automatically via AuthContext -> App.jsx
            } else {
                // Validation for Sign Up
                if (password !== confirmPassword) {
                    throw new Error("Passwords do not match");
                }
                if (password.length < 6) {
                    throw new Error("Password must be at least 6 characters");
                }
                await signUp(email, password);
                setError('Account created! Please check your email to confirm before logging in.');
                setIsLogin(true); // Switch back to login for UX
            }
        } catch (err) {
            console.error(err);
            setError(err.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 transition-colors duration-500">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-300">

                {/* Branding Header */}
                <div className="bg-slate-900 dark:bg-indigo-600 p-8 text-center relative overflow-hidden">
                    {/* Language Toggle */}
                    <button
                        onClick={toggleLanguage}
                        className="absolute top-4 right-4 z-20 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-sm transition-all flex items-center gap-1.5 text-xs font-bold"
                    >
                        <Globe size={14} />
                        {i18n.language?.toUpperCase() || 'EN'}
                    </button>

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-black/20">
                            <span className="text-3xl font-bold text-slate-900">K</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-1">KlaroWallet</h1>
                        <p className="text-slate-300 text-sm">Your Personal Finance Fortress</p>
                    </div>

                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2 blur-xl"></div>
                    </div>
                </div>

                {/* Form */}
                <div className="p-8">
                    {error && (
                        <div className="mb-6 p-3 text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900 rounded-lg">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {!isLogin && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`w-full pl-10 pr-4 py-3 rounded-xl border ${confirmPassword && confirmPassword !== password ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'} bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:border-transparent outline-none transition-all`}
                                        placeholder="••••••••"
                                        minLength={6}
                                    />
                                </div>
                                {confirmPassword && confirmPassword !== password && (
                                    <p className="text-xs text-rose-500 font-medium">Passwords do not match</p>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-slate-900 dark:bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                isLogin ? <><LogIn size={20} /> Access Dashboard</> : <><UserPlus size={20} /> Create Account</>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-4 justify-center items-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium transition-colors"
                        >
                            {isLogin ? "No account yet? Create one" : "Already have an account? Log In"}
                        </button>

                        <button
                            onClick={() => {
                                setLoading(true);
                                // Small artificial delay for UX
                                setTimeout(() => {
                                    loginAsGuest();
                                    setLoading(false);
                                }, 500);
                            }}
                            className="text-xs text-indigo-500 hover:text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-full transition-colors"
                        >
                            ✨ Try Demo Mode (No Setup)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
