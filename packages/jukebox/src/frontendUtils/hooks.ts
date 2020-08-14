import { useState, useDebugValue, useEffect, RefObject } from "react";
import { LyricsKitLyrics } from "../graphql/LyricsKitObjects";


export function useNamedState<T>(initialValue: T, name: string) {
  const ret = useState<T>(initialValue);
  useDebugValue(`${name}: ${ret[0]}`);
  return ret;
}

export function useLyricsState(playerRef: RefObject<HTMLAudioElement>, lyrics: LyricsKitLyrics) {
  const [line, setLine] = useNamedState<number | null>(null, "line");

  function onTimeUpdate() {
    const player = playerRef.current;
    if (player !== null) {
      const time = player.currentTime;
      const thisLineIndex = _.sortedIndexBy<{ position: number }>(lyrics.lines, { position: time }, "position");
      if (thisLineIndex === 0) {
        if (line !== null) setLine(null);
      } else {
        const thisLine =
          (thisLineIndex >= lyrics.lines.length || lyrics.lines[thisLineIndex].position !== time) ?
            thisLineIndex - 1 :
            thisLineIndex;
        if (thisLine != line) {
          setLine(thisLine);
        }
      }
      if (!player.paused) {
        window.requestAnimationFrame(onTimeUpdate);
      }
    } else {
      setLine(null);
    }
  }

  function onPlay() {
    window.requestAnimationFrame(onTimeUpdate);
  }

  useEffect(() => {
    const player = playerRef.current;
    if (player) {
      player.addEventListener("play", onPlay);
      if (!player.paused) {
        onPlay();
      }
      return () => {
        player.removeEventListener("play", onPlay);
      };
    }
  }, [playerRef]);

  return line;
}