const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb')

const {
  buildUpdateExpression,
  dynamo,
  getUserId,
  jsonResponse,
  parseBody,
  TODOS_TABLE,
  LISTS_TABLE,
} = require('./dynamo.js')

const ALLOWED_STATUSES = new Set(['todo', 'in_progress', 'done'])
const INBOX_LIST_ID = 'inbox'

function normalizeListId(value) {
  if (typeof value !== 'string') return INBOX_LIST_ID
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : INBOX_LIST_ID
}

async function assertListAccess(userId, listId) {
  if (listId === INBOX_LIST_ID) {
    return null
  }

  const result = await dynamo.send(
    new GetCommand({
      TableName: LISTS_TABLE,
      Key: { userId, listId },
    }),
  )

  if (!result.Item) {
    const error = new Error('Folder not found')
    error.statusCode = 404
    throw error
  }

  return result.Item
}

function parseIsoDate(input, { field }) {
  if (input === undefined) return undefined
  if (input === null || input === '') return null

  const date = new Date(input)
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`Invalid ${field}`)
    error.statusCode = 400
    throw error
  }

  return date.toISOString()
}

exports.handler = async (event) => {
  if (event?.requestContext?.http?.method === 'OPTIONS') {
    return jsonResponse(200, { ok: true })
  }

  const userId = getUserId(event)
  if (!userId) {
    return jsonResponse(401, { message: 'Unauthorized' })
  }

  const taskId = event?.pathParameters?.taskId
  if (!taskId) {
    return jsonResponse(400, { message: 'Task ID is required' })
  }

  let payload
  try {
    payload = parseBody(event)
  } catch (error) {
    return jsonResponse(400, { message: error.message })
  }

  const updates = {}

  if (typeof payload.title === 'string') updates.title = payload.title.trim()
  if (typeof payload.description === 'string') updates.description = payload.description.trim()
  if (payload.status && ALLOWED_STATUSES.has(payload.status)) updates.status = payload.status

  if (payload.dueDate !== undefined) {
    try {
      updates.dueDate = parseIsoDate(payload.dueDate, { field: 'due date' }) ?? null
    } catch (error) {
      const statusCode = error.statusCode ?? 400
      return jsonResponse(statusCode, { message: error.message })
    }
  }

  if (payload.reminderAt !== undefined) {
    try {
      updates.reminderAt = parseIsoDate(payload.reminderAt, { field: 'reminder time' }) ?? null
    } catch (error) {
      const statusCode = error.statusCode ?? 400
      return jsonResponse(statusCode, { message: error.message })
    }
  }

  if (payload.priority !== undefined) {
    const parsedPriority = Number(payload.priority)
    updates.priority = Number.isFinite(parsedPriority) ? parsedPriority : undefined
  }

  if (payload.position !== undefined) {
    const parsedPosition = Number(payload.position)
    updates.position = Number.isFinite(parsedPosition) ? parsedPosition : undefined
  }

  if (payload.listId !== undefined) {
    const listId = normalizeListId(payload.listId)
    try {
      await assertListAccess(userId, listId)
      updates.listId = listId
    } catch (error) {
      const statusCode = error.statusCode ?? 400
      return jsonResponse(statusCode, { message: error.message })
    }
  }

  updates.updatedAt = new Date().toISOString()

  const expression = buildUpdateExpression(updates)
  if (!expression) {
    return jsonResponse(400, { message: 'No valid fields provided for update' })
  }

  try {
    const result = await dynamo.send(
      new UpdateCommand({
        TableName: TODOS_TABLE,
        Key: { userId, taskId },
        ...expression,
        ConditionExpression: 'attribute_exists(#userId) AND attribute_exists(#taskId)',
        ExpressionAttributeNames: {
          ...expression.ExpressionAttributeNames,
          '#userId': 'userId',
          '#taskId': 'taskId',
        },
        ReturnValues: 'ALL_NEW',
      }),
    )

    return jsonResponse(200, result.Attributes)
  } catch (error) {
    console.error('UpdateTask error', error)
    if (error.name === 'ConditionalCheckFailedException') {
      return jsonResponse(404, { message: 'Task not found' })
    }
    return jsonResponse(500, { message: 'Failed to update task' })
  }
}

