import type { CSSProperties, ReactNode } from 'react'
import type { Background, Character, Sprite, SpritePosition } from '@/types'
import { positionLeft } from '@/types'
import { backgroundStyle } from '@/sections/BackgroundsView'
import SpriteFigure from '@/components/SpriteFigure'

export interface StageSprite {
  position: SpritePosition
  character: Character
  sprite: Sprite | null
  dimmed?: boolean
  /** 走位动画：该立绘正在从此站位滑向 position */
  slideFrom?: SpritePosition
}

export interface ClashInfo {
  from: SpritePosition
  to: SpritePosition
}

interface Props {
  background: Background | null | undefined
  sprites: StageSprite[]
  children?: ReactNode
  onClick?: () => void
  /** 抖动：normal = 爆炸抖动，hard = 剧烈抖动 */
  shaking?: 'normal' | 'hard' | null
  /** 闪光：now = 立即（爆炸），impact = 延迟到碰撞瞬间，hard = 剧烈抖动双重闪光 */
  flash?: 'now' | 'impact' | 'hard' | null
  /** 战斗碰撞：指定站位的立绘互相冲刺 */
  clash?: ClashInfo | null
  /** 角色下场：正在淡出离场的站位，'all' = 全部 */
  clearTarget?: SpritePosition | 'all' | null
  /** 角色下场：同时离场的多个站位 */
  clearTargets?: SpritePosition[] | null
  /** 角色上场：正在淡入登场的站位 */
  entering?: SpritePosition[] | null
  /** 效果动画的重启键（通常为剧情卡 id），变化时动画重新播放 */
  animKey?: string
  /** 背景淡入的重启键（通常为背景 id），变化时背景淡入切换 */
  bgAnimKey?: string
}

const POS_ORDER: Record<SpritePosition, number> = {
  'far-left': 0,
  left: 1,
  center: 2,
  right: 3,
  'far-right': 4,
}

/** 碰撞时某站位立绘的冲刺动画类 */
function lungeClass(pos: SpritePosition, other: SpritePosition): string {
  const diff = POS_ORDER[other] - POS_ORDER[pos]
  const dir = diff > 0 ? 'r' : 'l'
  const dist = Math.abs(diff) >= 2 ? 'far' : 'near'
  return `lunge-${dir}-${dist}`
}

/** 演出舞台：背景层 + 立绘层 + 效果层 + 覆盖层（对话框等）。播放器与编辑器预览共用 */
export default function Stage({ background, sprites, children, onClick, shaking, flash, clash, clearTarget, clearTargets, entering, animKey, bgAnimKey }: Props) {
  return (
    <div className="relative h-full w-full overflow-hidden select-none bg-[#0d0d0d]" onClick={onClick}>
      {/* 背景层：key 变化时重新挂载，触发淡入 */}
      <div key={bgAnimKey ?? 'bg'} className={`absolute inset-0 ${bgAnimKey !== undefined ? 'stage-fade' : ''}`} style={backgroundStyle(background)} />
      <div key={animKey ?? ''} className={`absolute inset-0 ${clash ? 'vn-shake-impact' : shaking === 'hard' ? 'vn-shake-hard' : shaking ? 'vn-shake' : ''}`}>
        {/* 背景压暗，保证文字可读 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25 pointer-events-none" />

        {/* 立绘层 */}
        {sprites.map(s => {
          const lunge =
            clash && (s.position === clash.from || s.position === clash.to)
              ? lungeClass(s.position, s.position === clash.from ? clash.to : clash.from)
              : ''
          const exiting =
            clearTarget === 'all' || clearTarget === s.position || clearTargets?.includes(s.position)
              ? 'vn-fadeout'
              : ''
          const enteringClass = entering?.includes(s.position) ? 'vn-fadein' : ''
          const moveStyle: CSSProperties | undefined = s.slideFrom
            ? ({ '--dx': `${positionLeft(s.slideFrom) - positionLeft(s.position)}vw` } as CSSProperties)
            : undefined
          return (
            <div
              key={s.position}
              className="absolute bottom-0 flex w-max -translate-x-1/2 items-end justify-center"
              style={{ left: `${positionLeft(s.position)}%`, height: sprites.length > 3 ? '74%' : '88%' }}
            >
              <div className={`flex h-full items-end ${lunge} ${exiting} ${enteringClass} ${s.slideFrom ? 'vn-move' : ''}`} style={moveStyle}>
                <SpriteFigure character={s.character} sprite={s.sprite} height="100%" dimmed={s.dimmed} />
              </div>
            </div>
          )
        })}
      </div>

      {/* 闪光层 */}
      {flash && (
        <div
          key={`flash-${animKey ?? ''}`}
          className={`absolute inset-0 pointer-events-none ${flash === 'impact' ? 'vn-flash-impact' : flash === 'hard' ? 'vn-flash-hard' : 'vn-flash'}`}
          style={{ background: 'radial-gradient(circle at 50% 55%, #fff7e0 0%, #ffb84c 45%, transparent 75%)' }}
        />
      )}

      {children}
    </div>
  )
}
