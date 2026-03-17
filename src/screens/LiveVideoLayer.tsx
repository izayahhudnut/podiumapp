import { StyleSheet } from 'react-native';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useLocalParticipant,
  type TrackReference,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { useEffect } from 'react';

type LiveVideoLayerProps = {
  serverUrl: string;
  token: string;
  isHost: boolean;
  micEnabled: boolean;
  cameraEnabled: boolean;
};

function LiveVideoBackground({ isHost }: { isHost: boolean }) {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]);
  const videoTrack = (
    isHost
      ? tracks.find((t) => t.participant?.isLocal)
      : tracks.find((t) => !t.participant?.isLocal)
  ) as TrackReference | undefined;

  if (!videoTrack) return null;

  return (
    <VideoTrack
      trackRef={videoTrack}
      style={StyleSheet.absoluteFillObject}
      objectFit="cover"
    />
  );
}

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
      video={isHost}
    >
      <LiveVideoBackground isHost={isHost} />
      {isHost ? (
        <LocalMediaSync micEnabled={micEnabled} cameraEnabled={cameraEnabled} />
      ) : null}
    </LiveKitRoom>
  );
}
