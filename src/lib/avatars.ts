import m1 from "@/assets/avatars/trener-m1.png";
import m2 from "@/assets/avatars/trener-m2.png";
import k1 from "@/assets/avatars/trener-k1.png";
import k2 from "@/assets/avatars/trener-k2.png";

export type AvatarOption = {
  key: string;
  label: string;
  gender: "m" | "k";
  src: string;
};

/** Pełnopostaciowe sylwetki trenerów — jeden spójny styl pixel-art. */
export const AVATARS: AvatarOption[] = [
  { key: "m1", label: "Trener w czapce", gender: "m", src: m1 },
  { key: "m2", label: "Trener w bluzie", gender: "m", src: m2 },
  { key: "k1", label: "Trenerka w czapce", gender: "k", src: k1 },
  { key: "k2", label: "Trenerka w kurtce", gender: "k", src: k2 },
];

export const DEFAULT_AVATAR_KEY = "m1";

export function avatarSrc(key: string | null | undefined): string {
  return (AVATARS.find((item) => item.key === key) ?? AVATARS[0]!).src;
}
