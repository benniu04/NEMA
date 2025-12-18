import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { analytics } from '../config/analytics';
import { useSettings } from '../context/SettingsContext';

interface Review {
  _id: string;
  movieId: string;
  nickname: string;
  rating: number;
  comment?: string;
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
}

interface StarProps {
  filled: boolean;
}

const Star: React.FC<StarProps> = ({ filled }) => (
  <svg className={`w-6 h-6 ${filled ? 'text-amber-400' : 'text-gray-500'}`} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969
             0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755
             1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1
             1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0
             00.951-.69l1.07-3.292z"/>
  </svg>
);

interface ReviewSectionProps {
  movieId: string;
  movieTitle: string;
}

const ReviewSection: React.FC<ReviewSectionProps> = ({ movieId, movieTitle }) => {
  const { t } = useSettings();
  const [deviceId, setDeviceId] = useState('');
  const [nickname, setNickname] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);

  /* fingerprint */
  useEffect(() => {
    FingerprintJS.load().then(fp => fp.get()).then(res => {
      setDeviceId(res.visitorId);
      const stored = localStorage.getItem(`nickname-${res.visitorId}`);
      if (stored) setNickname(stored);
    });
  }, []);

  /* fetch reviews */
  const fetchReviews = async () => {
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/api/reviews/movie/${movieId}`,
        {
          withCredentials: true
        }
      );
      const list = Array.isArray(data) ? data
                 : Array.isArray(data.reviews) ? data.reviews
                 : [];
      setReviews(list);
      // Note: Can't identify "myReview" from client side anymore (uses server IP)
      // Users will see delete button but backend enforces ownership
      setMyReview(null);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deviceId) fetchReviews();
  }, [deviceId]);

  /* submit or update */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname) localStorage.setItem(`nickname-${deviceId}`, nickname);
    
    try {
      await axios.post(
        `${API_BASE_URL}/api/reviews`,
        {
          movieId, 
          nickname: nickname || 'Anonymous',
          rating: stars, 
          comment
          // Note: deviceId determined server-side by IP address
        },
        {
          withCredentials: true
        }
      );
      // Track review submission
      if (movieTitle) {
        analytics.submitReview(movieTitle, stars);
      }
      setStars(0); 
      setComment('');
      fetchReviews();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      if (error.response?.status === 429) {
        alert(t('reviews.rateLimitError'));
      } else {
        alert(t('reviews.submitError'));
      }
    }
  };

  /* delete review */
  const handleDelete = async (reviewId: string) => {
    if (!window.confirm(t('reviews.deleteConfirm'))) return;

    try {
      // Backend uses server-side IP for authorization (no need to send deviceId)
      await axios.delete(
        `${API_BASE_URL}/api/reviews/${reviewId}`,
        {
          withCredentials: true
        }
      );
      // Track review deletion
      if (movieTitle) {
        analytics.deleteReview(movieTitle);
      }
      setStars(0);
      setComment('');
      fetchReviews();
    } catch (error: any) {
      console.error('Error deleting review:', error);
      if (error.response?.status === 403) {
        alert(t('reviews.deleteError'));
      } else if (error.response?.status === 429) {
        alert(t('reviews.rateLimitError'));
      } else {
        alert(t('reviews.deleteReviewError'));
      }
    }
  };

  const avg = reviews.length
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '0';

  return (
    <div className="mt-16 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-amber-100/10 rounded-lg p-8">
      <h2 className="text-2xl font-light mb-4 text-amber-100/90">{t('reviews.title')}</h2>

      {/* Average */}
      <div className="flex items-center mb-6">
        {[...Array(10)].map((_, i) => <Star key={i} filled={i < Math.round(Number(avg))} />)}
        <span className="ml-2 text-amber-100/80">{avg}/10 ({reviews.length})</span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mb-10">
        <div className="flex items-center mb-4">
          {[...Array(10)].map((_, i) => (
            <button key={i} type="button" onClick={() => setStars(i + 1)}>
              <Star filled={i < stars} />
            </button>
          ))}
          <span className="ml-4 text-sm text-amber-100/60">
            {stars ? `${stars}/10` : t('reviews.clickToRate')}
          </span>
        </div>

        <input
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          placeholder={t('reviews.nicknamePlaceholder')}
          className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-2 mb-3
                     text-white placeholder-amber-100/40 focus:outline-none focus:border-amber-500"
        />

        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder={t('reviews.writeReview')}
          rows={3}
          className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 mb-3
                     text-white placeholder-amber-100/40 focus:outline-none focus:border-amber-500"
        />

        <button
          disabled={!stars}
          className="px-6 py-2 bg-amber-500 text-black font-medium rounded-lg
                     hover:bg-amber-400 disabled:opacity-50"
        >
          {myReview ? t('reviews.updateReview') : t('reviews.submitReview')}
        </button>
      </form>

      {/* List */}
      {loading ? (
        <div className="text-amber-100/60">{t('reviews.loading')}</div>
      ) : reviews.length === 0 ? (
        <div className="text-amber-100/60">{t('reviews.noReviews')}</div>
      ) : (
        <div className="space-y-6">
          {reviews.map(r => (
            <div key={r._id} className="border-b border-amber-100/10 pb-6 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-amber-100/80 font-medium">{r.nickname}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-amber-100/60 text-sm">{new Date(r.createdAt).toLocaleDateString()}</span>
                  {/* Delete button - backend checks IP-based ownership */}
                  <button
                    onClick={() => handleDelete(r._id)}
                    className="text-red-400/60 hover:text-red-400 transition-colors"
                    title="Delete this review (only works if it's yours)"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex items-center mb-1">
                {[...Array(10)].map((_, i) => <Star key={i} filled={i < r.rating} />)}
                <span className="ml-2 text-amber-100/80">{r.rating}/10</span>
              </div>
              {r.comment && <p className="text-gray-200">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewSection;

