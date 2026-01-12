import React, { useState, useEffect } from 'react';
import { X, CreditCard, Plus, Trash2, Check, ChevronRight, Wallet, ArrowUpRight, ArrowDownLeft, History, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { ApiService } from '../services/api';

interface Card {
    id: string;
    type: 'uzcard' | 'humo' | 'visa';
    number: string;
    expiry: string;
    isDefault: boolean;
}

interface Transaction {
    id: string;
    type: 'deposit' | 'withdrawal' | 'payment' | 'earning';
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
}

// Karta logolari
const cardLogos = {
    uzcard: (
        <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">UzCard</span>
        </div>
    ),
    humo: (
        <div className="w-12 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">HUMO</span>
        </div>
    ),
    visa: (
        <div className="w-12 h-8 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold italic">VISA</span>
        </div>
    ),
};

const quickAmounts = [50000, 100000, 200000, 500000, 1000000];

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose, balance, onBalanceUpdate }) => {
    const [cards, setCards] = useState<Card[]>(() => {
        const saved = localStorage.getItem('userCards');
        return saved ? JSON.parse(saved) : [];
    });
    const [transactions, setTransactions] = useState<Transaction[]>(() => {
        const saved = localStorage.getItem('userTransactions');
        return saved ? JSON.parse(saved) : [];
    });
    const [activeTab, setActiveTab] = useState<'main' | 'deposit' | 'withdraw' | 'cards' | 'history'>('main');
    const [showAddCard, setShowAddCard] = useState(false);
    const [selectedCardType, setSelectedCardType] = useState<'uzcard' | 'humo' | 'visa'>('uzcard');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Deposit/Withdraw states
    const [amount, setAmount] = useState('');
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

    useEffect(() => {
        if (cards.length > 0 && !selectedCard) {
            setSelectedCard(cards.find(c => c.isDefault) || cards[0]);
        }
    }, [cards]);

    // Karta raqamini formatlash
    const formatCardNumber = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = (matches && matches[0]) || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        return parts.length ? parts.join(' ') : value;
    };

    // Amal qilish muddatini formatlash
    const formatExpiry = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        if (v.length >= 2) {
            return v.substring(0, 2) + '/' + v.substring(2, 4);
        }
        return v;
    };

    // Karta qo'shish
    const handleAddCard = () => {
        if (cardNumber.replace(/\s/g, '').length < 16) {
            toast.error("Karta raqami to'liq emas");
            return;
        }
        if (cardExpiry.length < 5) {
            toast.error("Amal qilish muddatini kiriting");
            return;
        }

        setIsLoading(true);

        setTimeout(() => {
            const newCard: Card = {
                id: Date.now().toString(),
                type: selectedCardType,
                number: cardNumber,
                expiry: cardExpiry,
                isDefault: cards.length === 0,
            };

            const updatedCards = [...cards, newCard];
            setCards(updatedCards);
            localStorage.setItem('userCards', JSON.stringify(updatedCards));

            setCardNumber('');
            setCardExpiry('');
            setShowAddCard(false);
            setIsLoading(false);
            toast.success(`${selectedCardType.toUpperCase()} karta muvaffaqiyatli qo'shildi!`);
        }, 1500);
    };

    // Kartani o'chirish
    const handleDeleteCard = (cardId: string) => {
        const updatedCards = cards.filter(c => c.id !== cardId);
        setCards(updatedCards);
        localStorage.setItem('userCards', JSON.stringify(updatedCards));
        if (selectedCard?.id === cardId) {
            setSelectedCard(updatedCards[0] || null);
        }
        toast.info("Karta o'chirildi");
    };

    // Asosiy karta qilish
    const handleSetDefault = (cardId: string) => {
        const updatedCards = cards.map(c => ({
            ...c,
            isDefault: c.id === cardId,
        }));
        setCards(updatedCards);
        localStorage.setItem('userCards', JSON.stringify(updatedCards));
        toast.success("Asosiy karta tanlandi");
    };

    // Balansni to'ldirish
    const handleDeposit = async () => {
        const depositAmount = Number(amount);
        if (!depositAmount || depositAmount < 1000) {
            toast.error("Minimal summa 1,000 UZS");
            return;
        }
        if (!selectedCard) {
            toast.error("Kartani tanlang");
            return;
        }

        setIsProcessing(true);
        await new Promise(r => setTimeout(r, 2000)); // Simulate processing

        const newBalance = balance + depositAmount;

        // Update user balance
        if (currentUser) {
            await ApiService.updateUser(currentUser.id, { balance: newBalance } as any);
            const updatedUser = { ...currentUser, balance: newBalance };
            sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }

        // Add transaction
        const newTransaction: Transaction = {
            id: Date.now().toString(),
            type: 'deposit',
            amount: depositAmount,
            description: `Balansni to'ldirish (${selectedCard.type.toUpperCase()})`,
            date: new Date().toISOString(),
            status: 'success'
        };
        const updatedTransactions = [newTransaction, ...transactions];
        setTransactions(updatedTransactions);
        localStorage.setItem('userTransactions', JSON.stringify(updatedTransactions));

        setIsProcessing(false);
        setAmount('');
        onBalanceUpdate?.(newBalance);
        toast.success(`✅ ${depositAmount.toLocaleString()} UZS muvaffaqiyatli qo'shildi!`);
        setActiveTab('main');
    };

    // Pul yechish
    const handleWithdraw = async () => {
        const withdrawAmount = Number(amount);
        if (!withdrawAmount || withdrawAmount < 10000) {
            toast.error("Minimal summa 10,000 UZS");
            return;
        }
        if (withdrawAmount > balance) {
            toast.error("Balansda yetarli mablag' yo'q");
            return;
        }
        if (!selectedCard) {
            toast.error("Kartani tanlang");
            return;
        }

        setIsProcessing(true);
        await new Promise(r => setTimeout(r, 2000)); // Simulate processing

        const newBalance = balance - withdrawAmount;

        // Update user balance
        if (currentUser) {
            await ApiService.updateUser(currentUser.id, { balance: newBalance } as any);
            const updatedUser = { ...currentUser, balance: newBalance };
            sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }

        // Add transaction
        const newTransaction: Transaction = {
            id: Date.now().toString(),
            type: 'withdrawal',
            amount: withdrawAmount,
            description: `Pul yechish (****${selectedCard.number.slice(-4)})`,
            date: new Date().toISOString(),
            status: 'success'
        };
        const updatedTransactions = [newTransaction, ...transactions];
        setTransactions(updatedTransactions);
        localStorage.setItem('userTransactions', JSON.stringify(updatedTransactions));

        setIsProcessing(false);
        setAmount('');
        onBalanceUpdate?.(newBalance);
        toast.success(`✅ ${withdrawAmount.toLocaleString()} UZS kartangizga o'tkazildi!`);
        setActiveTab('main');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="h-full flex flex-col bg-white dark:bg-gray-900">

                {/* Header */}
                <div className="relative bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 p-6 pb-8">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={20} className="text-white" />
                    </button>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Wallet size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Hamyon</h2>
                            <p className="text-sm text-white/70">Kartalar va balans</p>
                        </div>
                    </div>

                    {/* Balance Card */}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
                        <p className="text-sm text-white/70 mb-1">Umumiy balans</p>
                        <p className="text-4xl font-black text-white drop-shadow-sm">
                            {balance.toLocaleString()} <span className="text-lg font-medium">UZS</span>
                        </p>
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => setActiveTab('deposit')}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-green-600 font-semibold rounded-xl hover:bg-green-50 transition-colors"
                            >
                                <ArrowDownLeft size={18} />
                                <span>To'ldirish</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('withdraw')}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition-colors"
                            >
                                <ArrowUpRight size={18} />
                                <span>Yechish</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 -mt-4">

                    {/* Main Tab */}
                    {activeTab === 'main' && (
                        <>
                            {/* Quick Actions */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <button
                                    onClick={() => setActiveTab('cards')}
                                    className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 flex items-center gap-3 hover:shadow-md transition-all"
                                >
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                        <CreditCard size={20} className="text-blue-600" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">Kartalarim</p>
                                        <p className="text-xs text-gray-500">{cards.length} ta karta</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 flex items-center gap-3 hover:shadow-md transition-all"
                                >
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                        <History size={20} className="text-purple-600" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-900 dark:text-white text-sm">Tarix</p>
                                        <p className="text-xs text-gray-500">{transactions.length} ta amal</p>
                                    </div>
                                </button>
                            </div>

                            {/* Recent Transactions */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                                    <h3 className="font-bold text-gray-900 dark:text-white">So'nggi amallar</h3>
                                    <button
                                        onClick={() => setActiveTab('history')}
                                        className="text-sm text-blue-600 font-medium"
                                    >
                                        Barchasi
                                    </button>
                                </div>
                                {transactions.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <p className="text-gray-500 dark:text-gray-400">Tranzaksiyalar yo'q</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {transactions.slice(0, 3).map(tx => (
                                            <div key={tx.id} className="p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-full ${tx.type === 'deposit' || tx.type === 'earning'
                                                            ? 'bg-green-100 dark:bg-green-900/30'
                                                            : 'bg-red-100 dark:bg-red-900/30'
                                                        }`}>
                                                        {tx.type === 'deposit' || tx.type === 'earning' ? (
                                                            <ArrowDownLeft size={16} className="text-green-600" />
                                                        ) : (
                                                            <ArrowUpRight size={16} className="text-red-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white text-sm">{tx.description}</p>
                                                        <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString('uz-UZ')}</p>
                                                    </div>
                                                </div>
                                                <span className={`font-bold ${tx.type === 'deposit' || tx.type === 'earning'
                                                        ? 'text-green-600'
                                                        : 'text-red-600'
                                                    }`}>
                                                    {tx.type === 'deposit' || tx.type === 'earning' ? '+' : '-'}
                                                    {tx.amount.toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Deposit Tab */}
                    {activeTab === 'deposit' && (
                        <div className="space-y-6">
                            <button onClick={() => setActiveTab('main')} className="text-sm text-gray-500 flex items-center gap-1">
                                ← Orqaga
                            </button>

                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Balansni to'ldirish</h3>

                            {/* Amount Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Summa</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-2xl font-bold text-center focus:ring-2 focus:ring-green-500 outline-none"
                                />
                            </div>

                            {/* Quick Amounts */}
                            <div className="grid grid-cols-3 gap-2">
                                {quickAmounts.map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => setAmount(amt.toString())}
                                        className={`py-3 rounded-xl font-medium transition-all ${Number(amount) === amt
                                                ? 'bg-green-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {(amt / 1000).toFixed(0)}K
                                    </button>
                                ))}
                            </div>

                            {/* Card Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Karta</label>
                                {cards.length === 0 ? (
                                    <button
                                        onClick={() => setShowAddCard(true)}
                                        className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl text-gray-500 hover:border-green-500 hover:text-green-500 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus size={20} />
                                        Karta qo'shish
                                    </button>
                                ) : (
                                    <div className="space-y-2">
                                        {cards.map(card => (
                                            <button
                                                key={card.id}
                                                onClick={() => setSelectedCard(card)}
                                                className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${selectedCard?.id === card.id
                                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                        : 'border-gray-200 dark:border-gray-700'
                                                    }`}
                                            >
                                                {cardLogos[card.type]}
                                                <span className="font-mono">•••• {card.number.slice(-4)}</span>
                                                {selectedCard?.id === card.id && <Check size={20} className="ml-auto text-green-500" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Deposit Button */}
                            <button
                                onClick={handleDeposit}
                                disabled={isProcessing || !amount || Number(amount) < 1000 || !selectedCard}
                                className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <>
                                        <ArrowDownLeft size={20} />
                                        To'ldirish
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Withdraw Tab */}
                    {activeTab === 'withdraw' && (
                        <div className="space-y-6">
                            <button onClick={() => setActiveTab('main')} className="text-sm text-gray-500 flex items-center gap-1">
                                ← Orqaga
                            </button>

                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Pul yechish</h3>

                            {/* Current Balance */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                                <p className="text-sm text-gray-500 mb-1">Mavjud balans</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{balance.toLocaleString()} UZS</p>
                            </div>

                            {/* Amount Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Yechish summasi</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0"
                                    max={balance}
                                    className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-2xl font-bold text-center focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {/* Max button */}
                            <button
                                onClick={() => setAmount(balance.toString())}
                                className="text-sm text-blue-600 font-medium"
                            >
                                Barchasini yechish
                            </button>

                            {/* Card Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Qaysi kartaga</label>
                                {cards.length === 0 ? (
                                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                                        <AlertCircle size={20} />
                                        <span className="text-sm">Avval karta qo'shing</span>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {cards.map(card => (
                                            <button
                                                key={card.id}
                                                onClick={() => setSelectedCard(card)}
                                                className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${selectedCard?.id === card.id
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                        : 'border-gray-200 dark:border-gray-700'
                                                    }`}
                                            >
                                                {cardLogos[card.type]}
                                                <span className="font-mono">•••• {card.number.slice(-4)}</span>
                                                {selectedCard?.id === card.id && <Check size={20} className="ml-auto text-blue-500" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Warning */}
                            {Number(amount) > balance && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-2">
                                    <AlertCircle size={18} />
                                    <span className="text-sm">Balansda yetarli mablag' yo'q</span>
                                </div>
                            )}

                            {/* Withdraw Button */}
                            <button
                                onClick={handleWithdraw}
                                disabled={isProcessing || !amount || Number(amount) < 10000 || Number(amount) > balance || !selectedCard}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <>
                                        <ArrowUpRight size={20} />
                                        Yechish
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Cards Tab */}
                    {activeTab === 'cards' && (
                        <div className="space-y-4">
                            <button onClick={() => setActiveTab('main')} className="text-sm text-gray-500 flex items-center gap-1">
                                ← Orqaga
                            </button>

                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Mening kartalarim</h3>
                                <button
                                    onClick={() => setShowAddCard(true)}
                                    className="flex items-center gap-1 text-sm font-medium text-blue-600"
                                >
                                    <Plus size={16} />
                                    Qo'shish
                                </button>
                            </div>

                            {cards.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CreditCard size={40} className="text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 mb-4">Hali karta qo'shilmagan</p>
                                    <button
                                        onClick={() => setShowAddCard(true)}
                                        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl"
                                    >
                                        Karta qo'shish
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cards.map(card => (
                                        <div
                                            key={card.id}
                                            className={`p-4 rounded-2xl border-2 ${card.isDefault ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                {cardLogos[card.type]}
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-900 dark:text-white">
                                                        •••• •••• •••• {card.number.slice(-4)}
                                                    </p>
                                                    <p className="text-sm text-gray-500">Amal qilish: {card.expiry}</p>
                                                </div>
                                                {card.isDefault ? (
                                                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">
                                                        Asosiy
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSetDefault(card.id)}
                                                        className="p-2 text-gray-400 hover:text-green-500 transition-colors"
                                                    >
                                                        <Check size={20} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteCard(card.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* History Tab */}
                    {activeTab === 'history' && (
                        <div className="space-y-4">
                            <button onClick={() => setActiveTab('main')} className="text-sm text-gray-500 flex items-center gap-1">
                                ← Orqaga
                            </button>

                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Tranzaksiyalar tarixi</h3>

                            {transactions.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <History size={40} className="text-gray-400" />
                                    </div>
                                    <p className="text-gray-500">Tranzaksiyalar yo'q</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {transactions.map(tx => (
                                        <div key={tx.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 rounded-xl ${tx.type === 'deposit' || tx.type === 'earning'
                                                        ? 'bg-green-100 dark:bg-green-900/30'
                                                        : 'bg-red-100 dark:bg-red-900/30'
                                                    }`}>
                                                    {tx.type === 'deposit' || tx.type === 'earning' ? (
                                                        <ArrowDownLeft size={18} className="text-green-600" />
                                                    ) : (
                                                        <ArrowUpRight size={18} className="text-red-600" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{tx.description}</p>
                                                    <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleString('uz-UZ')}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-bold ${tx.type === 'deposit' || tx.type === 'earning'
                                                        ? 'text-green-600'
                                                        : 'text-red-600'
                                                    }`}>
                                                    {tx.type === 'deposit' || tx.type === 'earning' ? '+' : '-'}
                                                    {tx.amount.toLocaleString()}
                                                </p>
                                                <p className="text-xs text-gray-500">UZS</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Add Card Modal */}
                {showAddCard && (
                    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fadeIn">
                        <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl p-6 animate-slideUp safe-area-inset-bottom">
                            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-6"></div>

                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Yangi karta qo'shish</h3>

                            {/* Card Type Selection */}
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                {(['uzcard', 'humo', 'visa'] as const).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedCardType(type)}
                                        className={`p-4 rounded-2xl border-2 transition-all ${selectedCardType === type
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            {cardLogos[type]}
                                            <span className={`text-xs font-semibold ${selectedCardType === type ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                                                }`}>
                                                {type.toUpperCase()}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Card Number Input */}
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Karta raqami
                                </label>
                                <input
                                    type="text"
                                    value={cardNumber}
                                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                    maxLength={19}
                                    placeholder="0000 0000 0000 0000"
                                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-lg tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Expiry Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Amal qilish muddati
                                </label>
                                <input
                                    type="text"
                                    value={cardExpiry}
                                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                                    maxLength={5}
                                    placeholder="OO/YY"
                                    className="w-32 px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-lg tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowAddCard(false)}
                                    className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Bekor qilish
                                </button>
                                <button
                                    onClick={handleAddCard}
                                    disabled={isLoading}
                                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Plus size={18} />
                                            <span>Qo'shish</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WalletModal;
