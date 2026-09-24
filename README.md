# Deckdelver — Kart Zindanı Macerası

Mobil öncelikli, sıra tabanlı bir **roguelike deste kurma RPG'si**. Dallanan bir zindan haritasında ilerle, tek sıralı bir koridorda konumlanarak kart savaşları ver, desteni güçlendir, tılsımlar topla ve her perdenin sonundaki bossu yen. Her macera farklıdır, ölüm kalıcıdır, ama kazandığın Ruh Taşları seni bir sonraki maceraya daha güçlü gönderir.

Oyun tamamen TypeScript ile yazıldı. Grafikler, sesler ve müzik kod içinde üretilir, harici görsel ya da ses dosyası yoktur. Tarayıcıda PWA olarak ya da Capacitor ile paketlenmiş Android uygulaması olarak çalışır.

## Özellikler

- **8 kahraman sınıfı**, her birinin kendine özgü mekaniği var:
  | Sınıf | Tarz |
  |---|---|
  | Savaşçı | Güç biriktirme, blok, düşmanları duvara itme |
  | Korucu | Menzilli oklar, tuzaklar, işaretleme, kurt yoldaş |
  | Büyücü | Ateş (Yanık), buz (Sabitleme), zincirleme şimşek, alan büyüleri |
  | Suikastçı | Zehir, atış hançerleri, arkaya ışınlanma, kaçınma |
  | Paladin | Işıltı biriktirme, kutsal hasar, iyileşme, diken |
  | Nekromant | İskelet ve golem çağırma, Ruh toplama/harcama |
  | Mühendis | Taretler, gecikmeli bombalar, patlayan bidonlar, savaş robotu |
  | Keşiş | Ki kombinasyonları, tekmelerle itme, yüksek hareket |
- **~190 özgün kart** (sınıf kartları, ortak kartlar, lanetler, durum kartları), her kartın geliştirilmiş hali var.
- **Konumsal savaş sistemi**: 8 karelik koridor, hareket puanı, yakın/menzilli saldırılar, itme ve çekme, çarpışma hasarı, tuzaklar, bombalar, çağrılan yardımcılar.
- **Düşman niyetleri**: her düşman ne yapacağını önceden gösterir. Alan saldırıları kırmızı karelerle işaretlenir, oradan çekilerek kaçabilirsin.
- **42 düşman**: 3 perdede normal düşmanlar, elitler ve 6 boss (Mahzen Bekçisi, Fare Kralı, Mantar Ana, Trol Kral, Kül Ejderi, Solgun Hükümdar).
- **Dallanan harita**: savaş, elit, bilinmeyen olay, tüccar, kamp ateşi ve hazine odaları.
- **61 tılsım**, **16 iksir**, **18 metin tabanlı olay**.
- **4 oyun modu**:
  - **Klasik**: 3 perdelik macera.
  - **Cehennem**: birikimli 10 zorluk seviyesi, daha fazla ödül.
  - **Kule**: sonsuz katlar, her 10 katta bir boss, giderek güçlenen düşmanlar.
  - **Haftalık Meydan Okuma**: herkes için aynı tohum, sınıf ve özel kurallar.
- **Kalıcı ilerleme**: Ruh Taşlarıyla yeni kahramanların kilidini aç ve kalıcı güçlendirmeler satın al (can, altın, iksir yuvası, kart ödülü yenileme ve daha fazlası).
- **Başarımlar**, istatistikler, maceralar geçmişi, kart/tılsım/canavar kütüphanesi.
- **Türkçe ve İngilizce** dil desteği.
- Otomatik kayıt: savaşın ortasında bile çıkıp kaldığın yerden devam edebilirsin.
- Sentezlenmiş ses efektleri ve prosedürel chiptune müzik, ekran sarsıntısı, titreşim ve animasyon hızı ayarları.

## Nasıl Oynanır

1. **Kart oynamak**: bir karta dokun, sonra parlayan hedefe (düşman ya da kare) dokun. Hedefsiz kartlar için karta ikinci kez dokun. Kartı sürükleyip hedefin üzerine bırakabilirsin de.
2. **Hareket**: yeşil kesikli karelere dokunarak yürü. ⚔ işaretli kartlar bitişik hedef ister, ◎N işaretli kartlar N kare uzağa ulaşır.
3. **Niyetler**: düşmanların üstündeki simgeler bir sonraki hamlelerini gösterir. Yakın dövüşçüler sana ulaşamazsa saldırıları boşa gider.
4. **Blok** gelen hasarı emer ve senin turunun başında sıfırlanır.
5. Kartlara, düşmanlara, tılsımlara ve iksirlere **basılı tutarak** ayrıntıları görebilirsin.

## Geliştirme

Gereksinimler: Node.js 20+ (CI'da 22 kullanılıyor).

```bash
npm install
npm run dev          # geliştirme sunucusu (telefondan da erişilebilir: --host)
npm run build        # üretim derlemesi -> dist/
npm test             # birim testleri (Vitest)
npm run e2e          # tarayıcı uçtan uca testleri (Playwright)
npm run sim          # denge simülasyonu (bot her sınıfla N macera oynar)
```

`N=50 npm run sim` ile simülasyon sayısını, `MODE=tower` ile modu değiştirebilirsin.

## Android APK

### Hazır APK (önerilen)
Her gönderimde GitHub Actions **"Build & Test"** iş akışı hata ayıklama APK'sı üretir. Actions sekmesinde ilgili çalıştırmayı aç, **Artifacts** bölümünden `deckdelver-debug-apk` dosyasını indir ve telefona yükle.

### Yerelde derleme
Android Studio (JDK 21 ve Android SDK 36) gerekir.

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

Ya da `npx cap open android` ile projeyi Android Studio'da açıp çalıştır.

### Web sürümü
`dist/` klasörü herhangi bir statik sunucuda çalışır ve çevrimdışı oynanabilir (PWA). GitHub Pages'e yayınlamak için repo ayarlarında **Pages → Source: GitHub Actions** seçip "Deploy web version to GitHub Pages" iş akışını elle başlat.

## Proje Yapısı

```
src/
  core/        Deterministik rastgele sayı üretici
  engine/      Oyun motoru (arayüzden bağımsız, test edilebilir)
    combat.ts    Savaş kuralları, hasar, hareket, itme, tuzak, bomba, düşman yapay zekâsı
    run.ts       Macera akışı: harita, ödüller, dükkân, kamp, olaylar, kayıt, puan
    map.ts       Dallanan harita ve kule bölümü üretimi
    meta.ts      Profil, kalıcı güçlendirmeler, başarımlar, Cehennem seviyeleri
    bot.ts       Otomatik oyuncu (test ve denge simülasyonu için)
  data/        Kartlar, sınıflar, düşmanlar, karşılaşmalar, tılsımlar, iksirler, olaylar
  gfx/         Kod ile tanımlı piksel sanatı ve çizim/önbellek katmanı
  audio/       WebAudio ses efektleri ve prosedürel müzik
  ui/          Ekranlar ve bileşenler (DOM tabanlı, mobil öncelikli)
  i18n/        Türkçe/İngilizce metinler
tests/
  unit/        Motor testleri
  e2e/         Playwright tarayıcı testleri
android/       Capacitor Android projesi
scripts/       Simülasyon, ikon üretimi ve ekran görüntüsü betikleri
```

Tasarım notları:
- Motor tamamen **serileştirilebilir durum** üzerinde çalışır. Tüm macera, savaş dahil, JSON olarak kaydedilir ve aynı tohumla aynı sonucu üretir.
- Motor, arayüzün oynattığı bir **olay akışı** üretir (hasar, hareket, ölüm...). Böylece kurallar ile animasyonlar birbirinden ayrı kalır.
- Kart açıklamaları kartın etki verisinden **otomatik üretilir**. Metin ile davranış hiçbir zaman birbirinden kopmaz. Savaş sırasında güç, zayıflık gibi etkenler sayılara canlı yansır.

## Özgünlük

Oyun, roguelike deste kurma türünün yaygın mekaniklerinden esinlenir. Tüm isimler, kartlar, düşmanlar, olay metinleri, piksel sanatı, ses ve müzik bu proje için sıfırdan üretilmiştir. Başka bir oyunun görsel, ses ya da metin varlığı kullanılmamıştır.
