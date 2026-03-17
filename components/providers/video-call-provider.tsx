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
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSocket } from "@/components/providers/socket-provider";
import { useAuthStore } from "@/store/use-auth-store";
import { videoCallService } from "@/api/video-call";
import { IncomingCallData, VideoCallType } from "@/types/video-call";

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
  callId: string;
  peerUserId: string;
  peerName?: string;
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

interface VideoCallContextType {
  phase: CallPhase;
  incomingCall: IncomingCallData | null;
  activeCall: ActiveCallState | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isBusy: boolean;
  startCall: (payload: StartCallPayload) => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  rejectIncomingCall: (reason?: string) => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
}

const VideoCallContext = createContext<VideoCallContextType | null>(null);

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  {
    urls:
      process.env.NEXT_PUBLIC_WEBRTC_STUN_URL || "stun:stun.l.google.com:19302",
  },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

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

const getCallId = (payload: Record<string, unknown>): string | undefined => {
  const directCandidates = [
    payload.callId,
    payload.id,
    payload._id,
    (payload.data as Record<string, unknown> | undefined)?.callId,
    (payload.data as Record<string, unknown> | undefined)?._id,
    (payload.result as Record<string, unknown> | undefined)?.callId,
  ];

  for (const candidate of directCandidates) {
    const id = toId(candidate);
    if (id) return id;
  }

  const callObj = toObject(payload.call);
  const nestedCandidates = [callObj.callId, callObj.id, callObj._id, callObj];

  for (const candidate of nestedCandidates) {
    const id = toId(candidate);
    if (id) return id;
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
): IncomingCallData | null => {
  const callId = getCallId(payload);
  const callerId = toId(payload.callerId) || toId(payload.fromUserId);
  if (!callId || !callerId) return null;

  return {
    callId,
    callerId,
    callerName:
      (payload.callerName as string | undefined) ||
      ((payload.caller as { displayName?: string } | undefined)?.displayName ??
        "User"),
    callerAvatar:
      (payload.callerAvatar as string | undefined) ||
      ((payload.caller as { avatar?: string } | undefined)?.avatar ?? ""),
    receiverId: toId(payload.receiverId),
    callType: (payload.callType as VideoCallType) || "video",
    conversationId: toId(payload.conversationId),
  };
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

export function VideoCallProvider({ children }: { children: ReactNode }) {
  const { socket, isConnected } = useSocket();
  const user = useAuthStore((state) => state.user);
  const myUserId = user?.id || user?._id;

  const [phase, setPhase] = useState<CallPhase>("idle");
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(
    null,
  );
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const activeCallRef = useRef<ActiveCallState | null>(null);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

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

  const cleanupPeer = useCallback(() => {
    if (!peerRef.current) return;

    peerRef.current.onicecandidate = null;
    peerRef.current.ontrack = null;
    peerRef.current.onconnectionstatechange = null;
    peerRef.current.close();
    peerRef.current = null;
  }, []);

  const stopStreams = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsCameraOff(false);
  }, []);

  const resetCallState = useCallback(() => {
    setPhase("idle");
    setIncomingCall(null);
    setActiveCall(null);
    setStartedAt(null);
    setDurationSeconds(0);
  }, []);

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

  const ensureLocalStream = useCallback(async (callType: VideoCallType) => {
    const existingStream = localStreamRef.current;
    if (existingStream) {
      const hasLiveAudio = existingStream
        .getAudioTracks()
        .some((track) => track.readyState === "live");
      const hasLiveVideo = existingStream
        .getVideoTracks()
        .some((track) => track.readyState === "live");

      // Reuse stream only when tracks still live and satisfy current call type.
      if (hasLiveAudio && (callType === "audio" || hasLiveVideo)) {
        return existingStream;
      }

      existingStream.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This device does not support WebRTC");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === "video",
    });

    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const setupPeerConnection = useCallback(
    async (call: ActiveCallState, shouldCreateOffer: boolean) => {
      cleanupPeer();
      setPhase("connecting");

      const stream = await ensureLocalStream(call.callType);
      const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS });
      peerRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        const streamFromPeer = event.streams[0];
        if (!streamFromPeer) return;
        setRemoteStream(streamFromPeer);
        setPhase("active");
        markCallStarted();
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        emitSignal("ice-candidate", {
          callId: call.callId,
          candidate: event.candidate,
          from: call.isCaller ? "caller" : "receiver",
          targetUserId: call.peerUserId,
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setPhase("active");
          markCallStarted();
          return;
        }

        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected" ||
          pc.connectionState === "closed"
        ) {
          toast.info("Call ended");
          cleanupPeer();
          stopStreams();
          resetCallState();
        }
      };

      if (shouldCreateOffer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        emitSignal("call-offer", {
          callId: call.callId,
          offer,
          targetUserId: call.peerUserId,
        });
      }

      return pc;
    },
    [
      cleanupPeer,
      emitSignal,
      ensureLocalStream,
      markCallStarted,
      resetCallState,
      stopStreams,
    ],
  );

  const startCall = useCallback(
    async ({
      receiverId,
      receiverName,
      conversationId,
      callType = "video",
    }: StartCallPayload) => {
      if (!socket.current || !isConnected) {
        toast.error("Socket is not connected");
        return;
      }
      if (!myUserId) {
        toast.error("Missing authenticated user");
        return;
      }

      try {
        const callRecord = await videoCallService.initiate({
          receiverId,
          callType,
          conversationId,
        });

        if (!callRecord.id) {
          toast.error("Cannot create call");
          return;
        }

        const call: ActiveCallState = {
          callId: callRecord.id,
          peerUserId: receiverId,
          peerName: receiverName,
          callType,
          conversationId,
          isCaller: true,
        };

        setIncomingCall(null);
        setPhase("outgoing");
        setActiveCall(call);

        await ensureLocalStream(callType);

        emitSignal("initiate-call", {
          callId: call.callId,
          call: { id: call.callId },
          receiverId,
          toUserId: receiverId,
          to: receiverId,
          callerId: myUserId,
          fromUserId: myUserId,
          from: myUserId,
          callType,
          conversationId,
        });

        toast.success("Calling...");
      } catch (error) {
        console.error("startCall error:", error);
        toast.error(getErrorMessage(error, "Unable to start call"));
        cleanupPeer();
        stopStreams();
        resetCallState();
      }
    },
    [
      cleanupPeer,
      emitSignal,
      ensureLocalStream,
      isConnected,
      myUserId,
      resetCallState,
      socket,
      stopStreams,
    ],
  );

  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall || !myUserId) return;

    try {
      const accepted = await videoCallService.accept(incomingCall.callId);

      const call: ActiveCallState = {
        callId: accepted.id || incomingCall.callId,
        peerUserId: incomingCall.callerId,
        peerName: incomingCall.callerName,
        callType: incomingCall.callType,
        conversationId: incomingCall.conversationId,
        isCaller: false,
      };

      setIncomingCall(null);
      setPhase("connecting");
      setActiveCall(call);
      markCallStarted();
      await ensureLocalStream(call.callType);

      emitSignal("accept-call", {
        callId: call.callId,
        call: { id: call.callId },
        callerId: call.peerUserId,
        receiverId: myUserId,
        fromUserId: myUserId,
        from: myUserId,
        toUserId: call.peerUserId,
        to: call.peerUserId,
        targetUserId: call.peerUserId,
      });
    } catch (error) {
      console.error("acceptIncomingCall error:", error);
      toast.error("Unable to accept call");
      cleanupPeer();
      stopStreams();
      resetCallState();
    }
  }, [
    cleanupPeer,
    emitSignal,
    ensureLocalStream,
    incomingCall,
    markCallStarted,
    myUserId,
    resetCallState,
    stopStreams,
  ]);

  const rejectIncomingCall = useCallback(
    async (reason = "declined") => {
      if (!incomingCall) return;

      try {
        await videoCallService.reject(incomingCall.callId, reason);
        emitSignal("end-call", {
          callId: incomingCall.callId,
          reason,
          targetUserId: incomingCall.callerId,
        });
      } catch (error) {
        console.error("rejectIncomingCall error:", error);
      } finally {
        setIncomingCall(null);
        setPhase("idle");
      }
    },
    [emitSignal, incomingCall],
  );

  const endCall = useCallback(async () => {
    if (!activeCallRef.current) return;

    const currentCall = activeCallRef.current;

    try {
      await videoCallService.end(currentCall.callId);
      emitSignal("end-call", {
        callId: currentCall.callId,
        targetUserId: currentCall.peerUserId,
      });
    } catch (error) {
      console.error("endCall error:", error);
    } finally {
      cleanupPeer();
      stopStreams();
      resetCallState();
    }
  }, [cleanupPeer, emitSignal, resetCallState, stopStreams]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const nextMuted = !isMuted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  }, [isMuted]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const nextCameraOff = !isCameraOff;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !nextCameraOff;
    });
    setIsCameraOff(nextCameraOff);
  }, [isCameraOff]);

  useEffect(() => {
    if (!socket.current || !isConnected) return;
    const socketInstance = socket.current;

    const onCallRinging = (rawPayload: unknown) => {
      const payload = normalizeSignalPayload(rawPayload);
      const call = parseIncomingCall(payload);
      if (!call || call.callerId === myUserId) return;

      setIncomingCall(call);
      setPhase("ringing");
      toast.info(`${call.callerName || "User"} is calling you`);
    };

    const onCallAccepted = async (rawPayload: unknown) => {
      const payload = normalizeSignalPayload(rawPayload);
      const callId = getCallId(payload);
      const current = activeCallRef.current;

      if (
        !current ||
        !callId ||
        current.callId !== callId ||
        !current.isCaller
      ) {
        return;
      }

      const peerId = getPeerId(payload, myUserId) || current.peerUserId;
      const updatedCall: ActiveCallState = { ...current, peerUserId: peerId };
      setActiveCall(updatedCall);
      markCallStarted();

      try {
        await setupPeerConnection(updatedCall, true);
      } catch (error) {
        console.error("onCallAccepted error:", error);
        toast.error(
          getErrorMessage(error, "Unable to setup WebRTC connection"),
        );
        cleanupPeer();
        stopStreams();
        resetCallState();
      }
    };

    const onCallOffer = async (rawPayload: unknown) => {
      const payload = normalizeSignalPayload(rawPayload);
      const callId = getCallId(payload);
      const offer = payload.offer as RTCSessionDescriptionInit | undefined;
      if (!callId || !offer) return;

      let call = activeCallRef.current;
      if (!call || call.callId !== callId) {
        const peerUserId = getPeerId(payload, myUserId);
        if (!peerUserId) return;

        call = {
          callId,
          peerUserId,
          peerName: (payload.callerName as string | undefined) || undefined,
          callType: (payload.callType as VideoCallType) || "video",
          conversationId: toId(payload.conversationId),
          isCaller: false,
        };
        setActiveCall(call);
      }

      try {
        const pc = peerRef.current || (await setupPeerConnection(call, false));
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        emitSignal("call-answer", {
          callId,
          answer,
          targetUserId: call.peerUserId,
        });
      } catch (error) {
        console.error("onCallOffer error:", error);
      }
    };

    const onCallAnswer = async (rawPayload: unknown) => {
      const payload = normalizeSignalPayload(rawPayload);
      const callId = getCallId(payload);
      const answer = payload.answer as RTCSessionDescriptionInit | undefined;

      const current = activeCallRef.current;
      const pc = peerRef.current;

      if (!pc || !current || !callId || current.callId !== callId || !answer) {
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error("onCallAnswer error:", error);
      }
    };

    const onIceCandidate = async (rawPayload: unknown) => {
      const payload = normalizeSignalPayload(rawPayload);
      const callId = getCallId(payload);
      const candidate = payload.candidate as RTCIceCandidateInit | undefined;

      const current = activeCallRef.current;
      const pc = peerRef.current;

      if (
        !pc ||
        !current ||
        !callId ||
        current.callId !== callId ||
        !candidate
      ) {
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("addIceCandidate error:", error);
      }
    };

    const onCallEnded = (rawPayload: unknown) => {
      const payload = normalizeSignalPayload(rawPayload);
      const callId = getCallId(payload);
      if (!callId) return;

      const activeMatches = activeCallRef.current?.callId === callId;
      const incomingMatches = incomingCall?.callId === callId;
      if (!activeMatches && !incomingMatches) return;

      cleanupPeer();
      stopStreams();
      resetCallState();
      toast.info("Call ended");
    };

    const onCallRejected = (rawPayload: unknown) => {
      const payload = normalizeSignalPayload(rawPayload);
      const callId = getCallId(payload);
      if (!callId) return;

      const active = activeCallRef.current;
      if (!active || active.callId !== callId || !active.isCaller) return;

      cleanupPeer();
      stopStreams();
      resetCallState();

      const reason =
        (payload.reason as string | undefined) ||
        (payload.rejectionReason as string | undefined) ||
        "declined";

      if (reason === "missed") {
        toast.info("Call missed");
      } else {
        toast.info("Call rejected");
      }
    };

    socketInstance.on("call-ringing", onCallRinging);
    socketInstance.on("call-accepted", onCallAccepted);
    socketInstance.on("callAccepted", onCallAccepted);
    socketInstance.on("call-offer", onCallOffer);
    socketInstance.on("call-answer", onCallAnswer);
    socketInstance.on("ice-candidate", onIceCandidate);
    socketInstance.on("call-ended", onCallEnded);
    socketInstance.on("call-rejected", onCallRejected);
    socketInstance.on("callRejected", onCallRejected);

    return () => {
      socketInstance.off("call-ringing", onCallRinging);
      socketInstance.off("call-accepted", onCallAccepted);
      socketInstance.off("callAccepted", onCallAccepted);
      socketInstance.off("call-offer", onCallOffer);
      socketInstance.off("call-answer", onCallAnswer);
      socketInstance.off("ice-candidate", onIceCandidate);
      socketInstance.off("call-ended", onCallEnded);
      socketInstance.off("call-rejected", onCallRejected);
      socketInstance.off("callRejected", onCallRejected);
    };
  }, [
    cleanupPeer,
    emitSignal,
    incomingCall,
    isConnected,
    markCallStarted,
    myUserId,
    resetCallState,
    setupPeerConnection,
    socket,
    stopStreams,
  ]);

  useEffect(() => {
    return () => {
      cleanupPeer();
      stopStreams();
    };
  }, [cleanupPeer, stopStreams]);

  const contextValue = useMemo<VideoCallContextType>(
    () => ({
      phase,
      incomingCall,
      activeCall,
      isMuted,
      isCameraOff,
      isBusy: phase !== "idle",
      startCall,
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
            void rejectIncomingCall("dismissed");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Incoming call</DialogTitle>
            <DialogDescription>
              {incomingCall?.callerName || "User"} is calling (
              {incomingCall?.callType === "video" ? "video" : "audio"})
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                void rejectIncomingCall("declined");
              }}
            >
              <PhoneOff className="w-4 h-4" /> Decline
            </Button>
            <Button
              onClick={() => {
                void acceptIncomingCall();
              }}
            >
              <Phone className="w-4 h-4" /> Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeCall && phase !== "idle" && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm">
          <div className="relative w-full h-full">
            <div className="absolute inset-0 bg-slate-900">
              {remoteStream ? (
                <VideoElement
                  stream={remoteStream}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-slate-300">
                  <div className="text-center">
                    <p className="text-lg font-semibold">
                      {activeCall.peerName || "Connecting..."}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      {phase === "outgoing"
                        ? "Ringing..."
                        : "Setting up call..."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute h-40 overflow-hidden border rounded-lg shadow-xl right-4 top-4 w-28 border-white/20 bg-black/40 md:h-48 md:w-36">
              <VideoElement
                stream={localStream}
                muted
                mirror
                className="object-cover w-full h-full"
              />
            </div>

            <div className="absolute px-4 py-1 text-xs text-white -translate-x-1/2 rounded-full left-1/2 top-4 bg-black/40">
              {Math.floor(durationSeconds / 60)
                .toString()
                .padStart(2, "0")}
              :{(durationSeconds % 60).toString().padStart(2, "0")}
            </div>

            <div className="absolute flex items-center gap-3 -translate-x-1/2 bottom-8 left-1/2">
              <Button
                variant="secondary"
                size="icon"
                className="w-12 h-12 rounded-full"
                onClick={toggleMute}
              >
                {isMuted ? <MicOff /> : <Mic />}
              </Button>

              {activeCall.callType === "video" && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="w-12 h-12 rounded-full"
                  onClick={toggleCamera}
                >
                  {isCameraOff ? <VideoOff /> : <Video />}
                </Button>
              )}

              <Button
                variant="destructive"
                size="icon"
                className="w-12 h-12 rounded-full"
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
