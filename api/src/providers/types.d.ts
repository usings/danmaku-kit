/**
 * Defines the contract for a video source adapter (e.g., Bilibili, AcFun, etc.),
 * which is responsible for fetching metadata (series, episodes) and danmaku (comments)
 * from a specific video platform.
 *
 * Each adapter encapsulates its own API logic, enabling the system to dynamically
 * aggregate and normalize data from multiple heterogeneous sources.
 */
export interface DanmakuProvider {
  /**
   * A unique human-readable display name for the platform.
   * Suitable for UI representation.
   *
   * @example 'bilibili'
   */
  name: string

  /**
   * Performs a keyword-based search on the corresponding video platform.
   *
   * @example
   * ```ts
   * const results = await bilibili.search("Spy x Family")
   * console.log(results[0].title) // "SPY×FAMILY"
   * ```
   */
  search: (keyword: string) => Promise<Series[]>

  /**
   * Fetches the danmaku (bullet comments) for a given video or episode.
   * The identifier format depends on the adapter implementation
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
 * Represents an individual episode or part of a multi-episode series.
 */
export interface Episode {
  /**
   * The globally unique identifier for the episode.
   */
  id: string

  /**
   * The display title of the episode.
   *
   * @example "第二集 我们家的安妮亚"
   */
  title: string

  /**
   * The short index or label for the episode, used in UI listings.
   *
   * @example "EP02"
   */
  index: string
}

/**
 * Represents a video, movie, or a series containing multiple episodes.
 */
export interface Series {
  /**
   * The `key` of the `SourceAdapter` that provided this data.
   *
   * @example "bilibili"
   */
  source: string

  /**
   * The unique identifier for the entire video or series.
   * Typically maps to `season_id`, `media_id`, or similar field.
   */
  id: string

  /**
   * The display title of the series or video.
   *
   * @example "SPY×FAMILY 间谍过家家"
   */
  title: string

  /**
   * An optional array of individual episodes if the series contains multiple parts.
   */
  episodes?: Episode[]
}

/**
 * Represents a single danmaku that appears at a specific timestamp on the video.
 */
export interface Danmaku {
  /**
   * The visible text content of the danmaku, as displayed on the video.
   */
  text: string

  /**
   * Metadata string describing danmaku appearance, color, sender, etc.
   */
  meta: string
}
