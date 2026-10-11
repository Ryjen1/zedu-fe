"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, BellRing, BellOff, Clock, Check, RotateCcw } from "lucide-react";
import SettingsLabel from "../../components/settings-label";
import { GetRequest, PostRequest } from "~/utils/new-request";
import Loading from "~/components/ui/loading";
import { Switch } from "~/components/ui/switch";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { showSuccess, showError } from "~/components/toast/sonner";

type NotificationType = "all" | "mentions" | "nothing";
type ActiveDays = "everyday" | "weekdays" | "weekends";
type AllDayOption = "all_day" | "custom";

type Preferences = {
  notificationType: NotificationType;
  timeFrom: string;
  timeTo: string;
  allDay: AllDayOption;
  activeDays: ActiveDays;
  mobileNotifications: boolean;
  emailNotifications: boolean;
  directMentionEmail: boolean;
};

const DEFAULT_PREFERENCES: Preferences = {
  notificationType: "all",
  timeFrom: "09:00",
  timeTo: "17:00",
  allDay: "all_day",
  activeDays: "everyday",
  mobileNotifications: true,
  emailNotifications: true,
  directMentionEmail: false,
};

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

const ACTIVE_DAYS_OPTIONS: {
  id: ActiveDays;
  label: string;
}[] = [
  { id: "everyday", label: "Everyday" },
  { id: "weekdays", label: "Weekdays" },
  { id: "weekends", label: "Weekends" },
];

function getNotifyType(notifyAbout: string): NotificationType {
  if (notifyAbout === "all_new_messages") return "all";
  if (notifyAbout === "mentions") return "mentions";
  return "nothing";
}

function convertTo24Hour(time: string) {
  const parts = time.trim().split(" ");
  if (parts.length < 2) return time;
  const [t, suffix] = parts;
  let [h, m] = t.split(":").map(Number);
  if (suffix === "PM" && h !== 12) h += 12;
  if (suffix === "AM" && h === 12) h = 0;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function convertTo12Hour(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${formattedHour.toString().padStart(2, "0")}:${m} ${suffix}`;
}

const NotificationPage = () => {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [savedPrefs, setSavedPrefs] =
    useState<Preferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "unsaved"
  >("idle");

  const hasChanges = useMemo(
    () => JSON.stringify(prefs) !== JSON.stringify(savedPrefs),
    [prefs, savedPrefs]
  );

  useEffect(() => {
    if (hasChanges) {
      setSaveStatus("unsaved");
    }
  }, [hasChanges]);

  const fetchPreferences = useCallback(async () => {
    const orgId = localStorage.getItem("orgId") || "";
    setLoading(true);
    try {
      const res = await GetRequest(
        `/organisations/${orgId}/notification-preference?device_type=web`
      );
      if (res.status === 200 || res.status === 201) {
        const data = res.data.data;
        const [from, to] = data.time_range.split(" - ").map(convertTo24Hour);
        const parsed: Preferences = {
          notificationType: getNotifyType(data.notify_about),
          timeFrom: from || "09:00",
          timeTo: to || "17:00",
          allDay:
            data.all_day === false || data.time_range ? "custom" : "all_day",
          activeDays: (data.active_days as ActiveDays) ?? "everyday",
          mobileNotifications: !data.send_mail,
          emailNotifications: Boolean(data.send_mail),
          directMentionEmail: Boolean(data.direct_mention_email),
        };
        setPrefs(parsed);
        setSavedPrefs(parsed);
      }
    } catch {
      showError("Failed to load notification preferences");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const handleSave = async () => {
    const orgId = localStorage.getItem("orgId") || "";
    setSaving(true);
    setSaveStatus("saving");

    const payload = {
      notify_about:
        prefs.notificationType === "all"
          ? "all_new_messages"
          : prefs.notificationType === "mentions"
            ? "mentions"
            : "nothing",
      send_mail: prefs.emailNotifications,
      time_range: `${convertTo12Hour(prefs.timeFrom)} - ${convertTo12Hour(prefs.timeTo)}`,
      device_type: "web",
      all_day: prefs.allDay === "all_day",
      active_days: prefs.activeDays,
      direct_mention_email: prefs.directMentionEmail,
    };

    try {
      const res = await PostRequest(
        `/organisations/${orgId}/notification-preference?device_type=web`,
        payload
      );
      if (res.status === 200 || res.status === 201) {
        setSavedPrefs(prefs);
        setSaveStatus("saved");
        showSuccess("Preferences saved");
      }
    } catch {
      setSaveStatus("unsaved");
      showError("Failed to save preferences");
    }
    setSaving(false);
  };

  const handleRestoreDefaults = () => {
    setPrefs(DEFAULT_PREFERENCES);
  };

  const updatePref = <K extends keyof Preferences>(
    key: K,
    value: Preferences[K]
  ) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center p-6">
        <Loading />
      </div>
    );
  }

  return (
    <div>
      <SettingsLabel />
      <div className="mx-auto max-w-2xl p-4 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">
              Your Notification Preferences
            </h1>
            <p className="text-sm text-[#667085]">
              Manage when and why you get notified.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {saveStatus === "saving" ? (
              <span className="flex items-center gap-1 text-[#667085]">
                <Loading width="14" height="14" />
                Saving…
              </span>
            ) : saveStatus === "saved" && !hasChanges ? (
              <span className="flex items-center gap-1 text-green-600">
                <Check className="h-3.5 w-3.5" />
                All changes saved
              </span>
            ) : hasChanges ? (
              <span className="flex items-center gap-1 text-amber-600">
                Unsaved changes
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-[#E6EAEF] p-5">
            <h2 className="mb-1 text-sm font-semibold">
              Send notifications for
            </h2>
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
                    <span className="text-xs text-[#667085]">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-[#E6EAEF] p-5">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#667085]" />
              <h2 className="text-sm font-semibold">
                Schedule & Notification Window
              </h2>
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
                    if (val === "all_day") {
                      updatePref("timeFrom", "00:00");
                      updatePref("timeTo", "23:59");
                    }
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
                      value={prefs.timeFrom}
                      onChange={(e) => updatePref("timeFrom", e.target.value)}
                      className="rounded-md border border-[#E6EAEF] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="text-sm text-[#667085]">to</span>
                    <input
                      type="time"
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

          <section className="rounded-xl border border-[#E6EAEF] p-5">
            <h2 className="mb-1 text-sm font-semibold">Delivery channels</h2>
            <p className="mb-4 text-xs text-[#667085]">
              Choose how you want to be notified.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Mobile notifications</p>
                  <p className="text-xs text-[#667085]">
                    Receive push notifications on your mobile device
                  </p>
                </div>
                <Switch
                  checked={prefs.mobileNotifications}
                  onCheckedChange={(checked) =>
                    updatePref("mobileNotifications", checked)
                  }
                />
              </div>

              <hr className="border-[#E6EAEF]" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Email notifications</p>
                  <p className="text-xs text-[#667085]">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  checked={prefs.emailNotifications}
                  onCheckedChange={(checked) =>
                    updatePref("emailNotifications", checked)
                  }
                />
              </div>

              {prefs.emailNotifications && (
                <div className="flex items-center gap-2 pl-6">
                  <Checkbox
                    id="direct-mention-email"
                    checked={prefs.directMentionEmail}
                    onCheckedChange={(checked) =>
                      updatePref("directMentionEmail", checked === true)
                    }
                  />
                  <label
                    htmlFor="direct-mention-email"
                    className="cursor-pointer text-sm text-[#344054]"
                  >
                    Only send email for direct mentions
                  </label>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-[#E6EAEF] pt-4">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="flex items-center gap-1.5 text-sm text-[#667085] transition-colors hover:text-primary-500"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore defaults
          </button>

          <div className="flex gap-3">
            {hasChanges && (
              <button
                type="button"
                onClick={() => setPrefs(savedPrefs)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={cn(
                "rounded-md px-5 py-2 text-sm font-medium text-white transition-colors",
                hasChanges && !saving
                  ? "bg-primary-500 hover:bg-primary-400"
                  : "cursor-not-allowed bg-gray-300"
              )}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loading width="16" height="16" />
                  Saving…
                </span>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPage;
