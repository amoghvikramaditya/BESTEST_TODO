const { QueryCommand } = require('@aws-sdk/lib-dynamodb')

const { dynamo, getUserId, jsonResponse, LISTS_TABLE } = require('./dynamo.js')

exports.handler = async (event) => {
  if (event?.requestContext?.http?.method === 'OPTIONS') {
    return jsonResponse(200, { ok: true })
  }

  const userId = getUserId(event)
  if (!userId) {
    return jsonResponse(401, { message: 'Unauthorized' })
  }

  try {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: LISTS_TABLE,
        KeyConditionExpression: '#userId = :userId',
        ExpressionAttributeNames: { '#userId': 'userId' },
        ExpressionAttributeValues: { ':userId': userId },
      }),
    )

    const items = (result.Items || []).sort((a, b) => {
      const posDiff = (a.position ?? 0) - (b.position ?? 0)
      if (posDiff !== 0) return posDiff
      return new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0)
    })

    return jsonResponse(200, { items })
  } catch (error) {
    console.error('ListLists error', error)
    return jsonResponse(500, { message: 'Failed to list folders' })
  }
}


