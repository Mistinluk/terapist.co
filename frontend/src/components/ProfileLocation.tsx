import { ExternalLink, MapPin } from "lucide-react";
import type { Profil } from "../lib/api";

/**
 * Yalnızca yayımlanmış iş adresini/bölgeyi Maps aramasına taşır.
 * Harita gömülmez; Google'a istek kullanıcı bağlantıya bastığında gider.
 * Adres doğrulanmış koordinat değildir; boşsa ofis işaretçisi vaat edilmez.
 */
export function ProfileLocation({
  profile,
}: {
  profile: Pick<Profil, "adres" | "ilce" | "sehir" | "formatlar">;
}) {
  if (!profile.formatlar.includes("Yüz yüze")) return null;
  const address = profile.adres.trim();
  const query = [address, profile.ilce.trim(), profile.sehir.trim(), "Türkiye"]
    .filter(Boolean)
    .join(", ");
  const href = `https://www.google.com/maps/search/?${new URLSearchParams({
    api: "1",
    query,
  })}`;
  // Google Maps'in URL sınırı aşılırsa adresi kırpmak yanlış yere götürebilir.
  const canLink = href.length <= 2048;
  return (
    <div className="detail-section">
      <h2>Görüşme yeri</h2>
      <p className="location">
        <MapPin size={16} aria-hidden="true" />
        {address ? `${address}, ` : ""}
        {profile.ilce}, {profile.sehir}
      </p>
      {!address && (
        <p className="muted small">
          Açık adres belirtilmemiş; harita yalnızca ilçe/şehir bölgesini
          gösterir.
        </p>
      )}
      {canLink ? (
        <a
          className="button secondary"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
        >
          {address ? "Adresi Google Maps’te aç" : "Bölgeyi Google Maps’te aç"}
          <ExternalLink size={16} aria-hidden="true" />
          <span className="sr-only"> (yeni sekme)</span>
        </a>
      ) : (
        <p className="muted small">
          Adres bağlantı için çok uzun. Yukarıdaki adresi kopyalayıp Google
          Maps’te arayabilirsiniz.
        </p>
      )}
    </div>
  );
}
