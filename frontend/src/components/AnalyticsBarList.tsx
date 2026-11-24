import { useState } from "react";
import { BarChart3, Table2 } from "lucide-react";

export type BarListItem = {
  key: string;
  label: string;
  value: number;
  secondaryValue?: string;
  sharePct?: number;
};

export function AnalyticsBarList({
  title,
  eyebrow,
  headingId,
  valueLabel,
  emptyText,
  items,
}: {
  title: string;
  eyebrow: string;
  headingId: string;
  valueLabel: string;
  emptyText: string;
  items: BarListItem[];
}) {
  const [tableView, setTableView] = useState(false);
  const maxVal = Math.max(1, ...items.map((item) => item.value));

  return (
    <section className="admin-panel-card" aria-labelledby={headingId}>
      <div className="admin-card-header">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h3 id={headingId}>{title}</h3>
        </div>
        {items.length > 0 && (
          <div
            className="analytics-view-toggle"
            role="group"
            aria-label={`${title} görünüm seçimi`}
          >
            <button
              type="button"
              className={`analytics-toggle-btn ${!tableView ? "is-active" : ""}`}
              aria-pressed={!tableView}
              onClick={() => setTableView(false)}
            >
              <BarChart3 size={15} aria-hidden="true" />
              <span>Grafik</span>
            </button>
            <button
              type="button"
              className={`analytics-toggle-btn ${tableView ? "is-active" : ""}`}
              aria-pressed={tableView}
              onClick={() => setTableView(true)}
            >
              <Table2 size={15} aria-hidden="true" />
              <span>Tablo</span>
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="muted small">{emptyText}</p>
      ) : tableView ? (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                <th>Kaynak / öğe</th>
                <th>{valueLabel}</th>
                <th>Ayrıntı</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.key}>
                  <td>
                    <strong>{item.label}</strong>
                  </td>
                  <td className="tabular-num">{item.value}</td>
                  <td className="muted tabular-num">
                    {item.secondaryValue ||
                      (item.sharePct !== undefined
                        ? `%${item.sharePct.toLocaleString("tr-TR")}`
                        : "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-bar-list">
          {items.map((item) => (
            <div className="admin-bar-row" key={item.key}>
              <div className="admin-bar-meta">
                <span>{item.label}</span>
                <strong className="tabular-num">
                  {item.value}
                  {item.sharePct !== undefined
                    ? ` · %${item.sharePct.toLocaleString("tr-TR")}`
                    : ""}
                  {item.secondaryValue ? ` (${item.secondaryValue})` : ""}
                </strong>
              </div>
              <div className="admin-bar-track" aria-hidden="true">
                <div
                  className="admin-bar-fill"
                  style={{
                    width: `${Math.max(4, Math.round((item.value / maxVal) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export type DailyTrendPoint = {
  tarih: string;
  birincil: number;
  ikincil?: number;
};

const shortDay = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Istanbul",
});

function formatDayLabel(isoDay: string): string {
  const parsed = new Date(`${isoDay}T12:00:00+03:00`);
  if (Number.isNaN(parsed.getTime())) return isoDay;
  return shortDay.format(parsed);
}

export function DailyTrendChart({
  title,
  eyebrow,
  headingId,
  primaryLabel,
  secondaryLabel,
  points,
}: {
  title: string;
  eyebrow: string;
  headingId: string;
  primaryLabel: string;
  secondaryLabel?: string;
  points: DailyTrendPoint[];
}) {
  const [tableView, setTableView] = useState(false);
  const displayPoints =
    points.length > 30 ? points.slice(points.length - 30) : points;
  const maxVal = Math.max(
    1,
    ...displayPoints.map((p) => Math.max(p.birincil, p.ikincil ?? 0)),
  );
  const totalPrimary = points.reduce((sum, p) => sum + p.birincil, 0);

  return (
    <section className="admin-panel-card" aria-labelledby={headingId}>
      <div className="admin-card-header">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h3 id={headingId}>{title}</h3>
        </div>
        <div className="analytics-trend-controls">
          <div className="analytics-legend" aria-hidden="true">
            <span className="analytics-legend-item">
              <i className="analytics-dot is-primary" />
              {primaryLabel}
            </span>
            {secondaryLabel && (
              <span className="analytics-legend-item">
                <i className="analytics-dot is-secondary" />
                {secondaryLabel}
              </span>
            )}
          </div>
          {points.length > 0 && (
            <div
              className="analytics-view-toggle"
              role="group"
              aria-label={`${title} görünüm seçimi`}
            >
              <button
                type="button"
                className={`analytics-toggle-btn ${!tableView ? "is-active" : ""}`}
                aria-pressed={!tableView}
                onClick={() => setTableView(false)}
              >
                <BarChart3 size={15} aria-hidden="true" />
                <span>Grafik</span>
              </button>
              <button
                type="button"
                className={`analytics-toggle-btn ${tableView ? "is-active" : ""}`}
                aria-pressed={tableView}
                onClick={() => setTableView(true)}
              >
                <Table2 size={15} aria-hidden="true" />
                <span>Tablo</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {totalPrimary === 0 && points.every((p) => (p.ikincil ?? 0) === 0) ? (
        <p className="muted small">
          Seçilen dönemde henüz günlük trafik ölçümü oluşmadı. Ziyaretler
          geldikçe günlük dağılım burada çizilir.
        </p>
      ) : tableView ? (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">{title} günlük tablosu</caption>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>{primaryLabel}</th>
                {secondaryLabel && <th>{secondaryLabel}</th>}
              </tr>
            </thead>
            <tbody>
              {[...displayPoints].reverse().map((p) => (
                <tr key={p.tarih}>
                  <td>{formatDayLabel(p.tarih)}</td>
                  <td className="tabular-num">{p.birincil}</td>
                  {secondaryLabel && (
                    <td className="tabular-num">{p.ikincil ?? 0}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="analytics-trend-wrap"
          role="img"
          aria-label={`${title}: son ${displayPoints.length} günlük dağılım`}
        >
          <div className="analytics-trend-bars">
            {displayPoints.map((point, index) => {
              const primaryH = point.birincil
                ? Math.max(8, Math.round((point.birincil / maxVal) * 100))
                : 3;
              const secondaryH =
                point.ikincil && secondaryLabel
                  ? Math.max(8, Math.round((point.ikincil / maxVal) * 100))
                  : 0;
              const showTick =
                index === 0 ||
                index === displayPoints.length - 1 ||
                index % Math.max(1, Math.floor(displayPoints.length / 5)) === 0;
              return (
                <div
                  className="analytics-trend-col"
                  key={point.tarih}
                  title={`${formatDayLabel(point.tarih)}: ${primaryLabel} ${point.birincil}${secondaryLabel ? `, ${secondaryLabel} ${point.ikincil ?? 0}` : ""}`}
                >
                  <div className="analytics-trend-pair">
                    <span
                      className={`analytics-trend-bar is-primary ${point.birincil === 0 ? "is-empty" : ""}`}
                      style={{ height: `${primaryH}%` }}
                    />
                    {secondaryLabel && (
                      <span
                        className={`analytics-trend-bar is-secondary ${(point.ikincil ?? 0) === 0 ? "is-empty" : ""}`}
                        style={{ height: `${secondaryH || 3}%` }}
                      />
                    )}
                  </div>
                  <span className="analytics-trend-tick">
                    {showTick ? formatDayLabel(point.tarih) : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
