import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Home, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import type { Project, SpritePosition } from '@/types'
import Stage, { type StageSprite } from '@/components/Stage'

interface Props {
  project: Project
  initialSceneId: string | null
  onExit: () => void
}

const TYPE_SPEED = 32 // ms / 字

export default function Player({ project, initialSceneId, onExit }: Props) {
  const [sceneId, setSceneId] = useState<string | null>(initialSceneId ?? project.scenes[0]?.id ?? null)
  const [beatIndex, setBeatIndex] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [ended, setEnded] = useState(false)
  const [muted, setMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const scene = project.scenes.find(s => s.id === sceneId) ?? null
  const beat = scene && !ended ? scene.beats[beatIndex] ?? null : null
  const fullText =
    beat?.kind === 'dialogue' ? beat.text : beat?.kind === 'choice' ? beat.prompt : ''
  const typing = charCount < fullText.length
  const effectBeat = beat?.kind === 'effect' ? beat : null
  /** 效果卡、音乐卡、背景卡、上场卡、走位卡都自动推进 */
  const autoBeat =
    beat && (beat.kind === 'effect' || beat.kind === 'bgm' || beat.kind === 'bg' || beat.kind === 'enter' || beat.kind === 'move')
      ? beat
      : null
  const enterBeat = beat?.kind === 'enter' ? beat : null

  // 当前背景：幕起始背景 + 扫描背景切换卡，最后一张生效
  const currentBackground = useMemo(() => {
    if (!scene) return null
    let id = scene.backgroundId
    for (let i = 0; i <= beatIndex && i < scene.beats.length; i++) {
      const b = scene.beats[i]
      if (b.kind === 'bg') id = b.backgroundId
    }
    return project.backgrounds.find(b => b.id === id) ?? null
  }, [scene, beatIndex, project.backgrounds])

  // 当前 BGM：幕起始 BGM + 扫描音乐切换卡，最后一张生效
  const currentBgmId = useMemo<string | null>(() => {
    if (!scene) return null
    let id = scene.bgmId
    for (let i = 0; i <= beatIndex && i < scene.beats.length; i++) {
      const b = scene.beats[i]
      if (b.kind === 'bgm') id = b.bgmId
    }
    return id
  }, [scene, beatIndex])

  // ===== BGM：随剧情切换 =====
  useEffect(() => {
    const bgm = project.bgms.find(b => b.id === currentBgmId)
    const src = bgm?.audio ?? ''
    if (!audioRef.current) audioRef.current = new Audio()
    const a = audioRef.current
    if (a.getAttribute('data-src') !== src) {
      a.pause()
      if (src) {
        a.src = src
        a.setAttribute('data-src', src)
        a.loop = true
        a.volume = 0.55
        a.muted = muted
        a.play().catch(() => {})
      } else {
        a.removeAttribute('src')
        a.removeAttribute('data-src')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBgmId, project.bgms])

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted
  }, [muted])

  // 卸载时停止音乐
  useEffect(() => {
    return () => audioRef.current?.pause()
  }, [])

  // 打字机
  useEffect(() => {
    if (!fullText || charCount >= fullText.length) return
    const t = setTimeout(() => setCharCount(c => c + 1), TYPE_SPEED)
    return () => clearTimeout(t)
  }, [charCount, fullText])

  // 切换剧情卡时重置打字进度
  useEffect(() => {
    setCharCount(0)
  }, [sceneId, beatIndex])

  // 效果卡 / 音乐卡：播放完自动推进
  useEffect(() => {
    if (!autoBeat || ended || !scene) return
    const dur =
      autoBeat.kind === 'bgm'
        ? 150
        : autoBeat.kind === 'bg'
          ? 450
          : autoBeat.kind === 'enter'
            ? 600
            : autoBeat.kind === 'move'
              ? 700
              : autoBeat.kind === 'effect' && autoBeat.effect === 'shake'
                ? 750
                : autoBeat.kind === 'effect' && autoBeat.effect === 'shake-hard'
                  ? 1300
                  : autoBeat.kind === 'effect' && autoBeat.effect === 'clash'
                    ? 1250
                    : 500
    const t = setTimeout(() => {
      if (beatIndex + 1 < scene.beats.length) setBeatIndex(i => i + 1)
      else setEnded(true)
    }, dur)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoBeat?.id, ended])

  // 舞台立绘：扫描到当前剧情卡（下场卡播放下场前的状态，配合淡出动画）
  const stageSprites = useMemo<StageSprite[]>(() => {
    if (!scene) return []
    const map = new Map<SpritePosition, StageSprite>()
    const current = scene.beats[beatIndex]
    const isClearBeat = current?.kind === 'effect' && current.effect === 'clear'
    const upto = isClearBeat ? beatIndex - 1 : beatIndex
    for (let i = 0; i <= upto && i < scene.beats.length; i++) {
      const b = scene.beats[i]
      if (b.kind === 'effect' && b.effect === 'clear') {
        if (b.target === 'all') map.clear()
        else if (b.targets?.length) b.targets.forEach(t => map.delete(t))
        else if (b.target) map.delete(b.target)
        continue
      }
      if (b.kind === 'enter') {
        for (const e of b.entries) {
          if (!e.characterId) continue
          const character = project.characters.find(c => c.id === e.characterId)
          if (!character) continue
          const sprite = character.sprites.find(s => s.id === e.spriteId) ?? character.sprites[0] ?? null
          map.set(e.position, { position: e.position, character, sprite, dimmed: i !== beatIndex })
        }
        continue
      }
      if (b.kind === 'move') {
        // 原子走位：先取出所有要移动的立绘，清空原站位后统一放到新站位
        const moved: { from: SpritePosition; to: SpritePosition; sp: StageSprite }[] = []
        for (const mv of b.moves) {
          const sp = map.get(mv.from)
          if (sp) moved.push({ from: mv.from, to: mv.to, sp })
        }
        for (const mv of b.moves) map.delete(mv.from)
        for (const m of moved) {
          map.set(m.to, { ...m.sp, position: m.to, slideFrom: i === beatIndex ? m.from : undefined, dimmed: i !== beatIndex })
        }
        continue
      }
      if (b.kind !== 'dialogue' || !b.characterId || b.showSprite === false) continue
      const character = project.characters.find(c => c.id === b.characterId)
      if (!character) continue
      const sprite = character.sprites.find(s => s.id === b.spriteId) ?? character.sprites[0] ?? null
      map.set(b.position, { position: b.position, character, sprite, dimmed: i !== beatIndex })
    }
    return [...map.values()]
  }, [scene, beatIndex, project.characters])

  const speaker = beat?.kind === 'dialogue' && beat.characterId
    ? project.characters.find(c => c.id === beat.characterId) ?? null
    : null

  const advance = useCallback(() => {
    if (!scene || ended) return
    if (!beat) { setEnded(true); return }
    if (beat.kind === 'effect' || beat.kind === 'bgm' || beat.kind === 'bg' || beat.kind === 'enter' || beat.kind === 'move') return // 自动推进，点击不跳过
    if (typing) { setCharCount(fullText.length); return }
    if (beat.kind === 'choice') return // 等待玩家点选
    if (beatIndex + 1 < scene.beats.length) setBeatIndex(i => i + 1)
    else setEnded(true)
  }, [scene, beat, ended, typing, fullText.length, beatIndex])

  // 键盘推进
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        advance()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance])

  const choose = (targetSceneId: string | null) => {
    if (!targetSceneId) { setEnded(true); return }
    setSceneId(targetSceneId)
    setBeatIndex(0)
    setEnded(false)
  }

  const replay = () => {
    setBeatIndex(0)
    setCharCount(0)
    setEnded(false)
  }

  if (!scene) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#0d0d0d] text-white/50">
        <p className="text-sm">还没有可播放的剧情，先去编辑器里写一幕吧</p>
        <button onClick={onExit} className="pill-btn pill-btn-outline text-xs">
          <Home size={14} /> 返回编辑器
        </button>
      </div>
    )
  }

  return (
    <div className="relative h-full bg-black">
      <Stage
        background={currentBackground}
        sprites={stageSprites}
        onClick={advance}
        animKey={effectBeat?.id ?? ''}
        bgAnimKey={currentBackground?.id ?? 'none'}
        shaking={
          effectBeat?.effect === 'shake' ? 'normal' : effectBeat?.effect === 'shake-hard' ? 'hard' : null
        }
        flash={
          effectBeat && effectBeat.effect !== 'clear'
            ? effectBeat.effect === 'shake'
              ? 'now'
              : effectBeat.effect === 'shake-hard'
                ? 'hard'
                : 'impact'
            : null
        }
        clash={
          effectBeat?.effect === 'clash'
            ? { from: effectBeat.from ?? 'left', to: effectBeat.to ?? 'right' }
            : null
        }
        clearTarget={
          effectBeat?.effect === 'clear'
            ? (effectBeat.target ?? (effectBeat.targets?.length ? null : 'all'))
            : null
        }
        clearTargets={effectBeat?.effect === 'clear' ? (effectBeat.targets ?? null) : null}
        entering={enterBeat ? enterBeat.entries.map(e => e.position) : null}
      >
        {/* 顶栏 */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-5 py-3 pointer-events-none">
          <span className="rounded-full bg-black/45 px-4 py-1.5 font-mono text-[11px] tracking-widest text-white/70 backdrop-blur-sm">
            {project.title} · {scene.title}
            {scene.bgmId && <Volume2 size={11} className="ml-2 inline -translate-y-px" />}
          </span>
          <div className="flex gap-2 pointer-events-auto">
            <button
              onClick={e => { e.stopPropagation(); setMuted(m => !m) }}
              className="pill-btn pill-btn-outline !border-white/20 !bg-black/45 !px-3 !py-1.5 text-xs backdrop-blur-sm"
              title={muted ? '取消静音' : '静音'}
            >
              {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>
            <button
              onClick={e => { e.stopPropagation(); onExit() }}
              className="pill-btn pill-btn-outline !border-white/20 !bg-black/45 !px-4 !py-1.5 text-xs backdrop-blur-sm"
            >
              <Home size={13} /> 退出播放
            </button>
          </div>
        </div>

        {/* 对话框 */}
        {beat && (beat.kind === 'dialogue' || beat.kind === 'choice') && !ended && (
          <div key={beat.id} className="stage-fade absolute inset-x-0 bottom-0 px-4 pb-5 sm:px-8" onClick={e => { e.stopPropagation(); advance() }}>
            <div className="mx-auto max-w-3xl">
              {speaker && (
                <span
                  className="relative z-10 -mb-4 ml-5 inline-block rounded-full px-5 py-2 text-sm font-bold text-[#1b1b1b] shadow-lg"
                  style={{ background: speaker.color }}
                >
                  {speaker.name}
                </span>
              )}
              <div className="min-h-28 rounded-2xl border border-white/15 bg-[#141414f2] px-7 pb-5 pt-6 shadow-2xl backdrop-blur">
                <p className={`novel-text text-base leading-loose text-[#f0f0f0] sm:text-lg ${typing ? 'type-caret' : ''}`}>
                  {fullText.slice(0, charCount)}
                </p>

                {/* 分支选项 */}
                {beat.kind === 'choice' && !typing && (
                  <div className="mt-4 space-y-2" onClick={e => e.stopPropagation()}>
                    {beat.options.map((opt, i) => (
                      <button
                        key={opt.id}
                        onClick={() => choose(opt.targetSceneId)}
                        className="group flex w-full items-center gap-3 rounded-xl border border-white/15 px-5 py-3 text-left transition-all hover:border-[#D1D0EA]/70 hover:bg-[#442369]/40"
                      >
                        <span className="font-mono text-xs text-[#D1D0EA]">{String.fromCharCode(65 + i)}</span>
                        <span className="novel-text text-base">{opt.text}</span>
                        <span className="flex-1" />
                        <span className="text-white/25 transition-transform group-hover:translate-x-1">→</span>
                      </button>
                    ))}
                  </div>
                )}

                {beat.kind === 'dialogue' && !typing && (
                  <span className="advance-hint absolute bottom-3 right-5 text-xs text-[#D1D0EA]">▼ 点击继续</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 幕终 */}
        {ended && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/70 backdrop-blur-sm" onClick={e => e.stopPropagation()}>
            <span className="mono-label !text-sm">幕 终</span>
            <p className="novel-text text-2xl font-semibold tracking-wide">{scene.title} · 完</p>
            <div className="flex gap-3">
              <button onClick={replay} className="pill-btn pill-btn-outline text-sm">
                <RotateCcw size={15} /> 重播此幕
              </button>
              <button onClick={onExit} className="pill-btn pill-btn-fill text-sm">
                <Home size={15} /> 返回编辑器
              </button>
            </div>
          </div>
        )}
      </Stage>
    </div>
  )
}
