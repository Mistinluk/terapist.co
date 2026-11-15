import { Aydinlatma } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Status } from "../components/Status";
import { usePageMetadata } from "../lib/seoMetadata";

export function Privacy() {
  usePageMetadata({
    title: "KVKK ve Aydınlatma Metni | terapist.co",
    description:
      "terapist.co kişisel verilerin korunması, veri minimizasyonu, çerez politikası ve danışan gizliliği ilkeleri hakkında aydınlatma metni.",
    path: "/aydinlatma",
  });
  const { data, loading, error, reload } = useApi<Aydinlatma>("/aydinlatma");
  return (
    <section className="narrow-page">
      <div className="page-heading">
        <span className="eyebrow">KİŞİSEL VERİLERİN KORUNMASI</span>
        <h1>Bilgileriniz hakkında.</h1>
      </div>
      <Status loading={loading} error={error} retry={reload} />
      {data && (
        <article className="form-section">
          <h2>Aydınlatma metni</h2>
          {data.gelistirme && (
            <p className="notice">
              Bu bir geliştirme taslağıdır. Gerçek danışan verisiyle kullanıma
              açık değildir.
            </p>
          )}
          <p className="biography">{data.metin}</p>
          {data.veri_sorumlusu && <p>Veri sorumlusu: {data.veri_sorumlusu}</p>}
          <p className="muted small">Metin sürümü: {data.surum}</p>
          <p className="muted">
            Giriş oturumu ve güvenlik kontrolleri için zorunlu oturum çerezleri
            kullanılır. Platform görünürlüğünü ve terapist profil performansını
            anlamak amacıyla IP adresi veya danışan kimliği saklamayan
            toplulaştırılmış trafik ölçümü ve yönetici tarafından
            etkinleştirildiğinde anonimleştirilmiş Google Analytics 4 (GA4)
            istatistikleri kullanılabilir; randevu formu bilgileri ya da sağlık
            verileri hiçbir analitik sisteme gönderilmez.
          </p>
          <p className="muted">
            Google Maps bağlantıları yeni sekmede açılır. Bağlantıya
            tıkladığınızda uzmanın yayımladığı iş adresi veya ilçe/şehir bilgisi
            Google Maps’te aranır. Randevu formundaki bilgiler ve eşleştirme
            tercihleriniz bu bağlantıya eklenmez.
          </p>
        </article>
      )}
    </section>
  );
}
