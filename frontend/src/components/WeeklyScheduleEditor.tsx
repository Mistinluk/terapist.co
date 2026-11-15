import { useState } from "react";
import { CalendarCheck2, Clock3, Copy, RotateCcw } from "lucide-react";
import type { CalismaSaati } from "../lib/api";

export const DAYS = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];

type DayState = {
  acik: boolean;
  baslangic: number;
  bitis: number;
};

type PresetKey = "weekday_9_17" | "weekday_10_18" | "mon_sat_10_17" | "clear";

function padHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function buildInitialSchedule(
  initialHours?: CalismaSaati[],
): DayState[] {
  return DAYS.map((_, index) => {
    const found = initialHours?.find((item) => item.gun === index);
    return found
      ? { acik: true, baslangic: found.baslangic, bitis: found.bitis }
      : { acik: false, baslangic: 9, bitis: 17 };
  });
}

export function WeeklyScheduleEditor({
  initialHours,
}: {
  initialHours?: CalismaSaati[];
}) {
  const [schedule, setSchedule] = useState<DayState[]>(() =>
    buildInitialSchedule(initialHours),
  );

  const openDays = schedule.filter((day) => day.acik);
  const totalHours = openDays.reduce(
    (sum, day) => sum + Math.max(0, day.bitis - day.baslangic),
    0,
  );

  function toggleDay(index: number) {
    setSchedule((prev) =>
      prev.map((day, i) => (i === index ? { ...day, acik: !day.acik } : day)),
    );
  }

  function updateStart(index: number, baslangic: number) {
    setSchedule((prev) =>
      prev.map((day, i) => {
        if (i !== index) return day;
        return {
          ...day,
          baslangic,
          bitis:
            day.bitis <= baslangic ? Math.min(24, baslangic + 1) : day.bitis,
        };
      }),
    );
  }

  function updateEnd(index: number, bitis: number) {
    setSchedule((prev) =>
      prev.map((day, i) => (i === index ? { ...day, bitis } : day)),
    );
  }

  function applyPreset(preset: PresetKey) {
    setSchedule((prev) =>
      prev.map((day, index) => {
        if (preset === "clear") {
          return { ...day, acik: false };
        }
        if (preset === "weekday_9_17") {
          return index < 5
            ? { acik: true, baslangic: 9, bitis: 17 }
            : { ...day, acik: false };
        }
        if (preset === "weekday_10_18") {
          return index < 5
            ? { acik: true, baslangic: 10, bitis: 18 }
            : { ...day, acik: false };
        }
        return index < 6
          ? { acik: true, baslangic: 10, bitis: 17 }
          : { ...day, acik: false };
      }),
    );
  }

  function applyToWeekdays(sourceIndex: number) {
    const source = schedule[sourceIndex];
    if (!source) return;
    setSchedule((prev) =>
      prev.map((day, index) =>
        index < 5
          ? {
              acik: true,
              baslangic: source.baslangic,
              bitis: source.bitis,
            }
          : day,
      ),
    );
  }

  return (
    <div className="schedule-editor">
      <div className="schedule-summary-bar">
        <div className="schedule-summary-pill">
          <Clock3 size={15} aria-hidden="true" />
          <span>
            {openDays.length > 0
              ? `Haftada ${openDays.length} gün · toplam ${totalHours} saat açık`
              : "Henüz açık gün seçilmedi"}
          </span>
        </div>

        <div
          className="schedule-presets"
          role="group"
          aria-label="Hızlı çalışma saati şablonları"
        >
          <span className="schedule-presets-label">
            <CalendarCheck2 size={14} aria-hidden="true" /> Hızlı şablon:
          </span>
          <button
            type="button"
            className="schedule-preset-btn"
            onClick={() => applyPreset("weekday_9_17")}
          >
            Hafta içi 09:00–17:00
          </button>
          <button
            type="button"
            className="schedule-preset-btn"
            onClick={() => applyPreset("weekday_10_18")}
          >
            Hafta içi 10:00–18:00
          </button>
          <button
            type="button"
            className="schedule-preset-btn"
            onClick={() => applyPreset("mon_sat_10_17")}
          >
            Pzt–Cmt 10:00–17:00
          </button>
          <button
            type="button"
            className="schedule-preset-btn is-muted"
            disabled={openDays.length === 0}
            onClick={() => applyPreset("clear")}
          >
            <RotateCcw size={13} aria-hidden="true" /> Temizle
          </button>
        </div>
      </div>

      <div className="schedule-days" role="group" aria-label="Haftalık günler">
        {DAYS.map((dayName, index) => {
          const day = schedule[index];
          const duration = day.bitis - day.baslangic;
          return (
            <div
              className={`schedule-day ${day.acik ? "is-open" : "is-closed"}`}
              key={dayName}
            >
              <label className="schedule-day-toggle">
                <input
                  type="checkbox"
                  className="schedule-switch-input"
                  name={`gun_${index}`}
                  checked={day.acik}
                  onChange={() => toggleDay(index)}
                />
                <span className="schedule-switch" aria-hidden="true" />
                <span className="schedule-day-copy">
                  <strong>{dayName}</strong>
                  <small>
                    {day.acik
                      ? `${padHour(day.baslangic)} – ${padHour(day.bitis)} · ${duration} saat`
                      : "Kapalı"}
                  </small>
                </span>
              </label>

              {day.acik ? (
                <div className="schedule-day-controls">
                  <div className="schedule-time-range">
                    <label>
                      <span className="sr-only">{dayName} başlangıç</span>
                      <select
                        name={`bas_${index}`}
                        value={day.baslangic}
                        onChange={(e) =>
                          updateStart(index, Number(e.target.value))
                        }
                      >
                        {Array.from({ length: 24 }, (_, hour) => (
                          <option key={hour} value={hour}>
                            {padHour(hour)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span className="schedule-sep" aria-hidden="true">
                      –
                    </span>
                    <label>
                      <span className="sr-only">{dayName} bitiş</span>
                      <select
                        name={`bit_${index}`}
                        value={day.bitis}
                        onChange={(e) =>
                          updateEnd(index, Number(e.target.value))
                        }
                      >
                        {Array.from(
                          { length: 24 - day.baslangic },
                          (_, offset) => {
                            const hour = day.baslangic + 1 + offset;
                            return (
                              <option key={hour} value={hour}>
                                {padHour(hour)}
                              </option>
                            );
                          },
                        )}
                      </select>
                    </label>
                  </div>
                  <button
                    type="button"
                    className="schedule-copy-btn"
                    onClick={() => applyToWeekdays(index)}
                    aria-label={`${dayName} saatlerini hafta içine uygula`}
                    title="Bu saat aralığını Pazartesi–Cuma günlerine uygula"
                  >
                    <Copy size={13} aria-hidden="true" />
                    <span>Hafta içine uygula</span>
                  </button>
                </div>
              ) : (
                <span className="schedule-closed-pill">Randevuya kapalı</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
