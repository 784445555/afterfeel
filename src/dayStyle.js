import { useMemo } from "react";
import { analyzeText } from "./lib/text";
import { computeStyle } from "./lib/style";
import { feelById } from "./lib/feel";

export function styleOf(day) {
  return computeStyle({ text: analyzeText(day.text), photos: day.photos, song: day.song, seed: day.id, feel: feelById(day.feel) });
}
export function useDayStyle(day) {
  return useMemo(() => styleOf(day), [day]);
}
