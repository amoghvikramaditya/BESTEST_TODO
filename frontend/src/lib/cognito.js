import { Amplify } from 'aws-amplify'

let initialized = false

export function configureAmplify() {
  if (initialized) return

  const region = import.meta.env.VITE_AWS_REGION ?? 'us-east-1'
  const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID ?? ''
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID ?? ''
  Amplify.configure({
    Auth: {
      Cognito: {
        region,
        userPoolId,
        userPoolClientId: clientId,
        loginWith: {
          email: true,
          phoneNumber: false,
          username: false,
        },
      },
    },
  })

  initialized = true
}

export function isAmplifyConfigured() {
  return initialized
}

