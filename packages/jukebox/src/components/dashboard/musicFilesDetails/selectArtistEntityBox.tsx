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
import { ArtistFragments } from "../../../graphql/fragments";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import EditIcon from "@material-ui/icons/Edit";
import CreateSongEntityDialog from "./createSongEntityDialog";
import { Artist } from "../../../models/Artist";
import VocaDBSearchArtistDialog from "./vocaDBSearchArtistDialog";

export type ExtendedArtist = Partial<Artist> & {
  vocaDBSuggestion?: boolean;
  manual?: boolean;
};

const LOCAL_ARTIST_ENTITY_QUERY = gql`
  query($text: String!) {
    searchArtists(keywords: $text) {
      ...SelectArtistEntry
    }
  }
  
  ${ArtistFragments.SelectArtistEntry}
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
    marginBottom: theme.spacing(2),
  },
  detailsThumbnail: {
    height: "3em",
    width: "3em",
    marginRight: theme.spacing(2),
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
  formikProps: FormikProps<{ [key in T]: ExtendedArtist }>;
  labelName: string;
  title?: string;
  value: ExtendedArtist | null;
}

export default function SelectArtistEntityBox<T extends string>({ fieldName, formikProps, labelName, title, value }: Props<T>) {
  const styles = useStyles();

  const apolloClient = useApolloClient();
  const { touched, errors, setFieldValue } = formikProps;

  const [vocaDBAutoCompleteOptions, setVocaDBAutoCompleteOptions] = useNamedState<ExtendedArtist[]>([], "vocaDBAutoCompleteOptions");
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
      const apolloPromise = apolloClient.query<{ searchArtists: Artist[] }>({
        query: LOCAL_ARTIST_ENTITY_QUERY,
        variables: { text: vocaDBAutoCompleteText },
      });

      const vocaDBPromise = axios.get<string[]>(
        "https://vocadb.net/api/artists/names",
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
        let result: ExtendedArtist[] = [];
        if (apolloResult.data?.searchArtists) {
          result = result.concat(apolloResult.data?.searchArtists);
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
      <Grid container spacing={1}>
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
            filterOptions={(v: ExtendedArtist[], params: FilterOptionsState<ExtendedArtist>) => {
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
            onChange={(event: unknown, newValue: ExtendedArtist | null, reason: string) => {
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
            }}
            renderOption={(option: ExtendedArtist | null) => {
              let icon = <MusicNoteIcon className={styles.icon} />;
              if (option.vocaDBSuggestion) icon = <SearchIcon className={styles.icon} />;
              else if (option.manual) icon = <AddCircleIcon className={styles.icon} />;
              return (
                <Box display="flex" flexDirection="row" alignItems="center">
                  {icon} {option.name}
                </Box>
              );
            }}
            getOptionLabel={(option: ExtendedArtist | null) => {
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
                  src={value.mainPictureUrl} variant="rounded"
                  className={styles.detailsThumbnail}
                >
                  <MusicNoteIcon />
                </Avatar>
              </div>
              <div className={styles.textBox}>
                <Typography>
                  {value.name}
                </Typography>
                <Typography color="textSecondary">
                  {value.sortOrder} ({value.type}) #{value.id}
                </Typography>
              </div>
              <div>
                {value.id >= 0 && (
                  <IconButton href={`https://vocadb.net/Ar/${value.id}`} target="_blank">
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
      <VocaDBSearchArtistDialog
        isOpen={isImportDialogOpen}
        toggleOpen={toggleImportDialogOpen}
        keyword={importDialogKeyword}
        setKeyword={setImportDialogKeyword}
        setArtist={(v) => setFieldValue(fieldName, v)}
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