import React from 'react';
import { useMessaging } from '../../context/MessagingContext';
import { useUser } from '../../context/UserContext';

interface User {
  _id: string;
  username: string;
  displayName?: string;
  avatar?: string;
}

const ConversationList: React.FC = () => {
  const { conversations, currentConversation, selectConversation, loading } = useMessaging();
  const { user } = useUser();

  // Get the other participant in a conversation
  const getOtherParticipant = (participants: User[]): User | undefined => {
    return participants.find(p => p._id !== (user?.id || user?._id));
  };

  // Format timestamp
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <svg className="w-12 h-12 text-white/20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-white/40 text-sm">No conversations yet</p>
        <p className="text-white/30 text-xs mt-1">Start a new conversation with someone you follow</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      {conversations.map(conversation => {
        const otherUser = getOtherParticipant(conversation.participants);
        const isSelected = currentConversation?._id === conversation._id;
        const lastMessageContent = conversation.lastMessage?.isDeleted
          ? 'Message deleted'
          : conversation.lastMessage?.content;

        return (
          <button
            key={conversation._id}
            onClick={() => selectConversation(conversation._id)}
            className={`w-full p-4 flex items-start gap-3 hover:bg-white/5 transition-colors text-left ${
              isSelected ? 'bg-white/10' : ''
            }`}
          >
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden">
                {otherUser?.avatar ? (
                  <img
                    src={otherUser.avatar}
                    alt={otherUser.displayName || otherUser.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-light text-white/40">
                    {(otherUser?.displayName || otherUser?.username || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-white truncate">
                  {otherUser?.displayName || otherUser?.username || 'Unknown'}
                </span>
                <span className="text-xs text-white/40 flex-shrink-0 ml-2">
                  {conversation.lastMessageAt && formatTime(conversation.lastMessageAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className={`text-sm truncate ${
                  conversation.unreadCount > 0 ? 'text-white/70 font-medium' : 'text-white/40'
                }`}>
                  {lastMessageContent || 'No messages yet'}
                </p>
                {conversation.unreadCount > 0 && (
                  <span className="flex-shrink-0 ml-2 bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                    {conversation.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ConversationList;
