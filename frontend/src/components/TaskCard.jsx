import { useCallback, useEffect, useRef } from 'react'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { gsap } from 'gsap'

const statusStyles = {
  todo: 'border border-sky-200/50 bg-sky-500/20 text-sky-100',
  in_progress: 'border border-amber-200/50 bg-amber-500/20 text-amber-100',
  done: 'border border-emerald-200/50 bg-emerald-500/20 text-emerald-100',
}

const statusLabels = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
}

export function TaskCard({ task, onEdit, onDelete, enableDrag = true, showListBadge = false }) {
  const cardRef = useRef(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.taskId,
    disabled: !enableDrag,
  })

  const composedRef = useCallback(
    (node) => {
      setNodeRef(node)
      cardRef.current = node
    },
    [setNodeRef],
  )

  useEffect(() => {
    if (!cardRef.current) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        {
          opacity: 0,
          y: 24,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          ease: 'power2.out',
        },
      )
    }, cardRef)

    return () => ctx.revert()
  }, [])

  const transformStyle = CSS.Transform.toString(transform)
  const reminderDate = task.reminderAt ? new Date(task.reminderAt) : null
  const isReminderPast = reminderDate ? reminderDate.getTime() < Date.now() : false
  const reminderLabel = reminderDate ? reminderDate.toLocaleString() : '—'
  const listName = task.listName || (task.listId === 'inbox' ? 'Inbox' : task.listId || 'Inbox')

  const style = {
    transform: transformStyle,
    transition,
    opacity: isDragging ? 0.75 : 1,
    cursor: enableDrag ? 'grab' : 'default',
  }

  return (
    <article
      ref={composedRef}
      style={style}
      className="group rounded-2xl border border-white/20 bg-white/10 p-5 text-white shadow-[0_25px_90px_-45px_rgba(15,23,42,0.7)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-white/40 hover:shadow-[0_35px_120px_-50px_rgba(15,23,42,0.75)]"
      data-task-card
    >
      <header className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-white">{task.title}</h3>
          <p className="mt-1 truncate text-sm text-white/75">{task.description || 'No description'}</p>
          {showListBadge && (
            <span className="mt-3 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white/80">
              {listName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {enableDrag && (
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white/70 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label="Drag task"
              {...listeners}
              {...attributes}
            >
              ≡
            </button>
          )}
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${
              statusStyles[task.status] ?? statusStyles.todo
            }`}
          >
            {statusLabels[task.status] ?? task.status}
          </span>
        </div>
      </header>

      <dl className="mt-4 grid grid-cols-1 gap-3 text-xs text-white/75 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="font-semibold text-white">Due</dt>
          <dd>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</dd>
        </div>
        <div>
          <dt className="font-semibold text-white">Priority</dt>
          <dd>{task.priority ?? '—'}</dd>
        </div>
        <div>
          <dt className="font-semibold text-white">Reminder</dt>
          <dd className={isReminderPast ? 'text-red-300' : undefined}>{reminderLabel}</dd>
        </div>
        <div>
          <dt className="font-semibold text-white">Created</dt>
          <dd>{task.createdAt ? new Date(task.createdAt).toLocaleString() : '—'}</dd>
        </div>
        <div>
          <dt className="font-semibold text-white">Folder</dt>
          <dd>{listName}</dd>
        </div>
        <div>
          <dt className="font-semibold text-white">Position</dt>
          <dd>{task.position ?? '—'}</dd>
        </div>
      </dl>

      <footer className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" className="btn w-full sm:w-auto" onClick={() => onEdit?.(task)}>
          Edit
        </button>
        <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => onDelete?.(task)}>
          Delete
        </button>
      </footer>
    </article>
  )
}

export default TaskCard

