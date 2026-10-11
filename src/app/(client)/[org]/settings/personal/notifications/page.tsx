"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import SettingsLabel from "../../components/settings-label";
import { GetRequest, PostRequest } from "~/utils/new-request";
import Loading from "~/components/ui/loading";
import { Switch } from "~/components/ui/switch";
import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/utils";
import { showSuccess, showError } from "~/components/toast/sonner";
import {
  NotificationTypeSection,
  ScheduleSection,
} from "./notification-sections";

export type NotificationType = "all" | "mentions" | "nothing";
export type ActiveDays = "everyday" | "weekdays" | "weekends";
export type AllDayOption = "all_day" | "custom";

export type Preferences = {
  notificationType: NotificationType;
  timeFrom: string;
  timeTo: string;
  allDay: AllDayOption;
  activeDays: ActiveDays;
  emailNotifications: boolean;
  directMentionEmail: boolean;
};

const DEFAULT_PREFERENCES: Preferences = {
  notificationType: "all",
  timeFrom: "09:00",
  timeTo: "17:00",
  allDay: "all_day",
  activeDays: "everyday",
  emailNotifications: true,
  directMentionEmail: false,
};

const getNotifyType = (notifyAbout: string): NotificationType =>
  notifyAbout === "all_new_messages"
    ? "all"
    : notifyAbout === "mentions"
      ? "mentions"
      : "nothing";

const convertTo24Hour = (time: string) => {
  const parts = time.trim().split(" ");
  if (parts.length < 2) return time;
  const [t, suffix] = parts;
  let [h, m] = t.split(":").map(Number);
  if (suffix === "PM" && h !== 12) h += 12;
  if (suffix === "AM" && h === 12) h = 0;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
};

const convertTo12Hour = (time: string) => {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${(hour % 12 === 0 ? 12 : hour % 12).toString().padStart(2, "0")}:${m} ${suffix}`;
};

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
    if (hasChanges) setSaveStatus("unsaved");
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
          allDay: data.all_day === false ? "custom" : "all_day",
          activeDays: (data.active_days as ActiveDays) ?? "everyday",
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
      } else {
        setSaveStatus("unsaved");
      }
    } catch {
      setSaveStatus("unsaved");
      showError("Failed to save preferences");
    }
    setSaving(false);
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
          <NotificationTypeSection prefs={prefs} updatePref={updatePref} />
          <ScheduleSection prefs={prefs} updatePref={updatePref} />

          <section className="rounded-xl border border-[#E6EAEF] p-5">
            <h2 className="mb-1 text-sm font-semibold">Delivery channels</h2>
            <p className="mb-4 text-xs text-[#667085]">
              Choose how you want to be notified.
            </p>
            <div className="space-y-4">
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
            onClick={() => setPrefs(DEFAULT_PREFERENCES)}
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
