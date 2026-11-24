import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Profil } from "../lib/api";
import {
  DeleteTherapistView,
  type TherapistDeletionSummary,
} from "./DeleteTherapist";

const profile = {
  id: "test-id",
  ad: "Kurgusal Uzman",
  kullanici_adi: "kurgusaluzman",
} as Profil;
const available: TherapistDeletionSummary = {
  uzman_id: profile.id,
  kullanici_adi: profile.kullanici_adi,
  silinebilir: true,
  engeller: [],
};

/** Tehlikeli işlem: yükleme/engel/yanlış hedef durumlarında düğme kapalıdır. */
function markup(
  summary?: TherapistDeletionSummary,
  confirmation = "",
  busy = false,
) {
  return renderToStaticMarkup(
    <DeleteTherapistView
      profile={profile}
      summary={summary}
      confirmation={confirmation}
      busy={busy}
      onConfirmation={() => {}}
      onDelete={() => {}}
      onClose={() => {}}
    />,
  );
}

describe("Kalıcı olarak silme onayı", () => {
  it.each([
    [undefined, "kurgusaluzman", false],
    [available, "", false],
    [available, "yanlis", false],
    [{ ...available, uzman_id: "baska-id" }, "kurgusaluzman", false],
    [
      { ...available, silinebilir: false, engeller: ["Randevu geçmişi var."] },
      "kurgusaluzman",
      false,
    ],
    [available, "kurgusaluzman", true],
  ] satisfies Array<[TherapistDeletionSummary | undefined, string, boolean]>)(
    "eksik, engelli veya işlemdeki onayı kabul etmez",
    (summary, confirmation, busy) => {
      expect(markup(summary, confirmation, busy)).toMatch(
        /<button type="submit"[^>]*disabled/,
      );
    },
  );
  it("tam hedef onayından sonra geri alınamaz işlemi açıklar", () => {
    const html = markup(available, "kurgusaluzman");
    expect(html).not.toMatch(/<button type="submit"[^>]*disabled/);
    expect(html).toContain("Bu işlem geri alınamaz");
    expect(html).toContain("Arşivle");
    expect(html).toContain("Vazgeç");
  });
  it("randevu engelini gösterir ve onay alanını gizler", () => {
    const html = markup({
      ...available,
      silinebilir: false,
      engeller: ["Randevu geçmişi var."],
    });
    expect(html).toContain("Randevu geçmişi var.");
    expect(html).not.toContain("<input");
  });
});
