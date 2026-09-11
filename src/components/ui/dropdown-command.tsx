"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DropdownCommandProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  items: Array<{
    value: string;
    label: string;
    group?: string;
  }>;
  className?: string;
  disabled?: boolean;
}

const DropdownCommand = React.forwardRef<
  HTMLDivElement,
  DropdownCommandProps
>(
  (
    {
      value,
      onValueChange,
      placeholder = "Select...",
      searchPlaceholder = "Search...",
      emptyMessage = "No results found.",
      items,
      className,
      disabled = false,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");

    const filteredItems = React.useMemo(() => {
      if (!search) return items;
      return items.filter((item) =>
        item.label.toLowerCase().includes(search.toLowerCase())
      );
    }, [items, search]);

    const groups = React.useMemo(() => {
      const map = new Map<string, typeof filteredItems>();
      for (const item of filteredItems) {
        const group = item.group || "";
        if (!map.has(group)) {
          map.set(group, []);
        }
        map.get(group)!.push(item);
      }
      return map;
    }, [filteredItems]);

    const selectedItem = items.find((item) => item.value === value);

    const handleSelect = React.useCallback(
      (itemValue: string) => {
        onValueChange?.(itemValue === value ? "" : itemValue);
        setOpen(false);
        setSearch("");
      },
      [onValueChange, value]
    );

    return (
      <div ref={ref} className={cn("relative", className)}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between",
            !selectedItem && "text-muted-foreground"
          )}
          onClick={() => setOpen(!open)}
        >
          <span className="truncate">
            {selectedItem ? selectedItem.label : placeholder}
          </span>
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
            <CommandPrimitive shouldFilter={false}>
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <input
                  className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
                {search && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearch("");
                    }}
                    className="ml-1 rounded-sm opacity-70 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <CommandPrimitive.List className="max-h-[200px] overflow-y-auto p-1">
                <CommandPrimitive.Empty className="py-6 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </CommandPrimitive.Empty>
                {Array.from(groups.entries()).map(([group, groupItems]) => (
                  <CommandPrimitive.Group
                    key={group}
                    className={cn(
                      "overflow-hidden p-1 text-foreground",
                      group && "mt-1"
                    )}
                  >
                    {group && (
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        {group}
                      </div>
                    )}
                    {groupItems.map((item) => (
                      <CommandPrimitive.Item
                        key={item.value}
                        value={item.value}
                        onSelect={() => handleSelect(item.value)}
                        className={cn(
                          "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                          "hover:bg-accent hover:text-accent-foreground",
                          value === item.value &&
                            "bg-accent text-accent-foreground"
                        )}
                      >
                        <span className="flex-1 truncate">{item.label}</span>
                        {value === item.value && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ✓
                          </span>
                        )}
                      </CommandPrimitive.Item>
                    ))}
                  </CommandPrimitive.Group>
                ))}
              </CommandPrimitive.List>
            </CommandPrimitive>
          </div>
        )}

        {open && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setOpen(false);
              setSearch("");
            }}
          />
        )}
      </div>
    );
  }
);
DropdownCommand.displayName = "DropdownCommand";

export { DropdownCommand, type DropdownCommandProps };
