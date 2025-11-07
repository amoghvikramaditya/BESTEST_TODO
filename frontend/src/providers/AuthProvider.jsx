import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import {
  confirmResetPassword as amplifyConfirmResetPassword,
  confirmSignUp as amplifyConfirmSignUp,
  fetchAuthSession,
  getCurrentUser,
  resendSignUpCode as amplifyResendSignUpCode,
  resetPassword as amplifyResetPassword,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  signUp as amplifySignUp,
} from 'aws-amplify/auth'

import { configureAmplify } from '../lib/cognito.js'
import { setTokenProvider } from '../lib/api.js'

const AuthContext = createContext(null)

const initialState = {
  user: null,
  tokens: null,
  initialized: false,
  error: null,
}

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_SESSION':
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        error: null,
      }
    case 'CLEAR_SESSION':
      return {
        ...state,
        user: null,
        tokens: null,
      }
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      }
    case 'SET_INITIALIZED':
      return {
        ...state,
        initialized: true,
      }
    default:
      return state
  }
}

configureAmplify()

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  const syncTokenProvider = useCallback(
    (tokens) => {
      setTokenProvider(async () => tokens?.accessToken ?? null)
    },
    [],
  )

  const refreshSession = useCallback(async () => {
    try {
      const user = await getCurrentUser().catch(() => null)
      if (!user) {
        dispatch({ type: 'CLEAR_SESSION' })
        syncTokenProvider(null)
        return null
      }

      const session = await fetchAuthSession({ forceRefresh: true }).catch(() => null)
      const tokens = session?.tokens
        ? {
            accessToken: session.tokens.accessToken?.toString() ?? null,
            idToken: session.tokens.idToken?.toString() ?? null,
          }
        : null

      if (!tokens?.accessToken) {
        dispatch({ type: 'CLEAR_SESSION' })
        syncTokenProvider(null)
        return null
      }

      dispatch({
        type: 'SET_SESSION',
        payload: { user, tokens },
      })
      syncTokenProvider(tokens)
      return user
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error })
      dispatch({ type: 'CLEAR_SESSION' })
      syncTokenProvider(null)
      return null
    } finally {
      dispatch({ type: 'SET_INITIALIZED' })
    }
  }, [syncTokenProvider])

  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  const signIn = useCallback(
    async ({ username, password }) => {
      try {
        const result = await amplifySignIn({ username, password })
        console.log('Amplify signIn result:', result)
        await refreshSession()
        return result
      } catch (error) {
        console.error('auth provider signIn error', error)
        dispatch({ type: 'SET_ERROR', payload: error })
        throw error
      }
    },
    [refreshSession],
  )

  const signUp = useCallback(async ({ email, password, name }) => {
    try {
      return await amplifySignUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name,
          },
        },
      })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error })
      throw error
    }
  }, [])

  const confirmSignUp = useCallback(async ({ email, code }) => {
    try {
      return await amplifyConfirmSignUp({ username: email, confirmationCode: code })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error })
      throw error
    }
  }, [])

  const resendSignUpCode = useCallback(async ({ email }) => {
    try {
      return await amplifyResendSignUpCode({ username: email })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error })
      throw error
    }
  }, [])

  const forgotPassword = useCallback(async ({ email }) => {
    try {
      return await amplifyResetPassword({ username: email })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error })
      throw error
    }
  }, [])

  const completeForgotPassword = useCallback(async ({ email, code, password }) => {
    try {
      return await amplifyConfirmResetPassword({ username: email, confirmationCode: code, newPassword: password })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error })
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    await amplifySignOut({ global: false }).catch(() => undefined)
    dispatch({ type: 'CLEAR_SESSION' })
    syncTokenProvider(null)
  }, [syncTokenProvider])

  const value = useMemo(
    () => ({
      user: state.user,
      tokens: state.tokens,
      initializing: !state.initialized,
      isAuthenticated: Boolean(state.user),
      authError: state.error,
      signIn,
      signUp,
      confirmSignUp,
      resendSignUpCode,
      forgotPassword,
      completeForgotPassword,
      signOut,
      refreshSession,
    }),
    [state, signIn, signUp, confirmSignUp, resendSignUpCode, forgotPassword, completeForgotPassword, signOut, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

