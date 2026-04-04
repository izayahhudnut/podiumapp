import { StyleSheet } from 'react-native';
import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  isTrackReference,
  useTracks,
  useLocalParticipant,
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
  const cameraTracks = tracks.filter(isTrackReference);
  const remoteCameraTrack = cameraTracks.find((track) => !track.participant.isLocal);
  const localCameraTrack = cameraTracks.find((track) => track.participant.isLocal);
  const videoTrack = isHost ? remoteCameraTrack ?? localCameraTrack : remoteCameraTrack;

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
      <LiveVideoBackground isHost={isHost} />
      <LocalMediaSync micEnabled={micEnabled} cameraEnabled={cameraEnabled} />
    </LiveKitRoom>
  );
}
