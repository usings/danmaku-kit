import type { DanmakuProvider } from './types'
import { Bahamut } from './bahamut'
import { Bilibili } from './bilibili'
import { IQiYi } from './iqiyi'

export const providers: DanmakuProvider[] = [
  new Bilibili(),
  new Bahamut(),
  new IQiYi(),
]
