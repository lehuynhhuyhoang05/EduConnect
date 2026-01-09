import { useState, useEffect, useCallback, useRef } from 'react';

interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

interface MediaState {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
}

interface UseMediaDevicesReturn {
  // State
  stream: MediaStream | null;
  screenStream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  // Devices
  audioInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
  videoInputDevices: MediaDeviceInfo[];
  selectedAudioInput: string | null;
  selectedAudioOutput: string | null;
  selectedVideoInput: string | null;
  // Actions
  initializeMedia: (audio?: boolean, video?: boolean) => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  selectAudioInput: (deviceId: string) => Promise<void>;
  selectAudioOutput: (deviceId: string) => void;
  selectVideoInput: (deviceId: string) => Promise<void>;
  stopAllMedia: () => void;
  // Error
  error: string | null;
}

export function useMediaDevices(): UseMediaDevicesReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [mediaState, setMediaState] = useState<MediaState>({
    audioEnabled: false,
    videoEnabled: false,
    screenSharing: false,
  });

  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);

  const [selectedAudioInput, setSelectedAudioInput] = useState<string | null>(null);
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string | null>(null);
  const [selectedVideoInput, setSelectedVideoInput] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Get available devices
  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      setAudioInputDevices(
        devices
          .filter((d) => d.kind === 'audioinput')
          .map((d) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 5)}`, kind: d.kind }))
      );
      setAudioOutputDevices(
        devices
          .filter((d) => d.kind === 'audiooutput')
          .map((d) => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 5)}`, kind: d.kind }))
      );
      setVideoInputDevices(
        devices
          .filter((d) => d.kind === 'videoinput')
          .map((d) => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 5)}`, kind: d.kind }))
      );
    } catch (err) {
      console.error('Error getting devices:', err);
    }
  }, []);

  // Initialize media
  const initializeMedia = useCallback(
    async (audio: boolean = true, video: boolean = true) => {
      try {
        setError(null);

        const constraints: MediaStreamConstraints = {
          audio: audio
            ? selectedAudioInput
              ? { deviceId: { exact: selectedAudioInput } }
              : true
            : false,
          video: video
            ? selectedVideoInput
              ? { deviceId: { exact: selectedVideoInput }, width: 1280, height: 720 }
              : { width: 1280, height: 720 }
            : false,
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = mediaStream;
        setStream(mediaStream);

        setMediaState({
          audioEnabled: audio,
          videoEnabled: video,
          screenSharing: false,
        });

        await getDevices();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to access media devices';
        setError(errorMessage);
        console.error('Media initialization error:', err);
      }
    },
    [selectedAudioInput, selectedVideoInput, getDevices]
  );

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setMediaState((prev) => ({ ...prev, audioEnabled: !prev.audioEnabled }));
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setMediaState((prev) => ({ ...prev, videoEnabled: !prev.videoEnabled }));
    }
  }, []);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    try {
      if (mediaState.screenSharing) {
        // Stop screen sharing
        if (screenStream) {
          screenStream.getTracks().forEach((track) => track.stop());
          setScreenStream(null);
        }
        setMediaState((prev) => ({ ...prev, screenSharing: false }));
      } else {
        // Start screen sharing
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: true,
        });

        displayStream.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          setMediaState((prev) => ({ ...prev, screenSharing: false }));
        };

        setScreenStream(displayStream);
        setMediaState((prev) => ({ ...prev, screenSharing: true }));
      }
    } catch (err) {
      console.error('Screen share error:', err);
      setError('Failed to share screen');
    }
  }, [mediaState.screenSharing, screenStream]);

  // Select audio input
  const selectAudioInput = useCallback(
    async (deviceId: string) => {
      setSelectedAudioInput(deviceId);
      if (streamRef.current) {
        const audioTracks = streamRef.current.getAudioTracks();
        audioTracks.forEach((track) => track.stop());

        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } },
        });

        const newAudioTrack = newStream.getAudioTracks()[0];
        newAudioTrack.enabled = mediaState.audioEnabled;

        streamRef.current.getAudioTracks().forEach((track) => {
          streamRef.current!.removeTrack(track);
        });
        streamRef.current.addTrack(newAudioTrack);
        setStream(streamRef.current);
      }
    },
    [mediaState.audioEnabled]
  );

  // Select audio output
  const selectAudioOutput = useCallback((deviceId: string) => {
    setSelectedAudioOutput(deviceId);
    // Audio output selection is handled at the element level
  }, []);

  // Select video input
  const selectVideoInput = useCallback(
    async (deviceId: string) => {
      setSelectedVideoInput(deviceId);
      if (streamRef.current) {
        const videoTracks = streamRef.current.getVideoTracks();
        videoTracks.forEach((track) => track.stop());

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId }, width: 1280, height: 720 },
        });

        const newVideoTrack = newStream.getVideoTracks()[0];
        newVideoTrack.enabled = mediaState.videoEnabled;

        streamRef.current.getVideoTracks().forEach((track) => {
          streamRef.current!.removeTrack(track);
        });
        streamRef.current.addTrack(newVideoTrack);
        setStream(streamRef.current);
      }
    },
    [mediaState.videoEnabled]
  );

  // Stop all media
  const stopAllMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }
    setMediaState({ audioEnabled: false, videoEnabled: false, screenSharing: false });
  }, [screenStream]);

  // Listen for device changes
  useEffect(() => {
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    };
  }, [getDevices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllMedia();
    };
  }, []);

  return {
    stream,
    screenStream,
    audioEnabled: mediaState.audioEnabled,
    videoEnabled: mediaState.videoEnabled,
    screenSharing: mediaState.screenSharing,
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,
    selectedAudioInput,
    selectedAudioOutput,
    selectedVideoInput,
    initializeMedia,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    selectAudioInput,
    selectAudioOutput,
    selectVideoInput,
    stopAllMedia,
    error,
  };
}
