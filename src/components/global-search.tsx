"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Contact, MessageSquare, FileText, Megaphone } from "lucide-react"

interface SearchResult {
  id: string
  title: string
  description: string
  url: string
  type: "contact" | "conversation" | "template" | "campaign"
}

const typeIcons = {
  contact: Contact,
  conversation: MessageSquare,
  template: FileText,
  campaign: Megaphone,
}

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  React.useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const controller = new AbortController()
    const timer = setTimeout(() => {
      Promise.all([
        fetch(`/api/contacts?search=${encodeURIComponent(query)}&limit=3`, { signal: controller.signal }).then(r => r.json()),
        fetch(`/api/conversations?search=${encodeURIComponent(query)}&limit=3`, { signal: controller.signal }).then(r => r.json()),
        fetch(`/api/templates?search=${encodeURIComponent(query)}&limit=3`, { signal: controller.signal }).then(r => r.json()),
        fetch(`/api/campaigns?search=${encodeURIComponent(query)}&limit=3`, { signal: controller.signal }).then(r => r.json()),
      ]).then(([contacts, conversations, templates, campaigns]) => {
        const items: SearchResult[] = []
        if (contacts?.success && Array.isArray(contacts.data)) {
          contacts.data.forEach((c: { id: string; name?: string; phone: string }) => {
            items.push({ id: `c-${c.id}`, title: c.name || c.phone, description: "Contact", url: `/contacts/${c.id}`, type: "contact" })
          })
        }
        if (conversations?.success && Array.isArray(conversations.data)) {
          conversations.data.forEach((conv: { id: string; contact?: { name?: string; phone: string } }) => {
            items.push({ id: `conv-${conv.id}`, title: conv.contact?.name || conv.contact?.phone || "Unknown", description: "Conversation", url: `/inbox?conversation=${conv.id}`, type: "conversation" })
          })
        }
        if (templates?.success && Array.isArray(templates.data)) {
          templates.data.forEach((t: { id: string; name: string }) => {
            items.push({ id: `t-${t.id}`, title: t.name, description: "Template", url: `/templates/${t.id}`, type: "template" })
          })
        }
        if (campaigns?.success && Array.isArray(campaigns.data)) {
          campaigns.data.forEach((c: { id: string; name: string }) => {
            items.push({ id: `cmp-${c.id}`, title: c.name, description: "Campaign", url: `/campaigns/${c.id}`, type: "campaign" })
          })
        }
        setResults(items)
      }).catch(() => {}).finally(() => setLoading(false))
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const handleSelect = (url: string) => {
    setOpen(false)
    setQuery("")
    router.push(url)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search contacts, conversations, templates..." value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>{loading ? "Searching..." : "No results found."}</CommandEmpty>
        {results.length > 0 && (
          <CommandGroup heading="Results">
            {results.map((result) => {
              const Icon = typeIcons[result.type]
              return (
                <CommandItem key={result.id} onSelect={() => handleSelect(result.url)}>
                  <Icon className="mr-2 size-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm truncate">{result.title}</p>
                    <p className="text-xs text-muted-foreground">{result.description}</p>
                  </div>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
