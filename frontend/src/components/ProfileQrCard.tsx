import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Download, QrCode } from "lucide-react";

export function ProfileQrCard({
  username,
  therapistName,
  therapistTitle,
  accentColor = "#3459d1",
  hideBrand = false,
}: {
  username: string;
  therapistName: string;
  therapistTitle?: string;
  accentColor?: string;
  hideBrand?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://terapist.co";
  const targetUrl = `${origin}/${username}?utm_source=qr`;

  function copyUrl() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(targetUrl)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      })
      .catch(() => {});
  }

  function downloadSvg() {
    const svg = svgContainerRef.current?.querySelector("svg");
    if (!svg) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${username}-qr-kod.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadDeskCardPng() {
    const svg = svgContainerRef.current?.querySelector("svg");
    if (!svg) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([serialized], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 960;
      canvas.height = 1200;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = accentColor;
      ctx.fillRect(0, 0, canvas.width, 28);
      ctx.fillStyle = "#17243a";
      ctx.font = "700 44px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(therapistName, canvas.width / 2, 130, 820);
      ctx.fillStyle = "#52637f";
      ctx.font = "500 28px system-ui, -apple-system, sans-serif";
      ctx.fillText(
        therapistTitle || "Randevu ve profil kartı",
        canvas.width / 2,
        180,
        820,
      );
      ctx.drawImage(img, 200, 260, 560, 560);
      ctx.fillStyle = "#17243a";
      ctx.font = "700 32px system-ui, -apple-system, sans-serif";
      ctx.fillText("Randevu ve kaynaklar için okutun", canvas.width / 2, 915);
      ctx.fillStyle = accentColor;
      ctx.font = "600 28px system-ui, -apple-system, sans-serif";
      ctx.fillText(`/${username}`, canvas.width / 2, 975);
      if (!hideBrand) {
        ctx.fillStyle = "#64748b";
        ctx.font = "500 22px system-ui, -apple-system, sans-serif";
        ctx.fillText("terapist.co", canvas.width / 2, 1120);
      }
      const pngUrl = canvas.toDataURL("image/png");
      const anchor = document.createElement("a");
      anchor.href = pngUrl;
      anchor.download = `${username}-masa-karti.png`;
      anchor.click();
      URL.revokeObjectURL(svgUrl);
    };
    img.src = svgUrl;
  }

  return (
    <section className="qr-studio-card" aria-labelledby="qr-card-title">
      <div className="qr-studio-visual">
        <div className="qr-code-frame" ref={svgContainerRef}>
          <QRCodeSVG
            value={targetUrl}
            size={188}
            level="M"
            fgColor={accentColor}
            bgColor="#ffffff"
            includeMargin
          />
        </div>
        <span className="qr-scan-caption">/{username}</span>
      </div>

      <div className="qr-studio-copy">
        <div className="analytics-metric-heading">
          <QrCode size={18} aria-hidden="true" />
          <h3 id="qr-card-title">Klinik ve masa için QR kodu</h3>
        </div>
        <p className="muted">
          Danışanlarınızın görüşme odanızdaki veya kartvizitinizdeki QR kodu
          okutarak doğrudan profilinize, formlarınıza ve randevu takviminize
          ulaşmasını sağlayın.
        </p>
        <div className="qr-url-preview">
          <code>{targetUrl}</code>
        </div>
        <div className="qr-actions">
          <button
            type="button"
            className="button"
            onClick={downloadDeskCardPng}
          >
            <Download size={16} aria-hidden="true" /> Masa kartını indir (PNG)
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={downloadSvg}
          >
            <Download size={16} aria-hidden="true" /> Vektör olarak indir (SVG)
          </button>
          <button type="button" className="button secondary" onClick={copyUrl}>
            {copied ? (
              <>
                <Check size={16} aria-hidden="true" /> Kopyalandı
              </>
            ) : (
              <>
                <Copy size={16} aria-hidden="true" /> QR bağlantısını kopyala
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
