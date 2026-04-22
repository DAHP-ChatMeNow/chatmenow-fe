import api from "@/lib/axios";
import { MusicTrack } from "@/types/music";

const search = async (q: string, limit = 20): Promise<MusicTrack[]> => {
    const { data } = await api.get<{ success: boolean; tracks: MusicTrack[] }>("/music/search", {
        params: { q, limit },
    });
    return data.tracks;
};

const getPopular = async (limit = 20): Promise<MusicTrack[]> => {
    const { data } = await api.get<{ success: boolean; tracks: MusicTrack[] }>("/music/popular", {
        params: { limit },
    });
    return data.tracks;
};

export const musicService = {
    search,
    getPopular,
};
