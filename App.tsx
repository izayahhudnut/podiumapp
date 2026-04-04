import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import { StyleSheet, View } from 'react-native';
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';

import { AppNav } from './src/components/AppNav';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { AuthScreen } from './src/screens/AuthScreen';
import {
  CreateDebateScreen,
  type CreateDebateValues,
} from './src/screens/CreateDebateScreen';
import { DebateRoomScreen } from './src/screens/DebateRoomScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { checkBackendConnection } from './src/lib/backend';
import {
  getCurrentSession,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  subscribeToAuthChanges,
  updateUserProfile,
} from './src/lib/auth';
import {
  getOrCreateProfile,
  getUserDebates,
  getLikedDebates,
  getLikedDebateIds,
  likeDebate,
  unlikeDebate,
  getSavedDebates,
  getSavedDebateIds,
  saveDebate,
  unsaveDebate,
  followUser,
  unfollowUser,
  getFollowingIds,
  getFollowerCount,
  getFollowingCount,
  upsertProfile,
  type ProfileRecord,
} from './src/lib/profile';
import type { EditProfileValues } from './src/screens/ProfileScreen';
import {
  createDebate,
  deleteDebate,
  endDebate,
  endDebateWithStats,
  getDebateMessages,
  getPublicLiveDebates,
  getPublicScheduledDebates,
  startScheduledDebate,
  subscribeToDebatePresence,
  subscribeToDebates,
  type DebateChangePayload,
  type DebatePresenceState,
  type DebateRecord,
  unsubscribeFromChannel,
} from './src/lib/debates';
import type { DebateCardItem } from './src/data/mockDebates';
import { uploadDebateThumbnail } from './src/lib/storage';
import { getEnvErrorMessage } from './src/lib/env';
import { trackLog, trackTrace } from './src/lib/opscompanion';
import { colors } from './src/theme';

type Screen = 'home' | 'create' | 'profile' | 'room';
type AuthVariant = 'sign-in' | 'sign-up' | 'complete-profile';
type GuestUser = {
  id: string;
  name: string;
  avatar: string;
};

function getInitials(value: string) {
  return (
    value
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() ?? '')
      .join('') || 'PD'
  );
}

function formatStartedAt(createdAt: string) {
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return 'Just now';
  const diffMs = Math.max(0, Date.now() - createdTime);
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function formatScheduledFor(scheduledFor: string) {
  const date = new Date(scheduledFor);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  if (diffMs <= 0) return 'Starting soon';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `in ${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `Today ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return `Tomorrow ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function sortDebatesByCreatedAt(debates: DebateRecord[]) {
  return [...debates].sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
}

function sortDebatesByScheduledFor(debates: DebateRecord[]) {
  return [...debates].sort(
    (left, right) =>
      new Date(left.scheduled_for ?? 0).getTime() -
      new Date(right.scheduled_for ?? 0).getTime(),
  );
}

function applyLiveDebateChange(
  current: DebateRecord[],
  payload: DebateChangePayload,
): DebateRecord[] {
  if (payload.eventType === 'DELETE') {
    return current.filter((d) => d.id !== payload.old.id);
  }
  if (!payload.new) return current;
  const withoutCurrent = current.filter((d) => d.id !== payload.new?.id);
  if (payload.new.status !== 'live' || !payload.new.is_public) return withoutCurrent;
  return sortDebatesByCreatedAt([payload.new, ...withoutCurrent]);
}

function applyScheduledDebateChange(
  current: DebateRecord[],
  payload: DebateChangePayload,
): DebateRecord[] {
  if (payload.eventType === 'DELETE') {
    return current.filter((d) => d.id !== payload.old.id);
  }
  if (!payload.new) return current;
  const withoutCurrent = current.filter((d) => d.id !== payload.new?.id);
  if (payload.new.status !== 'scheduled' || !payload.new.is_public) return withoutCurrent;
  return sortDebatesByScheduledFor([payload.new, ...withoutCurrent]);
}

function mapLiveDebateToCard(
  debate: DebateRecord,
  state?: DebatePresenceState,
  currentUserAvatar?: string,
): DebateCardItem {
  const hostPresences = state ? Object.values(state).flat() : [];
  const hostPresence = hostPresences.find((p) => p.is_host) ?? null;
  const hostName = hostPresence?.user_name ?? 'Host';
  const viewerCount = state ? Object.keys(state).length : 0;

  return {
    id: debate.id,
    title: debate.title,
    host: hostName,
    hostAvatar: hostPresence?.user_avatar ?? currentUserAvatar ?? getInitials(hostName),
    hostId: debate.host_user_id,
    status: 'live',
    isLive: true,
    viewers: new Intl.NumberFormat('en-US').format(viewerCount),
    topic: debate.topic,
    isPublic: debate.is_public,
    startedAt: formatStartedAt(debate.created_at),
    image: debate.thumbnail_url ?? undefined,
  };
}

function mapScheduledDebateToCard(
  debate: DebateRecord,
  currentUserAvatar?: string,
): DebateCardItem {
  return {
    id: debate.id,
    title: debate.title,
    host: 'You',
    hostAvatar: currentUserAvatar ?? 'PD',
    hostId: debate.host_user_id,
    status: debate.status,
    isLive: false,
    viewers: '0',
    topic: debate.topic,
    isPublic: debate.is_public,
    scheduledFor: debate.scheduled_for ? formatScheduledFor(debate.scheduled_for) : undefined,
    image: debate.thumbnail_url ?? undefined,
    totalJoinedCount: debate.total_joined_count,
    totalMessageCount: debate.total_message_count,
    durationSeconds: debate.duration_seconds,
  };
}

function mapEndedDebateToCard(
  debate: DebateRecord,
  currentUserAvatar?: string,
): DebateCardItem {
  return {
    id: debate.id,
    title: debate.title,
    host: 'You',
    hostAvatar: currentUserAvatar ?? 'PD',
    hostId: debate.host_user_id,
    status: 'ended',
    isLive: false,
    viewers: new Intl.NumberFormat('en-US').format(debate.total_joined_count),
    topic: debate.topic,
    isPublic: debate.is_public,
    scheduledFor: 'Ended',
    image: debate.thumbnail_url ?? undefined,
    totalJoinedCount: debate.total_joined_count,
    totalMessageCount: debate.total_message_count,
    durationSeconds: debate.duration_seconds,
  };
}

function createGuestUser(): GuestUser {
  const suffix = Math.random().toString(36).slice(2, 8);
  const name = `Guest ${suffix.toUpperCase()}`;

  return {
    id: `guest-${suffix}`,
    name,
    avatar: getInitials(name),
  };
}

export default function App() {
  const configError = getEnvErrorMessage();
  const presenceChannelsRef = useRef<Record<string, RealtimeChannel>>({});
  const [screen, setScreen] = useState<Screen>('home');
  const [session, setSession] = useState<Session | null>(null);
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);
  const [authVariant, setAuthVariant] = useState<AuthVariant>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [activeLiveDebate, setActiveLiveDebate] = useState<DebateRecord | null>(null);
  const [publicLiveDebates, setPublicLiveDebates] = useState<DebateRecord[]>([]);
  const [publicScheduledDebates, setPublicScheduledDebates] = useState<DebateRecord[]>([]);
  const [userProfile, setUserProfile] = useState<ProfileRecord | null>(null);
  const [userDebates, setUserDebates] = useState<DebateRecord[]>([]);
  const [likedDebates, setLikedDebates] = useState<DebateRecord[]>([]);
  const [likedDebateIds, setLikedDebateIds] = useState<Set<string>>(new Set());
  const [savedDebates, setSavedDebates] = useState<DebateRecord[]>([]);
  const [savedDebateIds, setSavedDebateIds] = useState<Set<string>>(new Set());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [presenceSnapshots, setPresenceSnapshots] = useState<Record<string, DebatePresenceState>>(
    {},
  );
  const [debatesLoading, setDebatesLoading] = useState(false);
  const [debatesError, setDebatesError] = useState<string | null>(null);
  const [createDebateError, setCreateDebateError] = useState<string | null>(null);
  const [createDebateSubmitting, setCreateDebateSubmitting] = useState(false);

  const isGuestMode = guestUser != null;
  const currentUserName =
    (session?.user.user_metadata?.full_name as string | undefined) ??
    session?.user.email?.split('@')[0] ??
    guestUser?.name ??
    'Podium User';
  const currentUserAvatar =
    guestUser?.avatar ??
    getInitials(currentUserName);
  const currentUser = session
    ? { id: session.user.id, name: currentUserName, avatar: currentUserAvatar }
    : guestUser ?? undefined;

  const liveCards = publicLiveDebates.map((debate) =>
    mapLiveDebateToCard(debate, presenceSnapshots[debate.id], currentUserAvatar),
  );
  const scheduledCards = publicScheduledDebates.map((debate) =>
    mapScheduledDebateToCard(debate, currentUserAvatar),
  );
  const homeDebates = [...liveCards, ...scheduledCards];

  const profileDebateItems: DebateCardItem[] = userDebates.map((debate) =>
    debate.status === 'live'
      ? mapLiveDebateToCard(debate, presenceSnapshots[debate.id], currentUserAvatar)
      : debate.status === 'ended'
        ? mapEndedDebateToCard(debate, currentUserAvatar)
        : mapScheduledDebateToCard(debate, currentUserAvatar),
  );

  const likedDebateItems: DebateCardItem[] = likedDebates.map((debate) =>
    debate.status === 'live'
      ? mapLiveDebateToCard(debate, presenceSnapshots[debate.id])
      : mapScheduledDebateToCard(debate),
  );

  const savedDebateItems: DebateCardItem[] = savedDebates.map((debate) =>
    debate.status === 'live'
      ? mapLiveDebateToCard(debate, presenceSnapshots[debate.id])
      : mapScheduledDebateToCard(debate),
  );

  // Auth initialization
  useEffect(() => {
    if (configError) {
      setAuthError(configError);
      return;
    }

    let active = true;

    async function load() {
      try {
        await checkBackendConnection();
        const initialSession = await getCurrentSession();
        if (active) {
          setSession(initialSession);
          if (initialSession) {
            setGuestUser(null);
          }
        }
      } catch (error) {
        if (active) {
          setAuthError(
            error instanceof Error ? error.message : 'Unable to connect to Supabase right now.',
          );
        }
      }
    }

    load();

    const {
      data: { subscription },
    } = subscribeToAuthChanges((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        if (nextSession) {
          setGuestUser(null);
        }
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configError]);

  // Deep link handling — opens a debate room from a shared link
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    Linking.getInitialURL().then((url) => handleDeepLink(url)).catch(() => {});
    return () => subscription.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicLiveDebates]);

  // Load public debates and session-bound profile data
  useEffect(() => {
    if (configError) {
      setPublicLiveDebates([]);
      setPublicScheduledDebates([]);
      setPresenceSnapshots({});
      setUserProfile(null);
      setUserDebates([]);
      setLikedDebates([]);
      setLikedDebateIds(new Set());
      setSavedDebates([]);
      setSavedDebateIds(new Set());
      setFollowingIds(new Set());
      setFollowerCount(0);
      setFollowingCount(0);
      setDebatesLoading(false);
      setDebatesError(null);
      return;
    }

    let active = true;
    setDebatesLoading(true);
    setDebatesError(null);

    async function loadAll() {
      try {
        const [liveDebates, scheduledDebates] = await Promise.all([
          getPublicLiveDebates(),
          getPublicScheduledDebates(),
        ]);
        if (active) {
          setPublicLiveDebates(liveDebates);
          setPublicScheduledDebates(scheduledDebates);
        }
        void trackLog({
          eventName: 'feed.load.succeeded',
          body: {
            liveCount: liveDebates.length,
            scheduledCount: scheduledDebates.length,
          },
          attributes: { feature: 'feed', 'user.is_guest': isGuestMode },
        });
      } catch (error) {
        if (active) {
          setDebatesError(
            error instanceof Error ? error.message : 'Unable to load debates.',
          );
        }
        void trackLog({
          eventName: 'feed.load.failed',
          severity: 'ERROR',
          body: error instanceof Error ? error.message : 'Unable to load debates.',
          attributes: { feature: 'feed', 'user.is_guest': isGuestMode },
        });
      } finally {
        if (active) setDebatesLoading(false);
      }

      if (!session) {
        if (active) {
          setUserProfile(null);
          setUserDebates([]);
          setLikedDebates([]);
          setLikedDebateIds(new Set());
        }
        return;
      }

      try {
        const [profile, myDebates, myLiked, myLikedIds, mySaved, mySavedIds, myFollowingIds, myFollowerCount, myFollowingCount] = await Promise.all([
          getOrCreateProfile(session.user.id),
          getUserDebates(session.user.id),
          getLikedDebates(session.user.id),
          getLikedDebateIds(session.user.id),
          getSavedDebates(session.user.id),
          getSavedDebateIds(session.user.id),
          getFollowingIds(session.user.id),
          getFollowerCount(session.user.id),
          getFollowingCount(session.user.id),
        ]);
        if (active) {
          setUserProfile(profile);
          setUserDebates(myDebates);
          setLikedDebates(myLiked);
          setLikedDebateIds(new Set(myLikedIds));
          setSavedDebates(mySaved);
          setSavedDebateIds(new Set(mySavedIds));
          setFollowingIds(new Set(myFollowingIds));
          setFollowerCount(myFollowerCount);
          setFollowingCount(myFollowingCount);
        }
      } catch {
      }
    }

    loadAll();

    const channel = subscribeToDebates((payload) => {
      if (!active) return;
      setPublicLiveDebates((current) => applyLiveDebateChange(current, payload));
      setPublicScheduledDebates((current) => applyScheduledDebateChange(current, payload));
    });

    return () => {
      active = false;
      unsubscribeFromChannel(channel);
    };
  }, [configError, session]);

  // Presence subscriptions for live debates
  useEffect(() => {
    if (configError) {
      Object.values(presenceChannelsRef.current).forEach((channel) => {
        unsubscribeFromChannel(channel);
      });
      presenceChannelsRef.current = {};
      setPresenceSnapshots({});
      return;
    }

    const liveDebateIds = new Set(publicLiveDebates.map((debate) => debate.id));

    publicLiveDebates.forEach((debate) => {
      if (presenceChannelsRef.current[debate.id]) return;

      presenceChannelsRef.current[debate.id] = subscribeToDebatePresence(debate.id, {
        onSync: (state) => {
          setPresenceSnapshots((current) => ({ ...current, [debate.id]: state }));
        },
      });
    });

    Object.entries(presenceChannelsRef.current).forEach(([debateId, channel]) => {
      if (liveDebateIds.has(debateId)) return;
      delete presenceChannelsRef.current[debateId];
      unsubscribeFromChannel(channel);
      setPresenceSnapshots((current) => {
        const next = { ...current };
        delete next[debateId];
        return next;
      });
    });
  }, [configError, publicLiveDebates, session]);

  // Cleanup presence on unmount
  useEffect(() => {
    return () => {
      Object.values(presenceChannelsRef.current).forEach((channel) => {
        unsubscribeFromChannel(channel);
      });
    };
  }, []);

  // Close room if active live debate ends
  useEffect(() => {
    if (!activeLiveDebate || !activeLiveDebate.is_public) return;
    const nextDebate = publicLiveDebates.find((debate) => debate.id === activeLiveDebate.id);
    if (nextDebate) {
      if (nextDebate !== activeLiveDebate) setActiveLiveDebate(nextDebate);
      return;
    }
    if (screen === 'room') {
      setActiveLiveDebate(null);
      setScreen('home');
    }
  }, [activeLiveDebate, publicLiveDebates, screen]);

  async function handleSignIn() {
    if (configError) { setAuthError(configError); return; }
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim()) {
      setAuthError('Enter your email and password.');
      return;
    }
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      setGuestUser(null);
      const nextSession = await signInWithPassword(normalizedEmail, password);
      setSession(nextSession ?? null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in right now.');
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleContinueSignUp() {
    if (configError) { setAuthError(configError); return; }
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim()) {
      setAuthError('Enter your email and password.');
      return;
    }
    setAuthError(null);
    setEmail(normalizedEmail);
    setAuthVariant('complete-profile');
  }

  async function handleCompleteProfile() {
    if (configError) { setAuthError(configError); return; }
    if (!name.trim()) { setAuthError('Enter your name.'); return; }
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      setGuestUser(null);
      const result = await signUpWithPassword(
        email.trim().toLowerCase(),
        password,
        name.trim(),
        avatarUri,
      );
      if (result.session) {
        setSession(result.session);
      } else {
        setAuthError(
          'Email confirmation is still enabled in Supabase. Turn it off for the simple password flow.',
        );
      }
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'Unable to create the account right now.',
      );
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handlePickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAuthError('Photo library permission is required to pick a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      mediaTypes: ['images'],
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0]?.uri ?? null);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      setSession(null);
      setGuestUser(null);
      setPublicLiveDebates([]);
      setPublicScheduledDebates([]);
      setPresenceSnapshots({});
      setUserProfile(null);
      setUserDebates([]);
      setLikedDebates([]);
      setLikedDebateIds(new Set());
      setSavedDebates([]);
      setSavedDebateIds(new Set());
      setFollowingIds(new Set());
      setFollowerCount(0);
      setFollowingCount(0);
      setActiveLiveDebate(null);
      setAuthVariant('sign-in');
      setPassword('');
      setName('');
      setAvatarUri(null);
      setAuthError(null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign out right now.');
    }
  }

  function handleContinueAsGuest() {
    const guest = createGuestUser();
    void trackLog({
      eventName: 'auth.continue_as_guest',
      body: { guestId: guest.id },
      attributes: { feature: 'auth' },
    });
    setGuestUser(guest);
    setAuthError(null);
    setAuthVariant('sign-in');
    setPassword('');
    setName('');
    setAvatarUri(null);
    setScreen('home');
  }

  function handleRequireAuth() {
    setGuestUser(null);
    setAuthVariant('sign-in');
    setAuthError(null);
    setScreen('home');
  }

  async function handleEditProfile(values: EditProfileValues) {
    if (!session) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      const [updatedUser, updatedProfile] = await Promise.all([
        updateUserProfile(values.name, values.avatarUri),
        upsertProfile(session.user.id, {
          username: values.username || null,
          bio: values.bio || null,
          avatar_url: values.avatarUri || null,
        }),
      ]);
      setUserProfile(updatedProfile);
      // Refresh session to pick up new auth metadata
      const { data } = await import('./src/lib/supabase').then(async (m) => {
        return m.getSupabaseClient().auth.getUser();
      });
      if (data.user) {
        setSession((prev) => prev ? { ...prev, user: data.user } : prev);
      }
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Unable to save profile.');
      throw error;
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleToggleLike(debateId: string) {
    if (!session) return;
    const alreadyLiked = likedDebateIds.has(debateId);
    // Optimistic update
    setLikedDebateIds((prev) => {
      const next = new Set(prev);
      if (alreadyLiked) next.delete(debateId); else next.add(debateId);
      return next;
    });
    try {
      if (alreadyLiked) {
        await unlikeDebate(session.user.id, debateId);
        setLikedDebates((prev) => prev.filter((d) => d.id !== debateId));
      } else {
        await likeDebate(session.user.id, debateId);
        const debate =
          publicLiveDebates.find((d) => d.id === debateId) ??
          publicScheduledDebates.find((d) => d.id === debateId);
        if (debate) {
          setLikedDebates((prev) => [debate, ...prev]);
        }
      }
    } catch {
      // Revert optimistic update on failure
      setLikedDebateIds((prev) => {
        const next = new Set(prev);
        if (alreadyLiked) next.add(debateId); else next.delete(debateId);
        return next;
      });
    }
  }

  async function handleToggleSave(debateId: string) {
    if (!session) return;
    const alreadySaved = savedDebateIds.has(debateId);
    // Optimistic update
    setSavedDebateIds((prev) => {
      const next = new Set(prev);
      if (alreadySaved) next.delete(debateId); else next.add(debateId);
      return next;
    });
    try {
      if (alreadySaved) {
        await unsaveDebate(session.user.id, debateId);
        setSavedDebates((prev) => prev.filter((d) => d.id !== debateId));
      } else {
        await saveDebate(session.user.id, debateId);
        const debate =
          userDebates.find((d) => d.id === debateId) ??
          publicLiveDebates.find((d) => d.id === debateId) ??
          publicScheduledDebates.find((d) => d.id === debateId) ??
          likedDebates.find((d) => d.id === debateId);
        if (debate) {
          setSavedDebates((prev) => [debate, ...prev]);
        }
      }
    } catch {
      // Revert optimistic update on failure
      setSavedDebateIds((prev) => {
        const next = new Set(prev);
        if (alreadySaved) next.add(debateId); else next.delete(debateId);
        return next;
      });
    }
  }

  function handleDeepLink(url: string | null) {
    if (!url) return;
    const { path } = Linking.parse(url);
    const match = path?.match(/^debate\/([^/]+)$/);
    if (!match) return;
    const debateId = match[1];
    const debate = publicLiveDebates.find((d) => d.id === debateId);
    if (debate) {
      handleOpenDebate(debateId);
    }
  }

  async function handleToggleFollow(targetUserId: string) {
    if (!session) return;
    const alreadyFollowing = followingIds.has(targetUserId);
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (alreadyFollowing) next.delete(targetUserId); else next.add(targetUserId);
      return next;
    });
    setFollowingCount((prev) => prev + (alreadyFollowing ? -1 : 1));
    try {
      if (alreadyFollowing) {
        await unfollowUser(session.user.id, targetUserId);
      } else {
        await followUser(session.user.id, targetUserId);
      }
    } catch {
      // Revert on failure
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (alreadyFollowing) next.add(targetUserId); else next.delete(targetUserId);
        return next;
      });
      setFollowingCount((prev) => prev + (alreadyFollowing ? 1 : -1));
    }
  }

  async function handleDeleteDebate(debateId: string) {
    if (!session) return;
    try {
      await deleteDebate(debateId, session.user.id);
      setUserDebates((prev) => prev.filter((d) => d.id !== debateId));
      setPublicLiveDebates((prev) => prev.filter((d) => d.id !== debateId));
      setPublicScheduledDebates((prev) => prev.filter((d) => d.id !== debateId));
      setSavedDebates((prev) => prev.filter((d) => d.id !== debateId));
      setSavedDebateIds((prev) => {
        const next = new Set(prev);
        next.delete(debateId);
        return next;
      });
    } catch (error) {
      setDebatesError(error instanceof Error ? error.message : 'Unable to delete the debate.');
    }
  }

  async function handleCreateDebate(values: CreateDebateValues) {
    if (configError) { setCreateDebateError(configError); return; }
    if (!session) return;

    if (!values.title || !values.topic) {
      setCreateDebateError('Enter a title and topic before going live.');
      return;
    }

    setCreateDebateSubmitting(true);
    setCreateDebateError(null);

    try {
      const startTimeMs = Date.now();
      let thumbnailUrl: string | null = null;
      if (values.thumbnailUri) {
        thumbnailUrl = await uploadDebateThumbnail(session.user.id, values.thumbnailUri);
      }

      const createdDebate = await createDebate({
        hostUserId: session.user.id,
        title: values.title,
        topic: values.topic,
        description: values.description,
        isPublic: values.isPublic,
        factCheckEnabled: values.factCheckEnabled,
        audienceCommentsEnabled: values.audienceCommentsEnabled,
        askToJoinEnabled: values.askToJoinEnabled,
        scheduledFor: values.scheduledFor,
        thumbnailUrl,
      });

      if (values.scheduledFor) {
        // Scheduled: add to upcoming, return to home
        if (createdDebate.is_public) {
          setPublicScheduledDebates((current) =>
            sortDebatesByScheduledFor([
              createdDebate,
              ...current.filter((d) => d.id !== createdDebate.id),
            ]),
          );
        }
        setScreen('home');
      } else {
        // Live now: enter the room
        if (createdDebate.is_public) {
          setPublicLiveDebates((current) =>
            sortDebatesByCreatedAt([
              createdDebate,
              ...current.filter((d) => d.id !== createdDebate.id),
            ]),
          );
        }
        setActiveLiveDebate(createdDebate);
        setScreen('room');
      }
      void trackTrace({
        name: 'ui.create_debate',
        startTimeMs,
        endTimeMs: Date.now(),
        attributes: {
          feature: 'debates',
          'debate.id': createdDebate.id,
          'debate.is_public': createdDebate.is_public,
          'debate.status': createdDebate.status,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create the debate.';
      void trackLog({
        eventName: 'ui.create_debate.failed',
        severity: 'ERROR',
        body: message,
        attributes: { feature: 'debates' },
      });
      setCreateDebateError(
        `${message} Run supabase/schema.sql in the Supabase SQL editor first.`,
      );
    } finally {
      setCreateDebateSubmitting(false);
    }
  }

  async function handleStartScheduled(debateId: string) {
    if (!session) return;
    try {
      const startedDebate = await startScheduledDebate(debateId, session.user.id);
      setPublicScheduledDebates((current) => current.filter((d) => d.id !== debateId));
      setPublicLiveDebates((current) =>
        sortDebatesByCreatedAt([
          startedDebate,
          ...current.filter((d) => d.id !== debateId),
        ]),
      );
      setActiveLiveDebate(startedDebate);
      setScreen('room');
      void trackLog({
        eventName: 'ui.start_scheduled_debate.succeeded',
        body: { debateId },
        attributes: { feature: 'debates', 'debate.id': debateId },
      });
    } catch (error) {
      void trackLog({
        eventName: 'ui.start_scheduled_debate.failed',
        severity: 'ERROR',
        body: error instanceof Error ? error.message : 'Unable to start the debate.',
        attributes: { feature: 'debates', 'debate.id': debateId },
      });
      setDebatesError(
        error instanceof Error ? error.message : 'Unable to start the debate.',
      );
    }
  }

  async function handleCloseLiveDebate() {
    if (!activeLiveDebate || !session) {
      setActiveLiveDebate(null);
      setScreen('home');
      return;
    }

    if (activeLiveDebate.host_user_id === session.user.id) {
      try {
        const messages = await getDebateMessages(activeLiveDebate.id);
        const participantCount = Object.keys(presenceSnapshots[activeLiveDebate.id] ?? {}).length;
        const durationSeconds = Math.max(
          0,
          Math.round(
            (Date.now() - new Date(activeLiveDebate.created_at).getTime()) / 1000,
          ),
        );
        await endDebateWithStats(activeLiveDebate.id, session.user.id, {
          totalJoinedCount: participantCount,
          totalMessageCount: messages.length,
          durationSeconds,
        });
        setPublicLiveDebates((current) =>
          current.filter((debate) => debate.id !== activeLiveDebate.id),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to end the live debate.';
        setCreateDebateError(message);
      }
    }

    void trackLog({
      eventName: 'ui.close_live_debate',
      body: { debateId: activeLiveDebate.id },
      attributes: { feature: 'debates', 'debate.id': activeLiveDebate.id },
    });

    setActiveLiveDebate(null);
    setScreen('home');
  }

  function handleOpenDebate(debateId: string) {
    // Live debate — enter the room
    const nextLiveDebate = publicLiveDebates.find((debate) => debate.id === debateId);
    if (nextLiveDebate) {
      void trackLog({
        eventName: 'ui.open_live_debate',
        body: { debateId },
        attributes: { feature: 'debates', 'debate.id': debateId },
      });
      setActiveLiveDebate(nextLiveDebate);
      setScreen('room');
      return;
    }

    // Scheduled debate — host can start it, others see nothing
    const scheduledDebate = publicScheduledDebates.find((d) => d.id === debateId);
    if (scheduledDebate) {
      if (scheduledDebate.host_user_id === session?.user.id) {
        void handleStartScheduled(debateId);
      }
      return;
    }

    // Ended / private debates — don't reopen the stream
  }

  return (
    <AppErrorBoundary>
      <View style={styles.appShell}>
        <StatusBar style="light" />

        {!session && !isGuestMode ? (
          <AuthScreen
            variant={authVariant}
            email={email}
            password={password}
            name={name}
            avatarUri={avatarUri}
            errorMessage={configError ?? authError}
            submitting={authSubmitting}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onNameChange={setName}
            onSubmit={
              authVariant === 'sign-in'
                ? handleSignIn
                : authVariant === 'sign-up'
                  ? handleContinueSignUp
                  : handleCompleteProfile
            }
            onSwitchVariant={(variant) => {
              setAuthVariant(variant);
              if (!configError) setAuthError(null);
            }}
            onPickAvatar={handlePickAvatar}
            onContinueAsGuest={handleContinueAsGuest}
          />
        ) : null}

        {(session || isGuestMode) && screen === 'home' ? (
          <HomeScreen
            debates={homeDebates}
            errorMessage={debatesError}
            loading={debatesLoading}
            currentUserId={session?.user.id}
            onOpenDebate={handleOpenDebate}
            onStartScheduled={session ? handleStartScheduled : undefined}
          />
        ) : null}

        {session && screen === 'create' ? (
          <CreateDebateScreen
            onBack={() => setScreen('home')}
            onStartDebate={handleCreateDebate}
            submitting={createDebateSubmitting}
            errorMessage={createDebateError}
          />
        ) : null}

        {session && screen === 'profile' ? (
          <ProfileScreen
            userName={currentUserName}
            userEmail={session.user.email ?? ''}
            userAvatarUri={
              userProfile?.avatar_url ??
              (session.user.user_metadata?.avatar_url as string | undefined) ??
              null
            }
            username={userProfile?.username ?? null}
            bio={userProfile?.bio ?? null}
            debateCount={userDebates.length}
            debates={profileDebateItems}
            likedDebates={likedDebateItems}
            savedDebates={savedDebateItems}
            savedDebateIds={savedDebateIds}
            editSubmitting={editSubmitting}
            editError={editError}
            onEditProfile={handleEditProfile}
            onSignOut={handleSignOut}
            onOpenDebate={handleOpenDebate}
            onSaveDebate={(id) => void handleToggleSave(id)}
            onDeleteDebate={(id) => void handleDeleteDebate(id)}
            followerCount={followerCount}
            followingCount={followingCount}
          />
        ) : null}

        {(session || isGuestMode) && screen === 'room' && activeLiveDebate ? (
          <DebateRoomScreen
            debate={activeLiveDebate}
            liveDebateId={activeLiveDebate.id}
            currentUser={session ? currentUser : undefined}
            mediaParticipant={currentUser}
            canUseRealtimeFeatures={Boolean(session)}
            showCameraPreview={Boolean(session)}
            isLiked={session ? likedDebateIds.has(activeLiveDebate.id) : false}
            onToggleLike={
              session ? () => void handleToggleLike(activeLiveDebate.id) : undefined
            }
            isFollowingHost={followingIds.has(activeLiveDebate.host_user_id)}
            onToggleFollow={() => void handleToggleFollow(activeLiveDebate.host_user_id)}
            onClose={() => {
              void handleCloseLiveDebate();
            }}
          />
        ) : null}

        {(session || isGuestMode) && screen !== 'room' ? (
          <AppNav
            active={screen === 'create' || screen === 'profile' ? screen : 'home'}
            guestMode={isGuestMode}
            onChange={(nextScreen) => {
              if (!session && isGuestMode && nextScreen !== 'home') {
                handleRequireAuth();
                return;
              }
              setScreen(nextScreen);
            }}
          />
        ) : null}
      </View>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
