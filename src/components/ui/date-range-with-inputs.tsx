"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangeWithInputsProps {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
  className?: string
}

export function DateRangeWithInputs({
  className,
  date: finalDate,
  onDateChange,
}: DateRangeWithInputsProps) {
  const [tempDate, setTempDate] = React.useState<DateRange | undefined>(finalDate)

  React.useEffect(() => {
    setTempDate(finalDate)
  }, [finalDate])

  const handleApply = () => {
    onDateChange(tempDate)
  }

  return (
    <div className={cn("flex flex-col sm:flex-row items-center gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date-from"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !tempDate?.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {tempDate?.from ? format(tempDate.from, "PPP") : <span>From</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="single"
            selected={tempDate?.from}
            onSelect={(day) => setTempDate(prev => ({ from: day, to: prev?.to }))}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date-to"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !tempDate?.to && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {tempDate?.to ? format(tempDate.to, "PPP") : <span>To</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="single"
            selected={tempDate?.to}
            onSelect={(day) => setTempDate(prev => ({ from: prev?.from, to: day }))}
            disabled={{ before: tempDate?.from }}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>
      <Button onClick={handleApply}>Apply</Button>
    </div>
  )
}
