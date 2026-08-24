import type { Character, Sprite } from '@/types'

interface Props {
  character: Character
  sprite: Sprite | null | undefined
  /** 高度（px 或 css 值） */
  height?: number | string
  dimmed?: boolean
}

/** 立绘渲染：有图显示图，无图渲染带角色主题色的剪影占位 */
export default function SpriteFigure({ character, sprite, height = '100%', dimmed }: Props) {
  const h = typeof height === 'number' ? `${height}px` : height

  if (sprite?.image) {
    return (
      <img
        src={sprite.image}
        alt={`${character.name}·${sprite.name}`}
        draggable={false}
        className="max-w-none object-contain object-bottom select-none transition-all duration-300"
        style={{ height: h, filter: dimmed ? 'brightness(0.55)' : 'none' }}
      />
    )
  }

  // 占位剪影：头 + 肩的人物轮廓，用角色主题色渐变
  return (
    <svg
      viewBox="0 0 200 320"
      className="max-w-none select-none transition-all duration-300"
      style={{ height: h, filter: dimmed ? 'brightness(0.55)' : 'none' }}
    >
      <defs>
        <linearGradient id={`g-${character.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={character.color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={character.color} stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="316" rx="72" ry="8" fill="#000" opacity="0.35" />
      <path
        d="M100 28c-26 0-42 20-42 46 0 17 7 31 17 38-3 8-9 13-19 18-24 12-38 32-40 62l-3 106c0 8 6 14 14 14h146c8 0 14-6 14-14l-3-106c-2-30-16-50-40-62-10-5-16-10-19-18 10-7 17-21 17-38 0-26-16-46-42-46z"
        fill={`url(#g-${character.id})`}
      />
      <text
        x="100"
        y="240"
        textAnchor="middle"
        fontSize="44"
        fontWeight="700"
        fill="#1b1b1b"
        opacity="0.75"
        style={{ fontFamily: 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif' }}
      >
        {character.name.slice(0, 1)}
      </text>
      <text
        x="100"
        y="266"
        textAnchor="middle"
        fontSize="13"
        fill="#1b1b1b"
        opacity="0.55"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        {sprite ? sprite.name : '未上传立绘'}
      </text>
    </svg>
  )
}
