import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMessaging } from '../../context/MessagingContext';
import { useUser } from '../../context/UserContext';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';

interface User {
  _id: string;
  username: string;
  displayName?: string;
  avatar?: string;
}

const MessageThread: React.FC = () => {
  const { currentConversation, messages, messagesLoading, typingUsers } = useMessaging();
  const { user } = useUser();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get the other participant
  const getOtherParticipant = (): User | undefined => {
    if (!currentConversation) return undefined;
    return currentConversation.participants.find(
      (p: User) => p._id !== (user?.id || user?._id)
    );
  };

  const otherUser = getOtherParticipant();
  const isTyping = currentConversation && typingUsers[currentConversation._id]?.length > 0;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!currentConversation) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3">
        <Link to={`/profile/${otherUser?.username}`} className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden hover:ring-2 hover:ring-amber-500 transition-all">
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
        </Link>
        <div>
          <Link
            to={`/profile/${otherUser?.username}`}
            className="font-medium text-white hover:text-amber-500 transition-colors"
          >
            {otherUser?.displayName || otherUser?.username || 'Unknown'}
          </Link>
          <p className="text-xs text-white/40">@{otherUser?.username}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messagesLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-white/10 overflow-hidden mb-4">
              {otherUser?.avatar ? (
                <img
                  src={otherUser.avatar}
                  alt={otherUser.displayName || otherUser.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-light text-white/40">
                  {(otherUser?.displayName || otherUser?.username || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <p className="text-white/60 mb-1">
              Start a conversation with {otherUser?.displayName || otherUser?.username}
            </p>
            <p className="text-white/40 text-sm">Send them a message below</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isMine = (typeof message.senderId === 'string'
                ? message.senderId
                : message.senderId._id) === (user?.id || user?._id);

              // Show date separator if date changed
              const showDate = index === 0 ||
                new Date(messages[index - 1].createdAt).toDateString() !==
                new Date(message.createdAt).toDateString();

              return (
                <React.Fragment key={message._id}>
                  {showDate && (
                    <div className="flex items-center justify-center my-4">
                      <span className="text-xs text-white/30 bg-black/50 px-3 py-1 rounded-full">
                        {new Date(message.createdAt).toLocaleDateString([], {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                  <MessageBubble message={message} isMine={isMine} />
                </React.Fragment>
              );
            })}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput conversationId={currentConversation._id} />
    </div>
  );
};

export default MessageThread;
