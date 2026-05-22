"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { useState } from "react"
import { RevealProvider } from "@/context/reveal-context"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })
  )
  return (
    <QueryClientProvider client={queryClient}>
      <RevealProvider>
        {children}
      </RevealProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: "#111", border: "1px solid #1f1f1f", color: "#e5e5e5" },
        }}
      />
    </QueryClientProvider>
  )
}
