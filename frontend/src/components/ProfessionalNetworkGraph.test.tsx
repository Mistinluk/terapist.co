import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { ProfesyonelBaglanti } from "../lib/api";
import {
  MAX_GRAPH_CONNECTIONS,
  ProfessionalNetworkGraph,
} from "./ProfessionalNetworkGraph";

function connection(index: number): ProfesyonelBaglanti {
  return {
    id: `connection-${index}`,
    terapist: { id: `therapist-${index}`, ad: `Terapist ${index}` },
    iliski_turu: "worked_together",
    iliski_adi: "Birlikte çalıştık",
    durum: "accepted",
    yon: "outgoing",
    istek_zamani: index,
    yanit_zamani: index,
  };
}

describe("ProfessionalNetworkGraph", () => {
  it("merkez terapisti, ilişki türlerini ve profil bağlantılarını sunar", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ProfessionalNetworkGraph
          therapist={{ id: "current", ad: "Dr. Merkez Terapist" }}
          connections={[connection(1), connection(2)]}
          total={2}
        />
      </MemoryRouter>,
    );

    expect(html).toContain("Dr. Merkez Terapist mesleki ağı");
    expect(html).toContain("Birlikte çalıştık");
    expect(html).toContain('href="/uzman/therapist-1"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("2 / 2 bağlantı gösteriliyor");
  });

  it("ilk grafiği sekiz düğümle sınırlar ve kalan bağlantıları listeler", () => {
    const connections = Array.from({ length: 10 }, (_, index) =>
      connection(index + 1),
    );
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ProfessionalNetworkGraph
          therapist={{ id: "current", ad: "Merkez Terapist" }}
          connections={connections}
          total={connections.length}
        />
      </MemoryRouter>,
    );

    expect(html).toContain(
      `${MAX_GRAPH_CONNECTIONS} / 10 bağlantı gösteriliyor`,
    );
    expect(html).toContain("Kalan 2 bağlantıyı listele");
    expect(html.match(/class="network-node-link"/g)).toHaveLength(
      MAX_GRAPH_CONNECTIONS,
    );
  });
});
