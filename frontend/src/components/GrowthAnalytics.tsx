import {
  ArrowRight,
  CalendarDays,
  HeartHandshake,
  MousePointerClick,
  Share2,
  UserPlus,
  UsersRound,
} from "lucide-react";
import type { BuyumeAnalitigi } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Status } from "./Status";

type DashboardTab =
  "profil" | "baglantilar" | "davetler" | "yonlendirmeler" | "tavsiyeler";

type Props = { onNavigate: (tab: DashboardTab) => void };

export function nextGrowthAction(data: BuyumeAnalitigi) {
  if (data.baglantilar.bekleyen_istekler > 0) {
    return {
      title: `${data.baglantilar.bekleyen_istekler} bağlantı isteği yanıtınızı bekliyor`,
      body: "İstekleri değerlendirerek mesleki ağınızı güncel tutun.",
      action: "İstekleri değerlendir",
      tab: "baglantilar" as const,
    };
  }
  if (data.davetler.bekleyen > 0) {
    return {
      title: `${data.davetler.bekleyen} davet henüz kabul edilmedi`,
      body: "Bekleyen ve kabul edilen davetlerin durumunu gözden geçirin.",
      action: "Davetleri görüntüle",
      tab: "davetler" as const,
    };
  }
  if (data.yonlendirmeler.olusturulan_baglanti === 0) {
    return {
      title: "İlk danışan yönlendirme bağlantınızı oluşturun",
      body: "Çalışamadığınız talepler için doğrulanmış meslektaşlar seçebilirsiniz.",
      action: "Yönlendirme oluştur",
      tab: "yonlendirmeler" as const,
    };
  }
  if (data.tavsiyeler.onerilen_terapist === 0) {
    return {
      title: "Çalışmadığınız alanlar için meslektaş önerin",
      body: "Profilinizi ziyaret edenler doğru uzmanlara daha kolay ulaşsın.",
      action: "Öneri ekle",
      tab: "tavsiyeler" as const,
    };
  }
  return {
    title: "Mesleki ağınızı güncel tutun",
    body: "Bağlantılarınızı ve bekleyen istekleri düzenli olarak gözden geçirin.",
    action: "Mesleki ağı aç",
    tab: "baglantilar" as const,
  };
}

export function AnalyticsOverview({
  data,
  onNavigate,
}: Props & { data: BuyumeAnalitigi }) {
  const nextAction = nextGrowthAction(data);

  return (
    <>
      <section
        className="analytics-grid"
        aria-label="Mesleki büyüme metrikleri"
      >
        <button
          className="analytics-metric"
          type="button"
          onClick={() => onNavigate("baglantilar")}
          aria-label="Mesleki ağı yönet"
        >
          <div className="analytics-metric-heading">
            <UsersRound size={19} aria-hidden="true" />
            <h3>Mesleki Ağ</h3>
          </div>
          <strong>{data.baglantilar.toplam}</strong>
          <p>profesyonel bağlantı</p>
          <span>
            {data.baglantilar.bekleyen_istekler > 0
              ? `${data.baglantilar.bekleyen_istekler} istek yanıt bekliyor`
              : "Bekleyen bağlantı isteği yok"}
          </span>
          <span className="analytics-action">
            Ağı yönet <ArrowRight size={15} aria-hidden="true" />
          </span>
        </button>

        <button
          className="analytics-metric"
          type="button"
          onClick={() => onNavigate("davetler")}
          aria-label="Meslektaş davetlerini yönet"
        >
          <div className="analytics-metric-heading">
            <UserPlus size={19} aria-hidden="true" />
            <h3>Davetler</h3>
          </div>
          <strong>{data.davetler.gonderilen}</strong>
          <p>gönderilen davet</p>
          <span>
            {data.davetler.kabul_edilen} kabul edildi · {data.davetler.bekleyen}{" "}
            bekliyor
          </span>
          <span className="analytics-action">
            {data.davetler.kalan_hak > 0
              ? `${data.davetler.kalan_hak} hakkı kullan`
              : "Davetleri görüntüle"}
            <ArrowRight size={15} aria-hidden="true" />
          </span>
        </button>

        <button
          className="analytics-metric"
          type="button"
          onClick={() => onNavigate("yonlendirmeler")}
          aria-label="Danışan yönlendirmesi oluştur"
        >
          <div className="analytics-metric-heading">
            <Share2 size={19} aria-hidden="true" />
            <h3>Yönlendirmeler</h3>
          </div>
          <strong>{data.yonlendirmeler.olusturulan_baglanti}</strong>
          <p>oluşturulan bağlantı</p>
          <span>{data.yonlendirmeler.aktif_baglanti} bağlantı aktif</span>
          <span className="analytics-action">
            Yönlendirme oluştur <ArrowRight size={15} aria-hidden="true" />
          </span>
        </button>

        <button
          className="analytics-metric"
          type="button"
          onClick={() => onNavigate("yonlendirmeler")}
          aria-label="Profil geçiş bağlantılarını yönet"
        >
          <div className="analytics-metric-heading">
            <MousePointerClick size={19} aria-hidden="true" />
            <h3>Profil Geçişleri</h3>
          </div>
          <strong>{data.yonlendirmeler.profil_tiklamalari}</strong>
          <p>yönlendirmeden profil tıklaması</p>
          <span>Tekil ziyaretçi değil, toplam geçiş sayısıdır</span>
          <span className="analytics-action">
            Bağlantıları yönet <ArrowRight size={15} aria-hidden="true" />
          </span>
        </button>

        <button
          className="analytics-metric"
          type="button"
          onClick={() => onNavigate("tavsiyeler")}
          aria-label="Terapist önerilerini yönet"
        >
          <div className="analytics-metric-heading">
            <HeartHandshake size={19} aria-hidden="true" />
            <h3>Öneriler</h3>
          </div>
          <strong>{data.tavsiyeler.onerilen_terapist}</strong>
          <p>önerilen terapist</p>
          <span>Çalışmadığınız alanlar için eklediğiniz meslektaşlar</span>
          <span className="analytics-action">
            Önerileri yönet <ArrowRight size={15} aria-hidden="true" />
          </span>
        </button>
        <button
          className="analytics-metric"
          type="button"
          onClick={() => onNavigate("profil")}
          aria-label="Takvim kaynağını ve görüşme saatlerini yönet"
        >
          <div className="analytics-metric-heading">
            <CalendarDays size={19} aria-hidden="true" />
            <h3>Takvim</h3>
          </div>
          <strong>Google</strong>
          <p>takvim ve saat eşitlemesi</p>
          <span>
            Randevu boşluklarınızı Google Takvim dolu zamanlarına göre kontrol
            edin
          </span>
          <span className="analytics-action">
            Takvimini ekle <ArrowRight size={15} aria-hidden="true" />
          </span>
        </button>
      </section>

      <section
        className="analytics-next-step"
        aria-labelledby="next-growth-step"
      >
        <span className="eyebrow">SIRADAKİ EN YARARLI ADIM</span>
        <h3 id="next-growth-step">{nextAction.title}</h3>
        <p>{nextAction.body}</p>
        <button
          className="button"
          type="button"
          onClick={() => onNavigate(nextAction.tab)}
        >
          {nextAction.action} <ArrowRight size={16} aria-hidden="true" />
        </button>
      </section>
    </>
  );
}

export function GrowthAnalytics({ onNavigate }: Props) {
  const analytics = useApi<BuyumeAnalitigi>("/uzman/buyume-analitigi");

  return (
    <div className="analytics-panel">
      <Status
        loading={analytics.loading}
        error={analytics.error}
        retry={analytics.reload}
      />
      {analytics.data && (
        <AnalyticsOverview data={analytics.data} onNavigate={onNavigate} />
      )}
    </div>
  );
}
