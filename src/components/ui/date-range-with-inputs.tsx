
"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
  align?: "start" | "center" | "end"
}

export function DateRangeWithInputs({
  className,
  date,
  onDateChange,
  align = "start"
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const resetDate = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDateChange(undefined)
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full sm:w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Filter by date range</span>
            )}
            {date && (
                <div onClick={resetDate} className="ml-auto hover:bg-secondary rounded-full p-1 cursor-pointer">
                    <X className="h-3 w-3" />
                </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <div className="flex flex-col gap-4 p-4">
            <div className="flex gap-4">
                <div className="flex flex-col gap-2 w-full">
                    <span className="text-xs font-medium text-muted-foreground uppercase">From</span>
                    <div className="flex h-10 w-[140px] items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm ring-offset-background text-muted-foreground">
                        {date?.from ? format(date.from, "MM/dd/yyyy") : "MM/DD/YYYY"}
                    </div>
                </div>
                <div className="flex flex-col gap-2 w-full">
                    <span className="text-xs font-medium text-muted-foreground uppercase">To</span>
                    <div className="flex h-10 w-[140px] items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm ring-offset-background text-muted-foreground">
                        {date?.to ? format(date.to, "MM/dd/yyyy") : "MM/DD/YYYY"}
                    </div>
                </div>
            </div>
            
            <div className="border rounded-md">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={onDateChange}
                    numberOfMonths={1}
                />
            </div>
             <Button onClick={() => setIsOpen(false)} className="w-full">Apply</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
