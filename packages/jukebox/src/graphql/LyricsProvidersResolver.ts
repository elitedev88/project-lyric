import { Request, Response, NextFunction, Router } from "express";
import axios from "axios";
import cheerio from "cheerio";
import { Song } from "../models/Song";
import { SongForApiContract, LyricsForSongContract, VDBTranslationType } from "vocadb";
import { LyricsProviderManager, LyricsSearchRequest } from "lyrics-kit";
import { Resolver, ObjectType, Field, Arg, Query, Int, Float, InputType } from "type-graphql";
import { ApolloError } from "apollo-server-express";
import { GraphQLJSONObject } from "graphql-type-json";
import { LyricsMetadata } from "lyrics-kit/build/main/core/lyricsMetadata";


@ObjectType({ description: "A search result from 初音ミク@wiki." })
class HmikuAtWikiSearchResultEntry {
  @Field({ description: "Entry ID." })
  id: string;

  @Field({ description: "Entry name." })
  name: string;

  @Field({ description: "A short summary of contents in the entry." })
  desc: string;
}

@ObjectType({ description: "A lyrics entry from 初音ミク@wiki." })
class HmikuAtWikiEntry {
  @Field({ description: "Entry ID." })
  id: string;

  @Field({ description: "Entry name." })

  name: string;
  @Field({ description: "Furigana of the entry name." })

  furigana: string;
  @Field({ description: "Lyrics content." })

  lyrics: string;
}

@ObjectType({ description: "A lyrics entry from VocaDB." })
class VocaDBLyricsEntry implements LyricsForSongContract {

  @Field(type => Int, { description: "Lyrics entry ID." })
  id: number;

  @Field({ description: "Language/culture code.", nullable: true })
  cultureCode: string;

  @Field({ description: "Language/culture code.", nullable: true })
  source: string;

  @Field({ description: "Language/culture code.", nullable: true })
  translationType: VDBTranslationType;

  @Field({ description: "Language/culture code.", nullable: true })
  url: string;

  @Field({ description: "Language/culture code.", nullable: true })
  value: string;
}

@InputType()
class LyricsKitSearchOptions {
  @Field({ description: "Whether to output LRCX syntax.", defaultValue: false })
  useLRCX: boolean;

  @Field(type => Float, { description: "Duration of the song (if known).", defaultValue: 0 })
  duration: number;
}

@ObjectType({ description: "A lyrics entry from lyrics-kit search engine." })
class LyricsKitLyricsEntry {
  @Field()
  lyrics: string;

  @Field(type => Float, { description: "Quality of the matching.", nullable: true })
  quality?: number;

  @Field({ description: "If the query is matched in this entry." })
  isMatched: boolean;

  @Field(type => GraphQLJSONObject)
  metadata: LyricsMetadata;

  @Field(type => GraphQLJSONObject)
  tags: object;
}


@Resolver()
export class LyricsProvidersResolver {

  private lyricsProvider: LyricsProviderManager;

  constructor() {
    this.lyricsProvider = new LyricsProviderManager();
  }

  @Query(returns => [HmikuAtWikiSearchResultEntry])
  public async hmikuLyricsSearch(@Arg("keyword") keyword: string): Promise<HmikuAtWikiSearchResultEntry[]> {
    const response = await axios.get<string>("https://w.atwiki.jp/hmiku/", {
      params: {
        cmd: "wikisearch",
        keyword: keyword
      }
    });
    if (response.status !== 200) {
      throw new ApolloError(`${response.status}: ${response.data}`);
    }
    const urlRegex = /(?<=pageid=)\d+/;
    const $ = cheerio.load(response.data);
    const nodes = $("#wikibody ul li");
    const data = nodes
      .filter((_, elm) => {
        const href = $("a", elm).attr("href");
        return Boolean(href && href.match(urlRegex));
      })
      .map((_, elm) => {
        const a = $("a", elm);
        const text = $(elm).text().split("\n").map(x => x.trim()).filter(x => !!x);
        const
          desc = text[1],
          name = a.text(),
          id = a.attr("href").match(urlRegex)[0];
        return {
          id: id,
          name: name,
          desc: desc
        };
      }).get();
    return data;
  }

  @Query(returns => HmikuAtWikiEntry, { nullable: true })
  public async hmikuLyrics(@Arg("id") id: string): Promise<HmikuAtWikiEntry | null> {
    try {
      const response = await axios.get<string>(`https://w.atwiki.jp/hmiku/pages/${id}.html`);
      if (response.status !== 200) {
        throw new ApolloError(`${response.status}: ${response.data}`);
      }
      const $ = cheerio.load(response.data);
      const titleNode = $("h2");
      if (!titleNode) {
        return null;
      }
      const title = titleNode.text();
      const furiganaMatch = $("#wikibody").text().match(/.+(?=【登録タグ)/);
      const furigana = furiganaMatch ? furiganaMatch[0] : null;
      const lyricsTitleNode = $("#wikibody h3:contains(歌詞)");
      let lyrics = null;
      if (lyricsTitleNode) {
        const lyricsNodes = lyricsTitleNode.nextUntil("h3");
        if (lyricsNodes) {
          // Normalize line breaks
          lyrics = lyricsNodes
            .text()
            .replace(/\n{3,}/g, "\n␊\n")
            .replace(/\n\n/g, "\n")
            .replace(/␊/g, "");
        } else {
          console.log("lyricsNodes not found");
        }
      } else {
        console.log("lyricsTitleNode not found");
      }
      return {
        id: id,
        name: title,
        furigana: furigana,
        lyrics: lyrics
      };
    } catch (e) {
      if (e.response && e.response.status === 404) {
        return null;
      }
      throw e;
    }
  }

  @Query(returns => [VocaDBLyricsEntry])
  public async vocaDBSingle(@Arg("id", type => Int) id: number): Promise<VocaDBLyricsEntry[]> {
    try {
      const elm = await Song.findByPk(id);
      if (elm) {
        if (elm.vocaDbJson.lyrics && elm.vocaDbJson.lyrics.length) {
          return elm.vocaDbJson.lyrics;
        } else {
          if (elm.vocaDbJson.originalVersionId) {
            return this.vocaDBSingle(elm.vocaDbJson.originalVersionId);
          }
          return [];
        }
      }
      const resp = await axios.get<SongForApiContract>(`https://vocadb.net/api/songs/${id}`, {
        params: { fields: "Lyrics" }
      });
      if (resp.data.lyrics && resp.data.lyrics.length) {
        return resp.data.lyrics;
      } else {
        if (resp.data.originalVersionId) {
          return this.vocaDBSingle(resp.data.originalVersionId);
        }
        return [];
      }
    } catch (e) {
      if (e.response && e.response.status === 404) {
        return [];
      }
      throw e;
    }
  }

  @Query(returns => [LyricsKitLyricsEntry])
  public async lyricsKitSearch(
    @Arg("artists") artists: string,
    @Arg("title") title: string,
    @Arg("options") { useLRCX, duration }: LyricsKitSearchOptions
  ): Promise<LyricsKitLyricsEntry[]> {

    const lyrics = await this.lyricsProvider.getLyrics(
      LyricsSearchRequest.fromInfo(title, artists, duration)
    );
    return lyrics.map(lrc => {
      return {
        lyrics: useLRCX ? lrc.toString() : lrc.toPlainLRC(),
        quality: lrc.quality,
        isMatched: lrc.isMatched(),
        metadata: lrc.metadata,
        tags: lrc.idTags
      };
    });
  }
}