import { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  isTrackReference,
  useTracks,
  useLocalParticipant,
  useParticipants,
  useVisualStableUpdate,
  type TrackReferenceOrPlaceholder,
} from '@livekit/react-native';
import { Track } from 'livekit-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LiveVideoLayerProps = {
  serverUrl: string;
  token: string;
  isHost: boolean;
  micEnabled: boolean;
  cameraEnabled: boolean;
};

// ---------------------------------------------------------------------------
// Grid layout helpers
// ---------------------------------------------------------------------------

function getGridCols(count: number): number {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  return 3;
}

function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '??'
  );
}

// ---------------------------------------------------------------------------
// Single participant tile
// ---------------------------------------------------------------------------

type TileProps = {
  trackRef: TrackReferenceOrPlaceholder;
  tileWidth: number;
  tileHeight: number;
};

function ParticipantTile({ trackRef, tileWidth, tileHeight }: TileProps) {
  const participant = trackRef.participant;
  const hasVideo = isTrackReference(trackRef);
  const isMicMuted = !participant.isMicrophoneEnabled;
  const name = participant.name ?? participant.identity ?? 'User';
  const initials = getInitials(name);

  return (
    <View style={[styles.tile, { width: tileWidth, height: tileHeight }]}>
      {hasVideo ? (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <VideoTrack trackRef={trackRef as any} style={StyleSheet.absoluteFillObject} objectFit="cover" />
      ) : (
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
      )}

      {/* Name + mic indicator bar */}
      <View style={styles.nameBar}>
        {isMicMuted ? (
          <View style={styles.mutedDot} />
        ) : null}
        <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Grid of all participants
// ---------------------------------------------------------------------------

function VideoGrid() {
  const { width, height } = useWindowDimensions();
  const allTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );

  // useVisualStableUpdate prevents flickering when participants join/leave
  const tracks = useVisualStableUpdate(allTracks, allTracks.length);

  const count = tracks.length;
  const cols = getGridCols(count);
  const rows = Math.ceil(count / cols);
  const tileWidth = width / cols;
  const tileHeight = height / rows;

  if (count === 0) return null;

  return (
    <View style={styles.grid}>
      {tracks.map((trackRef) => (
        <ParticipantTile
          key={`${trackRef.participant.identity}-camera`}
          trackRef={trackRef}
          tileWidth={tileWidth}
          tileHeight={tileHeight}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Local media sync — keeps mic/camera in sync with UI controls
// ---------------------------------------------------------------------------

function LocalMediaSync({
  micEnabled,
  cameraEnabled,
}: {
  micEnabled: boolean;
  cameraEnabled: boolean;
}) {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    localParticipant.setMicrophoneEnabled(micEnabled).catch(() => {});
  }, [micEnabled, localParticipant]);

  useEffect(() => {
    localParticipant.setCameraEnabled(cameraEnabled).catch(() => {});
  }, [cameraEnabled, localParticipant]);

  return null;
}

// ---------------------------------------------------------------------------
// Audio session lifecycle
// ---------------------------------------------------------------------------

function LiveKitAudioSession() {
  useEffect(() => {
    AudioSession.startAudioSession().catch(() => {});
    return () => {
      AudioSession.stopAudioSession().catch(() => {});
    };
  }, []);

  return null;
}

// ---------------------------------------------------------------------------
// Exported component
// ---------------------------------------------------------------------------

export function LiveVideoLayer({
  serverUrl,
  token,
  isHost,
  micEnabled,
  cameraEnabled,
}: LiveVideoLayerProps) {
  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      audio
      video={isHost && cameraEnabled}
    >
      <LiveKitAudioSession />
      <VideoGrid />
      <LocalMediaSync micEnabled={micEnabled} cameraEnabled={cameraEnabled} />
    </LiveKitRoom>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#000',
  },
  tile: {
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  avatarContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8C35F8',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '300',
  },
  nameBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  nameText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  mutedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4D6D',
  },
});
