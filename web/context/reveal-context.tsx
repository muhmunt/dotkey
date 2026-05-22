"use client"

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react"

interface RevealContextValue {
  revealToken: string | null
  isUnlocked: boolean
  secondsLeft: number
  unlock: (token: string, expiresIn: number) => void
  lock: () => void
}

const RevealContext = createContext<RevealContextValue>({
  revealToken: null,
  isUnlocked: false,
  secondsLeft: 0,
  unlock: () => {},
  lock: () => {},
})

export function RevealProvider({ children }: { children: React.ReactNode }) {
  const [revealToken, setRevealToken] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const lock = useCallback(() => {
    setRevealToken(null)
    setExpiresAt(null)
    setSecondsLeft(0)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const unlock = useCallback((token: string, expiresIn: number) => {
    setRevealToken(token)
    const exp = Date.now() + expiresIn * 1000
    setExpiresAt(exp)
    setSecondsLeft(expiresIn)
  }, [])

  useEffect(() => {
    if (!expiresAt) return
    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(() => {
      const left = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left === 0) lock()
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [expiresAt, lock])

  return (
    <RevealContext.Provider value={{ revealToken, isUnlocked: !!revealToken, secondsLeft, unlock, lock }}>
      {children}
    </RevealContext.Provider>
  )
}

export function useReveal() {
  return useContext(RevealContext)
}

export function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, "0")}`
}
