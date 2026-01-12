// Telegram Web App utilities
declare global {
    interface Window {
        Telegram?: {
            WebApp: TelegramWebApp;
        };
    }
}

interface TelegramWebApp {
    initData: string;
    initDataUnsafe: {
        user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            photo_url?: string;
        };
        start_param?: string;
    };
    colorScheme: 'light' | 'dark';
    themeParams: {
        bg_color?: string;
        text_color?: string;
        hint_color?: string;
        link_color?: string;
        button_color?: string;
        button_text_color?: string;
    };
    isExpanded: boolean;
    viewportHeight: number;
    viewportStableHeight: number;
    platform: string;
    ready: () => void;
    expand: () => void;
    close: () => void;
    MainButton: {
        text: string;
        color: string;
        textColor: string;
        isVisible: boolean;
        isActive: boolean;
        show: () => void;
        hide: () => void;
        onClick: (callback: () => void) => void;
        offClick: (callback: () => void) => void;
        setText: (text: string) => void;
        setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
    };
    BackButton: {
        isVisible: boolean;
        show: () => void;
        hide: () => void;
        onClick: (callback: () => void) => void;
        offClick: (callback: () => void) => void;
    };
    HapticFeedback: {
        impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
        notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        selectionChanged: () => void;
    };
    showAlert: (message: string, callback?: () => void) => void;
    showConfirm: (message: string, callback: (confirmed: boolean) => void) => void;
    showPopup: (params: { title?: string; message: string; buttons?: Array<{ id?: string; type?: string; text?: string }> }, callback?: (buttonId: string) => void) => void;
    setHeaderColor: (color: string) => void;
    setBackgroundColor: (color: string) => void;
    enableClosingConfirmation: () => void;
    disableClosingConfirmation: () => void;
}

// Check if running inside Telegram
export const isTelegramWebApp = (): boolean => {
    return typeof window !== 'undefined' && window.Telegram?.WebApp !== undefined;
};

// Get Telegram WebApp instance
export const getTelegramWebApp = (): TelegramWebApp | null => {
    if (isTelegramWebApp()) {
        return window.Telegram!.WebApp;
    }
    return null;
};

// Get Telegram user data
export const getTelegramUser = () => {
    const webApp = getTelegramWebApp();
    if (webApp) {
        return webApp.initDataUnsafe.user;
    }
    return null;
};

// Initialize Telegram WebApp
export const initTelegramWebApp = () => {
    const webApp = getTelegramWebApp();
    if (webApp) {
        // Notify Telegram that the app is ready
        webApp.ready();

        // Expand to full height
        webApp.expand();

        // Apply theme colors
        const theme = webApp.colorScheme;
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Set header color
        webApp.setHeaderColor(theme === 'dark' ? '#0d1117' : '#ffffff');
        webApp.setBackgroundColor(theme === 'dark' ? '#0d1117' : '#f9fafb');

        console.log('✅ Telegram Web App initialized');
        console.log('👤 User:', webApp.initDataUnsafe.user);
        console.log('🎨 Theme:', theme);

        return true;
    }
    return false;
};

// Show main button
export const showMainButton = (text: string, onClick: () => void) => {
    const webApp = getTelegramWebApp();
    if (webApp) {
        webApp.MainButton.setText(text);
        webApp.MainButton.onClick(onClick);
        webApp.MainButton.show();
    }
};

// Hide main button
export const hideMainButton = () => {
    const webApp = getTelegramWebApp();
    if (webApp) {
        webApp.MainButton.hide();
    }
};

// Show back button
export const showBackButton = (onClick: () => void) => {
    const webApp = getTelegramWebApp();
    if (webApp) {
        webApp.BackButton.onClick(onClick);
        webApp.BackButton.show();
    }
};

// Hide back button
export const hideBackButton = () => {
    const webApp = getTelegramWebApp();
    if (webApp) {
        webApp.BackButton.hide();
    }
};

// Haptic feedback
export const hapticFeedback = (type: 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy') => {
    const webApp = getTelegramWebApp();
    if (webApp) {
        if (type === 'success' || type === 'error' || type === 'warning') {
            webApp.HapticFeedback.notificationOccurred(type);
        } else {
            webApp.HapticFeedback.impactOccurred(type);
        }
    }
};

// Show alert
export const showTelegramAlert = (message: string): Promise<void> => {
    return new Promise((resolve) => {
        const webApp = getTelegramWebApp();
        if (webApp) {
            webApp.showAlert(message, resolve);
        } else {
            alert(message);
            resolve();
        }
    });
};

// Show confirm dialog
export const showTelegramConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
        const webApp = getTelegramWebApp();
        if (webApp) {
            webApp.showConfirm(message, resolve);
        } else {
            resolve(confirm(message));
        }
    });
};

// Close the web app
export const closeTelegramWebApp = () => {
    const webApp = getTelegramWebApp();
    if (webApp) {
        webApp.close();
    }
};
