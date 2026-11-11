"use client"

import { useEffect, useState } from "react"

/** Current location.hash without the "#". Updates on hashchange / popstate. */
export function useHash() {
  const [hash, setHash] = useState("")

  useEffect(() => {
    const read = () => setHash(window.location.hash.replace("#", ""))
    read()
    window.addEventListener("hashchange", read)
    window.addEventListener("popstate", read)
    return () => {
      window.removeEventListener("hashchange", read)
      window.removeEventListener("popstate", read)
    }
  }, [])

  return hash
}
