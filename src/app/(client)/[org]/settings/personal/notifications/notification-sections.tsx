import React from "react";
import { Bell, BellRing, BellOff, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import type {
  NotificationType,
  ActiveDays,
  AllDayOption,
  Preferences,
} from "./page";

const NOTIFICATION_TYPE_OPTIONS: {
  id: NotificationType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: "all",
    label: "All",
    description: "Get notified for every new message",
    icon: Bell,
  },
  {
    id: "mentions",
    label: "Mentions",
    description: "Only when someone mentions you",
    icon: BellRing,
  },
  {
    id: "nothing",
    label: "Nothing",
    description: "Turn off all notifications",
    icon: BellOff,
  },
];

const ACTIVE_DAYS_OPTIONS: { id: ActiveDays; label: string }[] = [
  { id: "everyday", label: "Everyday" },
  { id: "weekdays", label: "Weekdays" },
  { id: "weekends", label: "Weekends" },
];

type UpdatePref = <K extends keyof Preferences>(
  key: K,
  value: Preferences[K]
) => void;

export const NotificationTypeSection = ({
  prefs,
  updatePref,
}: {
  prefs: Preferences;
  updatePref: UpdatePref;
}) => (
  <section className="rounded-xl border border-[#E6EAEF] p-5">
    <h2 className="mb-1 text-sm font-semibold">Send notifications for</h2>
    <p className="mb-4 text-xs text-[#667085]">
      Choose what types of notifications you want to receive.
    </p>
    <div className="grid gap-3 sm:grid-cols-3">
      {NOTIFICATION_TYPE_OPTIONS.map((option) => {
        const Icon = option.icon;
        const selected = prefs.notificationType === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => updatePref("notificationType", option.id)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all",
              selected
                ? "border-primary-500 bg-primary-50"
                : "border-[#E6EAEF] hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                selected
                  ? "bg-primary-500 text-white"
                  : "bg-gray-100 text-gray-500"
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium">{option.label}</span>
            <span className="text-xs text-[#667085]">{option.description}</span>
          </button>
        );
      })}
    </div>
  </section>
);

export const ScheduleSection = ({
  prefs,
  updatePref,
}: {
  prefs: Preferences;
  updatePref: UpdatePref;
}) => (
  <section className="rounded-xl border border-[#E6EAEF] p-5">
    <div className="mb-4 flex items-center gap-2">
      <Clock className="h-4 w-4 text-[#667085]" />
      <h2 className="text-sm font-semibold">Schedule & Notification Window</h2>
    </div>
    <p className="mb-4 text-xs text-[#667085]">
      Set when you want to receive notifications. Outside this window,
      notifications are paused.
    </p>
    <div className="mb-4">
      <label className="mb-1.5 block text-xs font-medium text-[#344054]">
        Time window
      </label>
      <div className="flex items-center gap-3">
        <Select
          value={prefs.allDay}
          onValueChange={(val) => {
            updatePref("allDay", val as AllDayOption);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_day">All day</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        {prefs.allDay === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="time"
              aria-label="Start time"
              value={prefs.timeFrom}
              onChange={(e) => updatePref("timeFrom", e.target.value)}
              className="rounded-md border border-[#E6EAEF] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="text-sm text-[#667085]">to</span>
            <input
              type="time"
              aria-label="End time"
              value={prefs.timeTo}
              onChange={(e) => updatePref("timeTo", e.target.value)}
              className="rounded-md border border-[#E6EAEF] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}
      </div>
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[#344054]">
        Active days
      </label>
      <div className="flex flex-wrap gap-2">
        {ACTIVE_DAYS_OPTIONS.map((option) => {
          const selected = prefs.activeDays === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => updatePref("activeDays", option.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                selected
                  ? "bg-primary-500 text-white"
                  : "border border-[#E6EAEF] text-[#344054] hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  </section>
);
