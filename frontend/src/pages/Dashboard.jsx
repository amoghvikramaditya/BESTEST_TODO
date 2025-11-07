import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { gsap } from 'gsap'

import TaskList from '../components/TaskList.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { ListsApi, TasksApi } from '../lib/api.js'

const pad = (value) => String(value).padStart(2, '0')

const DASHBOARD_BACKGROUND_IMAGE = '/images/dashboard-background.webp'

const GLASS_PANEL_CLASS =
  'rounded-3xl border border-white/20 bg-white/10 shadow-[0_35px_120px_-45px_rgba(15,23,42,0.75)] backdrop-blur-2xl'
const GLASS_CARD_CLASS =
  'rounded-3xl border border-white/15 bg-white/10 shadow-[0_25px_90px_-40px_rgba(15,23,42,0.65)] backdrop-blur-2xl'
const GLASS_PILL_CLASS =
  'rounded-2xl border border-white/15 bg-white/10 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.6)] backdrop-blur-xl'
const GLASS_INPUT_CLASS =
  'w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/60 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/30'

const INBOX_LIST = {
  listId: 'inbox',
  name: 'Inbox',
  builtin: true,
}

function createDefaultTaskState(listId = 'inbox') {
  const now = new Date()
  const isValid = !Number.isNaN(now.getTime())
  const today = isValid ? now.toISOString().slice(0, 10) : ''
  const time = isValid ? `${pad(now.getHours())}:${pad(now.getMinutes())}` : ''

  return {
    title: '',
    description: '',
    status: 'todo',
    priority: 3,
    dueDate: today,
    reminderDate: today,
    reminderTime: time,
    listId,
  }
}

function toDateInputValue(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function toTimeInputValue(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function combineDateAndTime(dateValue, timeValue) {
  if (!dateValue) return null
  const timePart = timeValue && timeValue.trim().length ? timeValue : '00:00'
  const combined = new Date(`${dateValue}T${timePart}`)
  if (Number.isNaN(combined.getTime())) return null
  return combined.toISOString()
}

const REMINDER_STORAGE_KEY = 'best-todo-reminders-seen'

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
]

const statusLabelMap = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lists, setLists] = useState([])
  const [listsLoading, setListsLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [selectedListId, setSelectedListId] = useState('all')
  const [listSaving, setListSaving] = useState(false)
  const [listForm, setListForm] = useState({ name: '' })
  const [filters, setFilters] = useState({ status: 'all', search: '' })
  const [formState, setFormState] = useState(() => createDefaultTaskState('inbox'))
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const openSidebarForSmallScreens = useCallback(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(min-width: 1024px)').matches) {
      return
    }
    setIsSidebarOpen(true)
  }, [setIsSidebarOpen])
  const [activeView, setActiveView] = useState('tasks')
  const [seenReminders, setSeenReminders] = useState(() => {
    if (typeof window === 'undefined') return {}
    try {
      const stored = window.localStorage.getItem(REMINDER_STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.warn('Failed to parse reminder storage', error)
      return {}
    }
  })
  const heroRef = useRef(null)

  const availableLists = useMemo(() => [INBOX_LIST, ...lists], [lists])
  const listOptions = useMemo(
    () => [{ listId: 'all', name: 'All tasks', builtin: true }, ...availableLists],
    [availableLists],
  )
  const boardLists = useMemo(() => listOptions.filter((list) => list.listId !== 'all'), [listOptions])
  const listsById = useMemo(() => {
    return availableLists.reduce((acc, list) => {
      acc[list.listId] = list
      return acc
    }, {})
  }, [availableLists])

  useEffect(() => {
    if (selectedListId === 'all') return
    if (!listsById[selectedListId]) {
      setSelectedListId('inbox')
    }
  }, [listsById, selectedListId])

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await TasksApi.list()
      const items = response.items ?? response ?? []
      const sorted = items
        .slice()
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))
      setTasks(sorted)
    } catch (err) {
      setError(err.message ?? 'Failed to load tasks')
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchLists = useCallback(async () => {
    setListsLoading(true)
    setListError('')
    try {
      const response = await ListsApi.list()
      const items = response.items ?? response ?? []
      const sorted = items
        .slice()
        .sort(
          (a, b) =>
            (a.position ?? 0) - (b.position ?? 0) || new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0),
        )
      setLists(sorted)
    } catch (err) {
      setListError(err.message ?? 'Failed to load folders')
      setLists([])
    } finally {
      setListsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  useEffect(() => {
    fetchLists()
  }, [fetchLists])

  useEffect(() => {
    if (!heroRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.dashboard-animate',
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out' },
      )
    }, heroRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(seenReminders))
    } catch (error) {
      console.warn('Failed to persist reminder storage', error)
    }
  }, [seenReminders])

  useEffect(() => {
    setSeenReminders((prev) => {
      const next = { ...prev }
      let changed = false
      const activeReminderIds = new Set(tasks.filter((task) => task.reminderAt).map((task) => task.taskId))
      Object.keys(next).forEach((taskId) => {
        if (!activeReminderIds.has(taskId)) {
          delete next[taskId]
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [tasks])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (!isSidebarOpen) return undefined

    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    if (mediaQuery.matches) {
      return () => {}
    }

    const handleBreakpointChange = (event) => {
      if (event.matches) {
        setIsSidebarOpen(false)
      }
    }

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleBreakpointChange)
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleBreakpointChange)
    }

    const { body } = document
    const previousOverflow = body.style.overflow
    body.style.overflow = 'hidden'

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleBreakpointChange)
      } else if (typeof mediaQuery.removeListener === 'function') {
        mediaQuery.removeListener(handleBreakpointChange)
      }
      body.style.overflow = previousOverflow
    }
  }, [isSidebarOpen])

  const normalizedTasks = useMemo(() => {
    return tasks.map((task) => {
      const normalizedListId = task.listId && task.listId.trim().length > 0 ? task.listId : 'inbox'
      return {
        ...task,
        listId: normalizedListId,
        listName: listsById[normalizedListId]?.name ?? INBOX_LIST.name,
      }
    })
  }, [listsById, tasks])

  const filteredTasks = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase()
    return normalizedTasks
      .filter((task) => (selectedListId === 'all' ? true : task.listId === selectedListId))
      .filter((task) => (filters.status === 'all' ? true : task.status === filters.status))
      .filter((task) =>
        searchTerm ? [task.title, task.description].some((field) => field?.toLowerCase().includes(searchTerm)) : true,
      )
  }, [filters, normalizedTasks, selectedListId])

  const tasksByList = useMemo(() => {
    const groups = boardLists.reduce((acc, list) => {
      acc[list.listId] = []
      return acc
    }, {})

    filteredTasks.forEach((task) => {
      const listId = task.listId && task.listId.trim().length > 0 ? task.listId.trim() : INBOX_LIST.listId
      if (!groups[listId]) {
        groups[listId] = []
      }
      groups[listId].push(task)
    })

    Object.values(groups).forEach((group) => {
      group.sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0) || new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0),
      )
    })

    return groups
  }, [boardLists, filteredTasks])

  const reminderTasks = useMemo(() => {
    return normalizedTasks
      .filter((task) => Boolean(task.reminderAt))
      .map((task) => {
        const reminderMoment = new Date(task.reminderAt)
        return {
          ...task,
          reminderMoment: Number.isNaN(reminderMoment.getTime()) ? null : reminderMoment,
        }
      })
      .sort((a, b) => {
        const aTime = a.reminderMoment ? a.reminderMoment.getTime() : Number.POSITIVE_INFINITY
        const bTime = b.reminderMoment ? b.reminderMoment.getTime() : Number.POSITIVE_INFINITY
        return aTime - bTime
      })
  }, [normalizedTasks])

  const unreadReminders = useMemo(() => {
    return reminderTasks.filter((task) => task.reminderAt && seenReminders[task.taskId] !== task.reminderAt)
  }, [reminderTasks, seenReminders])

  const resetForm = useCallback(() => {
    setFormState(createDefaultTaskState(selectedListId === 'all' ? 'inbox' : selectedListId))
    setEditingTaskId(null)
  }, [selectedListId])

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleListFormChange = (event) => {
    const { value } = event.target
    setListForm({ name: value })
  }

  useEffect(() => {
    if (editingTaskId) return
    setFormState((prev) => ({
      ...prev,
      listId: selectedListId === 'all' ? 'inbox' : selectedListId,
    }))
  }, [editingTaskId, selectedListId])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    const isAllView = selectedListId === 'all'
    const targetListId = formState.listId && formState.listId.trim().length > 0 ? formState.listId.trim() : 'inbox'
    const listTaskCount = tasks.filter(
      (task) => (task.listId && task.listId.trim().length > 0 ? task.listId : 'inbox') === targetListId,
    ).length

    const reminderDateValue = typeof formState.reminderDate === 'string' ? formState.reminderDate.trim() : ''
    const reminderTimeValue = typeof formState.reminderTime === 'string' ? formState.reminderTime.trim() : ''

    if (reminderDateValue && !reminderTimeValue) {
      setSaving(false)
      setError('Please choose a reminder time')
      return
    }

    if (reminderTimeValue && !reminderDateValue) {
      setSaving(false)
      setError('Please choose a reminder date')
      return
    }

    let reminderAtIso = null
    if (reminderDateValue && reminderTimeValue) {
      reminderAtIso = combineDateAndTime(reminderDateValue, reminderTimeValue)
      if (!reminderAtIso) {
        setSaving(false)
        setError('Invalid reminder date or time')
        return
      }
    }

    const payload = {
      title: formState.title.trim(),
      description: formState.description.trim(),
      status: formState.status,
      dueDate: formState.dueDate || null,
      reminderAt: reminderAtIso,
      priority: Number(formState.priority) || null,
      listId: targetListId,
      position: editingTaskId ? undefined : listTaskCount + 1,
    }

    try {
      if (editingTaskId) {
        await TasksApi.update(editingTaskId, payload)
      } else {
        await TasksApi.create(payload)
      }
      resetForm()
      await fetchTasks()
      if (!isAllView) {
        setSelectedListId(targetListId)
      }
    } catch (err) {
      setError(err.message ?? 'Could not save task')
    } finally {
      setSaving(false)
    }
  }

  const handleSelectList = (listId) => {
    setSelectedListId(listId)
    if (!editingTaskId) {
      setFormState((prev) => ({
        ...prev,
        listId: listId === 'all' ? 'inbox' : listId,
      }))
    }
    setIsSidebarOpen(false)
  }

  const handleCreateList = async (event) => {
    event.preventDefault()
    if (listSaving) return

    const name = listForm.name.trim()
    if (!name) {
      setListError('Folder name is required')
      return
    }

    setListSaving(true)
    setListError('')
    try {
      await ListsApi.create({ name })
      setListForm({ name: '' })
      await fetchLists()
    } catch (err) {
      setListError(err.message ?? 'Failed to create folder')
    } finally {
      setListSaving(false)
    }
  }

  const handleEditTask = (task) => {
    const listId = task.listId && task.listId.trim().length > 0 ? task.listId : 'inbox'
    setActiveView('tasks')
    setEditingTaskId(task.taskId)
    setSelectedListId(listId)
    setFormState({
      title: task.title ?? '',
      description: task.description ?? '',
      status: task.status ?? 'todo',
      priority: task.priority ?? 3,
      dueDate: toDateInputValue(task.dueDate),
      reminderDate: toDateInputValue(task.reminderAt),
      reminderTime: toTimeInputValue(task.reminderAt),
      listId,
    })
    openSidebarForSmallScreens()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteTask = async (task) => {
    const confirmDelete = window.confirm(`Delete “${task.title}”? This cannot be undone.`)
    if (!confirmDelete) return

    setError('')
    try {
      await TasksApi.remove(task.taskId)
      await fetchTasks()
    } catch (err) {
      setError(err.message ?? 'Failed to delete task')
    }
  }

  const handleReorder = async (nextOrder) => {
    if (filters.status !== 'all' || filters.search.trim() || selectedListId === 'all') {
      return
    }

    const orderMap = new Map(nextOrder.map((task, index) => [task.taskId, index + 1]))

    setTasks((prev) => {
      const updated = prev.map((task) => {
        if (orderMap.has(task.taskId)) {
          return { ...task, position: orderMap.get(task.taskId) }
        }
        return task
      })

      const normalize = (task) => (task.listId && task.listId.trim().length > 0 ? task.listId.trim() : 'inbox')

      return updated.slice().sort((a, b) => {
        const listA = normalize(a)
        const listB = normalize(b)
        if (listA === listB) {
          return (a.position ?? 0) - (b.position ?? 0) || new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0)
        }
        return 0
      })
    })

    try {
      await Promise.all(
        nextOrder.map((task, index) =>
          TasksApi.update(task.taskId, {
            position: index + 1,
          }),
        ),
      )
    } catch (err) {
      setError(err.message ?? 'Failed to reorder tasks')
      await fetchTasks()
    }
  }

  const handleDeleteList = async (list) => {
    if (!list || list.builtin) return
    const confirmDelete = window.confirm(
      `Delete “${list.name}”? Tasks will move to ${INBOX_LIST.name}. This cannot be undone.`,
    )
    if (!confirmDelete) return

    setListSaving(true)
    setListError('')

    try {
      const response = await TasksApi.list({ listId: list.listId })
      const listTasks = response.items ?? response ?? []
      if (listTasks.length > 0) {
        const inboxTasksCount = tasks.filter((task) => {
          const normalized = task.listId && task.listId.trim().length > 0 ? task.listId.trim() : 'inbox'
          return normalized === 'inbox'
        }).length

        let nextPosition = inboxTasksCount + 1
        await Promise.all(
          listTasks.map((task) =>
            TasksApi.update(task.taskId, {
              listId: 'inbox',
              position: nextPosition++,
            }),
          ),
        )
      }

      await ListsApi.remove(list.listId)
      await Promise.all([fetchLists(), fetchTasks()])
      setSelectedListId('inbox')
    } catch (err) {
      setListError(err.message ?? 'Failed to delete folder')
    } finally {
      setListSaving(false)
    }
  }

  const handleMarkReminderRead = useCallback(
    (task) => {
      if (!task?.taskId || !task?.reminderAt) return
      setSeenReminders((prev) => {
        if (prev[task.taskId] === task.reminderAt) {
          return prev
        }
        return {
          ...prev,
          [task.taskId]: task.reminderAt,
        }
      })
    },
    [setSeenReminders],
  )

  const listCounts = useMemo(() => {
    const counts = tasks.reduce((acc, task) => {
      const listId = task.listId && task.listId.trim().length > 0 ? task.listId.trim() : 'inbox'
      acc[listId] = (acc[listId] ?? 0) + 1
      return acc
    }, {})
    counts.all = tasks.length
    return counts
  }, [tasks])

  const canReorder = filters.status === 'all' && !filters.search.trim() && selectedListId !== 'all'
  const reminderUnreadCount = unreadReminders.length
  const upcomingReminder = useMemo(() => {
    if (reminderTasks.length === 0) return null
    const now = Date.now()
    const future = reminderTasks.find((task) => task.reminderMoment && task.reminderMoment.getTime() >= now)
    return future ?? reminderTasks.find((task) => task.reminderMoment) ?? null
  }, [reminderTasks])

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 -z-20 bg-fixed bg-cover bg-center"
        style={{ backgroundImage: `url(${DASHBOARD_BACKGROUND_IMAGE})` }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-950/45 via-slate-900/15 to-slate-950/55 backdrop-blur-[4px]"
        aria-hidden="true"
      />
      <div className="relative mx-auto w-full max-w-[90rem] px-4 py-10 sm:px-6 lg:px-8" ref={heroRef}>
        <header className={`dashboard-animate relative overflow-hidden ${GLASS_PANEL_CLASS} p-8 text-white`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/70">BESTEST TODO</p>
              <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Dashboard</h1>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className={`${GLASS_PILL_CLASS} flex items-center gap-3 px-4 py-3 text-white sm:flex-col sm:items-end sm:gap-1`}>
                <p className="text-sm font-medium text-white">
                  {user?.username ?? user?.signInDetails?.loginId ?? 'You'}
                </p>
                <p className="text-xs text-white/75">
                  {user?.signInDetails?.loginId ?? user?.attributes?.email ?? ''}
                </p>
              </div>
              <button type="button" className="btn sm:hidden" onClick={() => setIsSidebarOpen(true)}>
                Workspace
              </button>
              <button type="button" className="btn-secondary sm:w-auto" onClick={signOut}>
                Logout
              </button>
            </div>
          </div>
        </header>

        <section className="dashboard-animate relative mt-10 lg:mt-12">
          <div
            className={`fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
              isSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="lg:grid lg:grid-cols-[minmax(320px,380px),1fr] lg:items-start lg:gap-10 xl:grid-cols-[minmax(340px,420px),1fr] 2xl:grid-cols-[minmax(360px,480px),1fr]">
            <aside
              className={`fixed inset-y-6 left-4 z-40 flex w-[min(22rem,calc(100vw-2.5rem))] max-h-[calc(100vh-3rem)] flex-col overflow-y-auto scrollbar-hidden ${GLASS_PANEL_CLASS} p-6 transition-transform duration-200 ${
                isSidebarOpen
                  ? 'pointer-events-auto translate-x-0 opacity-100'
                  : 'pointer-events-none -translate-x-[110%] opacity-0'
              } lg:static lg:z-auto lg:max-h-none lg:w-auto lg:translate-x-0 lg:overflow-visible lg:bg-white/10 lg:opacity-100 lg:pointer-events-auto lg:shadow-[0_25px_80px_-35px_rgba(15,23,42,0.55)] lg:ring-1 lg:ring-white/15`}
            >
              <div className="space-y-6 text-white">
                <div className="flex items-center justify-between lg:hidden">
                  <h2 className="text-lg font-semibold text-white">Workspace</h2>
                  <button type="button" className="btn-secondary" onClick={() => setIsSidebarOpen(false)}>
                    Close
                  </button>
                </div>

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Folders</h2>
                    {listsLoading && <span className="text-xs text-white/60">Loading…</span>}
                  </div>
                  <div className="flex max-h-[22rem] flex-col gap-2 overflow-y-auto pr-1 scrollbar-hidden lg:max-h-none xl:grid xl:grid-cols-2 xl:gap-3 xl:pr-2">
                    {listOptions.map((list) => {
                      const isActive = selectedListId === list.listId
                      return (
                        <div key={list.listId} className="flex min-w-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectList(list.listId)}
                            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                              isActive
                                ? 'border-white/40 bg-white/25 text-white shadow-[0_20px_60px_-25px_rgba(15,23,42,0.6)]'
                                : 'border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10'
                            }`}
                          >
                            <span className="truncate">{list.name}</span>
                            <span
                              className={`ml-3 inline-flex min-w-[2rem] justify-center rounded-full px-2 py-1 text-xs ${
                                isActive
                                  ? 'border border-white/40 bg-white/20 text-white'
                                  : 'border border-white/20 bg-white/10 text-white/75'
                              }`}
                            >
                              {listCounts[list.listId] ?? 0}
                            </span>
                          </button>
                          {!list.builtin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteList(list)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:border-red-300/40 hover:bg-red-500/20 hover:text-red-100"
                              aria-label={`Delete ${list.name}`}
                              disabled={listSaving}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <form className="flex items-center gap-2" onSubmit={handleCreateList}>
                    <label htmlFor="newList" className="sr-only">
                      New folder name
                    </label>
                    <input
                      id="newList"
                      type="text"
                      placeholder="New folder"
                      value={listForm.name}
                      onChange={handleListFormChange}
                      disabled={listSaving}
                      className={`${GLASS_INPUT_CLASS} flex-1 py-2 placeholder:text-white/50`}
                    />
                    <button type="submit" className="btn-secondary" disabled={listSaving}>
                      {listSaving ? 'Saving…' : 'Add'}
                    </button>
                  </form>
                  {listError && (
                    <p className="rounded-lg border border-red-300/40 bg-red-500/20 px-4 py-3 text-sm text-red-100">
                      {listError}
                    </p>
                  )}
                </section>

                <section className="space-y-4">
                  <h2 className="text-lg font-semibold text-white">{editingTaskId ? 'Edit task' : 'Create new task'}</h2>
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label htmlFor="title" className="mb-1 block text-sm font-medium text-white/75">
                          Title
                        </label>
                        <input
                          id="title"
                          name="title"
                          type="text"
                          required
                          value={formState.title}
                          onChange={handleInputChange}
                          className={GLASS_INPUT_CLASS}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="description" className="mb-1 block text-sm font-medium text-white/75">
                          Description
                        </label>
                        <textarea
                          id="description"
                          name="description"
                          rows={3}
                          value={formState.description}
                          onChange={handleInputChange}
                          className={`${GLASS_INPUT_CLASS} min-h-[7rem]`}
                        />
                      </div>
                      <div>
                        <label htmlFor="listId" className="mb-1 block text-sm font-medium text-white/75">
                          Folder
                        </label>
                        <select
                          id="listId"
                          name="listId"
                          value={formState.listId}
                          onChange={handleInputChange}
                          className={`${GLASS_INPUT_CLASS} bg-white/10`}
                        >
                          {availableLists.map((list) => (
                            <option key={list.listId} value={list.listId}>
                              {list.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="status" className="mb-1 block text-sm font-medium text-white/75">
                          Status
                        </label>
                        <select
                          id="status"
                          name="status"
                          value={formState.status}
                          onChange={handleInputChange}
                          className={`${GLASS_INPUT_CLASS} bg-white/10`}
                        >
                          <option value="todo">To do</option>
                          <option value="in_progress">In progress</option>
                          <option value="done">Done</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="priority" className="mb-1 block text-sm font-medium text-white/75">
                          Priority (1-5)
                        </label>
                        <input
                          id="priority"
                          name="priority"
                          type="number"
                          min={1}
                          max={5}
                          value={formState.priority}
                          onChange={handleInputChange}
                          className={GLASS_INPUT_CLASS}
                        />
                      </div>
                      <div>
                        <label htmlFor="dueDate" className="mb-1 block text-sm font-medium text-white/75">
                          Due date
                        </label>
                        <input
                          id="dueDate"
                          name="dueDate"
                          type="date"
                          value={formState.dueDate}
                          onChange={handleInputChange}
                          className={GLASS_INPUT_CLASS}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-white/75">Reminder</label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label htmlFor="reminderDate" className="sr-only">
                              Reminder date
                            </label>
                            <input
                              id="reminderDate"
                              name="reminderDate"
                              type="date"
                              value={formState.reminderDate}
                              onChange={handleInputChange}
                              className={GLASS_INPUT_CLASS}
                            />
                          </div>
                          <div>
                            <label htmlFor="reminderTime" className="sr-only">
                              Reminder time
                            </label>
                            <input
                              id="reminderTime"
                              name="reminderTime"
                              type="time"
                              value={formState.reminderTime}
                              onChange={handleInputChange}
                              step={300}
                              className={GLASS_INPUT_CLASS}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <p className="rounded-lg border border-red-300/40 bg-red-500/20 px-4 py-3 text-sm text-red-100">
                        {error}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      <button type="submit" className="btn flex-1 sm:flex-none" disabled={saving}>
                        {saving ? 'Saving…' : editingTaskId ? 'Update task' : 'Add task'}
                      </button>
                      {editingTaskId && (
                        <button type="button" className="btn-secondary flex-1 sm:flex-none" onClick={resetForm}>
                          Cancel edit
                        </button>
                      )}
                    </div>
                  </form>
                </section>
              </div>
            </aside>

            <div className="mt-8 space-y-6 lg:mt-0 lg:space-y-8">
              <div className={`dashboard-animate ${GLASS_CARD_CLASS} p-6 text-white`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="inline-flex rounded-full border border-white/20 bg-white/10 p-1 backdrop-blur">
                    <button
                      type="button"
                      onClick={() => setActiveView('tasks')}
                      className={`relative rounded-full px-4 py-2 text-sm font-medium transition ${
                        activeView === 'tasks'
                          ? 'bg-white/80 text-slate-900 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.65)]'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      Tasks
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView('reminders')}
                      className={`relative rounded-full px-4 py-2 text-sm font-medium transition ${
                        activeView === 'reminders'
                          ? 'bg-white/80 text-slate-900 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.65)]'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      Reminders
                      {reminderUnreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                        </span>
                      )}
                    </button>
                  </div>
                  <div className={`${GLASS_PILL_CLASS} flex items-center gap-3 px-4 py-3 text-sm text-white/80 lg:flex-col lg:items-end lg:text-right`}>
                    {activeView === 'tasks' ? (
                      <>
                        <span className="font-medium text-white">{filteredTasks.length} tasks</span>
                        <span>
                          {selectedListId === 'all' ? 'All folders' : listsById[selectedListId]?.name ?? INBOX_LIST.name}
                        </span>
                        {!canReorder && <span className="text-xs text-white/60">Reorder disabled while filtered</span>}
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-white">{reminderUnreadCount} unread</span>
                        <span>{reminderTasks.length} total reminder(s)</span>
                      </>
                    )}
                  </div>
                </div>
              {activeView === 'tasks' ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr),minmax(0,14rem)] sm:gap-5 lg:grid-cols-[minmax(0,1fr),minmax(0,18rem)]">
                  <div>
                    <label htmlFor="search" className="sr-only">
                      Search tasks
                    </label>
                    <input
                      id="search"
                      type="search"
                      placeholder="Search tasks"
                      value={filters.search}
                      onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                      className={`${GLASS_INPUT_CLASS} placeholder:text-white/60`}
                    />
                  </div>
                  <div>
                    <label htmlFor="statusFilter" className="sr-only">
                      Filter by status
                    </label>
                    <select
                      id="statusFilter"
                      value={filters.status}
                      onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                      className={`${GLASS_INPUT_CLASS} bg-white/10`}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-white/80">
                  <p>
                    Tracking{' '}
                    <span className="font-medium text-white">{reminderTasks.length}</span> reminder
                    {reminderTasks.length === 1 ? '' : 's'} across your folders.
                  </p>
                  {upcomingReminder ? (
                    <p>
                      Next reminder at{' '}
                      <span className="font-medium text-white">
                        {upcomingReminder.reminderMoment?.toLocaleString() ?? '—'}
                      </span>
                    </p>
                  ) : (
                    <p>No reminders scheduled yet.</p>
                  )}
                </div>
              )}
              </div>

            <div className={`${GLASS_CARD_CLASS} p-6 text-white`}>
              {activeView === 'tasks' ? (
                loading ? (
                  <div className="flex h-40 items-center justify-center text-sm text-white/70">Loading tasks…</div>
                ) : filteredTasks.length === 0 ? (
                  <div className="flex h-40 items-center justify-center text-sm text-white/75">
                    <span>no tas yet</span>
                  </div>
                ) : (
                  <div className="max-h-[70vh] min-w-0 overflow-x-hidden overflow-y-auto pr-1 scrollbar-hidden sm:pr-2 lg:max-h-[calc(100vh-18rem)]">
                    <TaskList
                      tasks={selectedListId === 'all' ? filteredTasks : tasksByList[selectedListId] ?? filteredTasks}
                      onReorder={canReorder && selectedListId !== 'all' ? handleReorder : undefined}
                      onEditTask={handleEditTask}
                      onDeleteTask={handleDeleteTask}
                      showListBadge
                    />
                  </div>
                )
              ) : reminderTasks.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-white/75">
                  <span>No reminders yet.</span>
                  <span className="text-xs">Add a reminder date and time when creating or editing a task.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {reminderTasks.map((task) => {
                    const isUnread = unreadReminders.some((reminder) => reminder.taskId === task.taskId)
                    const isPast = task.reminderMoment ? task.reminderMoment.getTime() < Date.now() : false
                    const reminderLabel = task.reminderMoment ? task.reminderMoment.toLocaleString() : '—'
                    return (
                      <section
                        key={`${task.taskId}-${task.reminderAt ?? 'none'}`}
                        className={`flex flex-col gap-4 ${GLASS_PILL_CLASS} p-5 text-white transition hover:border-white/40 hover:shadow-[0_30px_90px_-45px_rgba(15,23,42,0.7)]`}
                      >
                        <header className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate text-base font-semibold text-white">{task.title}</h3>
                              {isUnread && <span className="h-2.5 w-2.5 rounded-full bg-brand" aria-hidden />}
                            </div>
                            <p className="mt-1 text-sm text-white/80">{task.description || 'No description'}</p>
                            <span className="mt-2 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white/80">
                              {task.listName}
                            </span>
                          </div>
                          <div className="text-right text-sm text-white/80">
                            <p className="font-semibold text-white">Reminder</p>
                            <p className={isPast ? 'text-red-300' : undefined}>{reminderLabel}</p>
                            <p className="mt-1 text-xs uppercase tracking-wide text-white/60">
                              Status: {statusLabelMap[task.status] ?? task.status}
                            </p>
                          </div>
                        </header>
                        <div className="flex flex-wrap items-center gap-2">
                          <button type="button" className="btn" onClick={() => handleEditTask(task)}>
                            View task
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleMarkReminderRead(task)}
                            disabled={!task.reminderAt || !isUnread}
                          >
                            {isUnread ? 'Mark as read' : 'Reminder read'}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleDeleteTask(task)}
                          >
                            Delete task
                          </button>
                        </div>
                      </section>
                    )
                  })}
                </div>
              )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

