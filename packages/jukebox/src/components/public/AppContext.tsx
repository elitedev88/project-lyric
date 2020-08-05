import React, { RefObject, ReactChild, ReactNode, useContext } from "react";
import type {MusicFile} from "../../models/MusicFile";

export type Track = Pick<MusicFile, "id" | "fileSize" | "trackName" | "trackSortOrder" | "artistName" | "artistSortOrder" | "albumName" | "albumSortOrder" | "hasCover" | "duration" | "hasLyrics">;

export enum LoopMode {
  SINGLE = "SINGLE",
  ALL = "ALL",
  NONE = "NONE",
}

export interface Playlist {
  tracks: Track[];

  /** Track index number AFTER shuffle mapping. */
  nowPlaying?: number;

  loopMode: LoopMode;
  shuffleMapping?: number[];

  loadTracks: (tracks: Track[]) => void;
  playTrack: (index: number, playNow?: boolean) => void;
  playNext: (playNow?: boolean) => void;
  playPrevious: (playNow?: boolean) => void;
  addTrackToNext: (track: Track) => void;
  removeTrack: (index: number) => void;
  moveTrack: (from: number, to: number) => void;
  toggleShuffle: () => void;

  setLoopMode: (loopMode: LoopMode) => void;
  getCurrentSong: () => Track | null;
  getSongByIndex: (index: number) => Track | null;
}

const PlayerRefContext = React.createContext<RefObject<HTMLAudioElement>>(null);
PlayerRefContext.displayName = "PlayerRefContext";
const PlaylistContext = React.createContext<Playlist>({
  tracks: [],
  nowPlaying: null,
  loopMode: LoopMode.NONE,
  shuffleMapping: null,
  loadTracks: () => {
    /* do nothing */
  },
  playNext: () => {
    /* do nothing */
  },
  playPrevious: () => {
    /* do nothing */
  },
  addTrackToNext: () => {
    /* do nothing */
  },
  removeTrack: () => {
    /* do nothing */
  },
  playTrack: () => {
    /* do nothing */
  },
  moveTrack: () => {
    /* do nothing */
  },
  toggleShuffle: () => {
    /* do nothing */
  },
  setLoopMode: () => {
    /* do nothing */
  },
  getCurrentSong: () => {
    return null;
  },
  getSongByIndex: () => {
    return null;
  },
});
PlaylistContext.displayName = "PlaylistContext";

export interface ContextProps {
  playerRef: RefObject<HTMLAudioElement>;
  playlist: Playlist;
  children?: ReactChild;
}
export function AppContext({ playerRef, playlist, children }: ContextProps) {
  return (
    <PlayerRefContext.Provider value={playerRef}>
      <PlaylistContext.Provider value={playlist}>
        {children}
      </PlaylistContext.Provider>
    </PlayerRefContext.Provider>
  );
}

export function AppContextConsumer({
  children,
}: {
  children: (
    playerRef: RefObject<HTMLAudioElement>,
    playlist: Playlist
  ) => ReactNode;
}) {
  return (
    <PlayerRefContext.Consumer>
      {(playerRef) => (
        <PlaylistContext.Consumer>
          {(playlist) => children(playerRef, playlist)}
        </PlaylistContext.Consumer>
      )}
    </PlayerRefContext.Consumer>
  );
}

export function useAppContext() {
  return {
    playerRef: useContext(PlayerRefContext),
    playlist: useContext(PlaylistContext),
  };
}