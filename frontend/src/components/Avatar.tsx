export function Avatar({ ad, large = false }: { ad: string; large?: boolean }) {
  const words = ad
    .replace(/Dr\.|Uzm\.|Psk\.|Kln\./g, "")
    .trim()
    .split(/\s+/);
  return (
    <div aria-hidden="true" className={`avatar ${large ? "large" : ""}`}>
      {words
        .slice(0, 2)
        .map((w) => w[0])
        .join("")}
    </div>
  );
}
