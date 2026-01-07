import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth';
import type { RootStackScreenProps } from '../navigation/types';

type NavigationProp = RootStackScreenProps<'Main'>['navigation'];

type MenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  showBorder?: boolean;
  color?: string;
};

const MenuItem = ({ icon, label, onPress, showBorder = true, color }: MenuItemProps) => (
  <TouchableOpacity
    style={[styles.menuItem, !showBorder && styles.menuItemNoBorder]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.menuIconContainer, color && { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={20} color={color || '#F59E0B'} />
    </View>
    <Text style={styles.menuText}>{label}</Text>
    <Ionicons name="chevron-forward" size={20} color="#4B5563" />
  </TouchableOpacity>
);

const ProfileScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout, refreshUser } = useAuth();

  // Edit Profile Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  // ===== AVATAR HANDLERS =====
  const handleEditAvatar = async () => {
    Alert.alert(
      'Change Profile Photo',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (permission.granted) {
              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled) {
                Alert.alert('Photo Selected', 'Avatar upload coming soon!');
              }
            } else {
              Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
            }
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permission.granted) {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled) {
                Alert.alert('Photo Selected', 'Avatar upload coming soon!');
              }
            } else {
              Alert.alert('Permission Denied', 'Photo library permission is required.');
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // ===== MY LIBRARY HANDLERS =====
  const handleFavoriteFilms = () => {
    // Navigate to Watchlist tab which shows favorites
    navigation.navigate('Main', { screen: 'Watchlist' });
  };

  const handleWatchlist = () => {
    navigation.navigate('Main', { screen: 'Watchlist' });
  };

  const handleMyReviews = () => {
    Alert.alert('My Reviews', 'Your reviews feature coming soon!');
  };

  // ===== SETTINGS HANDLERS =====
  const handleEditProfile = () => {
    setEditDisplayName(user?.displayName || user?.username || '');
    setEditBio(user?.bio || '');
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editDisplayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const result = await authService.updateProfile({
        displayName: editDisplayName.trim(),
        bio: editBio.trim(),
      });

      if (result.success) {
        await refreshUser?.();
        setShowEditModal(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotifications = () => {
    navigation.navigate('Notifications');
  };

  const handlePrivacy = () => {
    Alert.alert(
      'Privacy Settings',
      'Choose your privacy preference',
      [
        { text: 'Public Profile', onPress: () => Alert.alert('Saved', 'Your profile is now public') },
        { text: 'Private Profile', onPress: () => Alert.alert('Saved', 'Your profile is now private') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handlePreferences = () => {
    Alert.alert(
      'Preferences',
      'App preferences',
      [
        { text: 'Notifications: On', style: 'default' },
        { text: 'Done', style: 'cancel' },
      ]
    );
  };

  // ===== SUPPORT HANDLERS =====
  const handleHelpFAQ = () => {
    Alert.alert(
      'Help & FAQ',
      'How can we help you?',
      [
        {
          text: 'Visit Help Center',
          onPress: () => Linking.openURL('https://nemaa.netlify.app').catch(() =>
            Alert.alert('Error', 'Could not open help center')
          )
        },
        { text: 'Report a Bug', onPress: () => handleContactUs('Bug Report') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleContactUs = (subject = 'General Inquiry') => {
    const email = 'nemaarchives@gmail.com';
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(`NEMA App - ${subject}`)}`;

    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert(
        'Contact Us',
        `Email us at: ${email}`,
        [{ text: 'OK' }]
      );
    });
  };

  const handleTermsPrivacy = () => {
    Alert.alert(
      'Legal',
      'Choose a document to view',
      [
        {
          text: 'Terms of Service',
          onPress: () => Linking.openURL('https://nemaa.netlify.app').catch(() =>
            Alert.alert('Terms of Service', 'By using NEMA, you agree to our terms and conditions.')
          )
        },
        {
          text: 'Privacy Policy',
          onPress: () => Linking.openURL('https://nemaa.netlify.app').catch(() =>
            Alert.alert('Privacy Policy', 'We respect your privacy and protect your data.')
          )
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // ===== STATS HANDLERS =====
  const handleWatchedStats = () => {
    Alert.alert('Films Watched', `You've watched ${user?.stats?.filmsWatched || 0} films!`);
  };

  const handleReviewsStats = () => {
    Alert.alert('Reviews Written', `You've written ${user?.stats?.reviewsWritten || 0} reviews!`);
  };

  const handleFollowersStats = () => {
    const count = user?.stats?.followersCount || user?.followers?.length || 0;
    Alert.alert('Followers', `You have ${count} followers`);
  };

  const handleFollowingStats = () => {
    const count = user?.stats?.followingCount || user?.following?.length || 0;
    Alert.alert('Following', `You're following ${count} users`);
  };

  // Show login/register options if not authenticated
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.authContainer}>
          <View style={styles.authIconContainer}>
            <Ionicons name="person-circle-outline" size={80} color="#4B5563" />
          </View>
          <Text style={styles.authTitle}>Join NEMA</Text>
          <Text style={styles.authSubtitle}>
            Sign in to track your watchlist, write reviews, and connect with other movie lovers
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Ionicons name="log-in-outline" size={20} color="#000" />
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.8}
          >
            <Text style={styles.registerButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const initials = (user.displayName?.charAt(0) || user.username?.charAt(0) || 'U').toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.avatarPlaceholder}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </LinearGradient>
            )}
            <TouchableOpacity style={styles.editAvatarButton} activeOpacity={0.8} onPress={handleEditAvatar}>
              <Ionicons name="camera" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.displayName}>{user.displayName || user.username}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statItem} activeOpacity={0.7} onPress={handleWatchedStats}>
            <Text style={styles.statValue}>{user.stats?.filmsWatched || 0}</Text>
            <Text style={styles.statLabel}>Watched</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem} activeOpacity={0.7} onPress={handleReviewsStats}>
            <Text style={styles.statValue}>{user.stats?.reviewsWritten || 0}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem} activeOpacity={0.7} onPress={handleFollowersStats}>
            <Text style={styles.statValue}>{user.stats?.followersCount || user.followers?.length || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem} activeOpacity={0.7} onPress={handleFollowingStats}>
            <Text style={styles.statValue}>{user.stats?.followingCount || user.following?.length || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        {/* Library Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>My Library</Text>
          <View style={styles.menuContainer}>
            <MenuItem icon="heart" label="Favorite Films" color="#EF4444" onPress={handleFavoriteFilms} />
            <MenuItem icon="bookmark" label="Watchlist" color="#3B82F6" onPress={handleWatchlist} />
            <MenuItem icon="create" label="My Reviews" color="#10B981" showBorder={false} onPress={handleMyReviews} />
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.menuContainer}>
            <MenuItem icon="person" label="Edit Profile" onPress={handleEditProfile} />
            <MenuItem icon="notifications" label="Notifications" onPress={handleNotifications} />
            <MenuItem icon="shield-checkmark" label="Privacy" onPress={handlePrivacy} />
            <MenuItem icon="settings" label="Preferences" showBorder={false} onPress={handlePreferences} />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.menuContainer}>
            <MenuItem icon="help-circle" label="Help & FAQ" onPress={handleHelpFAQ} />
            <MenuItem icon="mail" label="Contact Us" onPress={() => handleContactUs()} />
            <MenuItem icon="document-text" label="Terms & Privacy" showBorder={false} onPress={handleTermsPrivacy} />
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>NEMA v1.0.0</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={editDisplayName}
                onChangeText={setEditDisplayName}
                placeholder="Enter display name"
                placeholderTextColor="#6B7280"
                maxLength={50}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Tell us about yourself"
                placeholderTextColor="#6B7280"
                multiline
                maxLength={200}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{editBio.length}/200</Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSaveProfile}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#000',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0F0F0F',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  username: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
  },
  bio: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#2A2A2A',
  },
  sectionContainer: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  menuItemNoBorder: {
    borderBottomWidth: 0,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F59E0B20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    marginHorizontal: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    color: '#4B5563',
    fontSize: 12,
    marginTop: 24,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  authIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  authTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  authSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 22,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
    width: '100%',
    gap: 8,
  },
  signInButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
  registerButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    paddingVertical: 16,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#F59E0B',
    fontWeight: '600',
    fontSize: 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  bioInput: {
    height: 100,
    paddingTop: 14,
  },
  charCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});

export default ProfileScreen;
