import { useChatState } from '../contexts/ChatContext';

export const useChat = () => {
  return useChatState();
};
