# lyrics-kit

## Install

```shell
$ npm install lyrics-kit
```

### Install locally

```shell
npm install
```

## Usage

### Typescript (ES6 import)

```typescript
import {
  LyricsSearchRequest as Request,
  LyricsProviderManager as Manager,
  LyricsProviderSource as Source,
  Lyrics,
} from "lyrics-kit";

async () => {
  const request = Request.fromInfo(
    "Song title",
    "Artist name",
    /* duration in seconds */ 320.1
  );
  // Get lyrics from all sources.
  let manager = new Manager();
  let lyrics: Lyrics[] = manager.getLyrics(request);

  // Get lyrics from a set of sources
  manager = new Manager([Source.netease, Source.kugou]);
  lyrics = manager.getLyrics(request);

  // Get lyrics from a single source
  source = Source.qqMusic.build();
  lyrics = source.getLyrics(request);

  // Get LRCX text
  for (const lyric of lyrics) {
    console.log("========== BEGIN LRCX CONTENT ==========");
    console.log(lyric.toString());
    console.log("=========== END LRCX CONTENT ===========");
  }
};
```