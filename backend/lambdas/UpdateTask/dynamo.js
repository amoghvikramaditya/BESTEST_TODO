const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb')

const marshallOptions = {
  removeUndefinedValues: true,
}

const unmarshallOptions = {
  wrapNumbers: false,
}

const translateConfig = { marshallOptions, unmarshallOptions }

const region = process.env.AWS_REGION || 'us-east-1'
const TODOS_TABLE = process.env.TODOS_TABLE || 'Todos'
const LISTS_TABLE = process.env.TASK_LISTS_TABLE || 'TodoLists'

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), translateConfig)

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE',
    },
    body: JSON.stringify(payload ?? {}),
  }
}

function parseBody(event) {
  if (!event?.body) return {}
  try {
    return typeof event.body === 'string' ? JSON.parse(event.body) : event.body
  } catch (error) {
    throw new Error('Invalid JSON body')
  }
}

function getUserId(event) {
  const authorizer = event?.requestContext?.authorizer
  if (!authorizer) return null

  const claims = authorizer.jwt?.claims || authorizer.claims || {}
  return claims.sub || claims['cognito:username'] || claims.username || null
}

function buildUpdateExpression(attributes) {
  const sets = []
  const names = {}
  const values = {}

  Object.entries(attributes).forEach(([key, value]) => {
    if (value === undefined) return
    const nameKey = `#${key}`
    const valueKey = `:${key}`
    sets.push(`${nameKey} = ${valueKey}`)
    names[nameKey] = key
    values[valueKey] = value
  })

  if (sets.length === 0) {
    return null
  }

  return {
    UpdateExpression: `SET ${sets.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }
}

module.exports = {
  dynamo,
  TODOS_TABLE,
  LISTS_TABLE,
  jsonResponse,
  parseBody,
  getUserId,
  buildUpdateExpression,
}

