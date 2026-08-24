// ============ 照影工坊 · 数据模型 ============

/** 舞台站位：最多五人同时在场（左外 / 左 / 中 / 右 / 右外） */
export type SpritePosition = 'far-left' | 'left' | 'center' | 'right' | 'far-right'

/** 站位元数据：label 用于编辑器，left 为舞台横向锚点（百分比）。
 *  左/中/右保持三人版本的宽松间距，左外/右外贴近画面边缘 */
export const POSITIONS: { key: SpritePosition; label: string; left: number }[] = [
  { key: 'far-left', label: '左外', left: 7 },
  { key: 'left', label: '左', left: 22 },
  { key: 'center', label: '中', left: 50 },
  { key: 'right', label: '右', left: 78 },
  { key: 'far-right', label: '右外', left: 93 },
]

export function positionLeft(pos: SpritePosition): number {
  return POSITIONS.find(p => p.key === pos)?.left ?? 50
}

/** 立绘差分（一个角色可有多个表情/姿势） */
export interface Sprite {
  id: string
  /** 差分名，如：默认 / 微笑 / 生气 */
  name: string
  /** dataURL，null 时使用占位剪影 */
  image: string | null
}

export interface Character {
  id: string
  name: string
  /** 一句话介绍 / 称号 */
  title: string
  /** 主题色：名牌、占位立绘 */
  color: string
  sprites: Sprite[]
}

export interface Background {
  id: string
  name: string
  kind: 'gradient' | 'image'
  /** kind = gradient 时的 CSS 渐变 */
  gradient?: string
  /** kind = image 时的 dataURL */
  image?: string | null
}

export interface DialogueBeat {
  id: string
  kind: 'dialogue'
  /** null = 旁白 */
  characterId: string | null
  /** 该句对白使用的立绘差分 */
  spriteId: string | null
  position: SpritePosition
  text: string
  /** false = 说话时不显示角色形象（电话、内心独白、神秘人等）。缺省视为 true */
  showSprite?: boolean
}

export interface ChoiceOption {
  id: string
  text: string
  /** 跳转目标场景 */
  targetSceneId: string | null
}

export interface ChoiceBeat {
  id: string
  kind: 'choice'
  prompt: string
  options: ChoiceOption[]
}

export type EffectType = 'shake' | 'shake-hard' | 'clash' | 'clear'

/** 演出效果卡：爆炸抖动 / 角色战斗碰撞 / 角色下场 */
export interface EffectBeat {
  id: string
  kind: 'effect'
  effect: EffectType
  /** clash 专用：发起碰撞的两个站位 */
  from?: SpritePosition
  to?: SpritePosition
  /** clear 专用：要离场的站位，'all' = 清空舞台 */
  target?: SpritePosition | 'all'
  /** clear 专用：同时离场的多个站位 */
  targets?: SpritePosition[]
}

/** 角色上场条目 */
export interface EnterEntry {
  id: string
  characterId: string | null
  spriteId: string | null
  position: SpritePosition
}

/** 角色上场卡：一次性多位角色同时登台 */
export interface EnterBeat {
  id: string
  kind: 'enter'
  entries: EnterEntry[]
}

/** 音乐切换卡：播放到此处时切换/停止 BGM */
export interface BgmBeat {
  id: string
  kind: 'bgm'
  /** null = 停止音乐 */
  bgmId: string | null
}

/** 背景切换卡：播放到此处时更换场景背景 */
export interface BgBeat {
  id: string
  kind: 'bg'
  /** null = 无背景 */
  backgroundId: string | null
}

/** 走位条目：一名在场角色从 from 滑动到 to（无需先下场再上场） */
export interface MoveEntry {
  id: string
  from: SpritePosition
  to: SpritePosition
}

/** 角色走位卡：一次性让多位在场角色同时移动站位 */
export interface MoveBeat {
  id: string
  kind: 'move'
  moves: MoveEntry[]
}

export type Beat = DialogueBeat | ChoiceBeat | EffectBeat | BgmBeat | BgBeat | EnterBeat | MoveBeat

/** BGM 音轨 */
export interface Bgm {
  id: string
  name: string
  /** dataURL */
  audio: string
  /** 文件大小（字节），仅用于展示 */
  size?: number
}

export interface Scene {
  id: string
  title: string
  backgroundId: string | null
  /** 本幕循环播放的 BGM */
  bgmId: string | null
  beats: Beat[]
}

export interface Project {
  title: string
  characters: Character[]
  backgrounds: Background[]
  bgms: Bgm[]
  scenes: Scene[]
}

export type ViewKey = 'characters' | 'backgrounds' | 'bgm' | 'story' | 'player'
