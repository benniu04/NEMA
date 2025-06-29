import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import API_BASE_URL from '../config/api.js';

const CommentSection = ({ videoId }) => {
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
      setError('Failed to load comments');
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
          deviceId,
          nickname: nickname || 'Anonymous'
        }
      );

      setComments(prevComments => [response.data, ...prevComments]);
      setNewComment('');
      setError(null);
    } catch (error) {
      console.error('Error posting comment:', error);
      setError('Failed to post comment');
    } finally {
      setLoading(false);
    }
  };

  // Delete comment
  const handleDelete = async (commentId) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/comments/${commentId}`, {
        data: { deviceId }
      });
      setComments(prevComments => prevComments.filter(comment => comment._id !== commentId));
      setError(null);
    } catch (error) {
      console.error('Error deleting comment:', error);
      setError('Failed to delete comment');
    }
  };

  return (
    <div className="mt-16 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-amber-100/10 rounded-lg p-8">
      <h2 className="text-2xl font-light mb-8 text-amber-100/90">Comments</h2>
      
      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="mb-4">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Nickname (optional)"
            className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-2 text-white placeholder-amber-100/40 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
        <div className="mb-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows="3"
            className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 text-white placeholder-amber-100/40 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !newComment.trim()}
          className="px-6 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Posting...' : 'Post Comment'}
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
          <div className="text-amber-100/60">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-amber-100/60">No comments yet. Be the first to comment!</div>
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
              
              {/* Delete button (only shown for user's own comments) */}
              {comment.deviceId === deviceId && (
                <button
                  onClick={() => handleDelete(comment._id)}
                  className="mt-2 text-amber-100/40 text-sm hover:text-amber-100/60 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentSection; 