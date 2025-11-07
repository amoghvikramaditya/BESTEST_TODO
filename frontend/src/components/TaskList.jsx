import { useMemo } from 'react'

import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import TaskCard from './TaskCard.jsx'

export function TaskList({ tasks, onReorder, onEditTask, onDeleteTask, showListBadge = false }) {
  const isDraggable = typeof onReorder === 'function'

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  const ids = useMemo(() => tasks.map((task) => task.taskId), [tasks])

  const handleDragEnd = (event) => {
    if (!isDraggable) return

    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = tasks.findIndex((task) => task.taskId === active.id)
    const newIndex = tasks.findIndex((task) => task.taskId === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const nextOrder = arrayMove(tasks, oldIndex, newIndex)
    onReorder?.(nextOrder)
  }

  const listContent = (
    <div className="space-y-4 min-w-0">
      {tasks.map((task) => (
        <TaskCard
          key={task.taskId}
          task={task}
          onEdit={onEditTask}
          onDelete={onDeleteTask}
          enableDrag={isDraggable}
          showListBadge={showListBadge}
        />
      ))}
    </div>
  )

  if (!isDraggable) {
    return listContent
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {listContent}
      </SortableContext>
    </DndContext>
  )
}

export default TaskList

