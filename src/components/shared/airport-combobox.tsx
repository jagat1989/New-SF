'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, MapPin, Plane, Search } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CITY_AIRPORTS } from '@/lib/types'

interface Props {
  value: string
  onValueChange: (code: string) => void
  placeholder?: string
  className?: string
  exclude?: string // airport code to exclude (e.g. destination when picking origin)
  triggerClassName?: string
  allowAll?: boolean // show an "All airports" option (value = 'all')
  allLabel?: string
}

export function AirportCombobox({
  value, onValueChange, placeholder = 'Select airport', className, exclude, triggerClassName,
  allowAll = false, allLabel = 'All airports',
}: Props) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')

  const selected = value === 'all' ? null : CITY_AIRPORTS.find((a) => a.code === value)

  const regions = ['North', 'West', 'South', 'East'] as const
  const q = query.trim().toLowerCase()

  const filtered = q
    ? CITY_AIRPORTS.filter(
        (a) =>
          a.city.toLowerCase().includes(q) ||
          a.code.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.region.toLowerCase().includes(q),
      )
    : CITY_AIRPORTS

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal h-11', (!selected && value !== 'all') && 'text-muted-foreground', triggerClassName)}
        >
          {value === 'all' ? (
            <span className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold">{allLabel}</span>
            </span>
          ) : selected ? (
            <span className="flex items-center gap-2 min-w-0">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">
                <span className="font-semibold">{selected.city}</span>
                <span className="text-muted-foreground ml-1.5 text-xs">({selected.code})</span>
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search city, code or airport name…" value={query} onValueChange={setQuery} />
          <CommandList className="max-h-72">
            <CommandEmpty>
              <span className="text-sm text-muted-foreground py-4 block">No airport found.</span>
            </CommandEmpty>
            {allowAll && !q && (
              <CommandGroup heading="Filter">
                <CommandItem
                  value="all"
                  onSelect={() => { onValueChange('all'); setOpen(false); setQuery('') }}
                  className="gap-2"
                >
                  <Check className={cn('h-3.5 w-3.5', value === 'all' ? 'opacity-100 text-primary' : 'opacity-0')} />
                  <span className="font-medium text-sm">{allLabel}</span>
                </CommandItem>
              </CommandGroup>
            )}
            {regions.map((region) => {
              const items = filtered.filter((a) => a.region === region && a.code !== exclude)
              if (items.length === 0) return null
              return (
                <CommandGroup key={region} heading={region + ' India'}>
                  {items.map((a) => (
                    <CommandItem
                      key={a.code}
                      value={a.code}
                      onSelect={() => {
                        onValueChange(a.code)
                        setOpen(false)
                        setQuery('')
                      }}
                      className="gap-2"
                    >
                      <Check className={cn('h-3.5 w-3.5', value === a.code ? 'opacity-100 text-primary' : 'opacity-0')} />
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Plane className="h-3 w-3 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm truncate">{a.city}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{a.code}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">{a.name}</p>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
