/**
 * Harita bağlantısının dış hizmet sözleşmesini ve veri sınırını denetler.
 * Saf HTML üretimi kullanılır; testler Google'a bağlanmaz, konum izni istemez.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProfileLocation } from "./components/ProfileLocation";

const profile = {
  adres: " Örnek Sokak No: 7 & Kat: 2 ",
  ilce: "Kadıköy",
  sehir: "İstanbul",
  formatlar: ["Yüz yüze"],
  // Yanlışlıkla tüm profil alanları URL'ye eklenirse test bunu yakalar.
  ad: "Haritaya Gönderilmeyen Ad",
};

describe("Google Maps profil bağlantısı", () => {
  it("Türkçe adresi tek query olarak kodlar ve sekme/referrer korumalarını korur", () => {
    const html = renderToStaticMarkup(<ProfileLocation profile={profile} />);
    const url = new URL(
      html.match(/href="([^"]+)"/)![1].replaceAll("&amp;", "&"),
    );
    expect(url.origin).toBe("https://www.google.com");
    expect(url.pathname).toBe("/maps/search/");
    expect([...url.searchParams.keys()]).toEqual(["api", "query"]);
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("query")).toBe(
      "Örnek Sokak No: 7 & Kat: 2, Kadıköy, İstanbul, Türkiye",
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('referrerPolicy="no-referrer"');
    expect(html).not.toContain(profile.ad);
  });
  it("boş adresi klinik konumu olarak sunmaz, çevrim içi profile harita eklemez", () => {
    const html = renderToStaticMarkup(
      <ProfileLocation profile={{ ...profile, adres: "  " }} />,
    );
    expect(html).toContain("Bölgeyi Google Maps’te aç");
    expect(html).toContain("harita yalnızca ilçe/şehir bölgesini gösterir");
    expect(
      renderToStaticMarkup(
        <ProfileLocation profile={{ ...profile, formatlar: ["Çevrim içi"] }} />,
      ),
    ).toBe("");
  });
  it("kodlanınca sınırı aşan adresi sessizce kırpıp farklı hedef üretmez", () => {
    const html = renderToStaticMarkup(
      <ProfileLocation profile={{ ...profile, adres: "Ş".repeat(500) }} />,
    );
    expect(html).not.toContain("href=");
    expect(html).toContain("Adres bağlantı için çok uzun");
  });
});
