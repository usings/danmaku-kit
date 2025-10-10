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
   * Performs a keyword-based search for series or videos
   * available on this platform.
   *
   * @example
   * ```ts
   * const results = await bilibili.search("Spy x Family")
   * console.log(results[0].title) // "SPY×FAMILY 间谍过家家"
   * ```
   */
  search: (keyword: string) => Promise<Series[]>

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
   * <time_in_seconds>,<mode>,<color>,<user_id>
   * ```
   *
   * @example "25.20,1,16777215,1594722654"
   */
  meta: string
}

/**
 * Represents a single episode or part of a multi-episode series.
 */
export interface Episode {
  /**
   * The globally unique identifier for the episode within the platform.
   * This is typically used to fetch metadata or danmaku.
   *
   * @example "785548"
   */
  id: string

  /**
   * The display title of the episode, suitable for user-facing UIs.
   *
   * @example "第二集 我们家的安妮亚"
   */
  title: string

  /**
   * A short label or index for the episode.
   * Often used to distinguish episode order.
   *
   * @example "EP02"
   */
  index: string
}

/**
 * Represents a video series, season, or standalone video
 * containing one or more episodes.
 */
export interface Series {
  /**
   * The key or identifier of the provider (e.g., "bilibili", "acfun").
   * Used to associate this series with its source adapter.
   *
   * @example "bilibili"
   */
  source: string

  /**
   * The unique series identifier on the platform.
   * Could map to fields like `season_id` or `media_id`.
   *
   * @example "12345"
   */
  id: string

  /**
   * The display title of the series or movie.
   *
   * @example "SPY×FAMILY 间谍过家家"
   */
  title: string

  /**
   * Optional list of episodes, if the series consists of multiple parts.
   */
  episodes?: Episode[]
}
