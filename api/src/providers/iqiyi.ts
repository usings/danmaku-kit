import type { Danmaku, DanmakuProvider, UnifiedMedia } from './types'
import { ofetch } from 'ofetch'
import { isEmpty, parallel } from 'radashi'

/**
 * 🎬 IQiYi (爱奇艺) Danmaku Provider
 */
export class IQiYi implements DanmakuProvider {
  /** Source name identifier */
  public readonly name = 'iqiyi'
  /** Categories this provider belongs to */
  public readonly categories = ['media'] as const
  /** HTTP request headers to simulate browser */
  private readonly headers: Headers
  /** Maximum concurrency for requests */
  private readonly concurrency = 9

  constructor() {
    this.headers = new Headers()
  }

  /**
   * Search videos on iQIYI.
   */
  public async search(keyword: string): Promise<UnifiedMedia[]> {
    const response = await ofetch<ResponseSearch>(
      `https://search.video.iqiyi.com/o?if=html5&key=${encodeURIComponent(keyword)}`,
      { headers: this.headers },
    )

    const results = response.data?.docinfos ?? []
    if (results.length === 0) {
      return []
    }

    return results
      .filter(item =>
        item.albumDocInfo?.siteId === 'iqiyi'
        && new Set(['电视剧', '电影']).has(item.albumDocInfo?.channel.split(',')[0] ?? ''),
      )
      .map(item => ({
        provider: this.name,
        title: item.albumDocInfo?.albumTitle || '',
        cover: item.albumDocInfo?.albumImg || '',
        episodes: item.albumDocInfo?.videoinfos.map(video => ({
          id: String(video.tvId),
          title: video.subTitle ?? `第${video.itemNumber}集`,
          ordinal: String(video.itemNumber),
        })) ?? [],
      }))
  }

  /**
   * Fetch danmaku (comments) for a specific iQIYI episode.
   */
  public async fetchDanmaku(episodeId: string): Promise<Danmaku[]> {
    const { vid, duration } = await this.fetchEpisodeInfo(episodeId)
    const xmls = await parallel(
      this.concurrency,
      Array.from({ length: Math.ceil(duration / (60 * 5)) }, (_, i) => i + 1),
      async (segmentIndex) => {
        try {
          const buffer = await ofetch(
            `https://cmts.iqiyi.com/bullet/${vid.slice(-4, -2)}/${vid.slice(-2)}/${vid}_300_${segmentIndex}.z`,
            {
              responseType: 'arrayBuffer',
              headers: {
                ...this.headers,
                'Accept-Encoding': 'gzip',
              },
            },
          )
          return await this.decompressDanmaku(buffer)
        } catch (error) {
          console.warn(`[iQiYi] Failed segment ${segmentIndex}:`, error)
          return []
        }
      },
    )

    return xmls
      .filter((xml): xml is string => !isEmpty(xml))
      .flatMap(xml =>
        this.parseDanmakuXML(xml).map(d => ({
          text: d.content,
          meta: this.formatDanmakuMeta(d),
        })),
      )
  }

  /**
   * Fetch video info including vid and duration.
   * @private
   */
  private async fetchEpisodeInfo(episodeId: string): Promise<{ vid: string, duration: number }> {
    const response = await ofetch<ResponseEpisodeInfo>(
      `https://pcw-api.iqiyi.com/video/video/baseinfo/${episodeId}`,
      { headers: this.headers },
    )

    const results = response.data
    if (!results) {
      throw new Error(`[iQIYI] Failed to fetch video info for tvid=${episodeId}`)
    }

    return {
      vid: String(results.tvId || episodeId),
      duration: results.durationSec || 0,
    }
  }

  /**
   * Decompresses danmaku data.
   * @private
   */
  private async decompressDanmaku(buffer: ArrayBuffer): Promise<string> {
    const stream = new Blob([buffer])
      .stream()
      .pipeThrough(new DecompressionStream('deflate'))

    return await new Response(stream).text()
  }

  /**
   * Parse XML danmaku response.
   * @private
   */
  private parseDanmakuXML(xml: string): IQiYiDanmaku[] {
    const bulletRegex = /<bulletInfo>([\s\S]*?)<\/bulletInfo>/g

    return [...xml.matchAll(bulletRegex)].map((match) => {
      const bullet = match[1]

      function getTag(tag: string) {
        const m = bullet.match(new RegExp(`<${tag}>(.*?)</${tag}>`))
        return m ? m[1] : undefined
      }

      return {
        content: getTag('content')?.trim() || '',
        user: getTag('name')?.trim() || 'iqiyi',
        time: getTag('showTime') || '0',
        color: getTag('color') || '16777215',
        position: getTag('position') || '0',
      }
    })
  }

  /**
   * Format danmaku (bullet comment) metadata into a CSV-style string.
   * @private
   */
  private formatDanmakuMeta(danmaku: IQiYiDanmaku): string {
    const positions: Record<string, number> = {
      0: 1,
      1: 5,
      2: 4,
    }

    return [
      Number(danmaku.time).toFixed(2),
      positions[danmaku.position] || 1,
      Number.parseInt(danmaku.color, 16),
      danmaku.user,
    ].join(',')
  }
}

// =============== Types ===============

interface ResponseSearch {
  data?: {
    docinfos?: {
      albumDocInfo?: {
        albumTitle: string
        albumId: number
        albumImg: string
        channel: string
        siteId: string
        videoinfos: {
          tvId: number
          name: string
          itemNumber: number
          itemTitle: string
          subTitle?: string
        }[]
      }
    }[]
  }
}

interface ResponseEpisodeInfo {
  data?: {
    tvId: number
    durationSec: number
  }
}

interface IQiYiDanmaku {
  content: string
  user: string
  time: string
  color: string
  position: string
}
