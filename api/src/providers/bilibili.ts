import type { DanmakuElem as BilibiliDanmaku } from '../protobufs/bilibili_pb'
import type { Danmaku, DanmakuProvider, UnifiedMedia } from './types'
import { fromBinary } from '@bufbuild/protobuf'
import { ofetch } from 'ofetch'
import { parallel } from 'radashi'
import { DanmakuSegmentSchema } from '../protobufs/bilibili_pb'

/**
 * 🎬 Bilibili (哔哩哔哩) Danmaku Provider
 */
export class Bilibili implements DanmakuProvider {
  /** Source name identifier */
  public readonly name = 'bilibili'
  /** Categories this provider belongs to */
  public readonly categories = ['anime'] as const
  /** HTTP request headers to simulate browser and pass cookies */
  private readonly headers: Headers
  /** Maximum concurrency for requests */
  private readonly concurrency = 3

  constructor(cookie?: string) {
    this.headers = new Headers({
      cookie: cookie || 'enable_web_push=DISABLE; header_theme_version=CLOSE; enable_feed_channel=ENABLE; home_feed_column=5;',
    })
  }

  /**
   * Search anime on Bilibili.
   */
  public async search(keyword: string): Promise<UnifiedMedia[]> {
    const response = await ofetch<ResponseSearch>(
      `https://api.bilibili.com/x/web-interface/search/type?search_type=media_bangumi&keyword=${encodeURIComponent(keyword)}`,
      { headers: this.headers },
    )
    const results = response.data?.result ?? []

    if (results.length === 0) {
      return []
    }

    return results.map(item => ({
      provider: this.name,
      title: item.title.replaceAll(/<[^>]+>/g, ''),
      cover: item.cover,
      episodes: item.eps?.map(ep => ({
        id: String(ep.id),
        title: ep.long_title || ep.title,
        ordinal: ep.index_title,
      })) ?? [],
    }))
  }

  /**
   * Fetch danmaku (comments) for a specific Bilibili episode.
   */
  public async fetchDanmaku(episodeId: string): Promise<Danmaku[]> {
    const { cid, duration } = await this.fetchEpisodeInfo(episodeId)
    const buffers = await parallel(
      this.concurrency,
      Array.from({ length: Math.floor(duration / 1000 / 360) + 1 }, (_, i) => i + 1),
      async (val) => {
        try {
          return await ofetch(
            `https://api.bilibili.com/x/v2/dm/web/seg.so?type=1&oid=${cid}&segment_index=${val}`,
            {
              responseType: 'arrayBuffer',
              headers: {
                ...this.headers,
                referer: `https://www.bilibili.com/bangumi/play/ep${episodeId}`,
              },
            },
          )
        } catch (error) {
          console.warn(`[Bilibili] Failed segment ${val}:`, error)
          return
        }
      },
    )

    return buffers
      .filter((buffer): buffer is ArrayBuffer => !!buffer)
      .flatMap(buffer => this.parseDanmakuProtobuf(buffer)
        .filter(elem => elem.content)
        .map(elem => ({
          text: elem.content,
          meta: this.formatDanmakuMeta(elem),
        })))
  }

  /**
   * Fetch episode CID and duration from Bilibili's season API.
   * @private
   */
  private async fetchEpisodeInfo(episodeId: string): Promise<{ cid: string, duration: number }> {
    const response = await ofetch<ResponseSeries>(
      `https://api.bilibili.com/pgc/view/web/season?ep_id=${episodeId}`,
      { headers: this.headers },
    )
    const episode = response.result?.episodes?.find(e => e.id === Number(episodeId))

    if (!episode?.cid || !episode.duration) {
      throw new Error(`[Bilibili] Failed to fetch series details for ep_id=${episodeId}`)
    }

    return {
      cid: String(episode.cid),
      duration: episode.duration,
    }
  }

  /**
   * Parse Protobuf binary data of Bilibili danmaku.
   * @private
   */
  private parseDanmakuProtobuf(buffer: ArrayBuffer): BilibiliDanmaku[] {
    return fromBinary(DanmakuSegmentSchema, new Uint8Array(buffer)).elems
  }

  /**
   * Format danmaku (bullet comment) metadata into a CSV-style string.
   * @private
   */
  private formatDanmakuMeta(danmaku: BilibiliDanmaku): string {
    const positions: Record<number, number> = {
      4: 4,
      5: 5,
    }

    return [
      (danmaku.progress / 1000).toFixed(2),
      positions[danmaku.position] || 1,
      danmaku.color,
      danmaku.id,
    ].join(',')
  }
}

// =============== Types ===============

interface ResponseSearch {
  data?: {
    result?: {
      title: string
      cover: string
      season_id: number
      media_id: number
      pubtime: number
      eps: {
        id: number
        title: string
        index_title: string
        long_title: string
      }[]
    }[]
  }
}

interface ResponseSeries {
  result?: {
    episodes?: {
      id: number
      cid: number
      duration: number
    }[]
  }
}
