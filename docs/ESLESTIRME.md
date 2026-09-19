# Danışan tercihlerine göre eşleştirme

Bu özellik, danışanın belirttiği tercihleri uzmanların yayımlanmış profil
etiketleriyle karşılaştırır. Üyelik veya danışan hesabı gerektirmez. Varsayılan
`Tercihlerime en uygun` sıralaması en yüksek puanı başa getirir; her kartta
eşleşen ve profilde belirtilmeyen tercihler gösterilir.

Bu ilk sürüm deterministik, açıklanabilir bir kural sistemidir. Puan, klinik
uygunluk, tanı veya tedavi başarısı olasılığı değildir. Ağırlıklar klinik olarak
doğrulanmış katsayılar değil, değiştirilebilir ürün tercihleridir.

## Filtre ile tercih arasındaki fark

| Girdi | Etkisi |
| --- | --- |
| Onaylı ve arşivlenmemiş profil | Her istekte zorunlu; kullanıcı değiştiremez |
| Şehir, danışan grubu, görüşme şekli | Seçilmişse tam eşleşme zorunlu |
| Asgari deneyim | Deneyim yılı bu değerden küçükse elenir |
| En yüksek ücret | Ücret sınırı dahil uygulanır; `null` sınırsız, `0` yalnızca ücretsiz |
| Uzman adı | Türkçe büyük/küçük harf dönüşümü ile gerçek alt metin araması |
| Destek alanları | En fazla 5 seçim; eşleşme oranı puana katkı sağlar |
| Terapi yaklaşımları | En fazla 3 seçim; isteğe bağlı, eşleşme oranı puana katkı sağlar |

Örneğin bütçesi 1.500 TL olan danışana, bütün destek alanları eşleşse bile
2.000 TL ücretli profil gösterilmez. Buna karşılık iki destek alanından yalnızca
birini karşılayan profil elenmez; daha düşük puanla ve eksik alan açıklamasıyla
gösterilir. Şehir seçimi, çevrim içi görüşmelerde de kesin uygulanır.

## Puanlama: `tercih-v1`

Destek alanları için ağırlık **70**, terapi yaklaşımları için **30** kullanılır.
Her grubun kapsama oranı, eşleşen seçim sayısının o gruptaki seçim sayısına
bölünmesidir. Seçilmeyen grubun ağırlığı paydadan çıkarılır:

```text
A = eşleşen destek alanı sayısı / seçilen destek alanı sayısı
E = eşleşen yaklaşım sayısı / seçilen yaklaşım sayısı
W = (alan seçildiyse 70, yoksa 0) + (yaklaşım seçildiyse 30, yoksa 0)
puan = 100 × (70 × A + 30 × E) / W
```

Boş grup için oran 0 alınır. İki grup da boşsa puan `null` döner ve varsayılan
sıralama ada göre olur. Yalnızca alan seçilirse onun tam karşılanması 100 puandır.
Tekrarlanan tercihler, çevre boşlukları temizlendikten sonra bir kez sayılır.
Liste uzunluğu sınırları, tekrarları temizlemeden önce uygulanır.

Örnek: danışan `Kaygı`, `Travma` ve yaklaşım olarak `BDT` seçmiş olsun:

| Profilde bulunanlar | Alan katkısı | Yaklaşım katkısı | Puan |
| --- | ---: | ---: | ---: |
| Kaygı, Travma, BDT | 70 | 30 | 100 |
| Kaygı, BDT | 35 | 30 | 65 |
| Kaygı, Travma; BDT yok | 70 | 0 | 70 |
| Bu etiketlerin hiçbiri | 0 | 0 | 0 |

Sonuç sırası 100, 70, 65, 0 olur. Profilin başka etiketler eklemesi ek puan
kazandırmaz. Unvan, yüksek ücret, fotoğraf, tavsiye sayısı veya seçilmemiş deneyim
özellikleri bonus değildir. Profil adındaki meslek/unvan serbest metindir;
buradan bir yetkinlik çıkarımı yapılmaz.

Etiketler `/api/secenekler` tarafından verilen değerlerle **tam** karşılaştırılır;
eş anlamlı sözcük, yazım hatası veya tanı çıkarımı yapılmaz. API'den bilinmeyen
bir etiket gönderilirse eşleşmez. Profilde olmayan bir alan, uzmanın o konuda
çalışamayacağını kanıtlamaz; kartta bu nedenle “Profilde belirtilmeyenler” yazılır.

## Sıralama ve sayfalama

`backend/app/eslestirme.py` iki SELECT çalıştırır: filtrelenmiş toplam ve puanlı
sonuç sayfası. SQL önce bütün uygun adayların puanını hesaplar, sıralar ve sonra
12 kayıtlık sayfayı alır. Böylece ilk alfabetik sayfanın dışında kalan güçlü bir
eşleşme de ilk sıraya gelebilir. Her profil için ayrı sorgu yapılmaz.

PostgreSQL'de JSONB kapsama, SQLite testlerinde ilişkili `json_each` sorgusu
kullanılır. Bu sürüm tablo veya şema değişikliği gerektirmez. Eşitliklerde
küçültülmüş ad ve benzersiz profil kimliği sıralamayı sabitler. Türkçe harfler
küçültülür; tam Türkçe sözlük sırası için özel bir veritabanı kolasyonu kurulmaz.
Veri değişirse sayfalar arası sonuçlar da değişebilir; sayfalar tek bir anlık
veri kopyasına sabitlenmez. Gösterilen puan bir ondalığa yuvarlanır, sıralama
yuvarlanmamış puanla yapılır.

Kullanıcı `ad`, `ucret_artan` veya `ucret_azalan` seçerse bu sıra önceliklidir;
puan ve açıklamalar görünmeye devam eder. Tercih değişince arayüz ilk sayfaya döner.

## API sözleşmesi ve mahremiyet

`POST /api/eslestirme` salt okunur bir uç noktadır. Tercihleri sorgu URL'sine,
tarayıcı geçmişine ve yönlendiren başlığına taşımamak için POST kullanılır.
Örnek istek gövdesi:

```json
{
  "uzmanliklar": ["Kaygı", "Travma"],
  "ekoller": ["BDT"],
  "format": "Çevrim içi",
  "kitle": "Yetişkin",
  "azami_ucret": 2500,
  "deneyim": 3,
  "sayfa": 1,
  "sirala": "eslesme"
}
```

Tüm alanlar isteğe bağlıdır. `arama` ve `sehir` de kullanılabilir. Yanıt
`toplam`, `sayfa`, `surum` ve `sonuclar` içerir. Her sonuç normal profil
alanlarına ek olarak şu açıklamayı taşır:

```json
{
  "eslesme": {
    "puan": 65.0,
    "eslesen_alanlar": ["Kaygı"],
    "eslesen_ekoller": ["BDT"],
    "eksik_alanlar": ["Travma"],
    "eksik_ekoller": []
  }
}
```

Pydantic sayı/aralık/liste sınırlarını doğrular ve bilinmeyen alanları reddeder.
İstek `Content-Type: application/json` ve izinli `Origin` gerektirir;
Docker'da Origin `http://localhost:8080` olur. Gövde sınırı 32 KiB'dir.
Kaynak denetimi 403, doğrulama 422, hız sınırı 429 yanıtı üretir.

Tercihler veritabanına, denetim kaydına, çereze veya localStorage'a yazılmaz;
React belleğinde kalır ve yenilemede temizlenir. Yanıt `Cache-Control: no-store`
taşır. Sunucu isteği işlemek için tercihleri görür: bu tasarım sunucudan anonimlik
garantisi vermez. Mevcut dağıtım erişim günlüklerini kapatır; yeni izleme araçları
eklenirse istek/yanıt gövdeleri kaydedilmemelidir. Kötüye kullanım sınırı
IP'nin HMAC özetiyle dakikada 120 istektir; anahtarda tercih metni bulunmaz.

Eski `GET /api/uzmanlar` sözleşmesi korunur. Yeni dizin bütün sıralama seçenekleri
için POST kullanır; GET'teki eski uzmanlık/ekol filtreleri kısmi eşleşme puanı vermez.

## Geliştirme ve doğrulama

- Ağırlıklar: `backend/app/eslestirme.py` içindeki sabitler.
- İstek/yanıt sınırları: `backend/app/schemas.py`.
- HTTP ve hız sınırlaması: `backend/app/api/matching.py`.
- Arayüz durumu ve JSON: `frontend/src/lib/matching.ts`.
- Kartlar ve tercihler: `frontend/src/pages/Directory.tsx`.
- Senaryolar: `backend/tests/test_matching.py`, `frontend/src/matching.test.ts`.

Testler ağırlıkları, boş/tekrarlı tercihleri, 0 TL sınırını, Türkçe ad aramasını,
onay/arşiv koşullarını, tüm adayların sayfalamadan önce sıralanmasını, iki sorgu
sınırını ve aramanın tablo/oturum oluşturmamasını denetler. Aynı senaryolar
SQLite ve ayrılmış PostgreSQL veritabanında çalışır. Test komutları
[geliştirici rehberindedir](GELISTIRICI_REHBERI.md).

1.000 kurgusal profil için [veri seti rehberini](ESLESTIRME_VERISI.md) izleyin.
Bu veri işlevsel denemeler içindir; klinik kalitenin veya gerçek kullanım
performansının kanıtı değildir. Randevu müsaitliği bu puana dahil edilmez;
profildeki takvimden ayrıca kontrol edilir. İleride müsaitlik, kontrollü etiket
sözlüğü veya kullanıcı değerlendirmeleri eklenecekse yeni kuralın açıklaması,
gizlilik etkisi ve test senaryoları birlikte tasarlanmalıdır. Puanlama davranışı
değiştiğinde `surum` değerini ve bu belgeyi birlikte güncelleyin.
