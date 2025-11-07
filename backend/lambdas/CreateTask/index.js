const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb')
const { randomUUID } = require('crypto')

const {
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

  let payload
  try {
    payload = parseBody(event)
  } catch (error) {
    return jsonResponse(400, { message: error.message })
  }

  const title = typeof payload.title === 'string' ? payload.title.trim() : ''
  if (!title) {
    return jsonResponse(400, { message: 'Title is required' })
  }

  const description = typeof payload.description === 'string' ? payload.description.trim() : ''
  const listId = normalizeListId(payload.listId)
  const priority = Number.isFinite(Number(payload.priority)) ? Number(payload.priority) : null
  const status = ALLOWED_STATUSES.has(payload.status) ? payload.status : 'todo'
  const position = Number.isFinite(Number(payload.position)) ? Number(payload.position) : Date.now()

  let dueDate
  let reminderAt

  try {
    dueDate = parseIsoDate(payload.dueDate, { field: 'due date' }) ?? null
    reminderAt = parseIsoDate(payload.reminderAt, { field: 'reminder time' }) ?? null
  } catch (error) {
    const statusCode = error.statusCode ?? 400
    return jsonResponse(statusCode, { message: error.message })
  }

  try {
    await assertListAccess(userId, listId)
  } catch (error) {
    const statusCode = error.statusCode ?? 400
    return jsonResponse(statusCode, { message: error.message })
  }

  const now = new Date().toISOString()
  const taskId = randomUUID()

  const item = {
    userId,
    taskId,
    title,
    description,
    listId,
    status,
    dueDate,
    reminderAt,
    priority,
    position,
    createdAt: now,
    updatedAt: now,
  }

  try {
    await dynamo.send(
      new PutCommand({
        TableName: TODOS_TABLE,
        Item: item,
        ConditionExpression: 'attribute_not_exists(#userId) AND attribute_not_exists(#taskId)',
        ExpressionAttributeNames: {
          '#userId': 'userId',
          '#taskId': 'taskId',
        },
      }),
    )
  } catch (error) {
    console.error('CreateTask error', error)
    return jsonResponse(500, { message: 'Failed to create task' })
  }

  return jsonResponse(201, item)
}

