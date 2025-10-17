import type { Danmaku, DanmakuProvider, UnifiedMedia } from './types'
import { ofetch } from 'ofetch'
import { parallel } from 'radashi'

/**
 * 🎬 Bahamut (巴哈姆特動畫瘋) Danmaku Provider
 */
export class Bahamut implements DanmakuProvider {
  /** Source name identifier */
  public readonly name = 'bahamut'
  /** Categories this provider belongs to */
  public readonly categories = ['anime'] as const
  /** HTTP request headers to simulate browser */
  private readonly headers: Headers
  /** Maximum concurrency for requests */
  private readonly concurrency = 3

  constructor() {
    this.headers = new Headers({
      'User-Agent': 'Anime/2.29.2 (tw.com.gamer.anime; build:999; iOS 26.0.0)',
    })
  }

  /**
   * Search anime on Bahamut Ani-Gamer.
   */
  public async search(keyword: string): Promise<UnifiedMedia[]> {
    const searchResponse = await ofetch<ResponseSearch>(
      `https://api.gamer.com.tw/mobile_app/anime/v1/search.php?kw=${encodeURIComponent(keyword)}`,
      { headers: this.headers },
    )
    const searchResults = searchResponse.anime ?? []

    if (searchResults.length === 0) {
      return []
    }

    const seriesDetails = await parallel(this.concurrency, searchResults, async (item) => {
      try {
        return await ofetch<ResponseSeries>(
          `https://api.gamer.com.tw/anime/v1/video.php?videoSn=${item.video_sn}`,
          { headers: this.headers },
        )
      } catch (error) {
        console.error(`[Bahamut] Failed to fetch series details for video_sn=${item.video_sn}:`, error)
        return
      }
    })

    function extractEpisodes(detail?: ResponseSeries) {
      const { anime, video } = detail?.data ?? {}
      const key = video?.type ?? anime?.episodeIndex
      return Object.values(anime?.episodes?.[key ?? ''] ?? {})
    }

    return searchResults.map((item, index) => ({
      title: item.title,
      provider: this.name,
      episodes: extractEpisodes(seriesDetails[index])?.map(ep => ({
        id: String(ep.videoSn),
        title: `第 ${ep.episode} 集`,
        ordinal: ep.episode,
      })) ?? [],
    }))
  }

  /**
   * Fetch danmaku (comments) for a specific Bahamut episode.
   */
  public async fetchDanmaku(episodeId: string): Promise<Danmaku[]> {
    const response = await ofetch<ResponseDanmaku>(
      `https://api.gamer.com.tw/anime/v1/danmu.php?geo=TW%2CHK&videoSn=${episodeId}`,
      { headers: this.headers },
    )
    const danmaku = response.data?.danmu ?? []

    if (danmaku.length === 0) {
      return []
    }

    return danmaku.map(d => ({
      text: d.text,
      meta: this.formatDanmakuMeta(d),
    }))
  }

  /**
   * Format danmaku (bullet comment) metadata into a CSV-style string.
   * @private
   */
  private formatDanmakuMeta(danmaku: BahamutDanmaku): string {
    const positions: Record<number, number> = {
      1: 5,
      2: 4,
    }

    return [
      Number(danmaku.time / 10).toFixed(2),
      positions[danmaku.position] || 1,
      Number.parseInt(danmaku.color.slice(1), 16),
      danmaku.userid,
    ].join(',')
  }
}

// =============== Types ===============

interface ResponseSearch {
  anime?: {
    anime_sn: number
    video_sn: number
    title: string
    cover: string
    info: string
  }[]
}

interface ResponseSeries {
  data?: {
    video?: {
      type: number
    }
    anime?: {
      title: string
      totalEpisode: number
      episodeIndex: number
      episodes: Record<string, {
        episode: number
        videoSn: number
      }[]>
    }
  }
}

interface BahamutDanmaku {
  text: string
  color: string
  size: number
  position: number
  time: number
  sn: number
  userid: string
}

interface ResponseDanmaku {
  data?: {
    danmu?: BahamutDanmaku[]
  }
}
