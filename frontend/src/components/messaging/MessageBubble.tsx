import React, { useState } from 'react';
import { useMessaging } from '../../context/MessagingContext';

interface User {
  _id: string;
  username: string;
  displayName?: string;
  avatar?: string;
}

interface Message {
  _id: string;
  conversationId: string;
  senderId: string | User;
  content: string;
  isRead: boolean;
  readAt?: string;
  isDeleted: boolean;
  createdAt: string;
}

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMine }) => {
  const { deleteMessage } = useMessaging();
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (deleting) return;

    const confirmed = window.confirm('Delete this message?');
    if (!confirmed) return;

    setDeleting(true);
    await deleteMessage(message._id);
    setDeleting(false);
    setShowMenu(false);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (message.isDeleted) {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
        <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/30 italic text-sm">
          This message was deleted
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}
      onMouseLeave={() => setShowMenu(false)}
    >
      <div className="relative max-w-[70%]">
        {/* Message bubble */}
        <div
          className={`px-4 py-2 rounded-lg ${
            isMine
              ? 'bg-amber-500/20 border border-amber-500/40 text-white'
              : 'bg-white/10 border border-white/10 text-white'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {/* Timestamp and read receipt */}
        <div className={`flex items-center gap-1.5 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-white/30">{formatTime(message.createdAt)}</span>
          {isMine && (
            <span className="text-xs text-white/30">
              {message.isRead ? (
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
          )}
        </div>

        {/* Delete menu (only for own messages) */}
        {isMine && !message.isDeleted && (
          <div className={`absolute top-0 ${isMine ? 'right-full mr-2' : 'left-full ml-2'} opacity-0 group-hover:opacity-100 transition-opacity`}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            >
              <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute top-full right-0 mt-1 bg-black border border-white/20 rounded-lg shadow-xl py-1 z-10">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm text-red-400 hover:bg-white/10 w-full text-left flex items-center gap-2 disabled:opacity-50"
                >
                  {deleting ? (
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
