'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authApi } from './api'

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

function setTokenCookie(token: string) {
  document.cookie = `access_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
}

function removeTokenCookie() {
  document.cookie = 'access_token=; path=/; max-age=0'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await authApi.me()
      setUser(data?.user || data)
    } catch {
      setUser(null)
      localStorage.removeItem('access_token')
      removeTokenCookie()
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      refresh().finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [refresh])

  const login = async (email: string, password: string) => {
    const data = await authApi.login({ email, password })
    const token = data?.accessToken || data?.access_token
    if (token) {
      localStorage.setItem('access_token', token)
      setTokenCookie(token)
    }
    setUser(data?.user)
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
    localStorage.removeItem('access_token')
    removeTokenCookie()
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
