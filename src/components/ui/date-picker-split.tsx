"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, ArrowRight } from "lucide-react"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerSplitProps {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
}

export function DatePickerSplit({ date, onDateChange }: DatePickerSplitProps) {
  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !date?.from && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? format(date.from, "LLL dd") : "Start"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="range" selected={date} onSelect={onDateChange} numberOfMonths={1} />
        </PopoverContent>
      </Popover>

      <ArrowRight className="h-4 w-4 text-muted-foreground" />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !date?.to && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.to ? format(date.to, "LLL dd") : "End"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
           <Calendar mode="range" selected={date} onSelect={onDateChange} numberOfMonths={1} />
        </PopoverContent>
      </Popover>
    </div>
  )
}
