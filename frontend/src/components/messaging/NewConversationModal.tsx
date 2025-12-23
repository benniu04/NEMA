import React, { useState, useEffect } from 'react';
import { useMessaging } from '../../context/MessagingContext';
import API_BASE_URL from '../../config/api';

interface User {
  _id: string;
  username: string;
  displayName?: string;
  avatar?: string;
}

interface NewConversationModalProps {
  onClose: () => void;
}

const NewConversationModal: React.FC<NewConversationModalProps> = ({ onClose }) => {
  const { startConversation, selectConversation, conversations } = useMessaging();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [starting, setStarting] = useState<string | null>(null);

  // Fetch users who can be messaged (mutual followers)
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/messages/messageable-users`, {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filter users by search query
  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      (user.displayName?.toLowerCase().includes(query) ?? false)
    );
  });

  // Check if conversation already exists with user
  const getExistingConversation = (userId: string) => {
    return conversations.find(conv =>
      conv.participants.some(p => p._id === userId)
    );
  };

  const handleSelectUser = async (userId: string) => {
    if (starting) return;

    // Check if conversation already exists
    const existing = getExistingConversation(userId);
    if (existing) {
      await selectConversation(existing._id);
      onClose();
      return;
    }

    // Start new conversation
    setStarting(userId);
    const conversationId = await startConversation(userId);

    if (conversationId) {
      await selectConversation(conversationId);
      onClose();
    }

    setStarting(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-black border border-white/20 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-medium text-white">New Message</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/10">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for people..."
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-colors"
            autoFocus
          />
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-white/20 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {users.length === 0 ? (
                <>
                  <p className="text-white/40">No mutual followers yet</p>
                  <p className="text-white/30 text-sm mt-1">
                    You can only message users who follow you back
                  </p>
                </>
              ) : (
                <p className="text-white/40">No users found matching "{searchQuery}"</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredUsers.map(user => {
                const existingConv = getExistingConversation(user._id);

                return (
                  <button
                    key={user._id}
                    onClick={() => handleSelectUser(user._id)}
                    disabled={starting === user._id}
                    className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors text-left disabled:opacity-50"
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.displayName || user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-light text-white/40">
                          {(user.displayName || user.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {user.displayName || user.username}
                      </p>
                      <p className="text-sm text-white/40 truncate">@{user.username}</p>
                    </div>

                    {/* Status */}
                    {starting === user._id ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500" />
                    ) : existingConv ? (
                      <span className="text-xs text-white/40 px-2 py-1 bg-white/5 rounded">
                        Open chat
                      </span>
                    ) : (
                      <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewConversationModal;
