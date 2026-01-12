import { ChatService } from '../services/chatService';
import { toast } from 'react-toastify';

/**
 * Opens or creates a chat with another user and navigates to the chat page
 * @param currentUserId - ID of the current logged-in user
 * @param otherUserId - ID of the user to chat with
 * @param navigate - React Router navigate function
 */
export const openChatWith = async (
    currentUserId: string,
    otherUserId: string,
    navigate: (path: string, options?: any) => void
) => {
    try {
        console.log('=== Opening chat ===');
        console.log('Current user ID:', currentUserId);
        console.log('Other user ID:', otherUserId);

        if (!currentUserId || !otherUserId) {
            console.error('Missing user IDs');
            toast.error("Foydalanuvchi ma'lumotlari topilmadi");
            return;
        }

        if (currentUserId === otherUserId) {
            toast.warning("O'zingiz bilan chat qila olmaysiz");
            return;
        }

        // Show loading toast
        const loadingToast = toast.loading("Chat ochilmoqda...");

        // Get or create chat between users
        const chat = await ChatService.getOrCreateChat(currentUserId, otherUserId);

        console.log('Chat created/found:', chat);

        // Dismiss loading toast
        toast.dismiss(loadingToast);

        if (!chat || !chat.id) {
            console.error('Failed to create/get chat');
            toast.error("Chatni ochishda xatolik");
            return;
        }

        // Navigate to chat page with the chat ID in state
        navigate('/chat', { state: { selectedChatId: chat.id } });

        toast.success("Chat ochildi!");
    } catch (error) {
        console.error('Error opening chat:', error);
        toast.error("Chatni ochishda xatolik yuz berdi");
    }
};

/**
 * Start a chat from order context (e.g., customer to worker or vice versa)
 */
export const startChatFromOrder = async (
    currentUserId: string,
    otherUserId: string,
    navigate: (path: string, options?: any) => void,
    context?: string
) => {
    console.log(`Starting chat from order context: ${context || 'unknown'}`);
    await openChatWith(currentUserId, otherUserId, navigate);
};
