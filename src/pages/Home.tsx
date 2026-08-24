import { useRef, useState } from 'react'
import { BookOpenText, Download, Image, MessageSquareText, MonitorPlay, Music, Play, Upload, UserRound } from 'lucide-react'
import type { ViewKey } from '@/types'
import { useProject } from '@/hooks/useProject'
import { exportProject, importProject } from '@/lib/store'
import { downloadStandalonePlayer } from '@/lib/standalonePlayer'
import CharactersView from '@/sections/CharactersView'
import BackgroundsView from '@/sections/BackgroundsView'
import BgmView from '@/sections/BgmView'
import StoryEditor from '@/sections/StoryEditor'
import Player from '@/sections/Player'

const NAV: { key: ViewKey; label: string; icon: React.ReactNode }[] = [
  { key: 'characters', label: '角色立绘', icon: <UserRound size={15} /> },
  { key: 'backgrounds', label: '场景背景', icon: <Image size={15} /> },
  { key: 'bgm', label: '音乐', icon: <Music size={15} /> },
  { key: 'story', label: '剧情编辑', icon: <MessageSquareText size={15} /> },
]

export default function Home() {
  const { project, setProject, update } = useProject()
  const [view, setView] = useState<ViewKey>('story')
  const [playSceneId, setPlaySceneId] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const p = await importProject(file)
      setProject(p)
    } catch {
      alert('导入失败：文件格式不正确')
    }
  }

  const startPlay = (sceneId: string | null) => {
    setPlaySceneId(sceneId)
    setView('player')
  }

  if (view === 'player') {
    return (
      <div className="h-full">
        <Player project={project} initialSceneId={playSceneId} onExit={() => setView('story')} />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* 顶栏 */}
      <header className="flex flex-none items-center gap-4 border-b border-white/10 bg-[#181818] px-5 py-3">
        <div className="flex items-center gap-2.5">
          <BookOpenText size={20} className="text-[#D1D0EA]" />
          <input
            className="w-40 bg-transparent text-base font-bold tracking-wide outline-none focus:border-b focus:border-[#D1D0EA]/60"
            value={project.title}
            onChange={e => update(p => ({ ...p, title: e.target.value }))}
            title="作品标题（点击修改）"
          />
          <span className="hidden rounded-full border border-white/15 px-3 py-0.5 font-mono text-[10px] tracking-widest text-white/40 sm:inline">
            照影工坊
          </span>
        </div>

        <nav className="mx-auto flex items-center gap-1 rounded-full border border-white/10 bg-black/30 p-1">
          {NAV.map(item => (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition-colors ${
                view === item.key ? 'bg-[#D1D0EA] font-semibold text-[#1b1b1b]' : 'text-white/60 hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button onClick={() => exportProject(project)} className="pill-btn pill-btn-outline !px-3.5 !py-1.5 text-xs" title="导出为 JSON，可备份或分享">
            <Download size={13} /> 导出
          </button>
          <button onClick={() => importRef.current?.click()} className="pill-btn pill-btn-outline !px-3.5 !py-1.5 text-xs" title="导入 JSON 项目文件，或导出的播放器 HTML（自动提取其中的工程数据）">
            <Upload size={13} /> 导入
          </button>
          <input ref={importRef} type="file" accept=".json,.html,.htm,application/json,text/html" className="hidden" onChange={onImport} />
          <button
            onClick={() => downloadStandalonePlayer(project)}
            className="pill-btn pill-btn-outline !px-3.5 !py-1.5 text-xs"
            title="导出自包含的 HTML 播放器，改名 index.html 即可部署到 GitHub Pages"
          >
            <MonitorPlay size={13} /> 导出播放器
          </button>
          <button onClick={() => startPlay(null)} className="pill-btn pill-btn-fill !px-4 !py-1.5 text-xs">
            <Play size={13} /> 从头播放
          </button>
        </div>
      </header>

      {/* 主区域 */}
      <main className="min-h-0 flex-1">
        {view === 'characters' && <CharactersView project={project} update={update} />}
        {view === 'backgrounds' && <BackgroundsView project={project} update={update} />}
        {view === 'bgm' && <BgmView project={project} update={update} />}
        {view === 'story' && <StoryEditor project={project} update={update} onPlay={startPlay} />}
      </main>
    </div>
  )
}
