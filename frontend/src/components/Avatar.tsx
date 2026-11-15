export function Avatar({
  ad,
  large = false,
  src = "",
}: {
  ad: string;
  large?: boolean;
  src?: string;
}) {
  const words = ad
    .replace(/Dr\.|Uzm\.|Psk\.|Kln\./g, "")
    .trim()
    .split(/\s+/);
  return src ? (
    <img
      className={`avatar ${large ? "large" : ""}`}
      src={src}
      alt={`${ad} profil fotoğrafı`}
      referrerPolicy="no-referrer"
      loading={large ? "eager" : "lazy"}
      fetchPriority={large ? "high" : "auto"}
      decoding="async"
      width={large ? 148 : 76}
      height={large ? 148 : 76}
    />
  ) : (
    <div aria-hidden="true" className={`avatar ${large ? "large" : ""}`}>
      {words
        .slice(0, 2)
        .map((w) => w[0])
        .join("")}
    </div>
  );
}
