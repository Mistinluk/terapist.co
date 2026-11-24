import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { NotificationBell } from "./NotificationBell";
import { NotificationsAndMessages } from "./NotificationsAndMessages";

describe("NotificationBell ve NotificationsAndMessages", () => {
  it("yönetici ve terapist için sağ üst çan tetikleyicisini erişilebilir şekilde render eder", () => {
    const therapistHtml = renderToStaticMarkup(
      <MemoryRouter>
        <NotificationBell userRole="uzman" />
      </MemoryRouter>,
    );
    expect(therapistHtml).toContain('aria-label="Bildirimler"');
    expect(therapistHtml).toContain('aria-expanded="false"');
    expect(therapistHtml).toContain(
      'aria-controls="site-notification-popover"',
    );

    const adminHtml = renderToStaticMarkup(
      <MemoryRouter>
        <NotificationBell userRole="yonetici" />
      </MemoryRouter>,
    );
    expect(adminHtml).toContain('aria-label="Bildirimler"');
    expect(adminHtml).toContain("nav-bell-btn");
  });

  it("Bildirimler ve mesajlar sekmesini (mesajlar, bildirimler ve yeni mesaj başlatma) render eder", () => {
    const hubHtml = renderToStaticMarkup(
      <MemoryRouter>
        <NotificationsAndMessages userRole="uzman" />
      </MemoryRouter>,
    );
    expect(hubHtml).toContain("Mesajlar");
    expect(hubHtml).toContain("Bildirimler");
    expect(hubHtml).toContain("Yeni mesaj yaz");
  });
});
