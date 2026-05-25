import { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  isTrackReference,
  useTracks,
  useLocalParticipant,
  useVisualStableUpdate,
  type TrackReferenceOrPlaceholder,
} from '@livekit/react-native';
import { Track } from 'livekit-client';

const GRID_GAP = 6;
const GRID_HORIZONTAL_PADDING = 6;
const GRID_TOP_PADDING = 88;
const GRID_BOTTOM_PADDING = 180;

type LiveVideoLayerProps = {
  serverUrl: string;
  token: string;
  micEnabled: boolean;
  cameraEnabled: boolean;
  cameraFacing: 'front' | 'back';
  hostName?: string;
};

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
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('') || '??'
  );
}

type TileProps = {
  trackRef: TrackReferenceOrPlaceholder;
  tileWidth: number;
  tileHeight: number;
  isHost: boolean;
};

function ParticipantTile({ trackRef, tileWidth, tileHeight, isHost }: TileProps) {
  const participant = trackRef.participant;
  const hasVideo = isTrackReference(trackRef) && !trackRef.publication.isMuted;
  const isMicMuted = !participant.isMicrophoneEnabled;
  const name = participant.name ?? participant.identity ?? 'User';
  const initials = getInitials(name);

  return (
    <View style={[styles.tile, { width: tileWidth, height: tileHeight }, isHost && styles.hostTile]}>
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

      {isHost ? (
        <View style={styles.hostBadge}>
          <Text style={styles.hostBadgeText}>Host</Text>
        </View>
      ) : null}

      <View style={styles.nameBar}>
        {isMicMuted ? <View style={styles.mutedDot} /> : null}
        <Text style={styles.nameText} numberOfLines={1}>{name}</Text>
      </View>
    </View>
  );
}

function VideoGrid({ hostName }: { hostName?: string }) {
  const { width, height } = useWindowDimensions();
  const allTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );
  const tracks = useVisualStableUpdate(allTracks, allTracks.length);

  const count = tracks.length;
  if (count === 0) return null;

  const cols = getGridCols(count);
  const rows = Math.ceil(count / cols);
  const availableWidth =
    width - GRID_HORIZONTAL_PADDING * 2 - GRID_GAP * Math.max(0, cols - 1);
  const availableHeight =
    height - GRID_TOP_PADDING - GRID_BOTTOM_PADDING - GRID_GAP * Math.max(0, rows - 1);

  // Portrait-ratio tiles: fill available space naturally (taller than wide in most layouts)
  const tileWidth = Math.max(80, Math.floor(availableWidth / cols));
  const tileHeight = Math.max(120, Math.floor(availableHeight / rows));

  return (
    <View style={styles.grid}>
      {tracks.map((trackRef) => {
        const name = trackRef.participant.name ?? trackRef.participant.identity ?? '';
        const isHost = Boolean(hostName && name === hostName);
        return (
          <ParticipantTile
            key={`${trackRef.participant.identity}-camera`}
            trackRef={trackRef}
            tileWidth={tileWidth}
            tileHeight={tileHeight}
            isHost={isHost}
          />
        );
      })}
    </View>
  );
}

function LocalMediaSync({
  micEnabled,
  cameraEnabled,
  cameraFacing,
}: {
  micEnabled: boolean;
  cameraEnabled: boolean;
  cameraFacing: 'front' | 'back';
}) {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    localParticipant.setMicrophoneEnabled(micEnabled).catch(() => {});
  }, [micEnabled, localParticipant]);

  useEffect(() => {
    localParticipant.setCameraEnabled(cameraEnabled).catch(() => {});
  }, [cameraEnabled, localParticipant]);

  useEffect(() => {
    if (!cameraEnabled) return;

    const publication = localParticipant.getTrackPublication(Track.Source.Camera);
    const videoTrack = publication?.videoTrack;
    const mediaStreamTrack = videoTrack?.mediaStreamTrack as
      | ({ getSettings?: () => { facingMode?: string }; _switchCamera?: () => void })
      | undefined;

    if (!mediaStreamTrack?._switchCamera) return;

    const currentFacingMode = mediaStreamTrack.getSettings?.().facingMode;
    const desiredFacingMode = cameraFacing === 'front' ? 'user' : 'environment';

    if (currentFacingMode && currentFacingMode === desiredFacingMode) {
      return;
    }

    mediaStreamTrack._switchCamera();
  }, [cameraEnabled, cameraFacing, localParticipant]);

  return null;
}

function LiveKitAudioSession() {
  useEffect(() => {
    AudioSession.startAudioSession().catch(() => {});
    return () => {
      AudioSession.stopAudioSession().catch(() => {});
    };
  }, []);

  return null;
}

export function LiveVideoLayer({
  serverUrl,
  token,
  micEnabled,
  cameraEnabled,
  cameraFacing,
  hostName,
}: LiveVideoLayerProps) {
  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      audio
      video={cameraEnabled}
    >
      <LiveKitAudioSession />
      <VideoGrid hostName={hostName} />
      <LocalMediaSync
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        cameraFacing={cameraFacing}
      />
    </LiveKitRoom>
  );
}

const styles = StyleSheet.create({
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    justifyContent: 'center',
    gap: GRID_GAP,
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
    paddingTop: GRID_TOP_PADDING,
    paddingBottom: GRID_BOTTOM_PADDING,
    backgroundColor: '#000',
  },
  tile: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  hostTile: {
    borderColor: '#8C35F8',
    borderWidth: 2,
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
  hostBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  hostBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
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
    paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  nameText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 1,
  },
  mutedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FF4D6D',
  },
});
