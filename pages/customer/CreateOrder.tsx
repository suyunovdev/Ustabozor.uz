import React, { useState, useEffect } from 'react';
import { GeminiService } from '../../services/geminiService';
import { MockService } from '../../services/mockDb';
import { Loader2, Sparkles, ChevronRight, MapPin } from '../../components/Icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSavedLocation } from '../../services/locationService';

export const CreateOrder = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(searchParams.get('cat') || '');
  const [price, setPrice] = useState('');
  const [locationText, setLocationText] = useState('');

  // Joylashuvni olish
  useEffect(() => {
    const savedLocation = getSavedLocation();
    if (savedLocation) {
      setLocationText(savedLocation.district
        ? `${savedLocation.city}, ${savedLocation.district}`
        : savedLocation.city || 'Hozirgi manzil'
      );
    }
  }, []);

  const handleAISuggest = async () => {
    if (!input.trim()) return;
    setIsAnalyzing(true);
    const result = await GeminiService.enhanceOrderDetails(input);
    setIsAnalyzing(false);

    if (result) {
      setOrderDetails(result);
      setTitle(result.title);
      setCategory(result.category);
      setPrice(result.estimatedPrice?.toString() || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Get current user
    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

    if (!currentUser) {
      alert("Iltimos, avval tizimga kiring");
      return;
    }

    // GPS koordinatalarini olish
    const savedLocation = getSavedLocation();

    await MockService.createOrder({
      customerId: currentUser.id,
      title: title,
      description: orderDetails?.description || input,
      category: category,
      price: Number(price),
      location: locationText || 'Hozirgi manzil',
      lat: savedLocation?.lat,
      lng: savedLocation?.lng,
      aiSuggested: !!orderDetails
    });
    navigate('/customer/home');
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Buyurtma Berish</h1>

      {/* AI Assistant Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-indigo-900 dark:to-purple-900 p-6 rounded-3xl shadow-lg shadow-blue-500/20 text-white mb-8 border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>

        <div className="flex items-center mb-2 relative z-10">
          <Sparkles className="text-yellow-300 mr-2" />
          <h2 className="font-bold text-lg">AI Yordamchi</h2>
        </div>
        <p className="text-sm text-blue-100 dark:text-indigo-200 mb-4 relative z-10">Nimaga muhtojligingizni yozing, biz detallarni to'ldirib beramiz.</p>

        <div className="relative z-10">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Masalan: Oshxonadagi kran suv oqizyapti, zudlik bilan usta kerak."
            className="w-full p-4 rounded-xl text-gray-900 dark:text-white dark:bg-gray-800/80 text-sm focus:ring-2 focus:ring-yellow-400 outline-none h-24 resize-none shadow-inner border border-transparent dark:border-white/10"
          />
          <button
            onClick={handleAISuggest}
            disabled={isAnalyzing || !input}
            className="absolute bottom-3 right-3 bg-gray-900 dark:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center disabled:opacity-50 transition-colors hover:bg-gray-800 dark:hover:bg-indigo-500"
          >
            {isAnalyzing ? <Loader2 className="animate-spin mr-1" size={12} /> : <Sparkles size={12} className="mr-1" />}
            To'ldirish
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Ish nomi</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            placeholder="Masalan: Kranni tuzatish"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Kategoriya</label>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none transition-all"
              required
            >
              <option value="">Kategoriyani tanlang</option>
              <option value="Santexnika">Santexnika</option>
              <option value="Elektr">Elektr</option>
              <option value="Tozalash">Tozalash</option>
              <option value="Qurilish">Qurilish</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
              <ChevronRight className="rotate-90" size={16} />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Taklif narxi (so'm)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none font-mono transition-all"
            placeholder="50000"
            required
          />
        </div>

        {/* Manzil - avtomatik */}
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">📍 Manzil</label>
          <div className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <MapPin size={16} className="text-blue-500" />
            <span>{locationText || 'Joylashuv aniqlanmoqda...'}</span>
            {locationText && <span className="text-green-500 text-xs ml-auto">✓ GPS</span>}
          </div>
          <p className="text-xs text-gray-400 mt-1">Sizning hozirgi joylashuvingiz avtomatik aniqlanadi</p>
        </div>

        {orderDetails && (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl text-xs text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800/30">
            <p className="font-bold mb-1 flex items-center"><Sparkles size={12} className="mr-1" /> AI Tavsifi:</p>
            {orderDetails.description}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 mt-4 flex items-center justify-center transition-all active:scale-95"
        >
          E'lon qilish <ChevronRight className="ml-2" />
        </button>
      </form>
    </div>
  );
};