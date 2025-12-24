"use client"

import * as React from "react"
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  eachDayOfInterval,
  isWithinInterval,
  isBefore,
  setMonth,
  setYear,
  format,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type CalendarProps = {
  className?: string
  mode?: "single" | "range"
  selected?: Date | { from: Date | undefined; to: Date | undefined }
  onSelect?: (date: any) => void
  numberOfMonths?: number
}

function Calendar({
  className,
  mode = "single",
  selected,
  onSelect,
  numberOfMonths = 1,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    (mode === "range" && (selected as any)?.from) || (mode === "single" && selected as Date) || new Date()
  )

  const onNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const onPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]

  const currentYear = currentMonth.getFullYear()
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i)

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>, offset: number) => {
    const newMonthIndex = parseInt(e.target.value)
    const targetDate = addMonths(currentMonth, offset)
    const newDate = setMonth(targetDate, newMonthIndex)
    setCurrentMonth(subMonths(newDate, offset))
  }

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>, offset: number) => {
    const newYear = parseInt(e.target.value)
    const targetDate = addMonths(currentMonth, offset)
    const newDate = setYear(targetDate, newYear)
    setCurrentMonth(subMonths(newDate, offset))
  }

  const onSelectHandler = (day: Date) => {
    if (onSelect) {
      if (mode === "single") {
        onSelect(day)
      } else if (mode === "range") {
        const range = selected as { from?: Date; to?: Date }
        if (range?.from && !range?.to) {
          if (isBefore(day, range.from)) {
            onSelect({ from: day, to: range.from })
          } else {
            onSelect({ ...range, to: day })
          }
        } else {
          onSelect({ from: day, to: undefined })
        }
      }
    }
  }

  const renderMonth = (monthDate: Date, offset: number) => {
    const monthStart = startOfMonth(monthDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const dateFormat = "d"
    const dayList = eachDayOfInterval({ start: startDate, end: endDate })
    const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center pt-1 relative z-10">
          <div className="flex items-center gap-1">
            <select
              value={monthDate.getMonth()}
              onChange={(e) => handleMonthChange(e, offset)}
              className="h-7 bg-transparent font-semibold text-sm cursor-pointer hover:bg-muted rounded px-1 outline-none border-none focus:ring-0 appearance-none text-center"
              style={{ textAlignLast: "center" }}
            >
              {months.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={monthDate.getFullYear()}
              onChange={(e) => handleYearChange(e, offset)}
              className="h-7 bg-transparent font-semibold text-sm cursor-pointer hover:bg-muted rounded px-1 outline-none border-none focus:ring-0 appearance-none"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground font-bold mb-2">
          {weekDays.map((d) => (
            <div key={d} className="w-9">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1 gap-x-1 w-full">
          {dayList.map((dayItem, idx) => {
            const rangeSelected = selected as { from?: Date; to?: Date }
            const isSelected =
              mode === "range"
                ? (rangeSelected?.from && isSameDay(dayItem, rangeSelected.from)) ||
                  (rangeSelected?.to && isSameDay(dayItem, rangeSelected.to))
                : selected && isSameDay(dayItem as Date, selected as Date)

            const isInRange =
              mode === "range" &&
              rangeSelected?.from &&
              rangeSelected?.to &&
              isWithinInterval(dayItem, { start: rangeSelected.from, end: rangeSelected.to })

            const isOutside = !isSameMonth(dayItem, monthStart)
            const isToday = isSameDay(dayItem, new Date());

            let roundedClass = "rounded-md"
            if (isInRange) {
              roundedClass = "rounded-none"
              if (isSameDay(dayItem, rangeSelected.from!)) roundedClass = "rounded-l-md"
              if (isSameDay(dayItem, rangeSelected.to!)) roundedClass = "rounded-r-md"
            }

            return (
              <div
                key={idx}
                className={cn(
                  "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                  isOutside ? "opacity-50" : ""
                )}
              >
                <Button
                  variant="ghost"
                  onClick={() => onSelectHandler(dayItem)}
                  className={cn(
                    "h-9 w-9 p-0 font-normal",
                    isSelected ? "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary" : "",
                    isInRange && !isSelected ? "bg-accent text-accent-foreground" : "",
                    isToday && !isSelected && "border border-primary/50",
                    roundedClass
                  )}
                >
                  {format(dayItem, dateFormat)}
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("p-3 relative", className)}>
      <div className="flex items-center justify-between absolute w-full px-4 top-4 left-0 pointer-events-none">
        <Button variant="ghost" onClick={onPrevMonth} className="h-7 w-7 p-0 pointer-events-auto">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={onNextMonth} className="h-7 w-7 p-0 pointer-events-auto">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex gap-8">
        {renderMonth(currentMonth, 0)}
        {numberOfMonths > 1 && renderMonth(addMonths(currentMonth, 1), 1)}
      </div>
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
