// Pul summasini chiroyli formatlash (UZS)
export const formatMoney = (amount: number): string => {
    if (amount === 0) return '0';
    const abs = Math.abs(amount);
    if (abs >= 1_000_000_000) {
        return (amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' mlrd';
    }
    if (abs >= 1_000_000) {
        return (amount / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' mln';
    }
    if (abs >= 1_000) {
        return (amount / 1_000).toFixed(1).replace(/\.0$/, '') + ' ming';
    }
    return amount.toLocaleString();
};
