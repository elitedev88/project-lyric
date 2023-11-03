import type {
  ArtistForApiContract,
  ArtistContract,
  VDBArtistType,
  SongForApiContract,
} from "../types/vocadb";
import { ArtistOfSong } from "./ArtistOfSong";
import { ArtistOfAlbum } from "./ArtistOfAlbum";
import { DataTypes } from "sequelize";
import {
  Table,
  Column,
  Model,
  PrimaryKey,
  BelongsToMany,
  AllowNull,
  ForeignKey,
  BelongsTo,
  Default,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  HasMany,
  Index,
} from "sequelize-typescript";
import { Song } from "./Song";
import { Album } from "./Album";
import { Field, Int, ObjectType } from "type-graphql";
import { GraphQLJSONObject } from "graphql-type-json";
import { SongInAlbum } from "./SongInAlbum";

@ObjectType()
@Table({ modelName: "Artist" })
export class Artist extends Model<Artist, Partial<Artist>> {
  @Field(() => Int)
  @PrimaryKey
  @Column({ type: new DataTypes.INTEGER() })
  id: number;

  @Field()
  @Column({ type: new DataTypes.STRING(4096) })
  @Index({
    name: "Artist_SearchText",
    type: "FULLTEXT",
    parser: "ngram",
  })
  name: string;

  @Field()
  @Column({ type: new DataTypes.STRING(4096) })
  @Index({
    name: "Artist_SearchText",
    type: "FULLTEXT",
    parser: "ngram",
  })
  sortOrder: string;

  @Field({ nullable: true })
  @AllowNull
  @Column({ type: new DataTypes.STRING(4096) })
  mainPictureUrl?: string;

  @Field()
  @Column({
    type: new DataTypes.ENUM(
      "Unknown",
      "Circle",
      "Label",
      "Producer",
      "Animator",
      "Illustrator",
      "Lyricist",
      "Vocaloid",
      "UTAU",
      "CeVIO",
      "OtherVoiceSynthesizer",
      "OtherVocalist",
      "OtherGroup",
      "OtherIndividual",
      "Utaite",
      "Band",
      "Vocalist",
      "CoverArtist",
      "SynthesizerV",
      "Character"
    ),
    defaultValue: "Unknown",
  })
  type: VDBArtistType;

  @BelongsToMany(() => Song, () => ArtistOfSong)
  songs: Array<Song & { ArtistOfSong: ArtistOfSong }>;

  @BelongsToMany(() => Album, () => ArtistOfAlbum)
  albums: Array<Album & { ArtistOfAlbum: ArtistOfAlbum }>;

  @ForeignKey((type) => Artist)
  @AllowNull
  @Column({ type: DataTypes.INTEGER })
  public baseVoiceBankId!: number | null;

  @BelongsTo((type) => Artist, "baseVoiceBankId")
  public baseVoiceBank: Artist | null;

  @HasMany((type) => Artist, "baseVoiceBankId")
  public readonly derivedVoiceBanks: Artist[];

  @AllowNull
  @Field((type) => GraphQLJSONObject)
  @Column({ type: DataTypes.JSON })
  vocaDbJson: ArtistForApiContract | null;

  @Field()
  @Default(true)
  @Column({ type: DataTypes.BOOLEAN })
  incomplete: boolean;

  @Field()
  @CreatedAt
  creationDate: Date;

  @Field()
  @UpdatedAt
  updatedOn: Date;

  @DeletedAt
  deletionDate: Date;

  /** ArtistOfSong reflected by Song.$get("artists"), added for GraphQL queries. */
  @Field((type) => ArtistOfSong, { nullable: true })
  ArtistOfSong?: Partial<ArtistOfSong>;

  /** ArtistOfAlbum reflected by Album.$get("artists"), added for GraphQL queries. */
  @Field((type) => ArtistOfAlbum, { nullable: true })
  ArtistOfAlbum?: Partial<ArtistOfAlbum>;

  /** incomplete entity */
  static async fromVocaDBArtistContract(
    artist: ArtistContract
  ): Promise<Artist> {
    // import { transliterate } from "../utils/transliterate";
    const { transliterate } = await import("../utils/transliterate");
    const obj = (
      await Artist.findOrCreate({
        where: { id: artist.id },
        defaults: {
          name: artist.name,
          sortOrder: await transliterate(artist.name),
          type: artist.artistType,
          incomplete: true,
        },
      })
    )[0];
    return obj;
  }

  static async saveFromVocaDBEntity(
    entity: ArtistForApiContract,
    baseVoiceBank: Artist | null
  ): Promise<Artist | null> {
    const { transliterate } = await import("../utils/transliterate");
    await Artist.upsert({
      id: entity.id,
      name: entity.name,
      sortOrder: await transliterate(entity.name), // prompt user to check this upon import
      vocaDbJson: entity,
      mainPictureUrl: entity.mainPicture?.urlOriginal,
      type: entity.artistType as VDBArtistType,
      incomplete: false,
    });

    const artist = await Artist.findByPk(entity.id);
    if (baseVoiceBank !== null) {
      await artist?.$set("baseVoiceBank", baseVoiceBank);
    }

    return artist;
  }
}
