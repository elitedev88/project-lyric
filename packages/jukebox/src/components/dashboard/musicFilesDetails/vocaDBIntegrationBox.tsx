import {
  Avatar,
  Box, Chip,
  Grid, IconButton,
  TextField as MuiTextField,
  Typography
} from "@material-ui/core";
import { Field, FormikProps } from "formik";
import { Autocomplete, AutocompleteRenderInputParams } from "formik-material-ui-lab";
import { FilterOptionsState } from "@material-ui/lab/useAutocomplete/useAutocomplete";
import { Song } from "../../../models/Song";
import { useNamedState } from "../../../frontendUtils/hooks";
import { useEffect } from "react";
import _ from "lodash";
import axios from "axios";
import { gql, useApolloClient } from "@apollo/client";
import MusicNoteIcon from "@material-ui/icons/MusicNote";
import SearchIcon from "@material-ui/icons/Search";
import AddCircleIcon from "@material-ui/icons/AddCircle";
import { makeStyles } from "@material-ui/core/styles";
import VocaDBSearchSongDialog from "./vocaDBSearchSongDialog";
import { SongFragments } from "../../../graphql/fragments";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import EditIcon from "@material-ui/icons/Edit";
import CreateSongEntityDialog from "./createSongEntityDialog";

export type ExtendedSong = Partial<Song> & {
  vocaDBSuggestion?: boolean;
  manual?: boolean;
};

const LOCAL_SONG_ENTITY_QUERY = gql`
  query($text: String!) {
    searchSongs(keywords: $text) {
      ...MusicFileDetails
    }
  }
  
  ${SongFragments.MusicFileDetails}
`;

const useStyles = makeStyles((theme) => ({
  icon: {
    color: theme.palette.text.secondary,
    marginRight: theme.spacing(2),
  },
  detailsBox: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  detailsThumbnail: {
    height: "4em",
    width: "4em",
    marginRight: "1em",
  },
  textBox: {
    flexGrow: 1,
  },
  chipsRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  featLabel: {
    margin: theme.spacing(0, 1),
  },
}));

interface Props<T extends string> {
  fieldName: T;
  formikProps: FormikProps<{ [key in T]: ExtendedSong }>;
  labelName: string;
  title?: string;
}

export default function VocaDBIntegrationBox<T extends string>({ fieldName, formikProps, labelName, title }: Props<T>) {
  const styles = useStyles();

  const apolloClient = useApolloClient();
  const { touched, errors, values, setFieldValue } = formikProps;
  const value = values[fieldName];

  const [vocaDBAutoCompleteOptions, setVocaDBAutoCompleteOptions] = useNamedState<ExtendedSong[]>([], "vocaDBAutoCompleteOptions");
  const [vocaDBAutoCompleteText, setVocaDBAutoCompleteText] = useNamedState("", "vocaDBAutoCompleteText");

  const [importDialogKeyword, setImportDialogKeyword] = useNamedState("", "importDialogKeyword");

  // Confirm import pop-up
  const [isImportDialogOpen, toggleImportDialogOpen] = useNamedState(false, "importDialogOpen");

  // Confirm manual enrol pop-up
  const [isManualDialogOpen, toggleManualDialogOpen] = useNamedState(false, "manualDialogOpen");

  // Query server for local autocomplete
  useEffect(() => {
    let active = true;

    if (vocaDBAutoCompleteText === "") {
      setVocaDBAutoCompleteOptions(value ? [value] : []);
      return undefined;
    }

    _.throttle(async () => {
      const apolloPromise = apolloClient.query<{ searchSongs: Song[] }>({
        query: LOCAL_SONG_ENTITY_QUERY,
        variables: { text: vocaDBAutoCompleteText },
      });

      const vocaDBPromise = axios.get<string[]>(
        "https://vocadb.net/api/songs/names",
        {
          params: {
            query: vocaDBAutoCompleteText,
            nameMatchMode: "Auto",
          }
        }
      );

      const apolloResult = await apolloPromise;
      const vocaDBResult = await vocaDBPromise;

      if (active) {
        let result: ExtendedSong[] = [];
        if (apolloResult.data?.searchSongs) {
          result = result.concat(apolloResult.data?.searchSongs);
        }
        if (vocaDBResult.status === 200 && vocaDBResult.data) {
          result = result.concat(vocaDBResult.data.map(v => ({
            id: null,
            name: v,
            sortOrder: `"${v}"`,
            vocaDBSuggestion: true,
          })));
        }
        if (value && !_.some(result, v => v.id === value.id)) {
          result = [value, ...result];
        }
        setVocaDBAutoCompleteOptions(result);
      }
    }, 200)();

    return () => {
      active = false;
    };
  }, [vocaDBAutoCompleteText, apolloClient, setVocaDBAutoCompleteOptions]);

  return (
    <>
      {title && <Typography variant="h6" component="h3" gutterBottom>{title}</Typography>}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Field
            component={Autocomplete}
            variant="outlined"
            name={fieldName}
            options={vocaDBAutoCompleteOptions}
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            freeSolo
            filterOptions={(v: ExtendedSong[], params: FilterOptionsState<ExtendedSong>) => {
              if (params.inputValue !== "") {
                v.push({
                  id: null,
                  name: `Search for “${params.inputValue}”`,
                  sortOrder: params.inputValue,
                  vocaDBSuggestion: true,
                });
                v.push({
                  id: null,
                  name: `Manually add “${params.inputValue}”`,
                  sortOrder: params.inputValue,
                  manual: true,
                });
              }
              return v;
            }}
            onInputChange={(event: unknown, newValue: string) => {
              setVocaDBAutoCompleteText(newValue);
            }}
            onChange={(event: unknown, newValue: ExtendedSong | null, reason: string) => {
              if (newValue === null) {
                setVocaDBAutoCompleteOptions([]);
                if (reason === "clear") {
                  setFieldValue(fieldName, null);
                }
                return;
              }
              if (newValue.vocaDBSuggestion) {
                setImportDialogKeyword(newValue.sortOrder);
                toggleImportDialogOpen(true);
                setVocaDBAutoCompleteOptions([]);
              } else if (newValue.manual) {
                setImportDialogKeyword(newValue.sortOrder);
                toggleManualDialogOpen(true);
                setVocaDBAutoCompleteOptions([]);
              } else {
                setFieldValue(fieldName, newValue);
              }
              console.log("on change", newValue, reason);
            }}
            renderOption={(option: ExtendedSong | null) => {
              let icon = <MusicNoteIcon className={styles.icon} />;
              if (option.vocaDBSuggestion) icon = <SearchIcon className={styles.icon} />;
              else if (option.manual) icon = <AddCircleIcon className={styles.icon} />;
              return (
                <Box display="flex" flexDirection="row" alignItems="center">
                  {icon} {option.name}
                </Box>
              );
            }}
            getOptionLabel={(option: ExtendedSong | null) => {
              // Prevent ”Manually add ...” item from being rendered
              if (option === null || option.id === null) return "";
              return option.name;
            }}
            renderInput={(params: AutocompleteRenderInputParams) => (
              <MuiTextField
                {...params}
                error={touched[fieldName] && !!errors[fieldName]}
                helperText={errors[fieldName]}
                label={labelName}
                variant="outlined"
                margin="dense"
                fullWidth
              />
            )}
          />
        </Grid>
        {value && (
          <Grid item xs={12}>
            <div className={styles.detailsBox}>
              <div>
                <Avatar
                  src={value.coverPath} variant="rounded"
                  className={styles.detailsThumbnail}
                >
                  <MusicNoteIcon />
                </Avatar>
              </div>
              <div className={styles.textBox}>
                <div>
                  <Typography component="span">
                    {value.name}
                  </Typography>
                  {" "}
                  <Typography color="textSecondary" component="span">
                    ({value.sortOrder}) #{value.id}
                  </Typography>
                </div>
                <div className={styles.chipsRow}>
                  {value.artists.filter(v => v.ArtistOfSong.categories.indexOf("Producer") >= 0).map(v => (
                    <Chip variant="outlined" size="small" key={v.sortOrder} label={v.name} />
                  ))}
                  {_.some(value.artists, v => v.ArtistOfSong.categories.indexOf("Vocalist")) &&
                  <Typography color="textSecondary" component="span" className={styles.featLabel}>feat.</Typography>}
                  {value.artists.filter(v => v.ArtistOfSong.categories.indexOf("Vocalist") >= 0).map(v => (
                    <Chip variant="outlined" size="small" key={v.sortOrder} label={v.name} />
                  ))}
                </div>
              </div>
              <div>
                {value.id >= 0 && (
                  <IconButton href={`https://vocadb.net/S/${value.id}`} target="_blank">
                    <OpenInNewIcon />
                  </IconButton>
                )}
                <IconButton>
                  <EditIcon />
                </IconButton>
              </div>
            </div>
          </Grid>
        )}
      </Grid>
      <VocaDBSearchSongDialog
        isOpen={isImportDialogOpen}
        toggleOpen={toggleImportDialogOpen}
        keyword={importDialogKeyword}
        setKeyword={setImportDialogKeyword}
        setSong={(v) => setFieldValue(fieldName, v)}
      />
      <CreateSongEntityDialog
        isOpen={isManualDialogOpen}
        toggleOpen={toggleManualDialogOpen}
        keyword={importDialogKeyword}
        setKeyword={setImportDialogKeyword}
        setSong={(v) => setFieldValue(fieldName, v)}
      />
    </>
  );
}