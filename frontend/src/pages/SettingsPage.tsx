import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useSettings, LanguageKey } from '../context/SettingsContext';

// Language configuration type
interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

// Languages data - mirroring SettingsContext
const languages: Record<string, LanguageConfig> = {
  en: { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  ko: { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  it: { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
};
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import API_BASE_URL from '../config/api';

interface Message {
  type: string;
  text: string;
}

interface Section {
  id: string;
  name: string;
  icon: string;
}

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile, changePassword, deleteAccount, loading, isAuthenticated, refreshUser } = useUser();
  const { language, setLanguage, t } = useSettings();

  // Profile settings
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<Message>({ type: '', text: '' });

  // Password settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<Message>({ type: '', text: '' });

  // Avatar/Banner
  const [isUploading, setIsUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Active section
  const [activeSection, setActiveSection] = useState('profile');

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<Message>({ type: '', text: '' });

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/settings' } } });
    }
  }, [isAuthenticated, loading, navigate]);

  // Load user data
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage({ type: '', text: '' });

    try {
      const result = await updateProfile({ displayName, bio });
      if (result.success) {
        setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        setProfileMessage({ type: 'error', text: result.error || 'Failed to update profile' });
      }
    } catch (error) {
      setProfileMessage({ type: 'error', text: 'An error occurred while updating profile' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordMessage({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      setPasswordSaving(false);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      setPasswordSaving(false);
      return;
    }

    try {
      const result = await changePassword(currentPassword, newPassword);
      if (result.success) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage({ type: 'error', text: result.error || 'Failed to change password' });
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: 'An error occurred while changing password' });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleImageUpload = async (file: File | undefined, type: string) => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/upload-image`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (response.ok) {
        if (refreshUser) {
          await refreshUser();
        }
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setDeleteMessage({ type: 'error', text: 'Please type DELETE to confirm' });
      return;
    }

    setDeleting(true);
    setDeleteMessage({ type: '', text: '' });

    try {
      const result = await deleteAccount(deletePassword);
      if (result.success) {
        navigate('/');
      } else {
        setDeleteMessage({ type: 'error', text: result.error || 'Failed to delete account' });
      }
    } catch (error) {
      setDeleteMessage({ type: 'error', text: 'An error occurred while deleting account' });
    } finally {
      setDeleting(false);
    }
  };

  const sections: Section[] = [
    { id: 'profile', name: t('settings.profile'), icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'account', name: t('settings.account'), icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    { id: 'language', name: t('settings.language'), icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <NavBar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <NavBar />

      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-light text-white tracking-wide">{t('settings.title')}</h1>
            <p className="text-amber-100/60 mt-2">{t('settings.subtitle')}</p>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar */}
            <div className="md:w-56 flex-shrink-0">
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeSection === section.id
                        ? 'bg-amber-500/10 text-amber-100 border border-amber-500/30'
                        : 'text-amber-100/60 hover:bg-white/5 hover:text-amber-100'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
                    </svg>
                    {section.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1">
              {/* Profile Section */}
              {activeSection === 'profile' && (
                <div className="space-y-6">
                  <div className="bg-white/5 border border-amber-100/10 rounded-xl p-6">
                    <h2 className="text-xl font-light text-white mb-6">{t('settings.profileInfo')}</h2>

                    {/* Avatar & Banner */}
                    <div className="mb-8">
                      <div className="flex items-start gap-6">
                        {/* Avatar */}
                        <div className="relative group">
                          <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-amber-500 to-rose-500">
                            {user?.avatar ? (
                              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-black">
                                {user?.displayName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => avatarInputRef.current?.click()}
                            disabled={isUploading}
                            className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                          <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e.target.files?.[0], 'avatar')}
                          />
                        </div>

                        <div className="flex-1">
                          <h3 className="text-amber-100 font-medium mb-1">{t('settings.profilePicture')}</h3>
                          <p className="text-amber-100/50 text-sm mb-3">{t('settings.clickToUpload')}</p>

                          <h3 className="text-amber-100 font-medium mb-1 mt-4">{t('settings.bannerImage')}</h3>
                          <p className="text-amber-100/50 text-sm mb-2">{t('settings.recommendedSize')}</p>
                          <button
                            onClick={() => bannerInputRef.current?.click()}
                            disabled={isUploading}
                            className="px-4 py-2 text-sm bg-white/5 border border-amber-100/20 rounded-lg text-amber-100/80 hover:bg-white/10 hover:border-amber-100/40 transition-colors"
                          >
                            {isUploading ? t('settings.uploading') : t('settings.uploadBanner')}
                          </button>
                          <input
                            ref={bannerInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e.target.files?.[0], 'banner')}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Profile Form */}
                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm text-amber-100/70 mb-2">{t('settings.displayName')}</label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full px-4 py-3 bg-black/50 border border-amber-100/20 rounded-lg text-white placeholder-amber-100/30 focus:outline-none focus:border-amber-500/50 transition-colors"
                          placeholder={t('settings.displayNamePlaceholder')}
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-amber-100/70 mb-2">{t('settings.bio')}</label>
                        <textarea
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          rows={4}
                          maxLength={500}
                          className="w-full px-4 py-3 bg-black/50 border border-amber-100/20 rounded-lg text-white placeholder-amber-100/30 focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
                          placeholder={t('settings.bioPlaceholder')}
                        />
                        <p className="text-right text-amber-100/40 text-sm mt-1">{bio.length}/500</p>
                      </div>

                      {profileMessage.text && (
                        <div className={`p-3 rounded-lg text-sm ${
                          profileMessage.type === 'success'
                            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                            : 'bg-red-500/10 border border-red-500/30 text-red-400'
                        }`}>
                          {profileMessage.text}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="px-6 py-3 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {profileSaving ? t('settings.saving') : t('settings.save')}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Account Section */}
              {activeSection === 'account' && (
                <div className="space-y-6">
                  {/* Account Info */}
                  <div className="bg-white/5 border border-amber-100/10 rounded-xl p-6">
                    <h2 className="text-xl font-light text-white mb-6">{t('settings.accountInfo')}</h2>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-amber-100/70 mb-2">{t('settings.username')}</label>
                        <div className="px-4 py-3 bg-black/30 border border-amber-100/10 rounded-lg text-amber-100/60">
                          @{user?.username}
                        </div>
                        <p className="text-amber-100/40 text-xs mt-1">{t('settings.usernameCannotChange')}</p>
                      </div>

                      <div>
                        <label className="block text-sm text-amber-100/70 mb-2">{t('settings.email')}</label>
                        <div className="px-4 py-3 bg-black/30 border border-amber-100/10 rounded-lg text-amber-100/60">
                          {user?.email}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-amber-100/70 mb-2">{t('settings.memberSince')}</label>
                        <div className="px-4 py-3 bg-black/30 border border-amber-100/10 rounded-lg text-amber-100/60">
                          {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(language, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Change Password */}
                  <div className="bg-white/5 border border-amber-100/10 rounded-xl p-6">
                    <h2 className="text-xl font-light text-white mb-6">{t('settings.changePassword')}</h2>

                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm text-amber-100/70 mb-2">{t('settings.currentPassword')}</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-black/50 border border-amber-100/20 rounded-lg text-white placeholder-amber-100/30 focus:outline-none focus:border-amber-500/50 transition-colors"
                          placeholder={t('settings.currentPasswordPlaceholder')}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-amber-100/70 mb-2">{t('settings.newPassword')}</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-black/50 border border-amber-100/20 rounded-lg text-white placeholder-amber-100/30 focus:outline-none focus:border-amber-500/50 transition-colors"
                          placeholder={t('settings.newPasswordPlaceholder')}
                          required
                          minLength={6}
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-amber-100/70 mb-2">{t('settings.confirmNewPassword')}</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-black/50 border border-amber-100/20 rounded-lg text-white placeholder-amber-100/30 focus:outline-none focus:border-amber-500/50 transition-colors"
                          placeholder={t('settings.confirmPasswordPlaceholder')}
                          required
                        />
                      </div>

                      {passwordMessage.text && (
                        <div className={`p-3 rounded-lg text-sm ${
                          passwordMessage.type === 'success'
                            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                            : 'bg-red-500/10 border border-red-500/30 text-red-400'
                        }`}>
                          {passwordMessage.text}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={passwordSaving}
                        className="px-6 py-3 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {passwordSaving ? t('settings.updating') : t('settings.updatePassword')}
                      </button>
                    </form>
                  </div>

                  {/* Delete Account */}
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <h2 className="text-xl font-light text-red-400">Delete Account</h2>
                    </div>
                    <p className="text-amber-100/60 text-sm mb-4">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 hover:border-red-500/50 transition-colors"
                    >
                      Delete my account
                    </button>
                  </div>
                </div>
              )}

              {/* Language Section */}
              {activeSection === 'language' && (
                <div className="space-y-6">
                  <div className="bg-white/5 border border-amber-100/10 rounded-xl p-6">
                    <h2 className="text-xl font-light text-white mb-6">{t('settings.language')}</h2>
                    <p className="text-amber-100/60 text-sm mb-6">{t('settings.selectLanguage')}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(languages).map(([code, lang]) => (
                        <button
                          key={code}
                          onClick={() => setLanguage(code as LanguageKey)}
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                            language === code
                              ? 'border-amber-500 bg-amber-500/10'
                              : 'border-amber-100/10 hover:border-amber-100/30 bg-white/5'
                          }`}
                        >
                          <span className="text-2xl">{lang.flag}</span>
                          <div className="text-left flex-1">
                            <p className="text-white font-medium">{lang.name}</p>
                            <p className="text-amber-100/50 text-sm">{lang.nativeName}</p>
                          </div>
                          {language === code && (
                            <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-amber-100 text-sm font-medium">{t('settings.languageAutoSave')}</p>
                          <p className="text-amber-100/60 text-xs mt-1">{t('settings.someContentOriginal')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => {
              setShowDeleteModal(false);
              setDeletePassword('');
              setDeleteConfirmText('');
              setDeleteMessage({ type: '', text: '' });
            }}
          />
          <div className="relative bg-black border border-red-500/20 rounded-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">Delete Account</h3>
                <p className="text-sm text-red-400">This action cannot be undone</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-amber-100/70 text-sm">
                This will permanently delete your account and all associated data. You will lose:
              </p>
              <ul className="text-amber-100/60 text-sm space-y-1 list-disc list-inside">
                <li>All your reviews and ratings</li>
                <li>All your comments</li>
                <li>Your watchlist and favorites</li>
                <li>All messages and conversations</li>
                <li>Your followers and following</li>
              </ul>

              <div>
                <label className="block text-sm text-amber-100/70 mb-2">
                  Enter your password to confirm
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-4 py-3 bg-black/50 border border-red-500/20 rounded-lg text-white placeholder-amber-100/30 focus:outline-none focus:border-red-500/50 transition-colors"
                  placeholder="Your password"
                />
              </div>

              <div>
                <label className="block text-sm text-amber-100/70 mb-2">
                  Type <span className="text-red-400 font-mono">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-4 py-3 bg-black/50 border border-red-500/20 rounded-lg text-white placeholder-amber-100/30 focus:outline-none focus:border-red-500/50 transition-colors font-mono"
                  placeholder="DELETE"
                />
              </div>

              {deleteMessage.text && (
                <div className="p-3 rounded-lg text-sm bg-red-500/10 border border-red-500/30 text-red-400">
                  {deleteMessage.text}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                    setDeleteConfirmText('');
                    setDeleteMessage({ type: '', text: '' });
                  }}
                  className="flex-1 px-4 py-3 bg-white/5 border border-amber-100/20 text-amber-100 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || !deletePassword || deleteConfirmText !== 'DELETE'}
                  className="flex-1 px-4 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default SettingsPage;

