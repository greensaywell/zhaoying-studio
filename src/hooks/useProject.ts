import { useCallback, useEffect, useState } from 'react'
import type { Project } from '@/types'
import { loadProject, saveProject } from '@/lib/store'

/** 项目全局状态：内存编辑 + 防抖持久化到浏览器 localStorage */
export function useProject() {
  const [project, setProject] = useState<Project>(loadProject)

  useEffect(() => {
    const t = setTimeout(() => saveProject(project), 400)
    return () => clearTimeout(t)
  }, [project])

  const update = useCallback((fn: (p: Project) => Project) => {
    setProject(prev => fn(prev))
  }, [])

  return { project, setProject, update }
}
