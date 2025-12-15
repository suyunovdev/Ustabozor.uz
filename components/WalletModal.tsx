import React, { useState } from 'react';
import { X, CreditCard, Plus, Trash2, Check, ChevronRight, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { toast } from 'react-toastify';

interface Card {
    id: string;
    type: 'uzcard' | 'humo' | 'visa';
    number: string;
    expiry: string;
    isDefault: boolean;
}

interface WalletModalProps {
    isOpen: boolean;
    onClose: () => void;
    balance: number;
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

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose, balance }) => {
    const [cards, setCards] = useState<Card[]>(() => {
        const saved = localStorage.getItem('userCards');
        return saved ? JSON.parse(saved) : [];
    });
    const [showAddCard, setShowAddCard] = useState(false);
    const [selectedCardType, setSelectedCardType] = useState<'uzcard' | 'humo' | 'visa'>('uzcard');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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
                            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-green-600 font-semibold rounded-xl hover:bg-green-50 transition-colors">
                                <ArrowDownLeft size={18} />
                                <span>To'ldirish</span>
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition-colors">
                                <ArrowUpRight size={18} />
                                <span>Yechish</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 -mt-4">

                    {/* Cards Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <CreditCard size={18} className="text-blue-500" />
                                Mening kartalarim
                            </h3>
                            <button
                                onClick={() => setShowAddCard(true)}
                                className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700"
                            >
                                <Plus size={16} />
                                Qo'shish
                            </button>
                        </div>

                        {cards.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CreditCard size={32} className="text-gray-400" />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 mb-2">Hali karta qo'shilmagan</p>
                                <p className="text-sm text-gray-400 dark:text-gray-500">Kartangizni qo'shib, balansni to'ldiring</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {cards.map((card) => (
                                    <div
                                        key={card.id}
                                        className={`flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${card.isDefault ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                                            }`}
                                    >
                                        {cardLogos[card.type]}
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                •••• •••• •••• {card.number.slice(-4)}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Amal qilish: {card.expiry}
                                            </p>
                                        </div>
                                        {card.isDefault ? (
                                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">
                                                Asosiy
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleSetDefault(card.id)}
                                                className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                                                title="Asosiy qilish"
                                            >
                                                <Check size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteCard(card.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                            title="O'chirish"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-6 space-y-3">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                    <ArrowUpRight size={20} className="text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">Tranzaksiyalar tarixi</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Oxirgi operatsiyalar</p>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-gray-400" />
                        </div>
                    </div>
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
