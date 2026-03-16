import api from "@/lib/axios";
import {
  VideoCallRecord,
  VideoCallStats,
  VideoCallType,
} from "@/types/video-call";

type AnyObject = Record<string, unknown>;

const toObject = (value: unknown): AnyObject => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as AnyObject;
  }
  return {};
};

const toId = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const raw = value as { _id?: string; id?: string };
    return raw._id || raw.id;
  }
  return undefined;
};

const normalizeCall = (raw: unknown): VideoCallRecord => {
  const source = (raw || {}) as {
    _id?: string;
    id?: string;
    callerId?: unknown;
    receiverId?: unknown;
    status?: VideoCallRecord["status"];
    callType?: VideoCallType;
    conversationId?: unknown;
    startTime?: string;
    endTime?: string;
    duration?: number;
    rejectionReason?: string;
    createdAt?: string;
    updatedAt?: string;
  };

  return {
    id: source._id || source.id || "",
    callerId: toId(source.callerId) || "",
    receiverId: toId(source.receiverId) || "",
    status: source.status || "initiated",
    callType: source.callType || "video",
    conversationId: toId(source.conversationId),
    startTime: source.startTime,
    endTime: source.endTime,
    duration: source.duration,
    rejectionReason: source.rejectionReason,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
};

const looksLikeCall = (raw: unknown) => {
  const obj = toObject(raw);
  return !!(
    toId(obj._id) ||
    toId(obj.id) ||
    obj.callerId ||
    obj.receiverId ||
    obj.callType ||
    obj.status
  );
};

const extractCall = (payload: unknown): VideoCallRecord => {
  const obj = (payload || {}) as AnyObject;

  const data = toObject(obj.data);
  const result = toObject(obj.result);
  const payloadObj = toObject(obj.payload);

  const candidates: unknown[] = [
    obj.call,
    obj.videoCall,
    data.call,
    data.videoCall,
    result.call,
    result.videoCall,
    payloadObj.call,
    payloadObj.videoCall,
    data,
    result,
    payloadObj,
    payload,
  ];

  const possibleCall = candidates.find((item) => looksLikeCall(item));

  return normalizeCall(possibleCall);
};

export const videoCallService = {
  initiate: async (data: {
    receiverId: string;
    callType?: VideoCallType;
    conversationId?: string;
  }) => {
    const res = await api.post("/video-calls/initiate", data);
    const call = extractCall(res.data);

    if (!call.id) {
      const message = toObject(res.data).message as string | undefined;
      throw new Error(message || "Initiate call response missing callId");
    }

    return call;
  },

  accept: async (callId: string) => {
    const res = await api.post(`/video-calls/${callId}/accept`);
    return extractCall(res.data);
  },

  reject: async (callId: string, reason = "declined") => {
    const res = await api.post(`/video-calls/${callId}/reject`, {
      reason,
    });
    return extractCall(res.data);
  },

  end: async (callId: string) => {
    const res = await api.post(`/video-calls/${callId}/end`);
    return extractCall(res.data);
  },

  getActive: async () => {
    const res = await api.get("/video-calls/active");
    return extractCall(res.data);
  },

  getHistory: async () => {
    const res = await api.get("/video-calls/history");
    const obj = (res.data || {}) as AnyObject;
    const calls = (obj.calls || obj.history || []) as unknown[];
    return calls.map((item) => normalizeCall(item));
  },

  getStats: async () => {
    const res = await api.get("/video-calls/stats");
    return (res.data || {}) as VideoCallStats;
  },
};
