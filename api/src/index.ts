import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { timeout } from 'hono/timeout'
import { providers } from './providers'

const api = new Hono().basePath('/api')

api
  .use(logger())
  .use(timeout(60 * 1000))

api.get('/search', async (c) => {
  const keyword = c.req.query('keyword')
  if (!keyword) {
    return c.json({
      success: false,
      message: 'Missing search query "keyword"',
    }, 400)
  }

  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        return await provider.search(keyword)
      } catch (error) {
        console.error(`[${provider.name}] failed:`, error)
        return []
      }
    }),
  )

  return c.json({
    success: true,
    data: results.flat(),
  })
})

api.get('/danmaku/:id', async (c) => {
  const id = c.req.param('id')
  if (!id) {
    return c.json({
      success: false,
      message: 'Missing episode ID "id"',
    }, 400)
  }

  const [providerName, episodeId] = id.split(':')
  if (!providerName || !episodeId) {
    return c.json({
      success: false,
      message: 'Invalid episode ID format',
    }, 400)
  }

  const provider = providers.find(a => a.name === providerName)
  if (!provider) {
    return c.json({
      success: false,
      message: `Provider "${providerName}" not found`,
    }, 404)
  }

  try {
    const danmaku = await provider.fetchDanmaku(episodeId)
    return c.json({
      success: true,
      data: danmaku,
    })
  } catch (error) {
    console.error(`[${provider.name}] failed:`, error)
    return c.json({
      success: false,
      message: `Failed to get danmaku`,
    }, 500)
  }
})

export default api
