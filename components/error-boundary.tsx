"use client"

import { useEffect, useState, type ReactNode } from "react"

interface ErrorBoundaryProps {
  children: ReactNode
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const handleError = () => {
      console.error("[v0] Error detected in ErrorBoundary")
      setHasError(true)
    }

    // Listen only for critical errors
    const handler = (event: ErrorEvent) => {
      if (
        event.error?.message?.includes("Class constructor") ||
        event.error?.message?.includes("Cannot call") ||
        event.message?.includes("Three")
      ) {
        handleError()
        event.preventDefault()
      }
    }

    window.addEventListener("error", handler, true)
    return () => window.removeEventListener("error", handler, true)
  }, [])

  if (hasError) {
    return null
  }

  return <>{children}</>
}
