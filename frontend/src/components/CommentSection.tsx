import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import API_BASE_URL from '../config/api';
import { useSettings } from '../context/SettingsContext';
import { useUser } from '../context/UserContext';

interface Comment {
  _id: string;
  movieId: string;
  content: string;
  nickname: string;
  deviceId?: string;
  userId?: string;
  parentId?: string;
  isEdited?: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

interface CommentSectionProps {
  videoId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ videoId }) => {
  const { t } = useSettings();
  const { user } = useUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [nickname, setNickname] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

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

  // Fetch comments and organize into tree structure
  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/api/comments/movie/${videoId}`
      );
      const allComments = Array.isArray(response.data) ? response.data : [];

      // Organize comments into tree structure
      const topLevelComments = allComments.filter((c: Comment) => !c.parentId);
      const commentMap = new Map<string, Comment>();

      // Create a map of all comments
      allComments.forEach((comment: Comment) => {
        commentMap.set(comment._id, { ...comment, replies: [] });
      });

      // Attach replies to their parent comments
      allComments.forEach((comment: Comment) => {
        if (comment.parentId) {
          const parent = commentMap.get(comment.parentId);
          if (parent && parent.replies) {
            parent.replies.push(commentMap.get(comment._id)!);
          }
        }
      });

      // Get top-level comments with their replies
      const structuredComments = topLevelComments.map((c: Comment) => commentMap.get(c._id)!);

      setComments(structuredComments);
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
  const handleSubmit = async (e: React.FormEvent) => {
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
          nickname: nickname || 'Anonymous',
          deviceId  // Send deviceId for ownership tracking
        },
        {
          withCredentials: true
        }
      );

      setComments(prevComments => [response.data, ...prevComments]);
      setNewComment('');
      setError(null);
    } catch (error: any) {
      console.error('Error posting comment:', error);
      setError(t('comments.postError'));
    } finally {
      setLoading(false);
    }
  };

  // Delete comment
  const handleDelete = async (commentId: string) => {
    if (!window.confirm(t('comments.deleteConfirm'))) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/comments/${commentId}?deviceId=${encodeURIComponent(deviceId)}`, {
        withCredentials: true
      });
      // Refresh comments to update the tree structure
      await fetchComments();
      setError(null);
    } catch (error: any) {
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

  // Start editing a comment
  const handleStartEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditContent(comment.content);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditContent('');
  };

  // Save edited comment
  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      await axios.put(
        `${API_BASE_URL}/api/comments/${commentId}`,
        {
          content: editContent,
          deviceId
        },
        {
          withCredentials: true
        }
      );

      // Refresh comments to show the edit
      await fetchComments();
      setEditingCommentId(null);
      setEditContent('');
      setError(null);
    } catch (error: any) {
      console.error('Error editing comment:', error);
      if (error.response?.status === 403) {
        setError('Not authorized to edit this comment');
      } else {
        setError('Failed to edit comment');
      }
    }
  };

  // Start replying to a comment
  const handleStartReply = (commentId: string) => {
    setReplyingToId(commentId);
    setReplyContent('');
  };

  // Cancel reply
  const handleCancelReply = () => {
    setReplyingToId(null);
    setReplyContent('');
  };

  // Submit reply
  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim()) return;

    try {
      await axios.post(
        `${API_BASE_URL}/api/comments`,
        {
          movieId: videoId,
          content: replyContent,
          nickname: nickname || 'Anonymous',
          deviceId,
          parentId
        },
        {
          withCredentials: true
        }
      );

      // Refresh comments to show the reply
      await fetchComments();
      setReplyingToId(null);
      setReplyContent('');
      setError(null);
    } catch (error: any) {
      console.error('Error posting reply:', error);
      setError('Failed to post reply');
    }
  };

  // Render individual comment with edit/reply functionality
  const renderComment = (comment: Comment, depth: number = 0) => {
    const isEditing = editingCommentId === comment._id;
    const isReplying = replyingToId === comment._id;

    // Determine ownership based on authentication state
    // - If comment has userId (authenticated), check if current user ID matches
    // - If comment has no userId (anonymous), check deviceId matches AND user is not authenticated
    let isOwner = false;
    if (comment.userId) {
      // Authenticated comment - check userId
      isOwner = user?.id === comment.userId;
    } else {
      // Anonymous comment - check deviceId AND user must not be authenticated
      isOwner = comment.deviceId === deviceId && !user;
    }

    return (
      <div key={comment._id} className={`${depth > 0 ? 'ml-8 mt-4' : ''}`}>
        <div className="border-b border-amber-100/10 pb-6 last:border-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <span className="text-amber-100/80 text-sm">
                  {comment.nickname?.[0]?.toUpperCase() || 'A'}
                </span>
              </div>
              <span className="text-amber-100/80 font-medium">{comment.nickname || 'Anonymous'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-100/40 text-sm">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
              {comment.isEdited && (
                <span className="text-amber-100/40 text-xs italic">(edited)</span>
              )}
            </div>
          </div>

          {/* Comment content or edit form */}
          {isEditing ? (
            <div className="mb-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 text-white placeholder-amber-100/40 focus:outline-none focus:border-amber-500 transition-colors"
                rows={3}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleSaveEdit(comment._id)}
                  className="px-4 py-1 bg-amber-500 text-black text-sm font-medium rounded hover:bg-amber-400 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-1 bg-white/10 text-white text-sm font-medium rounded hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-200 leading-relaxed mb-2">{comment.content}</p>
          )}

          {/* Action buttons */}
          {!isEditing && (
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => handleStartReply(comment._id)}
                className="text-amber-400/60 text-sm hover:text-amber-400 transition-colors"
              >
                Reply
              </button>

              {isOwner && (
                <>
                  <button
                    onClick={() => handleStartEdit(comment)}
                    className="text-blue-400/60 text-sm hover:text-blue-400 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(comment._id)}
                    className="text-red-400/60 text-sm hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          )}

          {/* Reply form */}
          {isReplying && (
            <div className="mt-4 ml-8">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 text-white placeholder-amber-100/40 focus:outline-none focus:border-amber-500 transition-colors"
                rows={3}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleSubmitReply(comment._id)}
                  className="px-4 py-1 bg-amber-500 text-black text-sm font-medium rounded hover:bg-amber-400 transition-colors"
                >
                  Reply
                </button>
                <button
                  onClick={handleCancelReply}
                  className="px-4 py-1 bg-white/10 text-white text-sm font-medium rounded hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Render nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
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
            rows={3}
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
          comments.map((comment) => renderComment(comment, 0))
        )}
      </div>
    </div>
  );
};

export default CommentSection;

