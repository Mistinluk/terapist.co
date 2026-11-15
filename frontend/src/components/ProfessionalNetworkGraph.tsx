import { Link } from "react-router-dom";
import type { ProfesyonelBaglanti } from "../lib/api";

export const MAX_GRAPH_CONNECTIONS = 8;
const MAX_MOBILE_CONNECTIONS = 20;
const WIDTH = 820;
const HEIGHT = 520;
const CENTER_X = WIDTH / 2;
const CENTER_Y = 236;

type Props = {
  therapist: { id: string; ad: string };
  connections: ProfesyonelBaglanti[];
  total: number;
};

function initials(name: string) {
  return name
    .replace(/Dr\.|Uzm\.|Psk\.|Kln\./g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
}

function labelLines(value: string, maxLength = 18) {
  const words = value.trim().split(/\s+/);
  const lines = [""];

  for (const word of words) {
    const current = lines[lines.length - 1];
    if (`${current} ${word}`.trim().length <= maxLength) {
      lines[lines.length - 1] = `${current} ${word}`.trim();
    } else if (lines.length === 1) {
      lines.push(word);
    } else {
      lines[1] = `${lines[1]} ${word}`;
    }
  }

  return lines.slice(0, 2).map((line, index) => {
    if (index === 1 && line.length > maxLength) {
      return `${line.slice(0, maxLength - 1).trim()}…`;
    }
    return line;
  });
}

function ConnectionList({
  connections,
}: {
  connections: ProfesyonelBaglanti[];
}) {
  return (
    <div className="network-list">
      {connections.map((connection) => (
        <article className="network-row" key={connection.id}>
          <div>
            <h3>
              <Link to={`/uzman/${connection.terapist.id}`}>
                {connection.terapist.ad}
              </Link>
            </h3>
            <p>{connection.iliski_adi}</p>
          </div>
          <Link className="text-button" to={`/uzman/${connection.terapist.id}`}>
            Profili gör
          </Link>
        </article>
      ))}
    </div>
  );
}

export function ProfessionalNetworkGraph({
  therapist,
  connections,
  total,
}: Props) {
  const sortedConnections = [...connections].sort((left, right) =>
    left.terapist.ad.localeCompare(right.terapist.ad, "tr"),
  );
  const graphConnections = sortedConnections.slice(0, MAX_GRAPH_CONNECTIONS);
  const graphRemainder = sortedConnections.slice(MAX_GRAPH_CONNECTIONS);
  const mobileConnections = sortedConnections.slice(0, MAX_MOBILE_CONNECTIONS);
  const mobileRemainder = sortedConnections.slice(MAX_MOBILE_CONNECTIONS);
  const currentNameLines = labelLines(therapist.ad, 20);

  return (
    <div className="network-visualization">
      <figure className="network-graph-desktop">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-labelledby="network-graph-title network-graph-description"
        >
          <title id="network-graph-title">
            {`${therapist.ad} mesleki ağı`}
          </title>
          <desc id="network-graph-description">
            Merkezde {therapist.ad}, çevresinde {graphConnections.length}{" "}
            mesleki bağlantısı ve aralarındaki ilişki türleri gösteriliyor.
          </desc>

          {graphConnections.map((connection, index) => {
            const angle =
              -Math.PI / 2 + (index * Math.PI * 2) / graphConnections.length;
            const x = CENTER_X + Math.cos(angle) * 300;
            const y = CENTER_Y + Math.sin(angle) * 166;
            const labelX = CENTER_X + (x - CENTER_X) * 0.57;
            const labelY = CENTER_Y + (y - CENTER_Y) * 0.57;
            const relationshipLines = labelLines(connection.iliski_adi, 16);
            const nameLines = labelLines(connection.terapist.ad, 17);

            return (
              <g key={connection.id}>
                <line
                  className="network-edge"
                  x1={CENTER_X}
                  y1={CENTER_Y}
                  x2={x}
                  y2={y}
                />
                <g
                  className="network-edge-label"
                  transform={`translate(${labelX} ${labelY})`}
                >
                  <title>{connection.iliski_adi}</title>
                  <rect
                    x="-67"
                    y={relationshipLines.length > 1 ? -20 : -12}
                    width="134"
                    height={relationshipLines.length > 1 ? 40 : 24}
                    rx="4"
                  />
                  <text textAnchor="middle">
                    {relationshipLines.map((line, lineIndex) => (
                      <tspan
                        x="0"
                        dy={
                          lineIndex === 0
                            ? relationshipLines.length > 1
                              ? -3
                              : 4
                            : 14
                        }
                        key={line}
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
                <a
                  className="network-node-link"
                  href={`/uzman/${connection.terapist.id}`}
                  aria-label={`${connection.terapist.ad} profilini gör, ${connection.iliski_adi}`}
                  tabIndex={0}
                >
                  <circle className="network-node" cx={x} cy={y} r="35" />
                  <text className="network-node-initials" x={x} y={y + 6}>
                    {initials(connection.terapist.ad)}
                  </text>
                  <text className="network-node-name" x={x} y={y + 51}>
                    {nameLines.map((line, lineIndex) => (
                      <tspan x={x} dy={lineIndex === 0 ? 0 : 16} key={line}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </a>
              </g>
            );
          })}

          <circle
            className="network-node network-node-current"
            cx={CENTER_X}
            cy={CENTER_Y}
            r="61"
          />
          <text
            className="network-node-current-label"
            x={CENTER_X}
            y={CENTER_Y - 20}
          >
            Görüntülenen profil
          </text>
          <text
            className="network-node-name network-node-current-name"
            x={CENTER_X}
            y={CENTER_Y + 2}
          >
            {currentNameLines.map((line, lineIndex) => (
              <tspan x={CENTER_X} dy={lineIndex === 0 ? 0 : 16} key={line}>
                {line}
              </tspan>
            ))}
          </text>
        </svg>
        <figcaption>
          {graphConnections.length} / {total} bağlantı gösteriliyor
        </figcaption>
      </figure>

      {graphRemainder.length > 0 && (
        <details className="network-graph-remainder">
          <summary>Kalan {graphRemainder.length} bağlantıyı listele</summary>
          <ConnectionList connections={graphRemainder} />
        </details>
      )}

      <div className="network-mobile-list">
        <ConnectionList connections={mobileConnections} />
        {mobileRemainder.length > 0 && (
          <details className="network-mobile-remainder">
            <summary>Kalan {mobileRemainder.length} bağlantıyı listele</summary>
            <ConnectionList connections={mobileRemainder} />
          </details>
        )}
      </div>
    </div>
  );
}
