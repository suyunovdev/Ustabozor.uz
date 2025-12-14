import { ChatService } from '../services/chatService';

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

        // Get or create chat between users
        const chat = await ChatService.getOrCreateChat(currentUserId, otherUserId);

        console.log('Chat created/found:', chat);
        console.log('Chat participants:', chat.participants);

        // Navigate to chat page with the chat ID in state
        navigate('/chat', { state: { selectedChatId: chat.id } });
    } catch (error) {
        console.error('Error opening chat:', error);
    }
};
