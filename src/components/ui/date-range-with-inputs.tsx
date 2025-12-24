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

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
}

export function DateRangeWithInputs({
  className,
  date,
  onDateChange,
}: DateRangePickerProps) {
  const [tempDate, setTempDate] = React.useState<DateRange | undefined>(date)
  const [fromOpen, setFromOpen] = React.useState(false)
  const [toOpen, setToOpen] = React.useState(false)

  React.useEffect(() => {
    setTempDate(date)
  }, [date])

  const handleApply = () => {
    onDateChange(tempDate)
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Popover open={fromOpen} onOpenChange={setFromOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date-from"
            variant={"outline"}
            className={cn(
              "w-[150px] justify-start text-left font-normal",
              !tempDate?.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {tempDate?.from ? format(tempDate.from, "LLL dd, y") : <span>From</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="single"
            selected={tempDate?.from}
            onSelect={(day) => {
              setTempDate(prev => ({ from: day, to: prev?.to }));
              setFromOpen(false);
            }}
            disabled={{ after: tempDate?.to }}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>

      <Popover open={toOpen} onOpenChange={setToOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date-to"
            variant={"outline"}
            className={cn(
              "w-[150px] justify-start text-left font-normal",
              !tempDate?.to && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {tempDate?.to ? format(tempDate.to, "LLL dd, y") : <span>To</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="single"
            selected={tempDate?.to}
            onSelect={(day) => {
              setTempDate(prev => ({ from: prev?.from, to: day }));
              setToOpen(false);
            }}
            disabled={{ before: tempDate?.from }}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>
      <Button onClick={handleApply}>Apply</Button>
    </div>
  )
}
