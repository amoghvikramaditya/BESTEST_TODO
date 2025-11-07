const { DeleteCommand } = require('@aws-sdk/lib-dynamodb')

const { dynamo, getUserId, jsonResponse, LISTS_TABLE } = require('./dynamo.js')

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

  try {
    await dynamo.send(
      new DeleteCommand({
        TableName: LISTS_TABLE,
        Key: { userId, listId },
        ConditionExpression: 'attribute_exists(#userId) AND attribute_exists(#listId)',
        ExpressionAttributeNames: {
          '#userId': 'userId',
          '#listId': 'listId',
        },
      }),
    )

    return jsonResponse(200, { message: 'List deleted' })
  } catch (error) {
    console.error('DeleteList error', error)
    if (error.name === 'ConditionalCheckFailedException') {
      return jsonResponse(404, { message: 'List not found' })
    }
    return jsonResponse(500, { message: 'Failed to delete list' })
  }
}


