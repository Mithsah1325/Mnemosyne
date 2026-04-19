import { useMemo } from "react";

export function useAudio() {
  return useMemo(
    () => ({
      isRecording: false,
      start: () => {},
      stop: () => {}
    }),
    []
  );
}
