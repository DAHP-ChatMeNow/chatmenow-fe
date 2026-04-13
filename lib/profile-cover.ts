export interface ProfileCoverPreset {
  id: string;
  name: string;
  className: string;
}

export const DEFAULT_PROFILE_COVER_CLASS =
  "bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600";

export const PROFILE_COVER_PRESETS: ProfileCoverPreset[] = [
  {
    id: "cover-sunset",
    name: "Hoàng hôn",
    className: "bg-gradient-to-br from-orange-400 via-rose-500 to-fuchsia-600",
  },
  {
    id: "cover-ocean",
    name: "Đại dương",
    className: "bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-700",
  },
  {
    id: "cover-forest",
    name: "Rừng xanh",
    className: "bg-gradient-to-br from-emerald-400 via-green-500 to-teal-700",
  },
  {
    id: "cover-lavender",
    name: "Lavender",
    className: "bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-600",
  },
  {
    id: "cover-golden",
    name: "Ánh vàng",
    className: "bg-gradient-to-br from-amber-300 via-orange-500 to-red-600",
  },
  {
    id: "cover-night",
    name: "Đêm sâu",
    className: "bg-gradient-to-br from-slate-700 via-slate-900 to-black",
  },
];

export const getProfileCoverPreset = (themeColor?: string) =>
  PROFILE_COVER_PRESETS.find((preset) => preset.id === themeColor);
