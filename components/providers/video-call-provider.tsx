"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LocalTrackPublication,
  Room,
  RoomEvent,
  Track,
} from "livekit-client";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PresignedAvatar } from "@/components/ui/presigned-avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSocket } from "@/components/providers/socket-provider";
import { userService } from "@/services/user";
import { useAuthStore } from "@/store/use-auth-store";
import { BASE_API_URL } from "@/types/utils";
import {
  IncomingCallData,
  VideoCallMode,
  VideoCallType,
} from "@/types/video-call";

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== "object") return fallback;

  const err = error as {
    message?: string;
    response?: {
      data?: {
        message?: string;
        error?: string;
      };
    };
  };

  return (
    err.response?.data?.message ||
    err.response?.data?.error ||
    err.message ||
    fallback
  );
};

type CallPhase = "idle" | "ringing" | "outgoing" | "connecting" | "active";

interface ActiveCallState {
  roomId: string;
  peerUserId: string;
  peerName?: string;
  callMode: VideoCallMode;
  participantUserIds?: string[];
  callType: VideoCallType;
  conversationId?: string;
  isCaller: boolean;
}

interface StartCallPayload {
  receiverId: string;
  receiverName?: string;
  conversationId?: string;
  callType?: VideoCallType;
}

interface StartGroupCallPayload {
  participantIds: string[];
  conversationId?: string;
  groupName?: string;
  callType?: VideoCallType;
}

interface VideoCallContextType {
  phase: CallPhase;
  incomingCall: IncomingCallData | null;
  activeCall: ActiveCallState | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isBusy: boolean;
  startCall: (payload: StartCallPayload) => Promise<void>;
  startGroupCall: (payload: StartGroupCallPayload) => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  rejectIncomingCall: (reason?: string) => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
}

interface LivekitTokenResponse {
  token: string;
  livekitUrl: string;
  roomId: string;
  identity?: string;
  participantName?: string;
  expiresIn?: number;
}

interface RemoteParticipantStream {
  participantId: string;
  name: string;
  stream: MediaStream | null;
  hasVideo: boolean;
}

const VideoCallContext = createContext<VideoCallContextType | null>(null);

const ROOM_ID_REGEX = /^[A-Za-z0-9_-]+$/;

const toId = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const source = value as { _id?: string; id?: string };
    return source._id || source.id;
  }
  return undefined;
};

const toObject = (value: unknown): Record<string, unknown> => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const toAvatarValue = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return value;

  const obj = toObject(value);
  const candidates = [
    obj.key,
    obj.url,
    obj.viewUrl,
    obj.avatar,
    obj.avatarKey,
    obj.avatarUrl,
    obj.avatarViewUrl,
    obj.secure_url,
    obj.path,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return undefined;
};

const toDisplayName = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  const obj = toObject(value);
  const candidates = [obj.displayName, obj.name, obj.fullName, obj.username];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return undefined;
};

const normalizeSignalPayload = (
  rawPayload: unknown,
): Record<string, unknown> => {
  const root = toObject(rawPayload);
  const data = toObject(root.data);
  const result = toObject(root.result);

  return {
    ...result,
    ...data,
    ...root,
  };
};

const sanitizeRoomId = (value: string): string =>
  value
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeRoomId = (value: unknown): string | undefined => {
  const raw = toId(value)?.trim();
  if (!raw) return undefined;

  const sanitized = sanitizeRoomId(raw);
  if (!sanitized || !ROOM_ID_REGEX.test(sanitized)) return undefined;
  return sanitized;
};

const buildRoomId = (
  conversationId?: string,
  callerId?: string,
  receiverId?: string,
): string => {
  const seed = conversationId
    ? conversationId.startsWith("conversation_")
      ? conversationId
      : `conversation_${conversationId}`
    : `call_${callerId || "user"}_${receiverId || "peer"}_${Date.now()}`;

  const sanitized = sanitizeRoomId(seed);
  if (sanitized && ROOM_ID_REGEX.test(sanitized)) {
    return sanitized;
  }

  return `call_${Date.now()}`;
};

const getRoomId = (payload: Record<string, unknown>): string | undefined => {
  const callObj = toObject(payload.call);

  const directCandidates = [
    payload.roomId,
    callObj.roomId,
    payload.callId,
    payload.id,
    payload._id,
  ];

  for (const candidate of directCandidates) {
    const roomId = normalizeRoomId(candidate);
    if (roomId) return roomId;
  }

  const conversationId = normalizeRoomId(payload.conversationId);
  if (conversationId) {
    return conversationId.startsWith("conversation_")
      ? conversationId
      : `conversation_${conversationId}`;
  }

  return undefined;
};

const getPeerId = (
  payload: Record<string, unknown>,
  myUserId?: string,
): string | undefined => {
  const candidates = [
    payload.fromUserId,
    payload.from,
    payload.toUserId,
    payload.to,
    payload.senderId,
    payload.callerId,
    payload.receiverId,
    payload.userId,
    (payload.call as Record<string, unknown> | undefined)?.callerId,
    (payload.call as Record<string, unknown> | undefined)?.receiverId,
  ];

  for (const candidate of candidates) {
    const id = toId(candidate);
    if (id && id !== myUserId) return id;
  }

  return undefined;
};

const parseIncomingCall = (
  payload: Record<string, unknown>,
  forcedCallMode?: VideoCallMode,
): IncomingCallData | null => {
  const roomId = getRoomId(payload);
  const callerId =
    toId(payload.callerId) || toId(payload.fromUserId) || toId(payload.from);
  if (!roomId || !callerId) return null;

  const caller = toObject(payload.caller);
  const callerAvatar =
    toAvatarValue(payload.callerAvatar) ||
    toAvatarValue(caller.avatar) ||
    toAvatarValue((caller as Record<string, unknown>).profilePicture) ||
    toAvatarValue(payload.avatar);

  const participantIds = [payload.participantIds, payload.toUserIds]
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .map((id) => toId(id))
    .filter((id): id is string => Boolean(id));

  const payloadCallMode = payload.callMode;
  const normalizedCallMode: VideoCallMode | undefined =
    payloadCallMode === "group" || payloadCallMode === "direct"
      ? payloadCallMode
      : undefined;

  // A direct call may still include one participant id, so we only infer
  // group mode when there are multiple remote participants.
  const callMode: VideoCallMode =
    forcedCallMode || normalizedCallMode || (participantIds.length > 1
      ? "group"
      : "direct");

  return {
    roomId,
    callId: normalizeRoomId(payload.callId),
    callMode,
    callerId,
    callerName:
      toDisplayName(payload.callerName) ||
      toDisplayName(payload.caller) ||
      toDisplayName(payload.fromUser) ||
      toDisplayName(payload.user) ||
      "Người dùng",
    callerAvatar: callerAvatar || "",
    receiverId: toId(payload.receiverId) || toId(payload.toUserId),
    participantIds,
    callType: (payload.callType as VideoCallType) || "video",
    conversationId: toId(payload.conversationId),
  };
};

const toMediaStreamTrack = (track: unknown): MediaStreamTrack | null => {
  if (!track || typeof track !== "object") return null;
  const candidate = track as { mediaStreamTrack?: MediaStreamTrack };
  return candidate.mediaStreamTrack || null;
};

const getVideoGridClass = (tileCount: number): string => {
  if (tileCount <= 1) return "grid-cols-1";
  if (tileCount === 2) return "grid-cols-1 md:grid-cols-2";
  if (tileCount <= 4) return "grid-cols-2";
  if (tileCount <= 6) return "grid-cols-2 md:grid-cols-3";
  return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
};

function VideoElement({
  stream,
  muted,
  mirror,
  className,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  mirror?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={`${className || ""} ${mirror ? "-scale-x-100" : ""}`.trim()}
    />
  );
}

function AudioElement({ stream }: { stream: MediaStream | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.srcObject = stream;
  }, [stream]);

  return <audio ref={audioRef} autoPlay playsInline className="hidden" />;
}

export function VideoCallProvider({ children }: { children: ReactNode }) {
  const { socket, isConnected } = useSocket();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const myUserId = user?.id || user?._id;

  const [phase, setPhase] = useState<CallPhase>("idle");
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(
    null,
  );
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<
    RemoteParticipantStream[]
  >([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);

  const roomRef = useRef<Room | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteEmptyTimeoutRef = useRef<number | null>(null);
  const activeCallRef = useRef<ActiveCallState | null>(null);
  const incomingCallRef = useRef<IncomingCallData | null>(null);
  const isAcceptingIncomingCallRef = useRef(false);
  const connectingRoomIdRef = useRef<string | null>(null);
  const hasLivekitConnectedRef = useRef(false);
  const stopRingtoneRef = useRef<(() => void) | null>(null);

  const isCallEnabled = process.env.NEXT_PUBLIC_ENABLE_CALL === "true";
  const livekitEnvUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;

  const callDebug = useCallback(
    (_event: string, _meta?: Record<string, unknown>) => {
      // Disable verbose call debug logs in production/dev console.
      void _event;
      void _meta;
    },
    [],
  );

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    if (!startedAt) {
      setDurationSeconds(0);
      return;
    }

    const timerId = window.setInterval(() => {
      setDurationSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [startedAt]);

  const cleanupRoom = useCallback(
    (source = "unknown", meta?: Record<string, unknown>) => {
      const room = roomRef.current;
      hasLivekitConnectedRef.current = false;
      if (remoteEmptyTimeoutRef.current !== null) {
        window.clearTimeout(remoteEmptyTimeoutRef.current);
        remoteEmptyTimeoutRef.current = null;
      }
      if (room) {
        callDebug("cleanupRoom:disconnect", {
          source,
          roomName: room.name,
          participantIdentity: room.localParticipant.identity,
          ...meta,
        });
        room.removeAllListeners();
        room.disconnect();
        roomRef.current = null;
      }
      setRemoteParticipants([]);
    },
    [callDebug],
  );

  const wait = useCallback((ms: number) => {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }, []);

  const enableLocalTrackWithRetry = useCallback(
    async (
      room: Room,
      kind: "microphone" | "camera",
      enabled: boolean,
      roomId: string,
    ) => {
      const run = () =>
        kind === "microphone"
          ? room.localParticipant.setMicrophoneEnabled(enabled)
          : room.localParticipant.setCameraEnabled(enabled);

      try {
        await run();
      } catch (firstError) {
        const firstMessage = getErrorMessage(
          firstError,
          `${kind} publish failed`,
        );
        callDebug("connectToLivekitRoom:local_media_retry", {
          roomId,
          kind,
          enabled,
          message: firstMessage,
        });

        await wait(800);

        try {
          await run();
          callDebug("connectToLivekitRoom:local_media_retry_success", {
            roomId,
            kind,
            enabled,
          });
        } catch (retryError) {
          const retryMessage = getErrorMessage(
            retryError,
            `${kind} publish failed`,
          );
          callDebug("connectToLivekitRoom:local_media_retry_failed", {
            roomId,
            kind,
            enabled,
            message: retryMessage,
          });

          if (enabled) {
            toast.warning(
              kind === "microphone"
                ? "Micro chưa sẵn sàng, vẫn đang vào cuộc gọi"
                : "Camera chưa sẵn sàng, vẫn đang vào cuộc gọi",
            );
          }
        }
      }
    },
    [callDebug, wait],
  );

  const stopStreams = useCallback(() => {
    setLocalStream(null);
    setRemoteParticipants([]);
    setIsMuted(false);
    setIsCameraOff(false);
    localStreamRef.current = null;
  }, []);

  const resetCallState = useCallback(() => {
    incomingCallRef.current = null;
    activeCallRef.current = null;
    setPhase("idle");
    setIncomingCall(null);
    setActiveCall(null);
    setStartedAt(null);
    setDurationSeconds(0);
  }, []);

  const leaveRoomAndReset = useCallback(
    (source = "unknown", meta?: Record<string, unknown>) => {
      callDebug("leaveRoomAndReset", {
        source,
        ...meta,
      });
      connectingRoomIdRef.current = null;
      hasLivekitConnectedRef.current = false;
      cleanupRoom(source, meta);
      stopStreams();
      resetCallState();
    },
    [callDebug, cleanupRoom, resetCallState, stopStreams],
  );

  const markCallStarted = useCallback(() => {
    setStartedAt((prev) => prev || Date.now());
  }, []);

  const emitSignal = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      if (!socket.current) return;
      socket.current.emit(event, payload);
    },
    [socket],
  );

  const stopRingtone = useCallback(() => {
    if (!stopRingtoneRef.current) return;
    stopRingtoneRef.current();
    stopRingtoneRef.current = null;
  }, []);

  const startRingtone = useCallback(
    (mode: "incoming" | "outgoing") => {
      stopRingtone();

      if (typeof window === "undefined") return;

      const AudioContextClass =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      void audioContext.resume().catch(() => {
        // Browser may block autoplay until user interacts.
      });

      let disposed = false;
      let patternTimeoutId: number | null = null;

      const beep = (
        frequency: number,
        durationMs: number,
        gainValue: number,
      ) => {
        if (disposed) return;

        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + durationMs / 1000 + 0.04);
      };

      const playPattern = () => {
        if (mode === "incoming") {
          beep(740, 180, 0.03);
          patternTimeoutId = window.setTimeout(() => {
            beep(740, 180, 0.03);
          }, 250);
          return;
        }

        beep(520, 320, 0.025);
      };

      playPattern();
      const intervalId = window.setInterval(playPattern, 1500);

      stopRingtoneRef.current = () => {
        disposed = true;
        window.clearInterval(intervalId);
        if (patternTimeoutId !== null) {
          window.clearTimeout(patternTimeoutId);
        }
        void audioContext.close().catch(() => {
          // Ignore close errors after cleanup.
        });
      };
    },
    [stopRingtone],
  );

  useEffect(() => {
    if (phase === "outgoing") {
      startRingtone("outgoing");
      return () => {
        stopRingtone();
      };
    }

    if (phase === "ringing" && incomingCall) {
      startRingtone("incoming");
      return () => {
        stopRingtone();
      };
    }

    stopRingtone();

    return () => {
      stopRingtone();
    };
  }, [incomingCall, phase, startRingtone, stopRingtone]);

  const syncLocalStreamFromRoom = useCallback((callType: VideoCallType) => {
    const room = roomRef.current;
    if (!room) return;

    const stream = new MediaStream();

    const micPublication = room.localParticipant.getTrackPublication(
      Track.Source.Microphone,
    ) as LocalTrackPublication | undefined;
    const cameraPublication = room.localParticipant.getTrackPublication(
      Track.Source.Camera,
    ) as LocalTrackPublication | undefined;

    const micTrack = toMediaStreamTrack(micPublication?.track);
    if (micTrack) stream.addTrack(micTrack);

    const videoTrack = toMediaStreamTrack(cameraPublication?.track);
    if (callType === "video" && videoTrack) {
      stream.addTrack(videoTrack);
    }

    setLocalStream(stream.getTracks().length > 0 ? stream : null);
    setIsMuted(Boolean(micPublication?.isMuted));

    if (callType === "video") {
      setIsCameraOff(Boolean(cameraPublication?.isMuted || !videoTrack));
    } else {
      setIsCameraOff(true);
    }
  }, []);

  const syncRemoteParticipantsFromRoom = useCallback(
    (targetRoom?: Room) => {
      const room = targetRoom || roomRef.current;
      if (!room) {
        setRemoteParticipants([]);
        return;
      }

      const nextParticipants = Array.from(room.remoteParticipants.values()).map(
        (participant) => {
          const stream = new MediaStream();
          let hasVideo = false;

          participant.trackPublications.forEach((publication) => {
            if (!publication.isSubscribed || !publication.track) return;

            const mediaTrack = toMediaStreamTrack(publication.track);
            if (!mediaTrack) return;

            if (mediaTrack.kind === "video" && !publication.isMuted) {
              hasVideo = true;
            }

            if (mediaTrack.kind === "video" && publication.isMuted) {
              return;
            }

            stream.addTrack(mediaTrack);
          });

          return {
            participantId: participant.identity || participant.sid,
            name: participant.name?.trim() || participant.identity || "Thành viên",
            stream: stream.getTracks().length > 0 ? stream : null,
            hasVideo,
          };
        },
      );

      setRemoteParticipants(nextParticipants);

      if (nextParticipants.length > 0) {
        setPhase("active");
        markCallStarted();
      }
    },
    [markCallStarted],
  );

  const getLivekitToken = useCallback(
    async (roomId: string): Promise<LivekitTokenResponse> => {
      if (!token) {
        throw new Error("Thiếu token xác thực");
      }
      if (!apiKey) {
        throw new Error("Missing NEXT_PUBLIC_API_KEY");
      }
      if (!BASE_API_URL) {
        throw new Error("Missing NEXT_PUBLIC_API_URL");
      }
      if (!ROOM_ID_REGEX.test(roomId)) {
        throw new Error("RoomId không hợp lệ");
      }

      const participantName = user?.displayName;
      const query = new URLSearchParams({ roomId });
      if (participantName) {
        query.set("participantName", participantName);
      }

      const tokenRes = await fetch(
        `${BASE_API_URL}/livekit-token?${query.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "x-api-key": apiKey,
          },
        },
      );

      if (!tokenRes.ok) {
        let message = "Không lấy được LiveKit token";
        try {
          const errData = (await tokenRes.json()) as {
            message?: string;
            error?: string;
          };
          message = errData.message || errData.error || message;
        } catch {
          // ignore JSON parsing errors
        }
        throw new Error(message);
      }

      return (await tokenRes.json()) as LivekitTokenResponse;
    },
    [apiKey, token, user?.displayName],
  );

  const connectToLivekitRoom = useCallback(
    async (call: ActiveCallState) => {
      if (!isCallEnabled) {
        throw new Error("Tính năng gọi đang tắt ở môi trường hiện tại");
      }

      const currentRoom = roomRef.current;
      if (
        currentRoom &&
        hasLivekitConnectedRef.current &&
        currentRoom.name === call.roomId
      ) {
        callDebug("connectToLivekitRoom:skip_already_connected", {
          roomId: call.roomId,
        });
        return;
      }

      if (connectingRoomIdRef.current === call.roomId) {
        callDebug("connectToLivekitRoom:skip_duplicate", {
          roomId: call.roomId,
        });
        return;
      }

      callDebug("connectToLivekitRoom:start", {
        roomId: call.roomId,
        callType: call.callType,
        isCaller: call.isCaller,
      });

      connectingRoomIdRef.current = call.roomId;
      hasLivekitConnectedRef.current = false;

      try {
        const tokenData = await getLivekitToken(call.roomId);
        const livekitUrl = livekitEnvUrl || tokenData.livekitUrl;

        if (!livekitUrl) {
          throw new Error("Missing NEXT_PUBLIC_LIVEKIT_URL");
        }

        cleanupRoom("connectToLivekitRoom:preconnect_cleanup", {
          roomId: call.roomId,
        });
        stopStreams();
        setPhase("connecting");

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        roomRef.current = room;
        setRemoteParticipants([]);

        if (remoteEmptyTimeoutRef.current !== null) {
          window.clearTimeout(remoteEmptyTimeoutRef.current);
          remoteEmptyTimeoutRef.current = null;
        }

        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (
            track.kind !== Track.Kind.Audio &&
            track.kind !== Track.Kind.Video
          ) {
            return;
          }
          syncRemoteParticipantsFromRoom(room);
        });

        room.on(RoomEvent.TrackUnsubscribed, () => {
          syncRemoteParticipantsFromRoom(room);
        });

        room.on(RoomEvent.TrackMuted, () => {
          syncRemoteParticipantsFromRoom(room);
        });

        room.on(RoomEvent.TrackUnmuted, () => {
          syncRemoteParticipantsFromRoom(room);
        });

        room.on(RoomEvent.TrackPublished, () => {
          syncRemoteParticipantsFromRoom(room);
        });

        room.on(RoomEvent.TrackUnpublished, () => {
          syncRemoteParticipantsFromRoom(room);
        });

        room.on(RoomEvent.ParticipantNameChanged, () => {
          syncRemoteParticipantsFromRoom(room);
        });

        room.on(RoomEvent.ParticipantConnected, () => {
          if (remoteEmptyTimeoutRef.current !== null) {
            window.clearTimeout(remoteEmptyTimeoutRef.current);
            remoteEmptyTimeoutRef.current = null;
          }
          syncRemoteParticipantsFromRoom(room);
        });

        room.on(RoomEvent.ParticipantDisconnected, () => {
          syncRemoteParticipantsFromRoom(room);

          if (room.remoteParticipants.size > 0) return;

          if (remoteEmptyTimeoutRef.current !== null) {
            window.clearTimeout(remoteEmptyTimeoutRef.current);
          }

          // Give the remote side a short window to reconnect before ending.
          remoteEmptyTimeoutRef.current = window.setTimeout(() => {
            remoteEmptyTimeoutRef.current = null;

            if (roomRef.current !== room) return;
            if (room.remoteParticipants.size > 0) return;

            toast.info("Cuộc gọi đã kết thúc");
            leaveRoomAndReset("room:participant_disconnected_empty", {
              roomId: call.roomId,
            });
          }, 3000);
        });

        room.on(RoomEvent.Disconnected, () => {
          callDebug("room:disconnected", {
            roomId: call.roomId,
          });
          setRemoteParticipants([]);
        });

        await room.connect(livekitUrl, tokenData.token);
        hasLivekitConnectedRef.current = true;
        callDebug("connectToLivekitRoom:connected", {
          roomId: call.roomId,
          livekitUrl,
        });

        await enableLocalTrackWithRetry(room, "microphone", true, call.roomId);
        await enableLocalTrackWithRetry(
          room,
          "camera",
          call.callType === "video",
          call.roomId,
        );

        callDebug("connectToLivekitRoom:local_media_enabled", {
          roomId: call.roomId,
          callType: call.callType,
        });

        syncRemoteParticipantsFromRoom(room);
        syncLocalStreamFromRoom(call.callType);
      } finally {
        if (connectingRoomIdRef.current === call.roomId) {
          connectingRoomIdRef.current = null;
        }
      }
    },
    [
      callDebug,
      cleanupRoom,
      getLivekitToken,
      isCallEnabled,
      leaveRoomAndReset,
      livekitEnvUrl,
      stopStreams,
      syncLocalStreamFromRoom,
      syncRemoteParticipantsFromRoom,
      enableLocalTrackWithRetry,
    ],
  );

  const startCall = useCallback(
    async ({
      receiverId,
      receiverName,
      conversationId,
      callType = "video",
    }: StartCallPayload) => {
      if (!isCallEnabled) {
        toast.info("Tính năng gọi đang tắt ở môi trường hiện tại");
        return;
      }

      if (!socket.current || !isConnected) {
        toast.error("Kết nối socket chưa sẵn sàng");
        return;
      }

      if (!myUserId) {
        toast.error("Không tìm thấy người dùng đã đăng nhập");
        return;
      }

      const roomId = buildRoomId(conversationId, myUserId, receiverId);

      try {
        const call: ActiveCallState = {
          roomId,
          peerUserId: receiverId,
          peerName: receiverName,
          callMode: "direct",
          participantUserIds: [receiverId],
          callType,
          conversationId,
          isCaller: true,
        };

        setIncomingCall(null);
        setPhase("outgoing");
        setActiveCall(call);

        emitSignal("call-user", {
          toUserId: receiverId,
          roomId,
          callMode: "direct",
          conversationId,
          callType,
        });

        toast.success("Đang gọi...");
        callDebug("startCall:signal_sent", {
          roomId,
          receiverId,
          callType,
        });
      } catch (error) {
        console.error("startCall error:", error);
        toast.error(getErrorMessage(error, "Không thể bắt đầu cuộc gọi"));
        leaveRoomAndReset("startCall:error", {
          message: getErrorMessage(error, "Không thể bắt đầu cuộc gọi"),
        });
      }
    },
    [
      callDebug,
      emitSignal,
      isCallEnabled,
      isConnected,
      leaveRoomAndReset,
      myUserId,
      socket,
    ],
  );

  const startGroupCall = useCallback(
    async ({
      participantIds,
      conversationId,
      groupName,
      callType = "video",
    }: StartGroupCallPayload) => {
      if (!isCallEnabled) {
        toast.info("Tính năng gọi đang tắt ở môi trường hiện tại");
        return;
      }

      if (!socket.current || !isConnected) {
        toast.error("Kết nối socket chưa sẵn sàng");
        return;
      }

      if (!myUserId) {
        toast.error("Không tìm thấy người dùng đã đăng nhập");
        return;
      }

      const cleanParticipantIds = Array.from(
        new Set(participantIds.filter((id) => Boolean(id) && id !== myUserId)),
      );

      if (cleanParticipantIds.length === 0) {
        toast.info("Nhóm hiện không có thành viên hợp lệ để gọi");
        return;
      }

      const roomId = buildRoomId(
        conversationId,
        myUserId,
        cleanParticipantIds[0],
      );

      try {
        const call: ActiveCallState = {
          roomId,
          peerUserId: cleanParticipantIds[0],
          peerName: groupName || "Nhóm chat",
          callMode: "group",
          participantUserIds: cleanParticipantIds,
          callType,
          conversationId,
          isCaller: true,
        };

        setIncomingCall(null);
        setPhase("outgoing");
        setActiveCall(call);

        emitSignal("call-group", {
          fromUserId: myUserId,
          toUserIds: cleanParticipantIds,
          roomId,
          callMode: "group",
          conversationId,
          callType,
        });

        toast.success("Đang gọi nhóm...");
        callDebug("startGroupCall:signal_sent", {
          roomId,
          participantCount: cleanParticipantIds.length,
          callType,
        });
      } catch (error) {
        console.error("startGroupCall error:", error);
        toast.error(getErrorMessage(error, "Không thể bắt đầu gọi nhóm"));
        leaveRoomAndReset("startGroupCall:error", {
          message: getErrorMessage(error, "Không thể bắt đầu gọi nhóm"),
        });
      }
    },
    [
      callDebug,
      emitSignal,
      isCallEnabled,
      isConnected,
      leaveRoomAndReset,
      myUserId,
      socket,
    ],
  );

  const acceptIncomingCall = useCallback(async () => {
    const callData = incomingCallRef.current;
    if (!callData || !myUserId) return;

    const call: ActiveCallState = {
      roomId: callData.roomId,
      peerUserId: callData.callerId,
      peerName: callData.callerName,
      callMode: callData.callMode || "direct",
      participantUserIds: callData.participantIds,
      callType: callData.callType,
      conversationId: callData.conversationId,
      isCaller: false,
    };

    try {
      isAcceptingIncomingCallRef.current = true;
      incomingCallRef.current = null;
      setIncomingCall(null);
      setPhase("connecting");
      setActiveCall(call);

      emitSignal("accept-call", {
        toUserId: call.peerUserId,
        roomId: call.roomId,
        callMode: call.callMode,
        participantIds: call.participantUserIds,
        conversationId: call.conversationId,
        callType: call.callType,
      });

      await connectToLivekitRoom(call);
    } catch (error) {
      console.error("acceptIncomingCall error:", error);
      toast.error(getErrorMessage(error, "Không thể chấp nhận cuộc gọi"));
      leaveRoomAndReset("acceptIncomingCall:error", {
        message: getErrorMessage(error, "Không thể chấp nhận cuộc gọi"),
      });
    } finally {
      isAcceptingIncomingCallRef.current = false;
    }
  }, [connectToLivekitRoom, emitSignal, leaveRoomAndReset, myUserId]);

  const rejectIncomingCall = useCallback(
    async (reason = "declined") => {
      const callData = incomingCallRef.current;
      if (!callData) return;

      try {
        incomingCallRef.current = null;
        emitSignal("reject-call", {
          toUserId: callData.callerId,
          roomId: callData.roomId,
          callMode: callData.callMode || "direct",
          participantIds: callData.participantIds,
          conversationId: callData.conversationId,
          callType: callData.callType,
          reason,
        });
      } catch (error) {
        console.error("rejectIncomingCall error:", error);
      } finally {
        leaveRoomAndReset("rejectIncomingCall:finally", {
          reason,
        });
      }
    },
    [emitSignal, leaveRoomAndReset],
  );

  const endCall = useCallback(async () => {
    const currentCall = activeCallRef.current;
    if (!currentCall) return;

    try {
      if (phase === "outgoing" || phase === "connecting") {
        emitSignal("reject-call", {
          toUserId: currentCall.peerUserId,
          toUserIds:
            currentCall.callMode === "group"
              ? currentCall.participantUserIds
              : undefined,
          roomId: currentCall.roomId,
          callMode: currentCall.callMode,
          participantIds: currentCall.participantUserIds,
          conversationId: currentCall.conversationId,
          callType: currentCall.callType,
          reason: "ended",
        });
      }
    } catch (error) {
      console.error("endCall error:", error);
    } finally {
      leaveRoomAndReset("endCall:finally", {
        phase,
      });
    }
  }, [emitSignal, leaveRoomAndReset, phase]);

  const toggleMute = useCallback(() => {
    const room = roomRef.current;
    const current = activeCallRef.current;
    if (!room || !current) return;

    const nextMuted = !isMuted;
    void room.localParticipant
      .setMicrophoneEnabled(!nextMuted)
      .then(() => {
        setIsMuted(nextMuted);
        syncLocalStreamFromRoom(current.callType);
      })
      .catch((error: unknown) => {
        console.error("toggleMute error:", error);
        toast.error("Không thể bật/tắt micro");
      });
  }, [isMuted, syncLocalStreamFromRoom]);

  const toggleCamera = useCallback(() => {
    const room = roomRef.current;
    const current = activeCallRef.current;
    if (!room || !current || current.callType !== "video") return;

    const nextCameraOff = !isCameraOff;
    void room.localParticipant
      .setCameraEnabled(!nextCameraOff)
      .then(() => {
        setIsCameraOff(nextCameraOff);
        syncLocalStreamFromRoom(current.callType);
      })
      .catch((error: unknown) => {
        console.error("toggleCamera error:", error);
        toast.error("Không thể bật/tắt camera");
      });
  }, [isCameraOff, syncLocalStreamFromRoom]);

  const hydrateIncomingCallerProfile = useCallback(
    async (call: IncomingCallData) => {
      if (!call.callerId) return;

      try {
        let caller = await userService.getUserProfile(call.callerId);

        // Fallback cho trường hợp endpoint profile không trả avatar theo context.
        if (
          !toAvatarValue((caller as unknown as Record<string, unknown>).avatar)
        ) {
          caller = await userService.getFriendProfile(call.callerId);
        }

        const callerObj = caller as unknown as Record<string, unknown>;
        const avatarKey =
          toAvatarValue(callerObj.avatar) || toAvatarValue(callerObj);
        const callerName = toDisplayName(callerObj);

        if (!avatarKey && !callerName) return;

        setIncomingCall((prev) => {
          if (!prev || prev.roomId !== call.roomId) return prev;
          const next = {
            ...prev,
            callerAvatar: prev.callerAvatar || avatarKey || "",
            callerName:
              prev.callerName && prev.callerName !== "Người dùng"
                ? prev.callerName
                : callerName || prev.callerName || "Người dùng",
          };
          incomingCallRef.current = next;
          return next;
        });
      } catch (error) {
        console.error(
          "hydrateIncomingCallerProfile error:",
          getErrorMessage(error, "Không lấy được thông tin người gọi"),
        );
      }
    },
    [],
  );

  useEffect(() => {
    if (!socket.current || !isConnected) return;
    const socketInstance = socket.current;

    const handleIncomingCall = (
      rawPayload: unknown,
      forcedCallMode?: VideoCallMode,
    ) => {
      const payload = normalizeSignalPayload(rawPayload);
      const call = parseIncomingCall(payload, forcedCallMode);
      if (!call || call.callerId === myUserId) return;

      const currentIncoming = incomingCallRef.current;
      const currentActive = activeCallRef.current;

      callDebug("socket:incoming-call", {
        roomId: call.roomId,
        callerId: call.callerId,
        conversationId: call.conversationId,
      });

      if (
        currentIncoming?.roomId === call.roomId ||
        currentActive?.roomId === call.roomId
      ) {
        callDebug("socket:incoming-call:duplicate_ignored", {
          roomId: call.roomId,
        });
        return;
      }

      if (currentActive || currentIncoming) {
        callDebug("socket:incoming-call:auto_reject_busy", {
          roomId: call.roomId,
        });
        emitSignal("reject-call", {
          toUserId: call.callerId,
          roomId: call.roomId,
          callMode: call.callMode || "direct",
          participantIds: call.participantIds,
          conversationId: call.conversationId,
          callType: call.callType,
          reason: "busy",
        });
        return;
      }

      incomingCallRef.current = call;
      setIncomingCall(call);
      setPhase("ringing");
      void hydrateIncomingCallerProfile(call);
    };

    const onIncomingDirectCall = (rawPayload: unknown) => {
      handleIncomingCall(rawPayload, "direct");
    };

    const onIncomingGroupCall = (rawPayload: unknown) => {
      handleIncomingCall(rawPayload, "group");
    };

    const onCallAccepted = async (rawPayload: unknown) => {
      const payload = normalizeSignalPayload(rawPayload);
      const roomId = getRoomId(payload);
      const current = activeCallRef.current;

      if (
        roomId &&
        roomRef.current &&
        hasLivekitConnectedRef.current &&
        roomRef.current.name === roomId
      ) {
        callDebug("socket:call-accepted:ignored_already_connected", {
          roomId,
        });
        return;
      }

      callDebug("socket:call-accepted", {
        roomId,
      });

      if (
        !current ||
        !current.isCaller ||
        !roomId ||
        current.roomId !== roomId
      ) {
        return;
      }

      const peerId = getPeerId(payload, myUserId) || current.peerUserId;
      const updatedCall: ActiveCallState = { ...current, peerUserId: peerId };
      setActiveCall(updatedCall);

      try {
        await connectToLivekitRoom(updatedCall);
      } catch (error) {
        console.error("onCallAccepted error:", error);
        toast.error(getErrorMessage(error, "Không thể kết nối phòng LiveKit"));
        leaveRoomAndReset("socket:call-accepted:error", {
          message: getErrorMessage(error, "Không thể kết nối phòng LiveKit"),
        });
      }
    };

    const onCallRejected = (rawPayload: unknown) => {
      const payload = normalizeSignalPayload(rawPayload);
      const roomId = getRoomId(payload);
      if (!roomId) return;

      callDebug("socket:call-rejected", {
        roomId,
        reason: payload.reason,
      });

      const activeMatches = activeCallRef.current?.roomId === roomId;
      const incomingMatches = incomingCallRef.current?.roomId === roomId;
      if (!activeMatches && !incomingMatches) return;

      const reason =
        (payload.reason as string | undefined) ||
        (payload.rejectionReason as string | undefined) ||
        "declined";

      const current = activeCallRef.current;
      if (
        current?.callMode === "group" &&
        current.isCaller &&
        (reason === "declined" || reason === "rejected" || reason === "busy")
      ) {
        toast.info("Một thành viên đã từ chối hoặc đang bận");
        return;
      }

      if (hasLivekitConnectedRef.current) {
        callDebug("socket:call-rejected:ignored_after_connected", {
          reason,
          roomId,
        });
        return;
      }

      leaveRoomAndReset("socket:call-rejected", {
        reason,
      });

      if (reason === "missed") {
        toast.info("Cuộc gọi nhỡ");
      } else if (reason === "busy") {
        toast.info("Người dùng đang bận");
      } else if (reason === "ended") {
        toast.info("Cuộc gọi đã kết thúc");
      } else {
        toast.info("Cuộc gọi bị từ chối");
      }
    };

    const onCallError = (rawPayload: unknown) => {
      const payload = normalizeSignalPayload(rawPayload);
      const roomId = getRoomId(payload);
      const activeRoomId = activeCallRef.current?.roomId;
      const incomingRoomId = incomingCallRef.current?.roomId;

      callDebug("socket:call-error", {
        roomId,
        activeRoomId,
        incomingRoomId,
      });

      if (roomId && roomId !== activeRoomId && roomId !== incomingRoomId) {
        return;
      }

      const message =
        (payload.message as string | undefined) ||
        (payload.error as string | undefined) ||
        "Lỗi cuộc gọi";

      if (hasLivekitConnectedRef.current) {
        callDebug("socket:call-error:ignored_after_connected", {
          message,
          roomId,
        });
        return;
      }

      toast.error(message);
      leaveRoomAndReset("socket:call-error", {
        message,
      });
    };

    socketInstance.on("incoming-call", onIncomingDirectCall);
    socketInstance.on("incomingCall", onIncomingDirectCall);
    socketInstance.on("incoming-group-call", onIncomingGroupCall);
    socketInstance.on("incomingGroupCall", onIncomingGroupCall);
    socketInstance.on("call-accepted", onCallAccepted);
    socketInstance.on("callAccepted", onCallAccepted);
    socketInstance.on("call-rejected", onCallRejected);
    socketInstance.on("callRejected", onCallRejected);
    socketInstance.on("call-error", onCallError);
    socketInstance.on("callError", onCallError);

    return () => {
      socketInstance.off("incoming-call", onIncomingDirectCall);
      socketInstance.off("incomingCall", onIncomingDirectCall);
      socketInstance.off("incoming-group-call", onIncomingGroupCall);
      socketInstance.off("incomingGroupCall", onIncomingGroupCall);
      socketInstance.off("call-accepted", onCallAccepted);
      socketInstance.off("callAccepted", onCallAccepted);
      socketInstance.off("call-rejected", onCallRejected);
      socketInstance.off("callRejected", onCallRejected);
      socketInstance.off("call-error", onCallError);
      socketInstance.off("callError", onCallError);
    };
  }, [
    callDebug,
    connectToLivekitRoom,
    emitSignal,
    isConnected,
    leaveRoomAndReset,
    myUserId,
    socket,
    hydrateIncomingCallerProfile,
  ]);

  useEffect(() => {
    return () => {
      stopRingtone();
      cleanupRoom("provider:unmount");
      stopStreams();
    };
  }, [cleanupRoom, stopRingtone, stopStreams]);

  const callStatusText =
    phase === "outgoing"
      ? "Đang đổ chuông..."
      : phase === "active"
        ? "Đang trong cuộc gọi"
        : "Đang thiết lập cuộc gọi...";

  const remoteAudioStreams = remoteParticipants
    .map((participant) => participant.stream)
    .filter((stream): stream is MediaStream => Boolean(stream));

  const videoTiles =
    activeCall?.callType === "video"
      ? [
          {
            tileId: "local",
            name: "Bạn",
            stream: localStream,
            hasVideo:
              Boolean(localStream?.getVideoTracks().length) && !isCameraOff,
            mirror: true,
          },
          ...remoteParticipants.map((participant) => ({
            tileId: participant.participantId,
            name: participant.name,
            stream: participant.stream,
            hasVideo: participant.hasVideo,
            mirror: false,
          })),
        ]
      : [];

  const isGroupVideoCall =
    activeCall?.callType === "video" && activeCall.callMode === "group";
  const directRemoteTile =
    activeCall?.callType === "video" && activeCall.callMode === "direct"
      ? videoTiles.find((tile) => tile.tileId !== "local")
      : undefined;
  const localTile =
    activeCall?.callType === "video"
      ? videoTiles.find((tile) => tile.tileId === "local")
      : undefined;

  const contextValue = useMemo<VideoCallContextType>(
    () => ({
      phase,
      incomingCall,
      activeCall,
      isMuted,
      isCameraOff,
      isBusy: phase !== "idle",
      startCall,
      startGroupCall,
      acceptIncomingCall,
      rejectIncomingCall,
      endCall,
      toggleMute,
      toggleCamera,
    }),
    [
      acceptIncomingCall,
      activeCall,
      endCall,
      incomingCall,
      isCameraOff,
      isMuted,
      phase,
      rejectIncomingCall,
      startCall,
      startGroupCall,
      toggleCamera,
      toggleMute,
    ],
  );

  return (
    <VideoCallContext.Provider value={contextValue}>
      {children}

      <Dialog
        open={!!incomingCall}
        onOpenChange={(open) => {
          if (!open) {
            if (isAcceptingIncomingCallRef.current) {
              callDebug("incomingDialog:close_ignored_while_accepting");
              return;
            }
            if (!incomingCallRef.current) {
              return;
            }
            void rejectIncomingCall("dismissed");
          }
        }}
      >
        <DialogContent className="left-1/2 top-auto bottom-0 w-full max-w-none -translate-x-1/2 translate-y-0 rounded-t-3xl rounded-b-none border-0 bg-white pb-10 pt-6 shadow-2xl md:top-1/2 md:bottom-auto md:w-[420px] md:max-w-[92vw] md:-translate-y-1/2 md:rounded-3xl md:px-8 md:pb-8 md:pt-7 [&>button]:hidden">
          <DialogHeader className="items-center text-center">
            <div className="relative mb-3 h-24 w-24 overflow-hidden rounded-full border-4 border-slate-100 bg-slate-200 shadow-md md:mb-4 md:h-28 md:w-28">
              {incomingCall?.callerAvatar ? (
                <PresignedAvatar
                  avatarKey={incomingCall.callerAvatar}
                  displayName={incomingCall?.callerName || "Người dùng"}
                  className="h-24 w-24 md:h-28 md:w-28"
                  fallbackClassName="text-2xl bg-slate-300 text-slate-700"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-600">
                  {(incomingCall?.callerName || "N")
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
            </div>
            <DialogTitle className="text-2xl font-bold text-slate-900">
              {incomingCall?.callerName || "Người dùng"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-base text-slate-500 md:text-[15px]">
              Cuộc gọi {incomingCall?.callType === "video" ? "video" : "thoại"}{" "}
              đến
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex-row items-end justify-center gap-12 sm:justify-center sm:space-x-0 md:mt-7 md:gap-14">
            <button
              type="button"
              onClick={() => {
                void rejectIncomingCall("declined");
              }}
              className="flex flex-col items-center gap-2"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-200">
                <PhoneOff className="h-6 w-6" />
              </span>
              <span className="text-sm font-medium text-slate-600 md:text-[15px]">
                Từ chối
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                void acceptIncomingCall();
              }}
              className="flex flex-col items-center gap-2"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-200">
                <Phone className="h-6 w-6" />
              </span>
              <span className="text-sm font-medium text-slate-600 md:text-[15px]">
                Chấp nhận
              </span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeCall && phase !== "idle" && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm">
          {remoteAudioStreams.map((stream, index) => (
            <AudioElement key={`remote-audio-${index}`} stream={stream} />
          ))}
          <div className="relative h-full w-full">
            <div className="absolute inset-0 bg-slate-900 p-3 pb-28 md:p-6 md:pb-32">
              {activeCall.callType === "video" ? (
                isGroupVideoCall ? (
                  <div
                    className={`grid h-full w-full gap-3 ${getVideoGridClass(
                      videoTiles.length || 1,
                    )}`}
                  >
                    {videoTiles.map((tile) => (
                      <div
                        key={tile.tileId}
                        className="relative min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-800"
                      >
                        {tile.hasVideo ? (
                          <VideoElement
                            stream={tile.stream}
                            muted={tile.tileId === "local"}
                            mirror={tile.mirror}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-300">
                            <div className="text-center">
                              <p className="text-base font-semibold">{tile.name}</p>
                              <p className="mt-1 text-xs text-slate-400">
                                {tile.tileId === "local" && isCameraOff
                                  ? "Camera đang tắt"
                                  : "Chưa có video"}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-1 text-xs text-white">
                          {tile.name}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-800">
                    {directRemoteTile?.hasVideo ? (
                      <VideoElement
                        stream={directRemoteTile.stream}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-300">
                        <div className="text-center">
                          <p className="text-base font-semibold">
                            {directRemoteTile?.name || activeCall.peerName || "Đang kết nối..."}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {callStatusText}
                          </p>
                        </div>
                      </div>
                    )}

                    {localTile && (
                      <div className="absolute right-4 top-4 h-40 w-28 overflow-hidden rounded-xl border border-white/35 bg-black/45 shadow-xl md:h-48 md:w-32">
                        {localTile.hasVideo ? (
                          <VideoElement
                            stream={localTile.stream}
                            muted
                            mirror
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-slate-100">
                            {isCameraOff ? "Camera tắt" : "Chưa có video"}
                          </div>
                        )}
                        <div className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
                          Bạn
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center w-full h-full text-slate-300">
                  <div className="text-center">
                    <p className="text-lg font-semibold">
                      {activeCall.peerName || "Đang kết nối..."}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      {callStatusText}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute left-4 top-4 rounded-xl bg-black/45 px-3 py-2 text-white">
              <p className="text-sm font-semibold">
                {activeCall.peerName || "Đang kết nối..."}
              </p>
              <p className="text-xs text-slate-300">{callStatusText}</p>
            </div>

            <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/40 px-4 py-1 text-xs text-white">
              {Math.floor(durationSeconds / 60)
                .toString()
                .padStart(2, "0")}
              :{(durationSeconds % 60).toString().padStart(2, "0")}
            </div>

            <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-3">
              <Button
                variant="secondary"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={toggleMute}
              >
                {isMuted ? <MicOff /> : <Mic />}
              </Button>

              {activeCall.callType === "video" && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={toggleCamera}
                >
                  {isCameraOff ? <VideoOff /> : <Video />}
                </Button>
              )}

              <Button
                variant="destructive"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={() => {
                  void endCall();
                }}
              >
                <PhoneOff />
              </Button>
            </div>
          </div>
        </div>
      )}
    </VideoCallContext.Provider>
  );
}

export function useVideoCall() {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error("useVideoCall must be used within VideoCallProvider");
  }
  return context;
}
