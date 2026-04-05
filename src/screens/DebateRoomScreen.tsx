import { useEffect, useRef, useState, type ComponentProps } from 'react';
import * as Linking from 'expo-linking';
import {
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { LiveVideoLayer as LiveVideoLayerType } from './LiveVideoLayer';

// Load LiveKit lazily so the app still works in Expo Go (no native modules).
// In a dev/production build this will resolve to the real implementation.
let LiveVideoLayer: typeof LiveVideoLayerType | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  LiveVideoLayer = (require('./LiveVideoLayer') as { LiveVideoLayer: typeof LiveVideoLayerType }).LiveVideoLayer;
} catch {
  // Running in Expo Go — video is unavailable, fall back to camera preview / glows.
}

import { DebateCardItem, liveRoom } from '../data/mockDebates';
import type {
  DebateJoinState,
  DebateMessageRecord,
  DebatePresenceState,
  DebateRecord,
  DebateStageState,
} from '../lib/debates';
import {
  getDebateMessages,
  getLikeCount,
  sendDebateMessage,
  subscribeToDebateEnd,
  subscribeToDebateLikeCount,
  subscribeToDebatePresence,
  subscribeToDebateMessages,
  unsubscribeFromChannel,
} from '../lib/debates';
import { fetchLivekitToken } from '../lib/livekit';
import { trackLog } from '../lib/opscompanion';
import { colors, radii, spacing } from '../theme';
import { FactCheckStrip } from '../components/FactCheckStrip';
import { GiftOverlay, type GiftOverlayItem } from '../components/GiftOverlay';
import { GiftPicker } from '../components/GiftPicker';
import { LiveComment, type LiveCommentItem } from '../components/LiveComment';
import { subscribeToGiftEvents } from '../lib/gifts';

type DebateRoomScreenProps = {
  debate: DebateCardItem | DebateRecord;
  room?: typeof liveRoom;
  liveDebateId?: string;
  currentUser?: {
    id: string;
    name: string;
    avatar: string;
  };
  mediaParticipant?: {
    id: string;
    name: string;
    avatar: string;
  };
  canUseRealtimeFeatures?: boolean;
  showCameraPreview?: boolean;
  isLiked?: boolean;
  onToggleLike?: () => void;
  isFollowingHost?: boolean;
  onToggleFollow?: () => void;
  onViewHostProfile?: () => void;
  onClose: () => void;
};

type ActionItem = {
  key: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
};

type StageParticipant = {
  id: string;
  name: string;
  avatar: string;
  role: 'host' | 'guest';
  admitted: boolean;
  requestingToJoin: boolean;
  onStage: boolean;
  muted: boolean;
  removed: boolean;
};

function mapRealtimeMessage(message: DebateMessageRecord): LiveCommentItem {
  return {
    id: message.id,
    user: message.user_name,
    userAvatar: message.user_avatar ?? 'PD',
    message: message.body,
  };
}

function mergeMessages(current: LiveCommentItem[], nextMessage: LiveCommentItem) {
  const exists = current.some((message) => message.id === nextMessage.id);
  return exists ? current : [...current, nextMessage];
}

function getParticipantId(name: string, avatar: string) {
  return `${name.trim().toLowerCase().replace(/\s+/g, '-')}:${avatar}`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function getHostParticipant(
  debate: DebateCardItem | DebateRecord,
  currentUser?: DebateRoomScreenProps['currentUser'],
): StageParticipant {
  if (currentUser && 'host_user_id' in debate && debate.host_user_id === currentUser.id) {
    return {
      id: currentUser.id,
      name: currentUser.name,
      avatar: currentUser.avatar,
      role: 'host',
      admitted: true,
      requestingToJoin: false,
      onStage: true,
      muted: false,
      removed: false,
    };
  }

  if ('host' in debate) {
    return {
      id: getParticipantId(debate.host, debate.hostAvatar),
      name: debate.host,
      avatar: debate.hostAvatar,
      role: 'host',
      admitted: true,
      requestingToJoin: false,
      onStage: true,
      muted: false,
      removed: false,
    };
  }

  return {
    id: debate.host_user_id,
    name: 'Host',
    avatar: 'PD',
    role: 'host',
    admitted: true,
    requestingToJoin: false,
    onStage: true,
    muted: false,
    removed: false,
  };
}

function getParticipantFromPresence(
  state: DebatePresenceState,
  current: StageParticipant[],
  requiresAdmission: boolean,
) {
  const hostStageState = Object.values(state)
    .flat()
    .find((presence) => presence.is_host)?.stage_state;
  const hostJoinState = Object.values(state)
    .flat()
    .find((presence) => presence.is_host)?.join_state;
  const next = new Map(current.map((participant) => [participant.id, participant]));

  Object.values(state)
    .flat()
    .forEach((presence) => {
      const existing = next.get(presence.user_id);
      const stageState = hostStageState?.[presence.user_id];
      const joinState = hostJoinState?.[presence.user_id];
      next.set(presence.user_id, {
        id: presence.user_id,
        name: presence.user_name,
        avatar: presence.user_avatar ?? 'PD',
        role: presence.is_host ? 'host' : 'guest',
        admitted: presence.is_host ? true : joinState?.admitted ?? !requiresAdmission,
        requestingToJoin:
          !presence.is_host &&
          (joinState?.requested ?? (requiresAdmission ? presence.request_to_join ?? true : false)),
        onStage: stageState?.on_stage ?? existing?.onStage ?? presence.is_host,
        muted: stageState?.muted ?? existing?.muted ?? false,
        removed: stageState?.removed ?? false,
      });
    });

  return Array.from(next.values()).filter((participant) => state[participant.id]);
}

function getParticipantFromMessage(message: LiveCommentItem): StageParticipant {
  return {
    id: getParticipantId(message.user, message.userAvatar),
    name: message.user,
    avatar: message.userAvatar,
    role: 'guest',
    admitted: true,
    requestingToJoin: false,
    onStage: false,
    muted: false,
    removed: false,
  };
}

function isDebatePublic(debate: DebateCardItem | DebateRecord) {
  return 'is_public' in debate ? debate.is_public : debate.isPublic;
}

function getDebateFeatureSettings(debate: DebateCardItem | DebateRecord) {
  if ('fact_check_enabled' in debate) {
    return {
      factCheckEnabled: debate.fact_check_enabled,
      audienceCommentsEnabled: debate.audience_comments_enabled,
      askToJoinEnabled: debate.ask_to_join_enabled,
    };
  }

  return {
    factCheckEnabled: true,
    audienceCommentsEnabled: true,
    askToJoinEnabled: !debate.isPublic,
  };
}

function sortParticipants(participants: StageParticipant[]) {
  return [...participants].sort((left, right) => {
    if (left.role !== right.role) return left.role === 'host' ? -1 : 1;
    if (left.onStage !== right.onStage) return left.onStage ? -1 : 1;
    return left.name.localeCompare(right.name);
  });
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function DebateRoomScreen({
  debate,
  room,
  liveDebateId,
  currentUser,
  mediaParticipant,
  canUseRealtimeFeatures = false,
  showCameraPreview = false,
  isLiked = false,
  onToggleLike,
  isFollowingHost = false,
  onToggleFollow,
  onViewHostProfile,
  onClose,
}: DebateRoomScreenProps) {
  const inputRef = useRef<TextInput>(null);
  const [messages, setMessages] = useState<LiveCommentItem[]>(room ? room.messages : []);
  const [participants, setParticipants] = useState<StageParticipant[]>([]);
  const [isStageSheetOpen, setIsStageSheetOpen] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const [messageError, setMessageError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [isGiftPickerOpen, setIsGiftPickerOpen] = useState(false);
  const [isInfoSheetOpen, setIsInfoSheetOpen] = useState(false);
  const [giftOverlayItems, setGiftOverlayItems] = useState<GiftOverlayItem[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [permission] = useCameraPermissions();

  // LiveKit state
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(showCameraPreview);
  const presenceChannelRef = useRef<ReturnType<typeof subscribeToDebatePresence> | null>(null);

  const activeMediaParticipant = mediaParticipant ?? currentUser;
  const isRealtimeRoom = Boolean(liveDebateId && canUseRealtimeFeatures && currentUser);
  const hostUserId =
    'host_user_id' in debate ? debate.host_user_id : (debate.hostId ?? null);
  const isGiftEnabled = isRealtimeRoom && Boolean(hostUserId) && currentUser?.id !== hostUserId;
  const hostParticipant = getHostParticipant(debate, currentUser);
  const { factCheckEnabled, audienceCommentsEnabled, askToJoinEnabled } =
    getDebateFeatureSettings(debate);
  const isPrivateDebate = !isDebatePublic(debate);
  const isLiveCreator = Boolean(
    currentUser && 'host_user_id' in debate && debate.host_user_id === currentUser.id,
  );
  const requiresAdmission = isPrivateDebate && askToJoinEnabled;
  const visibleParticipants = sortParticipants(
    participants.filter(
      (participant) => !participant.removed && (participant.admitted || participant.role === 'host'),
    ),
  );
  const pendingParticipants = sortParticipants(
    participants.filter(
      (participant) =>
        participant.requestingToJoin && !participant.admitted && !participant.removed,
    ),
  );
  const currentParticipant = currentUser
    ? participants.find((participant) => participant.id === currentUser.id)
    : null;
  const hasLiveAccess = !requiresAdmission || isLiveCreator || currentParticipant?.admitted === true;
  const title = 'title' in debate ? debate.title : '';
  const topic = debate.topic ?? '';
  const description = 'description' in debate ? (debate.description ?? '') : '';
  const viewerLabel = room?.viewers ?? `${visibleParticipants.length}`;
  const factCheck = room?.factCheck ?? liveRoom.factCheck;
  const bottomBarOffset = keyboardOffset > 0 ? keyboardOffset + spacing.md : 0;
  const actionRailOffset = keyboardOffset > 0 ? bottomBarOffset + 94 : 126;

  const isLiveKitConnected = Boolean(livekitToken && livekitUrl);

  const actionItems: ActionItem[] = room
    ? [
        { key: 'likes', icon: 'heart', label: room.hearts[0] },
        { key: 'gift', icon: 'gift', label: room.hearts[1] },
        { key: 'share', icon: 'share-social', label: room.hearts[2] },
      ]
    : [
        {
          key: 'like',
          icon: isLiked ? 'heart' : 'heart-outline',
          label: isLiked ? 'Liked' : 'Like',
        } as ActionItem,
        ...(isRealtimeRoom && hostUserId && currentUser?.id !== hostUserId
          ? [{
              key: 'follow',
              icon: (isFollowingHost ? 'person-remove-outline' : 'person-add-outline') as ComponentProps<typeof Ionicons>['name'],
              label: isFollowingHost ? 'Following' : 'Follow',
            } as ActionItem]
          : []),
        ...(isGiftEnabled
          ? [{ key: 'gift', icon: 'gift-outline', label: 'Gift' } as ActionItem]
          : []),
        { key: 'share', icon: 'share-social', label: 'Share' },
        ...(audienceCommentsEnabled && hasLiveAccess
          ? [{ key: 'chat', icon: 'chatbubble-ellipses', label: 'Chat' } as ActionItem]
          : []),
        ...(isLiveCreator ? [{ key: 'stage', icon: 'people', label: 'Stage' } as ActionItem] : []),
        ...(showCameraPreview && hasLiveAccess
          ? [
              {
                key: 'mic',
                icon: (micEnabled ? 'mic' : 'mic-off') as ComponentProps<typeof Ionicons>['name'],
                label: micEnabled ? 'Mic' : 'Muted',
              },
              {
                key: 'camera',
                icon: (cameraEnabled ? 'videocam' : 'videocam-off') as ComponentProps<
                  typeof Ionicons
                >['name'],
                label: 'Camera',
              },
            ]
          : []),
      ];

  // Fetch LiveKit token
  useEffect(() => {
    if (!liveDebateId || !activeMediaParticipant || !hasLiveAccess) {
      return;
    }

    let active = true;

    fetchLivekitToken(liveDebateId, activeMediaParticipant.name, showCameraPreview)
      .then(({ token, url }) => {
        if (active) {
          setLivekitToken(token);
          setLivekitUrl(url);
        }
        void trackLog({
          eventName: 'room.connect_ready',
          body: { debateId: liveDebateId, isHost: showCameraPreview },
          attributes: { feature: 'room', 'debate.id': liveDebateId },
        });
      })
      .catch((error) => {
        void trackLog({
          eventName: 'room.connect_failed',
          severity: 'ERROR',
          body: error instanceof Error ? error.message : 'Failed to get LiveKit token.',
          attributes: { feature: 'room', 'debate.id': liveDebateId },
        });
        // Silently fall back to camera preview / glows
      });

    return () => {
      active = false;
    };
  }, [activeMediaParticipant, hasLiveAccess, liveDebateId, showCameraPreview]);

  // Load messages
  useEffect(() => {
    if (!liveDebateId || !canUseRealtimeFeatures || !hasLiveAccess) {
      setMessageError(null);
      return;
    }

    const debateId = liveDebateId;
    let active = true;

    async function loadMessages() {
      try {
        const initialMessages = await getDebateMessages(debateId);
        if (active) {
          setMessages(initialMessages.map(mapRealtimeMessage));
        }
      } catch (error) {
        if (active) {
          const message =
            error instanceof Error ? error.message : 'Unable to load live chat.';
          setMessageError(message);
        }
      }
    }

    loadMessages();

    const channel = subscribeToDebateMessages(debateId, (nextMessage) => {
      if (!active) return;
      setMessages((current) => mergeMessages(current, mapRealtimeMessage(nextMessage)));
    });

    return () => {
      active = false;
      unsubscribeFromChannel(channel);
    };
  }, [canUseRealtimeFeatures, hasLiveAccess, liveDebateId]);

  // Presence tracking
  useEffect(() => {
    if (!liveDebateId || !canUseRealtimeFeatures || !currentUser) {
      return;
    }

    const isHost = 'host_user_id' in debate && debate.host_user_id === currentUser.id;
    const channel = subscribeToDebatePresence(liveDebateId, {
      onSync: (state) => {
        setParticipants((current) => getParticipantFromPresence(state, current, requiresAdmission));
      },
      presenceKey: currentUser.id,
      track: {
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_avatar: currentUser.avatar,
        is_host: isHost,
        joined_at: new Date().toISOString(),
        request_to_join: !isHost && requiresAdmission,
        stage_state: isHost
          ? {
              [currentUser.id]: {
                on_stage: true,
                muted: false,
                removed: false,
              },
            }
          : undefined,
        join_state: isHost
          ? {
              [currentUser.id]: {
                requested: false,
                admitted: true,
              },
            }
          : undefined,
      },
    });
    presenceChannelRef.current = channel;

    return () => {
      if (presenceChannelRef.current === channel) {
        presenceChannelRef.current = null;
      }
      void channel.untrack();
      unsubscribeFromChannel(channel);
    };
  }, [canUseRealtimeFeatures, currentUser?.avatar, currentUser?.id, currentUser?.name, debate, liveDebateId, requiresAdmission]);

  // Build participants from mock data when not in realtime room
  useEffect(() => {
    if (liveDebateId && currentUser) {
      return;
    }

    setParticipants((current) => {
      const next = new Map(current.map((participant) => [participant.id, participant]));
      const existingHost = next.get(hostParticipant.id);

      next.set(hostParticipant.id, {
        ...hostParticipant,
        muted: existingHost?.muted ?? hostParticipant.muted,
        removed: false,
      });

      messages.forEach((message) => {
        const incoming = getParticipantFromMessage(message);
        if (incoming.id === hostParticipant.id) return;
        const existing = next.get(incoming.id);
        next.set(incoming.id, {
          ...incoming,
          admitted: existing?.admitted ?? true,
          requestingToJoin: existing?.requestingToJoin ?? false,
          onStage: existing?.onStage ?? false,
          muted: existing?.muted ?? false,
          removed: existing?.removed ?? false,
          role: existing?.role ?? 'guest',
        });
      });

      return Array.from(next.values());
    });
  }, [
    currentUser?.id,
    hostParticipant.avatar,
    hostParticipant.id,
    hostParticipant.name,
    liveDebateId,
    messages,
  ]);

  // Keyboard handling
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardOffset(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardOffset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // End-stream subscription — closes the room for all viewers when host ends the debate
  useEffect(() => {
    if (!liveDebateId) return;
    const channel = subscribeToDebateEnd(liveDebateId, onClose);
    return () => { unsubscribeFromChannel(channel); };
  }, [liveDebateId, onClose]);

  // Like count — load initial count and track live changes
  useEffect(() => {
    if (!liveDebateId) return;
    let active = true;
    getLikeCount(liveDebateId).then((n) => { if (active) setLikeCount(n); }).catch(() => {});
    const channel = subscribeToDebateLikeCount(liveDebateId, (delta) => {
      if (!active) return;
      setLikeCount((prev) => Math.max(0, prev + delta));
    });
    return () => {
      active = false;
      unsubscribeFromChannel(channel);
    };
  }, [liveDebateId]);

  // Gift event subscription — delivers real-time gift overlays
  useEffect(() => {
    if (!liveDebateId) return;
    const channel = subscribeToGiftEvents(liveDebateId, (event) => {
      setGiftOverlayItems((prev) => [
        ...prev,
        {
          id: event.id,
          giftTypeId: event.gift_type_id,
          senderName: event.sender_name,
          xPercent: Math.floor(Math.random() * 55) + 5,
        },
      ]);
    });
    return () => { unsubscribeFromChannel(channel); };
  }, [liveDebateId]);

  async function handleActionPress(actionKey: string) {
    if (actionKey === 'like') {
      onToggleLike?.();
      return;
    }

    if (actionKey === 'follow') {
      onToggleFollow?.();
      return;
    }

    if (actionKey === 'chat') {
      inputRef.current?.focus();
      return;
    }

    if (actionKey === 'share') {
      try {
        const debateId = liveDebateId ?? debate.id;
        const deepLink = Linking.createURL(`debate/${debateId}`);
        await Share.share({
          title,
          message: `Watch "${title}" live on Podium — ${deepLink}`,
          url: deepLink,
        });
      } catch {
        // Ignore share sheet cancellations.
      }
      return;
    }

    if (actionKey === 'gift') {
      setIsGiftPickerOpen(true);
      return;
    }

    if (actionKey === 'stage') {
      void trackLog({
        eventName: 'room.stage_sheet.opened',
        body: { debateId: liveDebateId ?? null },
        attributes: { feature: 'stage', 'debate.id': liveDebateId ?? 'unknown' },
      });
      setIsStageSheetOpen(true);
      return;
    }

    if (actionKey === 'mic') {
      void trackLog({
        eventName: 'room.mic.toggle',
        body: { enabled: !micEnabled, debateId: liveDebateId ?? null },
        attributes: { feature: 'media', 'debate.id': liveDebateId ?? 'unknown' },
      });
      setMicEnabled((v) => !v);
      return;
    }

    if (actionKey === 'camera') {
      void trackLog({
        eventName: 'room.camera.toggle',
        body: { enabled: !cameraEnabled, debateId: liveDebateId ?? null },
        attributes: { feature: 'media', 'debate.id': liveDebateId ?? 'unknown' },
      });
      setCameraEnabled((v) => !v);
    }
  }

  function updateRealtimeStageState(
    current: StageParticipant[],
    participantId: string,
    updater: (participant: StageParticipant) => StageParticipant,
  ) {
    const next = current.map((participant) =>
      participant.id === participantId ? updater(participant) : participant,
    );

    if (isRealtimeRoom && currentUser && presenceChannelRef.current) {
      const stageState = next.reduce<DebateStageState>((result, participant) => {
        result[participant.id] = {
          on_stage: participant.onStage,
          muted: participant.muted,
          removed: participant.removed,
        };
        return result;
      }, {});
      const joinState = next.reduce<DebateJoinState>((result, participant) => {
        result[participant.id] = {
          requested: participant.requestingToJoin,
          admitted: participant.admitted,
        };
        return result;
      }, {});

      void presenceChannelRef.current.track({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_avatar: currentUser.avatar,
        is_host: true,
        joined_at: new Date().toISOString(),
        stage_state: stageState,
        join_state: joinState,
      });
    }

    return next;
  }

  function toggleParticipantStage(participantId: string) {
    if (!isLiveCreator) return;
    void trackLog({
      eventName: 'stage.toggle_participant',
      body: { debateId: liveDebateId ?? null, participantId },
      attributes: { feature: 'stage', 'debate.id': liveDebateId ?? 'unknown' },
    });

    setParticipants((current) =>
      updateRealtimeStageState(current, participantId, (participant) => ({
        ...participant,
        admitted: true,
        requestingToJoin: false,
        onStage: !participant.onStage,
      })),
    );
  }

  function toggleParticipantMute(participantId: string) {
    if (!isLiveCreator) return;
    void trackLog({
      eventName: 'stage.toggle_mute',
      body: { debateId: liveDebateId ?? null, participantId },
      attributes: { feature: 'stage', 'debate.id': liveDebateId ?? 'unknown' },
    });

    setParticipants((current) =>
      updateRealtimeStageState(current, participantId, (participant) => ({
        ...participant,
        muted: !participant.muted,
      })),
    );
  }

  function removeParticipantFromLive(participantId: string) {
    if (!isLiveCreator) return;
    void trackLog({
      eventName: 'stage.remove_participant',
      body: { debateId: liveDebateId ?? null, participantId },
      attributes: { feature: 'stage', 'debate.id': liveDebateId ?? 'unknown' },
    });

    setParticipants((current) =>
      updateRealtimeStageState(current, participantId, (participant) => ({
        ...participant,
        admitted: false,
        requestingToJoin: false,
        removed: true,
        onStage: false,
      })),
    );
  }

  function admitParticipantToLive(participantId: string) {
    if (!isLiveCreator) return;
    void trackLog({
      eventName: 'room.admit_participant',
      body: { debateId: liveDebateId ?? null, participantId },
      attributes: { feature: 'room_access', 'debate.id': liveDebateId ?? 'unknown' },
    });

    setParticipants((current) =>
      updateRealtimeStageState(current, participantId, (participant) => ({
        ...participant,
        admitted: true,
        requestingToJoin: false,
      })),
    );
  }

  function removeGiftOverlayItem(id: string) {
    setGiftOverlayItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleSendMessage() {
    if (!liveDebateId || !currentUser || !audienceCommentsEnabled || !hasLiveAccess) return;

    const trimmedBody = messageBody.trim();
    if (!trimmedBody) return;

    setSendingMessage(true);
    setMessageError(null);

    try {
      const createdMessage = await sendDebateMessage({
        debateId: liveDebateId,
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        body: trimmedBody,
      });
      setMessages((current) => mergeMessages(current, mapRealtimeMessage(createdMessage)));
      setMessageBody('');
      void trackLog({
        eventName: 'chat.message_sent',
        body: { debateId: liveDebateId, messageId: createdMessage.id },
        attributes: { feature: 'chat', 'debate.id': liveDebateId },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send the message.';
      void trackLog({
        eventName: 'chat.message_send_failed',
        severity: 'ERROR',
        body: message,
        attributes: { feature: 'chat', 'debate.id': liveDebateId },
      });
      setMessageError(message);
    } finally {
      setSendingMessage(false);
    }
  }

  return (
    <View style={styles.screen}>
      {/* Video layer — uses LiveKit in a dev/prod build, falls back in Expo Go */}
      {isLiveKitConnected && LiveVideoLayer ? (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <LiveVideoLayer
            serverUrl={livekitUrl!}
            token={livekitToken!}
            isHost={showCameraPreview}
            micEnabled={micEnabled}
            cameraEnabled={cameraEnabled}
          />
        </View>
      ) : (
        <>
          {showCameraPreview && cameraEnabled && permission?.granted ? (
            <CameraView facing="front" style={styles.cameraBackground} />
          ) : null}
          {!showCameraPreview ? <View style={styles.backgroundGlowTop} /> : null}
          {!showCameraPreview ? <View style={styles.backgroundGlowBottom} /> : null}
        </>
      )}

      {/* Gift floating overlays */}
      <GiftOverlay items={giftOverlayItems} onItemDone={removeGiftOverlayItem} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.titleArea}>
          <Pressable
            style={({ pressed }) => [styles.titlePill, pressed && styles.pressed]}
            onPress={() => setIsInfoSheetOpen(true)}
          >
            <Text numberOfLines={1} style={styles.titlePillText}>{title}</Text>
            <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.55)" />
          </Pressable>
          {topic ? (
            <View style={styles.topicChip}>
              <Text style={styles.topicChipText}>{topic}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.topControls}>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
          <View style={styles.likeCountPill}>
            <Ionicons name="heart" size={12} color="#FF4D6D" />
            <Text style={styles.likeCountText}>{formatCount(likeCount)}</Text>
          </View>
          <View style={styles.viewerPill}>
            <Text style={styles.viewerText}>{viewerLabel}</Text>
          </View>
          <Pressable
            onPress={() => {
              if (isLiveCreator && isRealtimeRoom) {
                Alert.alert(
                  'End Broadcast',
                  'Are you sure you want to end this broadcast? This will close the stream for all viewers.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'End Broadcast', style: 'destructive', onPress: onClose },
                  ],
                );
              } else {
                onClose();
              }
            }}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Text style={styles.closeText}>X</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.stageSpacer} />

      <View style={styles.overlayArea}>
        {factCheckEnabled ? <FactCheckStrip factCheck={factCheck} /> : null}

        {requiresAdmission && !hasLiveAccess ? (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingTitle}>Waiting for host approval</Text>
            <Text style={styles.waitingCopy}>
              This private debate is invite-only. The host needs to admit you before you can
              join the live room.
            </Text>
          </View>
        ) : null}

        <View style={styles.messagesWindow}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.map((message) => (
              <LiveComment key={message.id} message={message} />
            ))}
          </ScrollView>
        </View>
      </View>

      <View style={[styles.actionRail, { bottom: actionRailOffset }]}>
        {actionItems.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => {
              void handleActionPress(item.key);
            }}
            style={({ pressed }) => [styles.actionItem, pressed && styles.pressed]}
          >
            <View style={styles.actionBubble}>
              <Ionicons color={colors.textPrimary} name={item.icon} size={20} />
            </View>
            <Text style={styles.actionLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <View
        style={[
          styles.bottomBar,
          {
            bottom: bottomBarOffset,
            paddingBottom: keyboardOffset > 0 ? spacing.md : 36,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          editable={isRealtimeRoom && hasLiveAccess && audienceCommentsEnabled && !sendingMessage}
          placeholder={
            !audienceCommentsEnabled
              ? 'Audience comments are off'
              : requiresAdmission && !hasLiveAccess
                ? 'Waiting for host approval...'
                : 'Add a comment...'
          }
          placeholderTextColor={colors.textFaint}
          style={styles.commentInput}
          value={messageBody}
          onChangeText={setMessageBody}
        />
        <View style={styles.iconRow}>
          {messageError ? <Text style={styles.errorText}>{messageError}</Text> : null}
          <Pressable
            style={({ pressed }) => [styles.sendButton, pressed && styles.pressed]}
            onPress={() => {
              void handleSendMessage();
            }}
            disabled={!isRealtimeRoom || !hasLiveAccess || !audienceCommentsEnabled || sendingMessage}
          >
            <Text style={styles.sendButtonText}>{sendingMessage ? '...' : 'Send'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Gift picker modal */}
      {isGiftEnabled && currentUser && hostUserId ? (
        <GiftPicker
          visible={isGiftPickerOpen}
          onClose={() => setIsGiftPickerOpen(false)}
          senderId={currentUser.id}
          senderName={currentUser.name}
          recipientId={hostUserId}
          debateId={liveDebateId!}
          onGiftSent={() => setIsGiftPickerOpen(false)}
        />
      ) : null}

      {/* Debate info sheet */}
      <Modal
        animationType="slide"
        transparent
        visible={isInfoSheetOpen}
        onRequestClose={() => setIsInfoSheetOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsInfoSheetOpen(false)} />
          <View style={styles.infoSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.infoHeader}>
              <View style={styles.infoTopicPill}>
                <Text style={styles.infoTopicText}>{topic}</Text>
              </View>
              <Pressable
                onPress={() => setIsInfoSheetOpen(false)}
                style={({ pressed }) => [styles.infoCloseBtn, pressed && styles.pressed]}
              >
                <Ionicons name="close" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>
            <Text style={styles.infoTitle}>{title}</Text>
            {description ? (
              <Text style={styles.infoDescription}>{description}</Text>
            ) : (
              <Text style={styles.infoDescriptionEmpty}>No description provided.</Text>
            )}
            <Pressable
              style={({ pressed }) => [styles.infoHostRow, pressed && styles.pressed]}
              onPress={() => {
                if (!isLiveCreator && onViewHostProfile) {
                  setIsInfoSheetOpen(false);
                  onViewHostProfile();
                }
              }}
              disabled={isLiveCreator || !onViewHostProfile}
            >
              <View style={styles.infoHostAvatar}>
                <Text style={styles.infoHostAvatarText}>{hostParticipant.avatar}</Text>
              </View>
              <Text style={styles.infoHostName}>{hostParticipant.name}</Text>
              {!isLiveCreator && onViewHostProfile ? (
                <Ionicons name="chevron-forward" size={16} color={colors.textDim} style={{ marginLeft: 'auto' }} />
              ) : null}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Stage management modal */}
      <Modal
        animationType="fade"
        onRequestClose={() => setIsStageSheetOpen(false)}
        transparent
        visible={isStageSheetOpen}
      >
        <View style={styles.modalRoot}>
          <Pressable
            onPress={() => setIsStageSheetOpen(false)}
            style={styles.modalBackdrop}
          />
          <View style={styles.stageSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Stage</Text>
              <Text style={styles.sheetSubtitle}>
                {visibleParticipants.length} people in this live
              </Text>
            </View>

            {isLiveCreator && pendingParticipants.length > 0 ? (
              <View style={styles.pendingSection}>
                <Text style={styles.pendingTitle}>Requests to join</Text>
                {pendingParticipants.map((participant) => (
                  <View key={`pending-${participant.id}`} style={styles.pendingCard}>
                    <View style={styles.participantHeader}>
                      <View style={styles.participantAvatar}>
                        <Text style={styles.participantAvatarText}>{participant.avatar}</Text>
                      </View>
                      <View style={styles.participantMeta}>
                        <Text style={styles.participantName}>{participant.name}</Text>
                        <Text style={styles.hostNote}>Waiting for approval to join this private live.</Text>
                      </View>
                    </View>

                    <View style={styles.participantActions}>
                      <Pressable
                        onPress={() => admitParticipantToLive(participant.id)}
                        style={({ pressed }) => [
                          styles.participantAction,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.participantActionText}>Admit</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => removeParticipantFromLive(participant.id)}
                        style={({ pressed }) => [
                          styles.participantAction,
                          styles.participantActionDanger,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.participantActionDangerText}>Deny</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <ScrollView
              contentContainerStyle={styles.participantList}
              showsVerticalScrollIndicator={false}
            >
              {visibleParticipants.map((participant) => (
                <View key={participant.id} style={styles.participantCard}>
                  <View style={styles.participantHeader}>
                    <View style={styles.participantAvatar}>
                      <Text style={styles.participantAvatarText}>{participant.avatar}</Text>
                    </View>
                    <View style={styles.participantMeta}>
                      <Text style={styles.participantName}>{participant.name}</Text>
                      <View style={styles.participantBadges}>
                        {participant.role === 'host' ? (
                          <View style={styles.hostBadge}>
                            <Text style={styles.hostBadgeText}>Host</Text>
                          </View>
                        ) : null}
                        {participant.onStage ? (
                          <View style={styles.statusBadge}>
                            <Text style={styles.statusBadgeText}>On stage</Text>
                          </View>
                        ) : null}
                        {participant.muted ? (
                          <View style={styles.statusBadge}>
                            <Text style={styles.statusBadgeText}>Muted</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  {participant.role === 'host' ? (
                    <Text style={styles.hostNote}>You are the host for this live.</Text>
                  ) : !isLiveCreator ? (
                    <Text style={styles.hostNote}>Only the live creator can manage the stage.</Text>
                  ) : (
                    <View style={styles.participantActions}>
                      <Pressable
                        onPress={() => toggleParticipantStage(participant.id)}
                        style={({ pressed }) => [
                          styles.participantAction,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.participantActionText}>
                          {participant.onStage ? 'Remove stage' : 'Add to stage'}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => toggleParticipantMute(participant.id)}
                        style={({ pressed }) => [
                          styles.participantAction,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.participantActionText}>
                          {participant.muted ? 'Unmute' : 'Mute'}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => removeParticipantFromLive(participant.id)}
                        style={({ pressed }) => [
                          styles.participantAction,
                          styles.participantActionDanger,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.participantActionDangerText}>
                          Remove from live
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#3A165A',
  },
  cameraBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundGlowTop: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(214, 63, 124, 0.35)',
  },
  backgroundGlowBottom: {
    position: 'absolute',
    bottom: 140,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(85, 37, 150, 0.45)',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  titleArea: {
    flex: 1,
    gap: spacing.xs,
    marginRight: spacing.sm,
  },
  titlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.overlayStrong,
  },
  titlePillText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  topicChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(140, 53, 248, 0.55)',
  },
  topicChipText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '500',
  },
  // Info sheet
  infoSheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderCurve: 'continuous',
    backgroundColor: '#111114',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 44,
    gap: spacing.lg,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoTopicPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(140, 53, 248, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(140, 53, 248, 0.5)',
  },
  infoTopicText: {
    color: '#C07EFF',
    fontSize: 12,
    fontWeight: '600',
  },
  infoCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlayStrong,
  },
  infoTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '400',
    lineHeight: 30,
  },
  infoDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '300',
  },
  infoDescriptionEmpty: {
    color: colors.textFaint,
    fontSize: 14,
    fontWeight: '300',
  },
  infoHostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  infoHostAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.avatar,
  },
  infoHostAvatarText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  infoHostName: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '400',
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: '#F2387A',
  },
  liveBadgeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  likeCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    backgroundColor: colors.overlayStrong,
  },
  likeCountText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  viewerPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: colors.overlayStrong,
  },
  viewerText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlayStrong,
  },
  closeText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  stageSpacer: {
    flex: 1,
  },
  overlayArea: {
    paddingHorizontal: spacing.md,
    paddingBottom: 116,
    gap: spacing.md,
  },
  waitingCard: {
    maxWidth: 320,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(11, 11, 16, 0.68)',
    borderWidth: 1,
    borderColor: colors.borderOverlay,
    gap: spacing.xs,
  },
  waitingTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  waitingCopy: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  messagesWindow: {
    maxHeight: 250,
  },
  messagesContent: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  actionRail: {
    position: 'absolute',
    right: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionBubble: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  actionLabel: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 36,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '300',
  },
  iconRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  sendButton: {
    minWidth: 52,
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textPrimary,
  },
  sendButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    maxWidth: 160,
    color: '#FF7A7A',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
  },
  stageSheet: {
    maxHeight: '72%',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    backgroundColor: '#111114',
    gap: spacing.md,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.borderStrong,
  },
  sheetHeader: {
    gap: spacing.xs,
  },
  pendingSection: {
    gap: spacing.sm,
  },
  pendingTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  pendingCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '500',
  },
  sheetSubtitle: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '400',
  },
  participantList: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  participantCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  participantAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.avatar,
  },
  participantAvatarText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  participantMeta: {
    flex: 1,
    gap: spacing.xs,
  },
  participantName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  participantBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  hostBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: '#F2387A',
  },
  hostBadgeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.overlayStrong,
  },
  statusBadgeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  hostNote: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '400',
  },
  participantActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  participantAction: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    backgroundColor: colors.overlayStrong,
  },
  participantActionText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  participantActionDanger: {
    backgroundColor: 'rgba(255, 80, 110, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 122, 0.32)',
  },
  participantActionDangerText: {
    color: '#FF9A9A',
    fontSize: 12,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.86,
  },
});
