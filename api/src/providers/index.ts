import type { DanmakuProvider } from './types'
import { Bilibili } from './bilibili'

export const providers: DanmakuProvider[] = [
  new Bilibili(),
]
