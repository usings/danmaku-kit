import type { DanmakuProvider } from './types'
import { Bahamut } from './bahamut'
import { Bilibili } from './bilibili'

export const providers: DanmakuProvider[] = [
  new Bilibili(),
  new Bahamut(),
]
