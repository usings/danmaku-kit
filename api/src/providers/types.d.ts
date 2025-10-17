/**
 * Defines a unified interface for a danmaku (bullet comment) provider.
 *
 * Each provider implements its own API logic for:
 *  - Searching videos or series by keyword
 *  - Fetching danmaku (on-screen comments) for specific episodes
 *
 * This abstraction allows the system to dynamically aggregate and normalize
 * data from heterogeneous sources under a common contract.
 */
export interface DanmakuProvider {
  /**
   * A unique, human-readable identifier for the platform.
   * Used in UI and logging to indicate the data source.
   *
   * @example "bilibili"
   */
  name: string

  /**
   * Categories this provider belongs to.
   * Multiple categories can be assigned when the platform covers more than one type.
   *
   * @example ["anime"]
   */
  categories: readonly DanmakuCategory[]

  /**
   * Performs a keyword-based search for series or videos
   * available on this platform.
   *
   * @example
   * ```ts
   * const results = await bilibili.search("Spy x Family")
   * console.log(results[0].title) // "SPY×FAMILY 间谍过家家"
   * ```
   */
  search: (keyword: string) => Promise<UnifiedMedia[]>

  /**
   * Fetches danmaku (bullet comments) associated with a specific episode or video ID.
   *
   * The `episodeId` format depends on the platform — for example,
   * it could be a `cid` on Bilibili or a numeric video ID on AcFun.
   *
   * @example
   * ```ts
   * const danmaku = await bilibili.fetchDanmaku("785548")
   * console.log(danmaku[0].text) // "这集太好笑了哈哈哈"
   * ```
   */
  fetchDanmaku: (episodeId: string) => Promise<Danmaku[]>
}

/**
 * Represents the general category of danmaku content sources.
 *
 * - `"anime"` — Platforms or providers primarily focused on animation series,
 *   such as Bilibili, Bangumi, or Muse Asia.
 * - `"media"` — Broader media platforms that include TV dramas, movies,
 *   and other non-anime audiovisual content.
 */
export type DanmakuCategory = 'anime' | 'media'

/**
 * Represents a single danmaku (on-screen comment) item displayed
 * at a specific timestamp in a video.
 */
export interface Danmaku {
  /**
   * The textual content of the danmaku, as rendered on screen.
   *
   * @example "这集太好笑了哈哈哈"
   */
  text: string

  /**
   * A metadata string that encodes information about the danmaku.
   *
   * The format is:
   * ```
   * <time_in_seconds>,<position>,<color>,<user_id>
   * ```
   *
   * @example "25.20,1,16777215,1594722654"
   */
  meta: string
}

/**
 * Represents a unified media work returned from a provider search result,
 * such as an anime series, TV show, or movie.
 *
 * Each entry corresponds to a piece of content on a specific video platform
 * (e.g., Bilibili, Bahamut) and may include one or more episodes.
 */
export interface UnifiedMedia {
  /**
   * The key identifying the provider or platform that supplies this media.
   *
   * @example "bahamut"
   */
  provider: string

  /**
   * The display name of the media work, as shown on the provider platform.
   *
   * @example "SPY×FAMILY 間諜家家酒"
   */
  title: string

  /**
   * The URL of the cover image representing this media work.
   *
   * This image is typically used as a thumbnail or poster on the provider platform,
   * and serves as the visual identity of the content — the first impression a viewer sees.
   *
   * @example "https://p2.bahamut.com.tw/B/ACG/c/96/0000120396.JPG"
   */
  cover: string

  /**
   * List of episodes if the media work consists of multiple parts.
   */
  episodes: Episode[]
}

/**
 * Represents a single episode or segment belonging to a media work,
 * such as one part of a TV series, anime, or other multi-episode content.
 *
 * Each episode corresponds to a playable unit on a specific provider platform.
 */
interface Episode {
  /**
   * The unique identifier of this episode on the provider platform.
   * Typically used to fetch metadata or danmaku (comments).
   *
   * @example "28889"
   */
  id: string

  /**
   * The display name of the episode.
   *
   * @example "第二集 我们家的安妮亚"
   */
  title: string

  /**
   * The numeric ordinal of this episode within its series or season.
   *
   * @example 2
   */
  ordinal: string | number
}
