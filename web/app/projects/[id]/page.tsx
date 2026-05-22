"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { environments } from "@/lib/api"

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: envList = [], isLoading } = useQuery({
    queryKey: ["environments", id],
    queryFn: () => environments.list(id),
  })

  useEffect(() => {
    if (!isLoading && envList.length > 0) {
      router.replace(`/projects/${id}/env/${envList[0].id}`)
    }
  }, [envList, isLoading, id, router])

  return (
    <div className="p-6 text-xs text-muted-foreground">
      {isLoading ? "Loading..." : envList.length === 0 ? "No environments. Click + to create one." : "Redirecting..."}
    </div>
  )
}
