import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api.js';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const Star = ({ filled }) => (
  <svg className={`w-6 h-6 ${filled ? 'text-amber-400' : 'text-gray-500'}`} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969
             0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755
             1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1
             1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0
             00.951-.69l1.07-3.292z"/>
  </svg>
);

const ReviewSection = ({ movieId }) => {
  const [deviceId, setDeviceId] = useState('');
  const [nickname, setNickname] = useState('');
  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);
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
    const { data } = await axios.get(
      `${API_BASE_URL}/api/reviews/movie/${movieId}`
    );
    const list = Array.isArray(data) ? data
               : Array.isArray(data.reviews) ? data.reviews
               : [];
    setReviews(list);
    setMyReview(list.find(r => r.deviceId === deviceId) || null);
    setLoading(false);
  };

  useEffect(() => {
    if (deviceId) fetchReviews();
  }, [deviceId]);

  /* submit or update */
  const handleSubmit = async e => {
    e.preventDefault();
    if (nickname) localStorage.setItem(`nickname-${deviceId}`, nickname);
    await axios.post(
      `${API_BASE_URL}/api/reviews`,
      {
        movieId, deviceId, nickname: nickname || 'Anonymous',
        rating: stars, comment
      }
    );
    setStars(0); setComment('');
    fetchReviews();
  };

  const avg = reviews.length
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <div className="mt-16 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-amber-100/10 rounded-lg p-8">
      <h2 className="text-2xl font-light mb-4 text-amber-100/90">Reviews</h2>

      {/* Average */}
      <div className="flex items-center mb-6">
        {[...Array(10)].map((_, i) => <Star key={i} filled={i < Math.round(avg)} />)}
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
            {stars ? `${stars}/10` : 'Click to rate'}
          </span>
        </div>

        <input
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          placeholder="Nickname (optional)"
          className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-2 mb-3
                     text-white placeholder-amber-100/40 focus:outline-none focus:border-amber-500"
        />

        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Write a short review (optional)…"
          rows="3"
          className="w-full bg-white/5 border border-amber-100/20 rounded-lg px-4 py-3 mb-3
                     text-white placeholder-amber-100/40 focus:outline-none focus:border-amber-500"
        />

        <button
          disabled={!stars}
          className="px-6 py-2 bg-amber-500 text-black font-medium rounded-lg
                     hover:bg-amber-400 disabled:opacity-50"
        >
          {myReview ? 'Update Review' : 'Submit Review'}
        </button>
      </form>

      {/* List */}
      {loading ? (
        <div className="text-amber-100/60">Loading reviews…</div>
      ) : reviews.length === 0 ? (
        <div className="text-amber-100/60">No reviews yet.</div>
      ) : (
        <div className="space-y-6">
          {reviews.map(r => (
            <div key={r._id} className="border-b border-amber-100/10 pb-6 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-amber-100/80 font-medium">{r.nickname}</span>
                <span className="text-amber-100/60 text-sm">{new Date(r.createdAt).toLocaleDateString()}</span>
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
