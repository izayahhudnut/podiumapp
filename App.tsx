import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
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
  upsertProfile,
  type ProfileRecord,
} from './src/lib/profile';
import type { EditProfileValues } from './src/screens/ProfileScreen';
import {
  createDebate,
  deleteDebate,
  endDebate,
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
import { colors } from './src/theme';

type Screen = 'home' | 'create' | 'profile' | 'room';
type AuthVariant = 'sign-in' | 'sign-up' | 'complete-profile';

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
    isLive: false,
    viewers: '0',
    topic: debate.topic,
    isPublic: debate.is_public,
    scheduledFor: debate.scheduled_for ? formatScheduledFor(debate.scheduled_for) : undefined,
    image: debate.thumbnail_url ?? undefined,
  };
}

export default function App() {
  const configError = getEnvErrorMessage();
  const presenceChannelsRef = useRef<Record<string, RealtimeChannel>>({});
  const [screen, setScreen] = useState<Screen>('home');
  const [session, setSession] = useState<Session | null>(null);
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
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [presenceSnapshots, setPresenceSnapshots] = useState<Record<string, DebatePresenceState>>(
    {},
  );
  const [debatesLoading, setDebatesLoading] = useState(false);
  const [debatesError, setDebatesError] = useState<string | null>(null);
  const [createDebateError, setCreateDebateError] = useState<string | null>(null);
  const [createDebateSubmitting, setCreateDebateSubmitting] = useState(false);

  const currentUserName =
    (session?.user.user_metadata?.full_name as string | undefined) ??
    session?.user.email?.split('@')[0] ??
    'Podium User';
  const currentUserAvatar = getInitials(currentUserName);
  const currentUser = session
    ? { id: session.user.id, name: currentUserName, avatar: currentUserAvatar }
    : undefined;

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
        if (active) setSession(initialSession);
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
      if (active) setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configError]);

  // Load debates when session is ready
  useEffect(() => {
    if (configError || !session) {
      setPublicLiveDebates([]);
      setPublicScheduledDebates([]);
      setPresenceSnapshots({});
      setUserProfile(null);
      setUserDebates([]);
      setLikedDebates([]);
      setLikedDebateIds(new Set());
      setSavedDebates([]);
      setSavedDebateIds(new Set());
      setDebatesLoading(false);
      setDebatesError(null);
      return;
    }

    let active = true;
    setDebatesLoading(true);
    setDebatesError(null);

    const userId = session.user.id;

    async function loadAll() {
      try {
        // Debates are critical — fail loudly if these don't work
        const [liveDebates, scheduledDebates] = await Promise.all([
          getPublicLiveDebates(),
          getPublicScheduledDebates(),
        ]);
        if (active) {
          setPublicLiveDebates(liveDebates);
          setPublicScheduledDebates(scheduledDebates);
        }
      } catch (error) {
        if (active) {
          setDebatesError(
            error instanceof Error ? error.message : 'Unable to load debates.',
          );
        }
      } finally {
        if (active) setDebatesLoading(false);
      }

      // Profile data is secondary — don't let failures block the debates feed
      try {
        const [profile, myDebates, myLiked, myLikedIds, mySaved, mySavedIds] = await Promise.all([
          getOrCreateProfile(userId),
          getUserDebates(userId),
          getLikedDebates(userId),
          getLikedDebateIds(userId),
          getSavedDebates(userId),
          getSavedDebateIds(userId),
        ]);
        if (active) {
          setUserProfile(profile);
          setUserDebates(myDebates);
          setLikedDebates(myLiked);
          setLikedDebateIds(new Set(myLikedIds));
          setSavedDebates(mySaved);
          setSavedDebateIds(new Set(mySavedIds));
        }
      } catch {
        // Profile tables may not exist yet — silently ignore
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
    if (configError || !session) {
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
      setPublicLiveDebates([]);
      setPublicScheduledDebates([]);
      setPresenceSnapshots({});
      setUserProfile(null);
      setUserDebates([]);
      setLikedDebates([]);
      setLikedDebateIds(new Set());
      setSavedDebates([]);
      setSavedDebateIds(new Set());
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create the debate.';
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
    } catch (error) {
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
        await endDebate(activeLiveDebate.id, session.user.id);
        setPublicLiveDebates((current) =>
          current.filter((debate) => debate.id !== activeLiveDebate.id),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to end the live debate.';
        setCreateDebateError(message);
      }
    }

    setActiveLiveDebate(null);
    setScreen('home');
  }

  function handleOpenDebate(debateId: string) {
    // Live debate — enter the room
    const nextLiveDebate = publicLiveDebates.find((debate) => debate.id === debateId);
    if (nextLiveDebate) {
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

        {!session ? (
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
          />
        ) : null}

        {session && screen === 'home' ? (
          <HomeScreen
            debates={homeDebates}
            errorMessage={debatesError}
            loading={debatesLoading}
            currentUserId={session.user.id}
            onOpenDebate={handleOpenDebate}
            onStartScheduled={handleStartScheduled}
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
          />
        ) : null}

        {session && screen === 'room' && activeLiveDebate ? (
          <DebateRoomScreen
            debate={activeLiveDebate}
            liveDebateId={activeLiveDebate.id}
            currentUser={currentUser}
            showCameraPreview={activeLiveDebate.host_user_id === session.user.id}
            isLiked={likedDebateIds.has(activeLiveDebate.id)}
            onToggleLike={() => void handleToggleLike(activeLiveDebate.id)}
            onClose={() => {
              void handleCloseLiveDebate();
            }}
          />
        ) : null}

        {session && screen !== 'room' ? <AppNav active={screen} onChange={setScreen} /> : null}
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
