const { DeleteCommand } = require('@aws-sdk/lib-dynamodb')

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
    await dynamo.send(
      new DeleteCommand({
        TableName: TODOS_TABLE,
        Key: { userId, taskId },
        ConditionExpression: 'attribute_exists(#userId) AND attribute_exists(#taskId)',
        ExpressionAttributeNames: {
          '#userId': 'userId',
          '#taskId': 'taskId',
        },
      }),
    )

    return jsonResponse(200, { message: 'Task deleted' })
  } catch (error) {
    console.error('DeleteTask error', error)
    if (error.name === 'ConditionalCheckFailedException') {
      return jsonResponse(404, { message: 'Task not found' })
    }
    return jsonResponse(500, { message: 'Failed to delete task' })
  }
}

