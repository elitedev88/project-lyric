import {
  Box,
  Button,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Theme,
  Tooltip,
  useTheme,
} from "@mui/material";
import { CSSProperties, useCallback, useEffect, useMemo, useRef } from "react";
import type { LyricsLine } from "lyrics-kit/core";
import { Lyrics, RangeAttribute, FURIGANA } from "lyrics-kit/core";
import { useSnackbar } from "notistack";
import { useNamedState } from "../../../../frontendUtils/hooks";
import FuriganaLyricsLine from "../../../FuriganaLyricsLine";
import { gql, useApolloClient } from "@apollo/client";
import EditFuriganaLine from "./EditFuriganaLine";
import type { DocumentNode } from "graphql";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";

const KARAOKE_TRANSLITERATION_QUERY = gql`
  query ($text: String!) {
    transliterate(text: $text) {
      karaoke(language: "ja")
    }
  }
` as DocumentNode;

function furiganaHighlight(
  theme: Theme
): (
  base: string,
  ruby: string,
  groupings: (string | [string, string])[]
) => CSSProperties | undefined {
  const primaryText = { color: theme.palette.primary.light };
  const secondaryText = { color: theme.palette.secondary.light };
  return (base, ruby, groupings) => {
    if (base === "明日" && (ruby === "あした" || ruby === "あす"))
      return secondaryText;
    if (base === "抱" && (ruby === "だ" || ruby === "いだ"))
      return secondaryText;
    if (base === "行" && (ruby === "い" || ruby === "ゆ")) return secondaryText;
    if (base === "今" && ruby === "こん") return primaryText;
    if (base === "君" && ruby === "くん") return primaryText;

    // contextual
    if (
      (base === "身" && ruby === "しん") ||
      (base === "体" && ruby === "たい")
    ) {
      const shintaiIndex = groupings.findIndex(
        (v) => typeof v !== "string" && v[0] === "身" && v[1] === "しん"
      );
      if (
        shintaiIndex >= 0 &&
        shintaiIndex < groupings.length - 1 &&
        typeof groupings[shintaiIndex + 1] !== "string" &&
        groupings[shintaiIndex + 1][0] === "体" &&
        groupings[shintaiIndex + 1][1] === "たい"
      )
        return primaryText;
    }
    return undefined;
  };
}

interface Props {
  lyrics: string;
  setLyrics: (lyrics: string) => void;
  fileId: number;
}

export default function EditFurigana({ lyrics, setLyrics, fileId }: Props) {
  const snackbar = useSnackbar();
  const apolloClient = useApolloClient();
  const theme = useTheme();

  const [selectedLine, setSelectedLine] = useNamedState(null, "selectedLine");

  // Parse lyrics
  const parsedLyrics = useMemo<Lyrics | null>(() => {
    if (!lyrics) return null;

    try {
      return new Lyrics(lyrics);
    } catch (e) {
      console.error(`Error occurred while loading lyrics text: ${e}`, e);
      snackbar.enqueueSnackbar(
        `Error occurred while loading lyrics text: ${e}`,
        { variant: "error" }
      );
      return null;
    }
  }, [lyrics, snackbar]);

  // Parse and set `lines`.
  const [lines, setLines] = useNamedState<LyricsLine[]>([], "lines");
  const linesRef = useRef<LyricsLine[]>();
  linesRef.current = lines;
  useEffect(() => {
    if (parsedLyrics !== null) {
      setLines(parsedLyrics.lines);

      return () => {
        parsedLyrics.lines = linesRef.current;
        setLyrics(parsedLyrics.toString());
      };
    }
    // dropping dependency [parsedLyrics] to prevent loop with parsedLyrics.
  }, [setLines, setLyrics]);

  // Generate furigana
  const overwriteFurigana = useCallback(async () => {
    try {
      const result = await apolloClient.query<{
        transliterate: { karaoke: [string, string][][] };
      }>({
        query: KARAOKE_TRANSLITERATION_QUERY,
        variables: { text: lines.map((v) => v.content).join("\n") },
      });
      if (result.data) {
        // Copy `lines` for React to recognize it as a new state
        const newLines = [...lines];
        result.data.transliterate.karaoke.forEach((v, idx) => {
          const line = newLines[idx];
          if (!line) return;
          if (v.length < 1) {
            delete line.attachments.content[FURIGANA];
          } else {
            const { tags } = v.reduce<{
              len: number;
              tags: [string, [number, number]][];
            }>(
              ({ len, tags }, [base, furigana]) => {
                if (base === furigana) return { len: len + base.length, tags };
                else {
                  tags.push([furigana, [len, len + base.length]]);
                  return { len: len + base.length, tags };
                }
              },
              { len: 0, tags: [] }
            );
            if (tags.length < 1) delete line.attachments.content[FURIGANA];
            else line.attachments.content[FURIGANA] = new RangeAttribute(tags);
          }
        });
        setLines(newLines);
      }
    } catch (e) {
      console.error(`Error occurred while generating furigana: ${e}`, e);
      snackbar.enqueueSnackbar(
        `Error occurred while generating furigana: ${e}`,
        { variant: "error" }
      );
    }
  }, [apolloClient, lines, setLines, snackbar]);

  // Save current line furigana
  const saveCurrentLine = useCallback(
    (idx: number) => (line: LyricsLine) => {
      // Copy `lines` for React to recognize it as a new state
      setLines((l) => {
        const newLines = [...l];
        newLines[idx] = line;
        return newLines;
      });
    },
    [setLines]
  );

  // Apply furigana to all identical lines
  const applyFuriganaToAll = useCallback(
    (idx: number) => () => {
      const line = lines[idx];
      if (!line?.content) return;
      const furigana = line.attachments.content[FURIGANA];
      setLines((l) => {
        const newLines = [...l];
        newLines.forEach((v, i) => {
          if (i === idx) return;
          if (v.content === line.content) {
            if (furigana) v.attachments.content[FURIGANA] = furigana;
            else delete v.attachments.content[FURIGANA];
          }
        });
        return newLines;
      });
    },
    [lines, setLines]
  );

  return (
    <Grid container spacing={2}>
      <Grid
        item
        xs={12}
        sx={{
          position: "sticky",
          top: 2,
          left: 0,
          zIndex: 2,
        }}
      >
        <audio
          src={`/api/files/${fileId}/file`}
          controls
          style={{ width: "100%" }}
        />
      </Grid>
      <Grid
        item
        xs={12}
        sm={5}
        sx={{
          position: "sticky",
          top: 60,
          left: 0,
          height: "fit-content",
          zIndex: 2,
        }}
      >
        <Box sx={{ marginTop: 2, marginBottom: 2 }}>
          <Button variant="outlined" onClick={overwriteFurigana}>
            Overwrite with generated furigana
          </Button>
        </Box>
        <Box sx={{ marginTop: 2, marginBottom: 2 }}>
          {selectedLine != null && selectedLine < lines.length && (
            <EditFuriganaLine
              line={lines[selectedLine]}
              setLine={saveCurrentLine(selectedLine)}
            />
          )}
        </Box>
      </Grid>
      <Grid item xs={12} sm={7}>
        <List dense>
          {lines.map((v, idx) => (
            <ListItem
              key={idx}
              disablePadding
              secondaryAction={
                <Tooltip
                  title="Apply furigana to all identical lines"
                  placement="bottom-end"
                >
                  <IconButton onClick={applyFuriganaToAll(idx)}>
                    <PlaylistAddCheckIcon />
                  </IconButton>
                </Tooltip>
              }
              sx={{
                "& .MuiListItemSecondaryAction-root": {
                  visibility: "hidden",
                },
                "&:hover .MuiListItemSecondaryAction-root, &:focus .MuiListItemSecondaryAction-root":
                  {
                    visibility: "visible",
                  },
              }}
            >
              <ListItemButton
                onClick={() => setSelectedLine(idx)}
                selected={selectedLine === idx}
              >
                <ListItemText
                  primaryTypographyProps={{
                    variant: "body1",
                    lang: "ja",
                    sx: {
                      fontSize: "2em",
                      minHeight: "1em",
                    },
                  }}
                >
                  <FuriganaLyricsLine
                    lyricsKitLine={v}
                    rubyStyles={furiganaHighlight(theme)}
                  />
                </ListItemText>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Grid>
    </Grid>
  );
}
