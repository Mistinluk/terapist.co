import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BellPlus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
} from "lucide-react";
import { Link } from "react-router-dom";

type CalendarView = "week" | "month";
type CalendarStage = "date" | "time" | "details";

const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date) {
  const day = date.getDay() || 7;
  return addDays(date, 1 - day);
}

function monthCells(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

const fullDate = new Intl.DateTimeFormat("tr-TR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Istanbul",
});

const monthTitle = new Intl.DateTimeFormat("tr-TR", {
  month: "long",
  year: "numeric",
});

const timeOnly = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

export function AppointmentCalendar({
  slots,
  chosen,
  onChoose,
  onSubmit,
  busy,
  error,
  legalText,
  legalReady,
  waitlistOpen = true,
  onOpenWaitlist,
}: {
  slots: string[];
  chosen: string;
  onChoose: (slot: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  busy: boolean;
  error: string;
  legalText?: string;
  legalReady: boolean;
  waitlistOpen?: boolean;
  onOpenWaitlist?: () => void;
}) {
  const [view, setView] = useState<CalendarView>("week");
  const [stage, setStage] = useState<CalendarStage>("date");
  const [selectedDate, setSelectedDate] = useState("");
  const [cursor, setCursor] = useState(() => new Date());

  const availableDates = useMemo(
    () => new Set(slots.map((slot) => slot.slice(0, 10))),
    [slots],
  );
  const firstAvailableDate = slots[0]?.slice(0, 10);

  useEffect(() => {
    if (firstAvailableDate && !selectedDate) {
      setCursor(fromIsoDate(firstAvailableDate));
    }
  }, [firstAvailableDate, selectedDate]);

  useEffect(() => {
    if (!chosen && stage === "details") setStage("date");
  }, [chosen, stage]);

  const visibleDays =
    view === "week"
      ? Array.from({ length: 7 }, (_, index) =>
          addDays(startOfWeek(cursor), index),
        )
      : monthCells(cursor);
  const selectedSlots = selectedDate
    ? slots.filter((slot) => slot.startsWith(selectedDate))
    : [];
  const title =
    view === "week"
      ? `${visibleDays[0].toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "short",
        })} – ${visibleDays[6].toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`
      : monthTitle.format(cursor);

  function selectDate(date: Date) {
    const value = isoDate(date);
    if (!availableDates.has(value)) return;
    setSelectedDate(value);
    onChoose("");
    setStage("time");
  }

  function selectTime(slot: string) {
    onChoose(slot);
    setStage("details");
  }

  function goBack() {
    if (stage === "details") {
      onChoose("");
      setStage("time");
      return;
    }
    setStage("date");
  }

  return (
    <form className="appointment-calendar" onSubmit={onSubmit}>
      <div
        className="appointment-progress"
        aria-label="Randevu talebi adımları"
      >
        <span className={stage === "date" ? "is-current" : "is-complete"}>
          1. Gün
        </span>
        <span
          className={
            stage === "time"
              ? "is-current"
              : stage === "details"
                ? "is-complete"
                : ""
          }
        >
          2. Saat
        </span>
        <span className={stage === "details" ? "is-current" : ""}>
          3. Bilgiler
        </span>
      </div>

      <div className="appointment-calendar-body">
        {stage === "date" && (
          <>
            <div className="calendar-toolbar">
              <div
                className="calendar-view-switch"
                aria-label="Takvim görünümü"
              >
                <button
                  type="button"
                  className={view === "week" ? "is-active" : ""}
                  aria-pressed={view === "week"}
                  onClick={() => setView("week")}
                >
                  Haftalık
                </button>
                <button
                  type="button"
                  className={view === "month" ? "is-active" : ""}
                  aria-pressed={view === "month"}
                  onClick={() => setView("month")}
                >
                  Aylık
                </button>
              </div>
              <div className="calendar-navigation">
                <button
                  type="button"
                  aria-label={view === "week" ? "Önceki hafta" : "Önceki ay"}
                  onClick={() =>
                    setCursor((current) =>
                      view === "week"
                        ? addDays(current, -7)
                        : new Date(
                            current.getFullYear(),
                            current.getMonth() - 1,
                            1,
                            12,
                          ),
                    )
                  }
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={view === "week" ? "Sonraki hafta" : "Sonraki ay"}
                  onClick={() =>
                    setCursor((current) =>
                      view === "week"
                        ? addDays(current, 7)
                        : new Date(
                            current.getFullYear(),
                            current.getMonth() + 1,
                            1,
                            12,
                          ),
                    )
                  }
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
            <p className="calendar-period" aria-live="polite">
              {title}
            </p>
            <div
              className={`calendar-grid calendar-grid-${view}`}
              aria-label={`${title} uygun günler`}
            >
              {view === "month" &&
                dayNames.map((day) => (
                  <span className="calendar-weekday" key={day}>
                    {day}
                  </span>
                ))}
              {visibleDays.map((date) => {
                const value = isoDate(date);
                const available = availableDates.has(value);
                const outsideMonth =
                  view === "month" && date.getMonth() !== cursor.getMonth();
                return (
                  <button
                    type="button"
                    className={available ? "is-available" : ""}
                    key={value}
                    disabled={!available}
                    aria-label={`${fullDate.format(date)}${
                      available ? ", uygun saat var" : ", uygun saat yok"
                    }`}
                    onClick={() => selectDate(date)}
                  >
                    {view === "week" && (
                      <span>{dayNames[(date.getDay() + 6) % 7]}</span>
                    )}
                    <strong className={outsideMonth ? "is-outside" : ""}>
                      {date.getDate()}
                    </strong>
                    {available && <i aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            {slots.length === 0 && (
              <div className="calendar-empty">
                <CalendarDays size={22} aria-hidden="true" />
                <p>Önümüzdeki 15 gün için uygun saat bulunmuyor.</p>
                {waitlistOpen && onOpenWaitlist && (
                  <button
                    type="button"
                    className="button waitlist-cta-btn"
                    onClick={onOpenWaitlist}
                  >
                    <BellPlus size={16} aria-hidden="true" />
                    <span>Bekleme listesine katıl</span>
                  </button>
                )}
              </div>
            )}
            {slots.length > 0 && (
              <>
                <p className="calendar-help">İşaretli bir gün seçin.</p>
                {waitlistOpen && onOpenWaitlist && (
                  <button
                    type="button"
                    className="waitlist-subtle-link"
                    onClick={onOpenWaitlist}
                  >
                    <BellPlus size={14} aria-hidden="true" />
                    <span>
                      Size uygun saat yok mu? Bekleme listesine kaydolun
                    </span>
                  </button>
                )}
              </>
            )}
          </>
        )}

        {stage === "time" && (
          <>
            <button className="calendar-back" type="button" onClick={goBack}>
              <ChevronLeft size={18} aria-hidden="true" /> Takvime dön
            </button>
            <div className="calendar-stage-heading">
              <Clock3 size={22} aria-hidden="true" />
              <div>
                <h3>Uygun bir saat seçin</h3>
                <p>{fullDate.format(fromIsoDate(selectedDate))}</p>
              </div>
            </div>
            <div
              className="calendar-time-grid"
              role="group"
              aria-label="Uygun saatler"
            >
              {selectedSlots.map((slot) => (
                <button
                  type="button"
                  key={slot}
                  onClick={() => selectTime(slot)}
                >
                  {timeOnly.format(new Date(slot))}
                </button>
              ))}
            </div>
          </>
        )}

        {stage === "details" && chosen && (
          <>
            <button className="calendar-back" type="button" onClick={goBack}>
              <ChevronLeft size={18} aria-hidden="true" /> Saati değiştir
            </button>
            <div className="calendar-selection-summary">
              <CalendarDays size={20} aria-hidden="true" />
              <div>
                <strong>{fullDate.format(new Date(chosen))}</strong>
                <span>{timeOnly.format(new Date(chosen))} · Türkiye saati</span>
              </div>
            </div>
            <label className="field">
              Adınız ve soyadınız
              <input
                name="ad"
                autoComplete="name"
                minLength={3}
                maxLength={150}
                required
              />
            </label>
            <label className="field">
              Telefon numaranız
              <input
                name="telefon"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="05XX XXX XX XX"
                pattern="\+?[0-9 \(\)\-]{10,20}"
                maxLength={20}
                required
              />
            </label>
            <details className="legal-details">
              <summary>Kişisel verilerin işlenmesi hakkında</summary>
              <p>{legalText || "Metin yükleniyor…"}</p>
              <Link to="/aydinlatma">Metnin tamamı</Link>
            </details>
            <label className="consent">
              <input type="checkbox" name="okundu" required /> Aydınlatma
              metnini okudum.
            </label>
            <p className="muted small">
              Bu formda tanı, terapi notu veya başka sağlık bilgisi istenmez.
            </p>
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button full-width"
              type="submit"
              disabled={busy || !legalReady}
            >
              {busy ? "Gönderiliyor…" : "Randevu talebi gönder"}
            </button>
          </>
        )}
      </div>
    </form>
  );
}
