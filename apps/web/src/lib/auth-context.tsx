'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authApi } from './api'
import { identifyUser, resetAnalytics } from './analytics'

interface User {
  id: string
  email: string
  name?: string
  plan: string
  avatarUrl?: string
  articlesUsedMonth?: number
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await authApi.me()
      const u = data?.user || data
      setUser(u)
      if (u?.id) {
        identifyUser(u.id, { email: u.email, plan: u.plan, name: u.name })
      }
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    // Token lives in HttpOnly cookie — just attempt to fetch the current user
    refresh().finally(() => setIsLoading(false))
  }, [refresh])

  const login = async (email: string, password: string) => {
    const data = await authApi.login({ email, password })
    // access_token is now set as an HttpOnly cookie by the server
    setUser(data?.user)
    if (data?.user) {
      identifyUser(data.user.id, { email: data.user.email, plan: data.user.plan, name: data.user.name })
    }
  }

  const register = async (email: string, password: string, name?: string) => {
    await authApi.register({ email, password, name })
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore logout errors
    }
    resetAnalytics()
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
