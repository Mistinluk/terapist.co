import { ArrowUpRight, MapPin, ShieldCheck } from "lucide-react";
import { useParams } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { Status } from "../components/Status";
import { PublicYonlendirme } from "../lib/api";
import { useApi } from "../lib/useApi";

function iyelik(ad: string) {
  const vowels = [...ad.toLocaleLowerCase("tr-TR")].filter((letter) =>
    "aeıioöuü".includes(letter),
  );
  const lastVowel = vowels.at(-1) ?? "i";
  const suffix = "aı".includes(lastVowel)
    ? "ın"
    : "ei".includes(lastVowel)
      ? "in"
      : "ou".includes(lastVowel)
        ? "un"
        : "ün";
  const buffer = "aeıioöuü".includes(
    ad.at(-1)?.toLocaleLowerCase("tr-TR") ?? "",
  )
    ? "n"
    : "";
  return `${ad}'${buffer}${suffix}`;
}

export function Referral() {
  const { token = "" } = useParams();
  const referral = useApi<PublicYonlendirme>(`/yonlendirmeler/${token}`);

  return (
    <section className="referral-page">
      <div className="page-heading referral-heading">
        <span className="eyebrow">TERAPİST YÖNLENDİRMESİ</span>
        <h1>
          {referral.data
            ? `${iyelik(referral.data.yonlendiren.ad)} sizin için önerdiği terapistler`
            : "Sizin için önerilen terapistler"}
        </h1>
        <p className="muted">
          Bu bağlantı danışan kimliği, iletişim bilgisi veya sağlık verisi
          içermez.
        </p>
      </div>
      <Status
        loading={referral.loading}
        error={referral.error}
        retry={referral.reload}
      />
      {referral.data && (
        <>
          <p className="referral-trust">
            <ShieldCheck size={17} /> Yalnız doğrulanmış Terapist.co profilleri
            gösterilir.
          </p>
          <div className="referral-profile-list">
            {referral.data.terapistler.map((therapist) => (
              <article className="referral-profile" key={therapist.id}>
                <Avatar ad={therapist.ad} />
                <div className="referral-profile-body">
                  <h2>{therapist.ad}</h2>
                  <p className="location">
                    <MapPin size={15} /> {therapist.ilce}, {therapist.sehir}
                  </p>
                  <div className="tags">
                    {therapist.uzmanliklar.slice(0, 4).map((specialty) => (
                      <span key={specialty}>{specialty}</span>
                    ))}
                  </div>
                </div>
                <a
                  className="button"
                  href={`/api/yonlendirmeler/${token}/tikla/${therapist.id}`}
                >
                  Profili incele <ArrowUpRight size={16} />
                </a>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
