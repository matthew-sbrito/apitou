"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronDownIcon, ClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

function combineDateAndTime(date: Date, time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours || 0, minutes || 0, 0, 0);
  return combined.toISOString();
}

/** Controlled the way react-hook-form's <Controller> expects: `value` is the
 * combined ISO string (or "" when no date is picked yet), `onChange` gets
 * the new combined ISO string back. Time is a themed 24h Select pair
 * instead of the native <input type="time"> — the OS picker popup can't be
 * restyled to match the app, and its 12h/24h format isn't reliably
 * controllable across browsers. */
export function DateTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value) : undefined;
  const hour = date ? format(date, "HH") : "09";
  const minute = date ? String(Math.round(date.getMinutes() / 5) * 5).padStart(2, "0") : "00";

  function setTime(nextHour: string, nextMinute: string) {
    onChange(combineDateAndTime(date ?? new Date(), `${nextHour}:${nextMinute}`));
  }

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="flex-1 justify-between font-normal"
            />
          }
        >
          {date ? format(date, "dd/MM/yyyy") : "Escolher data"}
          <ChevronDownIcon className="h-4 w-4 opacity-60" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              if (d) onChange(combineDateAndTime(d, `${hour}:${minute}`));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-1">
        <ClockIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Select value={hour} onValueChange={(h) => h && setTime(h, minute)}>
          <SelectTrigger className="w-18">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOURS.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground">:</span>
        <Select value={minute} onValueChange={(m) => m && setTime(hour, m)}>
          <SelectTrigger className="w-18">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MINUTES.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
