const {
  buildUpdateExpression,
  dynamo,
  getUserId,
  jsonResponse,
  parseBody,
  LISTS_TABLE,
} = require('./dynamo.js')

exports.handler = async (event) => {
  if (event?.requestContext?.http?.method === 'OPTIONS') {
    return jsonResponse(200, { ok: true })
  }

  const userId = getUserId(event)
  if (!userId) {
    return jsonResponse(401, { message: 'Unauthorized' })
  }

  const listId = event?.pathParameters?.listId
  if (!listId) {
    return jsonResponse(400, { message: 'List ID is required' })
  }

  let payload
  try {
    payload = parseBody(event)
  } catch (error) {
    return jsonResponse(400, { message: error.message })
  }

  const updates = {}

  if (typeof payload.name === 'string') {
    const trimmed = payload.name.trim()
    if (trimmed.length === 0) {
      return jsonResponse(400, { message: 'List name cannot be empty' })
    }
    updates.name = trimmed
  }

  if (typeof payload.description === 'string') {
    updates.description = payload.description.trim()
  }

  if (payload.position !== undefined) {
    const parsed = Number(payload.position)
    updates.position = Number.isFinite(parsed) ? parsed : undefined
  }

  updates.updatedAt = new Date().toISOString()

  const expression = buildUpdateExpression(updates)
  if (!expression) {
    return jsonResponse(400, { message: 'No valid fields provided for update' })
  }

  try {
    const result = await dynamo.send(
      new UpdateCommand({
        TableName: LISTS_TABLE,
        Key: { userId, listId },
        ...expression,
        ConditionExpression: 'attribute_exists(#userId) AND attribute_exists(#listId)',
        ExpressionAttributeNames: {
          ...expression.ExpressionAttributeNames,
          '#userId': 'userId',
          '#listId': 'listId',
        },
        ReturnValues: 'ALL_NEW',
      }),
    )

    return jsonResponse(200, result.Attributes)
  } catch (error) {
    console.error('UpdateList error', error)
    if (error.name === 'ConditionalCheckFailedException') {
      return jsonResponse(404, { message: 'List not found' })
    }
    return jsonResponse(500, { message: 'Failed to update list' })
  }
}


