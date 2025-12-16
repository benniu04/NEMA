import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import API_BASE_URL from '../config/api.js';
import { useSettings } from '../context/SettingsContext';

const CommentSection = ({ videoId }) => {
  const { t } = useSettings();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [nickname, setNickname] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize fingerprint
  useEffect(() => {
    const initializeFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setDeviceId(result.visitorId);
        
        // Get stored nickname if exists
        const storedNickname = localStorage.getItem(`nickname-${result.visitorId}`);
        if (storedNickname) {
          setNickname(storedNickname);
        }
      } catch (error) {
        console.error('Error initializing fingerprint:', error);
      }
    };
    
    initializeFingerprint();
  }, []);

  // Fetch comments
  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/api/comments/movie/${videoId}`
      );
      setComments(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setError(t('comments.loadError'));
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (videoId) {
      fetchComments();
    }
  }, [videoId]);

  // Add new comment
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      // Save nickname for this device
      if (nickname) {
        localStorage.setItem(`nickname-${deviceId}`, nickname);
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/comments`,
        {
          movieId: videoId,
          content: newComment,
          nickname: nickname || 'Anonymous'
          // Note: deviceId determined server-side by IP address
        },
        {
          withCredentials: true
        }
      );

      setComments(prevComments => [response.data, ...prevComments]);
      setNewComment('');
      setError(null);
    } catch (error) {
      console.error('Error posting comment:', error);
      setError(t('comments.postError'));
    } finally {
      setLoading(false);
    }
  };

  // Delete comment
  const handleDelete = async (commentId) => {
    if (!window.confirm(t('comments.deleteConfirm'))) {
      return;
    }

    try {
      // Backend uses server-side IP for authorization (no need to send deviceId)
      await axios.delete(`${API_BASE_URL}/api/comments/${commentId}`, {
        withCredentials: true
      });
      setComments(prevComments => prevComments.filter(comment => comment._id !== commentId));
      setError(null);
    } catch (error) {
      console.error('Error deleting comment:', error);
      if (error.response?.status === 403) {
        setError(t('comments.deleteError'));
      } else if (error.response?.status === 429) {
        setError(t('comments.rateLimitError'));
      } else {
        setError(t('comments.deleteCommentError'));
      }
    }
  };

  return (
    <div className="mt-16 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-amber-100/10 rounded-lg p-8">
      <h2 className="text-2xl font-light mb-8 text-amber-100/90">{t('comments.title')}</h2>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="mb-4">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={t('comments.nicknamePlaceholder')}
            className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-2 text-white placeholder-amber-100/40 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
        <div className="mb-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t('comments.addComment')}
            rows="3"
            className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 text-white placeholder-amber-100/40 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !newComment.trim()}
          className="px-6 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('comments.posting') : t('comments.postComment')}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="text-red-500 mb-4">
          {error}
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {loading && comments.length === 0 ? (
          <div className="text-amber-100/60">{t('comments.loading')}</div>
        ) : comments.length === 0 ? (
          <div className="text-amber-100/60">{t('comments.noComments')}</div>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="border-b border-amber-100/10 pb-6 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <span className="text-amber-100/80 text-sm">
                      {comment.nickname?.[0]?.toUpperCase() || 'A'}
                    </span>
                  </div>
                  <span className="text-amber-100/80 font-medium">{comment.nickname || 'Anonymous'}</span>
                </div>
                <span className="text-amber-100/40 text-sm">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-200 leading-relaxed">{comment.content}</p>
              
              {/* Delete button - backend checks IP-based ownership */}
              <button
                onClick={() => handleDelete(comment._id)}
                className="mt-2 text-red-400/60 text-sm hover:text-red-400 transition-colors flex items-center gap-1"
                title={t('comments.delete')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {t('comments.delete')}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentSection; 