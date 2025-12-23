import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useMessaging } from '../context/MessagingContext';
import { useSettings } from '../context/SettingsContext';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import ConversationList from '../components/messaging/ConversationList';
import MessageThread from '../components/messaging/MessageThread';
import NewConversationModal from '../components/messaging/NewConversationModal';

const MessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: userLoading, isAuthenticated } = useUser();
  const { currentConversation, clearCurrentConversation } = useMessaging();
  const { t } = useSettings();
  const [showNewConversation, setShowNewConversation] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/messages' } } });
    }
  }, [isAuthenticated, userLoading, navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCurrentConversation();
    };
  }, []);

  if (userLoading || !user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <NavBar />

      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-light">Messages</h1>
        </div>

        <div className="flex h-[calc(100vh-250px)] border border-white/10 rounded-lg overflow-hidden bg-black/50">
          {/* Conversation List - Left Panel */}
          <div className="w-full md:w-1/3 border-r border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-sm uppercase tracking-wider text-white/50">Conversations</h2>
              <button
                onClick={() => setShowNewConversation(true)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="New message"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ConversationList />
            </div>
          </div>

          {/* Message Thread - Right Panel */}
          <div className="hidden md:flex flex-1 flex-col">
            {currentConversation ? (
              <MessageThread />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-white/40">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-lg mb-2">Select a conversation</p>
                  <p className="text-sm">Choose from your existing conversations or start a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* New Conversation Modal */}
      {showNewConversation && (
        <NewConversationModal onClose={() => setShowNewConversation(false)} />
      )}
    </div>
  );
};

export default MessagesPage;
