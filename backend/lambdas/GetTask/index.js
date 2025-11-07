const { GetCommand } = require('@aws-sdk/lib-dynamodb')

const { dynamo, getUserId, jsonResponse, TODOS_TABLE } = require('./dynamo.js')

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

  try {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TODOS_TABLE,
        Key: {
          userId,
          taskId,
        },
      }),
    )

    if (!result.Item) {
      return jsonResponse(404, { message: 'Task not found' })
    }

    return jsonResponse(200, result.Item)
  } catch (error) {
    console.error('GetTask error', error)
    return jsonResponse(500, { message: 'Failed to retrieve task' })
  }
}

