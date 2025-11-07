const { PutCommand } = require('@aws-sdk/lib-dynamodb')
const { randomUUID } = require('crypto')

const { dynamo, getUserId, jsonResponse, parseBody, LISTS_TABLE } = require('./dynamo.js')

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

  const name = typeof payload.name === 'string' ? payload.name.trim() : ''
  if (!name) {
    return jsonResponse(400, { message: 'List name is required' })
  }

  const description = typeof payload.description === 'string' ? payload.description.trim() : ''
  const listId = randomUUID()
  const now = new Date().toISOString()
  const position = Number.isFinite(Number(payload.position)) ? Number(payload.position) : Date.now()

  const item = {
    userId,
    listId,
    name,
    description,
    position,
    createdAt: now,
    updatedAt: now,
  }

  try {
    await dynamo.send(
      new PutCommand({
        TableName: LISTS_TABLE,
        Item: item,
        ConditionExpression: 'attribute_not_exists(#userId) AND attribute_not_exists(#listId)',
        ExpressionAttributeNames: {
          '#userId': 'userId',
          '#listId': 'listId',
        },
      }),
    )
  } catch (error) {
    console.error('CreateList error', error)
    return jsonResponse(500, { message: 'Failed to create list' })
  }

  return jsonResponse(201, item)
}


