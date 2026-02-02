import React, { useState, useEffect, useMemo } from 'react';
import {
    X, CreditCard, Plus, Trash2, Check, Wallet, ArrowUpRight, ArrowDownLeft,
    History, AlertCircle, Loader2, ChevronLeft, TrendingUp, TrendingDown,
    Shield, Copy, CheckCircle, Eye, EyeOff, Star, Sparkles, Receipt, Zap,
    DollarSign, PieChart, ArrowRight, RefreshCcw, Lock, Unlock, Fingerprint
} from 'lucide-react';
import { toast } from 'react-toastify';
import { ApiService } from '../services/api';

// ============ TYPES ============
interface Card {
    id: string;
    type: 'uzcard' | 'humo' | 'visa' | 'mastercard';
    number: string;
    expiry: string;
    isDefault: boolean;
    holderName?: string;
}

interface Transaction {
    id: string;
    type: 'deposit' | 'withdrawal' | 'payment' | 'earning' | 'bonus' | 'refund';
    amount: number;
    description: string;
    date: string;
    status: 'success' | 'pending' | 'failed';
}

interface WalletModalProps {
    isOpen: boolean;
    onClose: () => void;
    balance: number;
    onBalanceUpdate?: (newBalance: number) => void;
    userRole?: 'customer' | 'worker';
}

// ============ CONSTANTS ============
const CARD_STYLES = {
    uzcard: { gradient: 'from-sky-500 via-blue-600 to-indigo-700', icon: '💳', label: 'UzCard' },
    humo: { gradient: 'from-emerald-400 via-green-500 to-teal-600', icon: '🏦', label: 'HUMO' },
    visa: { gradient: 'from-violet-500 via-purple-600 to-fuchsia-700', icon: '💎', label: 'VISA' },
    mastercard: { gradient: 'from-amber-500 via-orange-600 to-red-700', icon: '🔥', label: 'MC' }
};

const QUICK_AMOUNTS = [10000, 50000, 100000, 250000, 500000, 1000000];

// ============ HELPER COMPONENTS ============
const CardVisual: React.FC<{ type: keyof typeof CARD_STYLES; number: string; expiry: string; isSmall?: boolean }> =
    ({ type, number, expiry, isSmall }) => {
        const style = CARD_STYLES[type];

        if (isSmall) {
            return (
                <div className={`w-14 h-9 bg-gradient-to-br ${style.gradient} rounded-lg flex items-center justify-center shadow-lg`}>
                    <span className="text-white font-black text-xs">{style.label}</span>
                </div>
            );
        }

        return (
            <div className={`relative w-full aspect-[1.6/1] bg-gradient-to-br ${style.gradient} rounded-2xl p-4 shadow-2xl overflow-hidden`}>
                {/* Pattern */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-1/4 -right-8 w-32 h-32 bg-white rounded-full" />
                    <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white rounded-full" />
                </div>

                <div className="relative h-full flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <span className="text-2xl">{style.icon}</span>
                        <span className="text-white/80 font-bold text-sm">{style.label}</span>
                    </div>
                    <div>
                        <p className="text-white/60 text-xs mb-1">Karta raqami</p>
                        <p className="text-white font-mono text-lg tracking-widest">•••• •••• •••• {number.slice(-4)}</p>
                    </div>
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-white/60 text-[10px]">VALID THRU</p>
                            <p className="text-white font-mono text-sm">{expiry}</p>
                        </div>
                        <div className="flex gap-1">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="w-6 h-4 bg-white/30 rounded-sm" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

// ============ MAIN COMPONENT ============
export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose, balance, onBalanceUpdate, userRole }) => {
    // State
    const [cards, setCards] = useState<Card[]>(() => {
        try { return JSON.parse(localStorage.getItem('userCards') || '[]'); } catch { return []; }
    });
    const [transactions, setTransactions] = useState<Transaction[]>(() => {
        try { return JSON.parse(localStorage.getItem('userTransactions') || '[]'); } catch { return []; }
    });

    const [view, setView] = useState<'main' | 'deposit' | 'withdraw' | 'cards' | 'history'>('main');
    const [showAddCard, setShowAddCard] = useState(false);
    const [cardType, setCardType] = useState<keyof typeof CARD_STYLES>('uzcard');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showBalance, setShowBalance] = useState(true);
    const [amount, setAmount] = useState('');
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const currentUser = useMemo(() => {
        try { return JSON.parse(sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || 'null'); }
        catch { return null; }
    }, []);

    // Detect role from props or currentUser
    const role = useMemo(() => {
        if (userRole) return userRole.toLowerCase() as 'customer' | 'worker';
        if (currentUser?.role) {
            const roleStr = typeof currentUser.role === 'string'
                ? currentUser.role.toLowerCase()
                : currentUser.role;
            return roleStr as 'customer' | 'worker';
        }
        return 'customer';
    }, [userRole, currentUser]);

    const isWorker = role === 'worker';

    // Stats - different for customer and worker
    const stats = useMemo(() => {
        const now = new Date();
        const thisMonth = transactions.filter(t => new Date(t.date).getMonth() === now.getMonth());

        if (isWorker) {
            // Worker stats: earnings and withdrawals
            return {
                income: thisMonth.filter(t => ['earning', 'bonus'].includes(t.type)).reduce((s, t) => s + t.amount, 0),
                expense: thisMonth.filter(t => ['withdrawal'].includes(t.type)).reduce((s, t) => s + t.amount, 0),
                incomeLabel: 'Ishlardan daromad',
                expenseLabel: 'Yechilgan',
                count: thisMonth.length
            };
        } else {
            // Customer stats: deposits and payments
            return {
                income: thisMonth.filter(t => ['deposit', 'refund'].includes(t.type)).reduce((s, t) => s + t.amount, 0),
                expense: thisMonth.filter(t => ['payment'].includes(t.type)).reduce((s, t) => s + t.amount, 0),
                incomeLabel: 'To\'ldirilgan',
                expenseLabel: 'To\'langan',
                count: thisMonth.length
            };
        }
    }, [transactions, isWorker]);

    useEffect(() => {
        if (cards.length && !selectedCard) setSelectedCard(cards.find(c => c.isDefault) || cards[0]);
    }, [cards, selectedCard]);

    // Formatters
    const formatCard = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
    const formatExp = (v: string) => {
        const n = v.replace(/\D/g, '').slice(0, 4);
        return n.length > 2 ? `${n.slice(0, 2)}/${n.slice(2)}` : n;
    };
    const formatMoney = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : n.toString();

    // Handlers
    const addCard = () => {
        if (cardNumber.replace(/\s/g, '').length < 16) return toast.error("Karta raqami to'liq emas");
        if (cardExpiry.length < 5) return toast.error("Amal qilish muddatini kiriting");

        setIsLoading(true);
        setTimeout(() => {
            const card: Card = { id: Date.now().toString(), type: cardType, number: cardNumber, expiry: cardExpiry, isDefault: !cards.length };
            const updated = [...cards, card];
            setCards(updated);
            localStorage.setItem('userCards', JSON.stringify(updated));
            setCardNumber(''); setCardExpiry(''); setShowAddCard(false); setIsLoading(false);
            toast.success("Karta qo'shildi! ✅");
        }, 1000);
    };

    const deleteCard = (id: string) => {
        const updated = cards.filter(c => c.id !== id);
        setCards(updated);
        localStorage.setItem('userCards', JSON.stringify(updated));
        if (selectedCard?.id === id) setSelectedCard(updated[0] || null);
        toast.info("Karta o'chirildi");
    };

    const setDefault = (id: string) => {
        const updated = cards.map(c => ({ ...c, isDefault: c.id === id }));
        setCards(updated);
        localStorage.setItem('userCards', JSON.stringify(updated));
        toast.success("Asosiy karta tanlandi ⭐");
    };

    const processTransaction = async (type: 'deposit' | 'withdrawal') => {
        const amt = Number(amount);
        if (type === 'deposit' && amt < 1000) return toast.error("Minimal: 1,000 UZS");
        if (type === 'withdrawal' && amt < 10000) return toast.error("Minimal: 10,000 UZS");
        if (type === 'withdrawal' && amt > balance) return toast.error("Yetarli mablag' yo'q");
        if (!selectedCard) return toast.error("Karta tanlang");

        setIsProcessing(true);
        await new Promise(r => setTimeout(r, 1500));

        const newBalance = type === 'deposit' ? balance + amt : balance - amt;

        if (currentUser) {
            await ApiService.updateUser(currentUser.id, { balance: newBalance } as any);
            const updated = { ...currentUser, balance: newBalance };
            sessionStorage.setItem('currentUser', JSON.stringify(updated));
            localStorage.setItem('currentUser', JSON.stringify(updated));
        }

        const tx: Transaction = {
            id: Date.now().toString(),
            type,
            amount: amt,
            description: type === 'deposit' ? `To'ldirish (${selectedCard.type.toUpperCase()})` : `Yechish (****${selectedCard.number.slice(-4)})`,
            date: new Date().toISOString(),
            status: 'success'
        };
        const updatedTx = [tx, ...transactions];
        setTransactions(updatedTx);
        localStorage.setItem('userTransactions', JSON.stringify(updatedTx));

        setIsProcessing(false);
        setAmount('');
        onBalanceUpdate?.(newBalance);
        toast.success(type === 'deposit' ? `✅ +${amt.toLocaleString()} UZS` : `✅ -${amt.toLocaleString()} UZS`);
        setView('main');
    };

    if (!isOpen) return null;

    // Render helpers
    const isPositive = (t: Transaction['type']) => ['deposit', 'earning', 'bonus', 'refund'].includes(t);

    return (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-2xl flex flex-col">
            {/* ===== CONTAINER ===== */}
            <div className="flex-1 flex flex-col max-h-[100dvh] overflow-hidden bg-gradient-to-b from-slate-900 via-gray-900 to-black">

                {/* ===== HEADER ===== */}
                <header className="shrink-0 relative">
                    {/* Glow Effects */}
                    <div className="absolute -top-20 -left-20 w-60 h-60 bg-emerald-500/30 rounded-full blur-[100px]" />
                    <div className="absolute -top-10 right-0 w-40 h-40 bg-teal-400/20 rounded-full blur-[80px]" />

                    <div className="relative px-5 pt-6 pb-8">
                        {/* Top Bar */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl blur-lg opacity-60" />
                                    <div className="relative p-3 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-xl">
                                        <Wallet size={24} className="text-white" />
                                    </div>
                                </div>
                                <div>
                                    <h1 className="text-xl font-black text-white tracking-tight">Hamyon</h1>
                                    <p className="text-xs text-emerald-300/60 font-medium">
                                        {isWorker ? 'Daromad va yechish' : 'Buyurtmalar uchun balans'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all active:scale-90"
                            >
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        {/* Balance Card */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[32px] blur-2xl opacity-40" />
                            <div className="relative bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 rounded-[32px] p-6 shadow-2xl border border-white/20 overflow-hidden">
                                {/* Decorative */}
                                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                                <div className="absolute top-1/2 left-1/2 w-full h-full bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-1/2 -translate-y-1/2 rotate-45" />

                                <div className="relative">
                                    {/* Label + Eye */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={14} className="text-yellow-300" />
                                            <span className="text-sm text-white/80 font-semibold">Umumiy balans</span>
                                        </div>
                                        <button
                                            onClick={() => setShowBalance(!showBalance)}
                                            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                                        >
                                            {showBalance ? <Eye size={16} className="text-white/80" /> : <EyeOff size={16} className="text-white/80" />}
                                        </button>
                                    </div>

                                    {/* Amount */}
                                    <div className="flex items-baseline gap-3 mb-6">
                                        <span className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-lg">
                                            {showBalance ? balance.toLocaleString('uz-UZ') : '••••••••'}
                                        </span>
                                        <span className="text-lg font-bold text-white/60">UZS</span>
                                    </div>

                                    {/* Actions - Different for customer and worker */}
                                    {isWorker ? (
                                        /* Worker: Both deposit and withdraw */
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => { setView('deposit'); setAmount(''); }}
                                                className="flex items-center justify-center gap-2.5 py-4 bg-white/15 text-white font-black rounded-2xl border border-white/20 backdrop-blur-sm hover:bg-white/25 transition-all active:scale-[0.98]"
                                            >
                                                <ArrowDownLeft size={20} strokeWidth={2.5} />
                                                <span>To'ldirish</span>
                                            </button>
                                            <button
                                                onClick={() => { setView('withdraw'); setAmount(''); }}
                                                className="flex items-center justify-center gap-2.5 py-4 bg-white text-emerald-700 font-black rounded-2xl shadow-xl shadow-black/20 hover:shadow-2xl hover:scale-[1.02] transition-all active:scale-[0.98]"
                                            >
                                                <ArrowUpRight size={20} strokeWidth={2.5} />
                                                <span>Yechish</span>
                                            </button>
                                        </div>
                                    ) : (
                                        /* Customer: Only deposit */
                                        <button
                                            onClick={() => { setView('deposit'); setAmount(''); }}
                                            className="w-full flex items-center justify-center gap-2.5 py-4 bg-white text-emerald-700 font-black rounded-2xl shadow-xl shadow-black/20 hover:shadow-2xl hover:scale-[1.02] transition-all active:scale-[0.98]"
                                        >
                                            <ArrowDownLeft size={20} strokeWidth={2.5} />
                                            <span>Balansni to'ldirish</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* ===== CONTENT ===== */}
                <main className="flex-1 overflow-y-auto overscroll-contain px-5 pb-32">

                    {/* MAIN VIEW */}
                    {view === 'main' && (
                        <div className="space-y-5 pt-3">
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-4 border border-slate-700/50">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                                            <TrendingUp size={14} className="text-emerald-400" />
                                        </div>
                                        <span className="text-xs text-slate-400 font-semibold">{stats.incomeLabel}</span>
                                    </div>
                                    <p className="text-2xl font-black text-emerald-400">+{formatMoney(stats.income)}</p>
                                </div>
                                <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-4 border border-slate-700/50">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className={`p-1.5 ${isWorker ? 'bg-blue-500/20' : 'bg-rose-500/20'} rounded-lg`}>
                                            {isWorker ? (
                                                <ArrowUpRight size={14} className="text-blue-400" />
                                            ) : (
                                                <TrendingDown size={14} className="text-rose-400" />
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-400 font-semibold">{stats.expenseLabel}</span>
                                    </div>
                                    <p className={`text-2xl font-black ${isWorker ? 'text-blue-400' : 'text-rose-400'}`}>-{formatMoney(stats.expense)}</p>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setView('cards')}
                                    className="group bg-slate-800/60 hover:bg-slate-700/60 rounded-2xl p-4 border border-slate-700/50 flex items-center gap-3 transition-all"
                                >
                                    <div className="p-2.5 bg-blue-500/20 rounded-xl group-hover:scale-110 transition-transform">
                                        <CreditCard size={22} className="text-blue-400" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="font-bold text-white text-sm">Kartalarim</p>
                                        <p className="text-xs text-slate-500">{cards.length} ta karta</p>
                                    </div>
                                    <ChevronLeft size={18} className="text-slate-600 rotate-180" />
                                </button>
                                <button
                                    onClick={() => setView('history')}
                                    className="group bg-slate-800/60 hover:bg-slate-700/60 rounded-2xl p-4 border border-slate-700/50 flex items-center gap-3 transition-all"
                                >
                                    <div className="p-2.5 bg-violet-500/20 rounded-xl group-hover:scale-110 transition-transform">
                                        <History size={22} className="text-violet-400" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="font-bold text-white text-sm">Tarix</p>
                                        <p className="text-xs text-slate-500">{transactions.length} ta amal</p>
                                    </div>
                                    <ChevronLeft size={18} className="text-slate-600 rotate-180" />
                                </button>
                            </div>

                            {/* Transactions */}
                            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-700/50">
                                    <h3 className="font-bold text-white text-sm">So'nggi amallar</h3>
                                    {transactions.length > 0 && (
                                        <button onClick={() => setView('history')} className="text-xs text-blue-400 font-bold flex items-center gap-1">
                                            Barchasi <ArrowRight size={12} />
                                        </button>
                                    )}
                                </div>

                                {transactions.length === 0 ? (
                                    <div className="p-10 text-center">
                                        <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Receipt size={28} className="text-slate-600" />
                                        </div>
                                        <p className="text-sm text-slate-400 font-medium">Tranzaksiyalar yo'q</p>
                                    </div>
                                ) : (
                                    <div>
                                        {transactions.slice(0, 4).map((tx, i) => (
                                            <div key={tx.id} className={`px-4 py-3.5 flex items-center justify-between ${i < 3 ? 'border-b border-slate-800/50' : ''}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2.5 rounded-xl ${isPositive(tx.type) ? 'bg-emerald-500/15' : 'bg-rose-500/15'}`}>
                                                        {isPositive(tx.type)
                                                            ? <ArrowDownLeft size={18} className="text-emerald-400" />
                                                            : <ArrowUpRight size={18} className="text-rose-400" />
                                                        }
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-white text-sm line-clamp-1">{tx.description}</p>
                                                        <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString('uz-UZ')}</p>
                                                    </div>
                                                </div>
                                                <span className={`font-black text-sm ${isPositive(tx.type) ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {isPositive(tx.type) ? '+' : '-'}{tx.amount.toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Security */}
                            <div className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                <Shield size={20} className="text-blue-400 shrink-0" />
                                <p className="text-xs text-blue-200/80">Barcha tranzaksiyalar xavfsiz va 256-bit shifrlangan</p>
                            </div>
                        </div>
                    )}

                    {/* DEPOSIT VIEW */}
                    {view === 'deposit' && (
                        <div className="space-y-5 pt-3">
                            <button onClick={() => setView('main')} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
                                <ChevronLeft size={18} /> Orqaga
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-emerald-500/20 rounded-2xl">
                                    <ArrowDownLeft size={24} className="text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white">Balansni to'ldirish</h2>
                                    <p className="text-xs text-slate-400">
                                        {isWorker ? 'Shaxsiy balans' : 'Buyurtmalar uchun'}
                                    </p>
                                </div>
                            </div>

                            {/* Amount */}
                            <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50">
                                <label className="text-sm text-slate-400 font-semibold mb-3 block">Summa</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full py-5 bg-slate-900/80 border border-slate-600/50 rounded-2xl text-4xl font-black text-center text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none placeholder:text-slate-700"
                                />
                            </div>

                            {/* Quick */}
                            <div>
                                <p className="text-xs text-slate-500 font-semibold mb-3">Tez tanlash</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {QUICK_AMOUNTS.map(amt => (
                                        <button
                                            key={amt}
                                            onClick={() => setAmount(amt.toString())}
                                            className={`py-3.5 rounded-xl font-black text-sm transition-all active:scale-95 ${Number(amount) === amt
                                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                                : 'bg-slate-800/80 text-slate-300 border border-slate-700/50 hover:bg-slate-700/80'
                                                }`}
                                        >
                                            {formatMoney(amt)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Card */}
                            <div>
                                <p className="text-sm text-slate-400 font-semibold mb-3">Karta</p>
                                {cards.length === 0 ? (
                                    <button
                                        onClick={() => setShowAddCard(true)}
                                        className="w-full p-6 border-2 border-dashed border-slate-600 rounded-2xl text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus size={22} />
                                        <span className="font-bold">Karta qo'shish</span>
                                    </button>
                                ) : (
                                    <div className="space-y-2">
                                        {cards.map(card => (
                                            <button
                                                key={card.id}
                                                onClick={() => setSelectedCard(card)}
                                                className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${selectedCard?.id === card.id
                                                    ? 'border-emerald-500 bg-emerald-500/10'
                                                    : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600'
                                                    }`}
                                            >
                                                <CardVisual type={card.type} number={card.number} expiry={card.expiry} isSmall />
                                                <div className="flex-1 text-left">
                                                    <p className="font-mono text-white font-bold">•••• {card.number.slice(-4)}</p>
                                                    <p className="text-xs text-slate-500">{CARD_STYLES[card.type].label}</p>
                                                </div>
                                                {selectedCard?.id === card.id && <CheckCircle size={22} className="text-emerald-400" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Submit */}
                            <button
                                onClick={() => processTransaction('deposit')}
                                disabled={isProcessing || !amount || Number(amount) < 1000 || !selectedCard}
                                className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/25 disabled:opacity-50 flex items-center justify-center gap-3 hover:shadow-2xl transition-all active:scale-[0.98]"
                            >
                                {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <><ArrowDownLeft size={22} /> To'ldirish</>}
                            </button>
                        </div>
                    )}

                    {/* WITHDRAW VIEW - Only for workers */}
                    {view === 'withdraw' && (
                        <div className="space-y-5 pt-3">
                            <button onClick={() => setView('main')} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
                                <ChevronLeft size={18} /> Orqaga
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-500/20 rounded-2xl">
                                    <ArrowUpRight size={24} className="text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white">Daromadni yechish</h2>
                                    <p className="text-xs text-slate-400">Ishlardan topilgan mablag'</p>
                                </div>
                            </div>

                            {/* Balance */}
                            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Mavjud daromad</p>
                                    <p className="text-2xl font-black text-white">{balance.toLocaleString()} <span className="text-sm text-slate-400">UZS</span></p>
                                </div>
                                <button
                                    onClick={() => setAmount(balance.toString())}
                                    className="px-5 py-3 bg-blue-500/20 text-blue-400 font-black rounded-xl hover:bg-blue-500/30 transition-all"
                                >
                                    Barchasi
                                </button>
                            </div>

                            {/* Amount */}
                            <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50">
                                <label className="text-sm text-slate-400 font-semibold mb-3 block">Yechish summasi</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0"
                                    max={balance}
                                    className="w-full py-5 bg-slate-900/80 border border-slate-600/50 rounded-2xl text-4xl font-black text-center text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder:text-slate-700"
                                />
                            </div>

                            {/* Card */}
                            <div>
                                <p className="text-sm text-slate-400 font-semibold mb-3">Qaysi kartaga</p>
                                {cards.length === 0 ? (
                                    <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex items-center gap-3">
                                        <AlertCircle size={22} className="text-amber-400" />
                                        <span className="text-sm text-amber-200 font-medium">Avval karta qo'shing</span>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {cards.map(card => (
                                            <button
                                                key={card.id}
                                                onClick={() => setSelectedCard(card)}
                                                className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${selectedCard?.id === card.id
                                                    ? 'border-blue-500 bg-blue-500/10'
                                                    : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600'
                                                    }`}
                                            >
                                                <CardVisual type={card.type} number={card.number} expiry={card.expiry} isSmall />
                                                <div className="flex-1 text-left">
                                                    <p className="font-mono text-white font-bold">•••• {card.number.slice(-4)}</p>
                                                    <p className="text-xs text-slate-500">{CARD_STYLES[card.type].label}</p>
                                                </div>
                                                {selectedCard?.id === card.id && <CheckCircle size={22} className="text-blue-400" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {Number(amount) > balance && (
                                <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 flex items-center gap-2">
                                    <AlertCircle size={18} className="text-rose-400" />
                                    <span className="text-sm text-rose-200">Yetarli mablag' yo'q</span>
                                </div>
                            )}

                            <button
                                onClick={() => processTransaction('withdrawal')}
                                disabled={isProcessing || !amount || Number(amount) < 10000 || Number(amount) > balance || !selectedCard}
                                className="w-full py-5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-3 hover:shadow-2xl transition-all active:scale-[0.98]"
                            >
                                {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <><ArrowUpRight size={22} /> Yechish</>}
                            </button>
                            <p className="text-xs text-slate-500 text-center">Minimal: 10,000 UZS</p>
                        </div>
                    )}

                    {/* CARDS VIEW */}
                    {view === 'cards' && (
                        <div className="space-y-5 pt-3">
                            <button onClick={() => setView('main')} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
                                <ChevronLeft size={18} /> Orqaga
                            </button>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-500/20 rounded-2xl">
                                        <CreditCard size={24} className="text-blue-400" />
                                    </div>
                                    <h2 className="text-2xl font-black text-white">Kartalarim</h2>
                                </div>
                                <button
                                    onClick={() => setShowAddCard(true)}
                                    className="px-4 py-2.5 bg-blue-500/20 text-blue-400 font-bold rounded-xl flex items-center gap-2 hover:bg-blue-500/30 transition-all"
                                >
                                    <Plus size={18} /> Qo'shish
                                </button>
                            </div>

                            {cards.length === 0 ? (
                                <div className="text-center py-20">
                                    <div className="w-24 h-24 bg-slate-800/80 rounded-full flex items-center justify-center mx-auto mb-5">
                                        <CreditCard size={48} className="text-slate-600" />
                                    </div>
                                    <p className="text-slate-400 font-bold text-lg mb-2">Karta topilmadi</p>
                                    <p className="text-sm text-slate-500 mb-6">Birinchi kartangizni qo'shing</p>
                                    <button
                                        onClick={() => setShowAddCard(true)}
                                        className="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl inline-flex items-center gap-2 hover:bg-blue-500 transition-all"
                                    >
                                        <Plus size={20} /> Karta qo'shish
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {cards.map(card => (
                                        <div key={card.id} className={`rounded-3xl overflow-hidden ${card.isDefault ? 'ring-2 ring-emerald-500' : ''}`}>
                                            <CardVisual type={card.type} number={card.number} expiry={card.expiry} />
                                            <div className={`p-4 ${card.isDefault ? 'bg-emerald-900/30' : 'bg-slate-800/80'} flex gap-2`}>
                                                {card.isDefault ? (
                                                    <div className="flex-1 py-3 bg-emerald-500/20 text-emerald-400 font-bold rounded-xl flex items-center justify-center gap-2">
                                                        <Star size={16} fill="currentColor" /> Asosiy karta
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setDefault(card.id)}
                                                        className="flex-1 py-3 bg-slate-700/50 text-slate-300 font-bold rounded-xl hover:bg-slate-600/50 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Check size={16} /> Asosiy qilish
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => deleteCard(card.id)}
                                                    className="px-4 py-3 bg-rose-500/10 text-rose-400 font-bold rounded-xl hover:bg-rose-500/20 transition-all flex items-center justify-center"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* HISTORY VIEW */}
                    {view === 'history' && (
                        <div className="space-y-5 pt-3">
                            <button onClick={() => setView('main')} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
                                <ChevronLeft size={18} /> Orqaga
                            </button>

                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-violet-500/20 rounded-2xl">
                                    <History size={24} className="text-violet-400" />
                                </div>
                                <h2 className="text-2xl font-black text-white">Tranzaksiyalar</h2>
                            </div>

                            {transactions.length === 0 ? (
                                <div className="text-center py-20">
                                    <div className="w-24 h-24 bg-slate-800/80 rounded-full flex items-center justify-center mx-auto mb-5">
                                        <History size={48} className="text-slate-600" />
                                    </div>
                                    <p className="text-slate-400 font-bold text-lg">Tranzaksiyalar yo'q</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {transactions.map(tx => (
                                        <div key={tx.id} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex items-center justify-between">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className={`p-3 rounded-xl ${isPositive(tx.type) ? 'bg-emerald-500/15' : 'bg-rose-500/15'}`}>
                                                    {isPositive(tx.type) ? <ArrowDownLeft size={20} className="text-emerald-400" /> : <ArrowUpRight size={20} className="text-rose-400" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-white text-sm truncate">{tx.description}</p>
                                                    <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleString('uz-UZ')}</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-3">
                                                <p className={`font-black ${isPositive(tx.type) ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {isPositive(tx.type) ? '+' : '-'}{tx.amount.toLocaleString()}
                                                </p>
                                                <p className="text-xs text-slate-500">UZS</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {/* ADD CARD MODAL */}
            {showAddCard && (
                <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-2xl flex items-end sm:items-center justify-center p-4">
                    <div className="w-full max-w-md bg-slate-900 rounded-3xl p-6 border border-slate-700/50 animate-slideUp">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-white">Yangi karta</h3>
                            <button onClick={() => setShowAddCard(false)} className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all">
                                <X size={18} className="text-slate-400" />
                            </button>
                        </div>

                        {/* Type */}
                        <div className="grid grid-cols-4 gap-2 mb-6">
                            {(Object.keys(CARD_STYLES) as Array<keyof typeof CARD_STYLES>).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setCardType(type)}
                                    className={`p-3 rounded-xl border-2 transition-all ${cardType === type ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700/50 bg-slate-800/60 hover:border-slate-600'
                                        }`}
                                >
                                    <div className={`w-full aspect-[1.6/1] bg-gradient-to-br ${CARD_STYLES[type].gradient} rounded-lg flex items-center justify-center`}>
                                        <span className="text-white font-black text-[10px]">{CARD_STYLES[type].label}</span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Number */}
                        <div className="mb-4">
                            <label className="text-sm text-slate-400 font-semibold mb-2 block">Karta raqami</label>
                            <input
                                type="text"
                                value={cardNumber}
                                onChange={(e) => setCardNumber(formatCard(e.target.value))}
                                maxLength={19}
                                placeholder="0000 0000 0000 0000"
                                className="w-full px-4 py-4 bg-slate-800/80 border border-slate-700/50 rounded-xl text-white text-lg tracking-widest font-mono focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-600"
                            />
                        </div>

                        {/* Expiry */}
                        <div className="mb-6">
                            <label className="text-sm text-slate-400 font-semibold mb-2 block">Amal qilish muddati</label>
                            <input
                                type="text"
                                value={cardExpiry}
                                onChange={(e) => setCardExpiry(formatExp(e.target.value))}
                                maxLength={5}
                                placeholder="OO/YY"
                                className="w-32 px-4 py-4 bg-slate-800/80 border border-slate-700/50 rounded-xl text-white text-lg tracking-widest font-mono focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-600"
                            />
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setShowAddCard(false)}
                                className="py-4 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-all"
                            >
                                Bekor
                            </button>
                            <button
                                onClick={addCard}
                                disabled={isLoading}
                                className="py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><Plus size={18} /> Qo'shish</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WalletModal;
