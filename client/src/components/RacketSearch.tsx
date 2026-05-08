import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSearchRackets } from "@/hooks/use-rackets";
import { useDebounce } from "@/hooks/use-debounce";

interface RacketSearchProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

export function RacketSearch({ value, onChange }: RacketSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebounce(query, 300);
  
  const { data: rackets, isLoading } = useSearchRackets(debouncedQuery);
  
  // Find selected racket name if value exists
  const selectedRacket = React.useMemo(() => {
    if (rackets) return rackets.find((r) => r.id === value);
    return null;
  }, [rackets, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-12 text-left font-normal bg-background border-input hover:bg-accent/5 hover:text-foreground"
        >
          {value
            ? (selectedRacket ? `${selectedRacket.brand} ${selectedRacket.model}` : `Racket #${value} Selected`)
            : "Search racket database..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Type brand or model..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <CommandList>
            {isLoading && <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>}
            {!isLoading && rackets?.length === 0 && query.length >= 2 && (
              <CommandEmpty>No rackets found.</CommandEmpty>
            )}
            {!isLoading && query.length < 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">Type at least 2 characters</div>
            )}
            <CommandGroup>
              {rackets?.map((racket) => {
                const isHevini = racket.brand === "Hevini";
                return (
                  <CommandItem
                    key={racket.id}
                    value={String(racket.id)}
                    onSelect={() => {
                      onChange(racket.id);
                      setOpen(false);
                    }}
                    className={isHevini ? "bg-primary/5" : undefined}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === racket.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1">
                      <span className="font-medium flex items-center gap-2">
                        {racket.brand} {racket.model}
                        {isHevini && (
                          <span className="bg-primary text-primary-foreground text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-sm">
                            Featured
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {racket.headSize}sq in • {racket.stringPattern} • {racket.weightUnstrung}g
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
