import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useDownloads } from '../context/DownloadsContext';
import type { DownloadEntry } from '../services/downloads';
import type { RootStackScreenProps } from '../navigation/types';

type NavigationProp = RootStackScreenProps<'Main'>['navigation'];

const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const DownloadsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isAuthenticated } = useAuth();
  const { downloads, activeDownloads, deleteDownload, cancelDownload, isInitialized } = useDownloads();

  const completed: DownloadEntry[] = Object.values(downloads).sort(
    (a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
  );
  const active = Object.values(activeDownloads);

  const handleOpen = (entry: DownloadEntry) => {
    navigation.navigate('VideoPlayer', { movieId: entry.movieId });
  };

  const handleDelete = (entry: DownloadEntry) => {
    Alert.alert(
      'Delete download?',
      `Remove "${entry.title}" from your downloads.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteDownload(entry.movieId) },
      ]
    );
  };

  const renderCompleted = ({ item }: { item: DownloadEntry }) => (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.8}
      onPress={() => handleOpen(item)}
    >
      <Image source={{ uri: item.posterUrl }} style={styles.poster} contentFit="cover" />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.rowMeta}>
          {formatBytes(item.sizeBytes)} · Downloaded {formatDate(item.downloadedAt)}
        </Text>
        <View style={styles.statusRow}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
          <Text style={styles.statusText}>Ready to watch offline</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item)}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
      >
        <Ionicons name="trash-outline" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Downloads</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="lock-closed-outline" size={48} color="#4B5563" />
          </View>
          <Text style={styles.emptyTitle}>Sign in to download movies</Text>
          <Text style={styles.emptySubtitle}>
            Save movies to your device and watch them anywhere, even without a connection.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Ionicons name="log-in-outline" size={20} color="#000" />
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalCount = completed.length + active.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Downloads</Text>
        {totalCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{totalCount}</Text>
          </View>
        )}
      </View>

      {!isInitialized ? null : totalCount === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="cloud-download-outline" size={48} color="#4B5563" />
          </View>
          <Text style={styles.emptyTitle}>No downloads yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the download icon on any movie to save it for offline viewing.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Main', { screen: 'Catalog' })}
            activeOpacity={0.8}
          >
            <Ionicons name="grid-outline" size={20} color="#000" />
            <Text style={styles.primaryButtonText}>Browse Movies</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={completed}
          keyExtractor={(item) => item.movieId}
          renderItem={renderCompleted}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            active.length > 0 ? (
              <View style={styles.activeSection}>
                <Text style={styles.sectionLabel}>In progress</Text>
                {active.map((dl) => (
                  <View key={dl.movieId} style={styles.row}>
                    <Image source={{ uri: dl.posterUrl }} style={styles.poster} contentFit="cover" />
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={2}>{dl.title}</Text>
                      <View style={styles.progressBarTrack}>
                        <View style={[styles.progressBarFill, { width: `${Math.round(dl.progress * 100)}%` }]} />
                      </View>
                      <Text style={styles.rowMeta}>
                        Downloading… {Math.round(dl.progress * 100)}%
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => cancelDownload(dl.movieId)}
                      hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                    >
                      <Ionicons name="close" size={22} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {completed.length > 0 && (
                  <Text style={[styles.sectionLabel, { marginTop: 12 }]}>Downloaded</Text>
                )}
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

const PADDING = 20;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  countText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: PADDING,
    paddingBottom: 24,
  },
  activeSection: {
    marginBottom: 4,
  },
  sectionLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  poster: {
    width: 64,
    height: 96,
    borderRadius: 8,
    backgroundColor: '#222',
    marginRight: 12,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  rowMeta: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#2A2A2A',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  primaryButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default DownloadsScreen;
