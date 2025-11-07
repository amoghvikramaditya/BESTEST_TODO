const { QueryCommand } = require('@aws-sdk/lib-dynamodb')

const { dynamo, getUserId, jsonResponse, TODOS_TABLE } = require('./dynamo.js')

const MAX_PAGE_SIZE = 50
const INBOX_LIST_ID = 'inbox'

function normalizeListId(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  return trimmed
}

exports.handler = async (event) => {
  if (event?.requestContext?.http?.method === 'OPTIONS') {
    return jsonResponse(200, { ok: true })
  }

  const userId = getUserId(event)
  if (!userId) {
    return jsonResponse(401, { message: 'Unauthorized' })
  }

  const params = event?.queryStringParameters || {}
  const status = params.status
  const requestedListId = normalizeListId(params.listId)
  const limit = Math.min(Number(params.limit) || 20, MAX_PAGE_SIZE)

  let exclusiveStartKey
  if (params.lastEvaluatedKey) {
    try {
      exclusiveStartKey = JSON.parse(decodeURIComponent(params.lastEvaluatedKey))
    } catch (error) {
      return jsonResponse(400, { message: 'Invalid pagination token' })
    }
  }

  const queryInput = {
    TableName: TODOS_TABLE,
    KeyConditionExpression: '#userId = :userId',
    ExpressionAttributeNames: { '#userId': 'userId' },
    ExpressionAttributeValues: { ':userId': userId },
    Limit: limit,
    ExclusiveStartKey: exclusiveStartKey,
  }

  if (status) {
    queryInput.IndexName = 'UserStatusIndex'
    queryInput.KeyConditionExpression = '#userId = :userId AND #status = :status'
    queryInput.ExpressionAttributeNames['#status'] = 'status'
    queryInput.ExpressionAttributeValues[':status'] = status
  } else {
    queryInput.IndexName = 'CreatedAtIndex'
    queryInput.ScanIndexForward = false
  }

  const filterExpressions = []

  if (requestedListId) {
    queryInput.ExpressionAttributeNames['#listId'] = 'listId'

    if (requestedListId === INBOX_LIST_ID) {
      filterExpressions.push('attribute_not_exists(#listId) OR #listId = :inboxListId')
      queryInput.ExpressionAttributeValues[':inboxListId'] = INBOX_LIST_ID
    } else {
      filterExpressions.push('#listId = :listId')
      queryInput.ExpressionAttributeValues[':listId'] = requestedListId
    }
  }

  if (filterExpressions.length > 0) {
    queryInput.FilterExpression = filterExpressions.join(' AND ')
  }

  try {
    const result = await dynamo.send(new QueryCommand(queryInput))

    const items = (result.Items || []).map((item) => ({
      ...item,
      listId: item.listId || INBOX_LIST_ID,
    }))

    return jsonResponse(200, {
      items,
      lastEvaluatedKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
    })
  } catch (error) {
    console.error('ListTasks error', error)
    return jsonResponse(500, { message: 'Failed to list tasks' })
  }
}

