# CepAkıl

Android telefonlar için Türkçe, sade bir **güvenlik farkındalık** uygulaması.
Kullanıcının telefonundaki riskleri anlamasına, zararlı olabilecek uygulama,
dosya ve bağlantıları fark etmesine yardımcı olur.

> CepAkıl, bilinen tehditleri herkese açık listelerle (Türkiye'nin resmi USOM
> listesi, OpenPhish, URLhaus) ve telefonda çalışan kurallarla arar. Listeler
> yalnız bilinen/bildirilmiş zararlıları içerir; bulduğu işaretler kesin hüküm
> değil, **"incele"** önerisidir. Hiçbir ekranda
> "telefonun tamamen korunuyor" gibi doğrulanamayan bir iddia yoktur.

- Dil: Kotlin · Arayüz: Jetpack Compose (Material 3)
- En düşük Android: **8.0 (API 26)** · Hedef: **Android 15 (API 35)**
- Uygulamanın istediği izinler: `QUERY_ALL_PACKAGES`, `REQUEST_DELETE_PACKAGES`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, `INTERNET`, `RECEIVE_BOOT_COMPLETED`, `FOREGROUND_SERVICE` (+`_SYSTEM_EXEMPTED`), `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` (yükleme sırasında verilir) ve `POST_NOTIFICATIONS` (Android 13+, yalnız bir koruma özelliği açılınca sorulur)
- İsteğe bağlı, kullanıcının onayladığı: **VPN** (web koruması)
- İnternet yalnız herkese açık tehdit listelerini **indirmek** ve web korumasında DNS sorgularını iletmek için kullanılır; kullanıcı verisi gönderilmez

## 0. Koruma özellikleri (Ayarlar > Koruma)

| Özellik | Nasıl çalışır | Varsayılan |
|---|---|---|
| **Çevrimiçi tehdit veritabanı** | `koruma/TehditGuncelleyici` günde bir (WorkManager, yalnız internet varken) anahtarsız, herkese açık listeleri `filesDir/tehdit` altına indirir: **USOM** zararlı bağlantı listesi (yedek: USOM-Blocklists kopyası), **OpenPhish** kimlik avı listesi, **URLhaus** ve **phishing-filter** sunucu listeleri (malware-filter projesinin kopyaları; her biri için yedek adresler denenir). HTML ya da boş yanıt liste sayılmaz. `analiz/TehditVeritabani` bağlantı, mesaj, açılan site ve dosya içindeki bağlantı kontrollerinde telefonda karşılaştırır. Ayrıca **bildirilmiş zararlı Android uygulamalarının SHA-256 listesi**: MalwareBazaar üyelik anahtarı istediği için `.github/workflows/cepakil-veri.yml` her gün depo sırrındaki `ABUSECH_KEY` ile son 1000 APK kaydını alır, birikmiş listeyi (en çok 100.000) `cepakil-veri` dalındaki `apk_sha256.txt` olarak yayınlar; uygulama yalnız bu dosyayı indirir. Mağaza denetiminden geçmemiş kullanıcı uygulamalarının `base.apk` parmak izi (sürüm başına bir kez hesaplanıp saklanır) bu listeyle karşılaştırılır; eşleşme kesin "Bilinen zararlı yazılım" bulgusudur. Liste yenilendiğinde anlık koruma açıksa önceden yüklü uygulamalar da yeniden karşılaştırılır. Ortak barındırma platformları (Google, GitHub, Firebase…) sunucu olarak engellenmez. | Kapalı; ilk açılışta ana sayfadaki "Tehdit listeleri indirilsin mi?" sorusuna "İndir" denirse açılır. Kapatılınca indirilen listeler silinir. |
| **Anlık uygulama koruması** | `koruma/KorumaIsi` ~15 dakikada bir (Android'in en sık periyodik aralığı) yeni yüklenen/güncellenen uygulamaları değerlendirir; değişiklik yoksa hiçbir şey okumaz. Riskliyse bildirim; dokununca uygulama ayrıntısı açılır. | Kapalı |
| ~~Gelen mesajları otomatik tara~~ | **Kaldırıldı.** Google Play Protect, dosyadan kurulan ve `NotificationListenerService` (ya da erişilebilirlik hizmeti) tanımlayan uygulamaların kurulumunu dolandırıcılık önlemi olarak engelliyor ("Uygulama, cihazınızı korumak için engellendi"). CI artık bu hizmetleri içeren APK'yı reddeder. Mesajlar "Paylaş > CepAkıl" ile denetlenir. Uygulama ileride Play Store'da yayımlanırsa yeniden değerlendirilebilir. | — |
| **Web koruması** | `koruma/CepAkilVpn` yalnız DNS sorgularını yakalayan yerel VPN'dir (sanal DNS 10.111.222.2'ye giden UDP/53). Tehdit listesindeki ya da banka/e-Devlet taklidi alan adlarına NXDOMAIN döner, bildirim gösterir ("Bu siteye izin ver" eylemiyle). Diğer sorgular telefonun gerçek DNS sunucusuna `protect()` edilmiş soketle iletilir; trafik başka sunucuya yönlendirilmez. Özel DNS (DoH/DoT) kullanan tarayıcılarda devre dışı kalabilir; başka VPN açıkken çalışmaz. | Kapalı |


---

## 1. Ekranlar

Alt gezinme çubuğunda beş bölüm vardır:

| Bölüm | Ne yapar |
|---|---|
| **Ana sayfa** | Genel durum kutusu (“Henüz tarama yapılmadı” / “Sorun görünmüyor” / “İncelemen gerekenler var” / “Öncelikli incelemen gerekenler var”), son tarama zamanı, büyük **Taramayı başlat** düğmesi, telefon ayarı bulguları ve işaretlenen uygulamalar. Altta “Güvenlik önerileri” ekranına geçiş. |
| **Uygulamalar** | Yüklü uygulamaların listesi; arama, “Tümü / İncelenecekler” süzgeci, sistem uygulamalarını gösterme anahtarı. Bir uygulamaya dokununca **ayrıntı ekranı**: neden işaretlendiği, yükleme bilgisi, istediği hassas izinler (verilmiş / verilmemiş / durumu okunamıyor) ve **Uygulama ayarlarını aç** düğmesi. |
| **Dosya** | Android'in sistem dosya seçicisiyle tek dosya seçilir; gerçek tür, boyut, bulunan işaretler ve SHA-256 parmak izi gösterilir. |
| **Bağlantı** | Bağlantı yapıştırılır (ya da başka uygulamadan **Paylaş > CepAkıl**); adres açılmadan incelenir. |
| **Ayarlar** | Sistem uygulamalarını dahil etme, gizlilik açıklamaları, izinlerin nedeni, CepAkıl'ın yapamadıkları, kayıtlı tarama özetini silme. |

Durumlar her yerde **renk + simge + yazı** ile gösterilir (renk tek başına
anlam taşımaz):

| Renk | Etiket | Anlamı |
|---|---|---|
| 🔴 Kırmızı | Öncelikli incele | Güçlü tehlike göstergesi (yine de kesin kanıt değil) |
| 🟡 Sarı | İncele | Beklenmedik / gözden geçirilmesi gereken durum |
| 🟢 Yeşil | Dikkat çeken işaret yok / Gösterge bulunamadı | CepAkıl'ın kurallarında işaret yok |
| ⚪ Gri | Kesin sonuç yok | Yalnız bağlantılarda: yeterli veri yok, **güvenli denmez** |

## 2. Veri akışı

```
Kullanıcı düğmeye basar
        │
        ▼
 ui/ (Compose ekranları) ──► ui/ViewModeller.kt (TaramaViewModel, UygulamalarViewModel, DosyaViewModel)
                                   │
          ┌────────────────────────┼─────────────────────────────┐
          ▼                        ▼                             ▼
 veri/UygulamaKaynagi      veri/CihazKaynagi              veri/DosyaKaynagi
 (PackageManager,          (KeyguardManager,              (Sistem dosya seçicisinden
  AccessibilityManager,     Build.VERSION,                 gelen Uri → InputStream;
  DevicePolicyManager…)     Settings.Global)               APK ise geçici önbellek kopyası)
          │                        │                             │
          ▼                        ▼                             ▼
 analiz/UygulamaDegerlendirici  analiz/CihazDegerlendirici  analiz/DosyaDenetleyici
                    analiz/BaglantiDenetleyici (yalnız metin)
          │
          ▼
 Bulgu(seviye, başlık, açıklama) listesi ──► ekranda gösterilir
          │
          ▼
 veri/TaramaDeposu (yalnız son tarama özeti, SharedPreferences, buluta yedeklenmez)
```

- `analiz/` paketi **Android'e bağımlı değildir**; tüm kurallar bilgisayarda
  birim testleriyle denetlenir (`app/src/test`).
- Ağ yalnız `koruma/TehditGuncelleyici` (liste indirme, GET) ve `koruma/CepAkilVpn`
  (DNS iletimi) tarafından kullanılır; hiçbir istekte kullanıcı verisi yoktur.
- Tam tarama kullanıcı düğmeye bastığında çalışır. Arka plan işleri yalnız
  Ayarlar > Koruma'da açılan özellikler içindir; otomatik silme yoktur.

## 3. Her kontrol neyi ölçer, neyi ölçmez?

### Ana sayfa taraması (telefon ayarları)
**Ölçer:** ekran kilidi var mı (`KeyguardManager.isDeviceSecure`), güvenlik
yaması tarihi (`Build.VERSION.SECURITY_PATCH`, 6 aydan eskiyse uyarır),
Android sürümü (10'dan eskiyse uyarır), USB hata ayıklama ve geliştirici
seçenekleri.
**Ölçmez:** telefonun “root”lanmış olup olmadığı, sahte/değiştirilmiş yazılım,
ağ güvenliği. Güncelleme olup olmadığını bilemez; yalnız yamanın yaşını söyler.

### Uygulama kontrolü
**Ölçer (Android'in herkese açık arayüzleriyle):** istenen izinler ve
çalışma zamanı izinlerinin verilip verilmediği, uygulamayı neyin yüklediği
(Play Store gibi bilinen bir mağaza mı?), açık erişilebilirlik hizmeti, etkin
cihaz yöneticisi, bildirim erişimi, varsayılan SMS uygulaması olup olmadığı,
hedef Android sürümü, uygulamanın bildirdiği kategori.

Kural örnekleri:
- Mağaza dışı + erişilebilirlik açık → **kırmızı** (bankacılık truva atlarında sık görülen birleşim)
- Mesaj uygulaması olmadığı hâlde SMS okuma izni verilmiş → **sarı** (mağaza dışıysa kırmızı)
- Oyun ya da fener/hesap makinesi gibi basit bir uygulamaya SMS, kişiler, arama kayıtları veya mikrofon izni verilmiş → **sarı** (“beklenmedik izin”)
- 4 veya daha fazla kişisel veri grubunda izin verilmiş → **sarı**
- Mağazadan yüklenmiş, kamera ve konum isteyen sıradan bir uygulama → **yeşil**: izin istemek tek başına zararlılık göstergesi sayılmaz.

**Ölçmez:** uygulamanın kodunu, ağ trafiğini, gerçekte ne yaptığını. Özel
izinlerin (ör. “diğer uygulamaların üzerinde gösterme”) verilip verilmediği
her cihazda okunamaz; o zaman ekranda “durumu ayarlardan kontrol et” yazar.
Yükleyen bilgisi uygulamanın beyanına dayanır; üretici ön yüklemelerinde boş
olabilir.

**Eylem:** CepAkıl hiçbir uygulamayı kendisi silmez, durdurmaz, devre dışı
bırakmaz. “Uygulama ayarlarını aç” düğmesi Android'in kendi uygulama bilgisi
ekranını açar; karar kullanıcınındır.

**Tamamen kaldır (iz bırakmadan):** ayrıntı ekranındaki bu düğme adım adım
bir rehber açar: (gerekirse) cihaz yöneticisi yetkisini kaldırma → uygulamayı
açıp hesabı silme (şirketin sunucusundaki veriler kaldırmakla silinmez) →
Android'in kaldırma onay penceresi (`ACTION_DELETE`; uygulamanın telefondaki
özel verilerini Android siler) → geride kalabilecek izler: ortak klasörlerdeki
dosyalar (İndirilenler), Ayarlar > Hesaplar'daki hesap, girilen şifre/kart
bilgileri için öneriler. Ekran, onay penceresinden dönünce uygulamanın
gerçekten kaldırılıp kaldırılmadığını yeniden denetler. Sınır: başka
uygulamaların ortak klasörlere bıraktığı dosyalar depolama izni olmadan
listelenemez; sunucudaki verileri yalnız şirket silebilir.

### Yeni yüklenen uygulamalar
CepAkıl her açıldığında (ön plana geldiğinde) yüklü uygulamaları, telefonda
saklanan bir önceki listeyle karşılaştırır: **yeni yüklenenleri** ve
**güncellemeyle yeni hassas izin isteyenleri** ana sayfada gösterir. “Tamam,
gördüm” deyince şimdiki liste yeni karşılaştırma noktası olur. Arka planda
çalışmaz; yalnız paket adları, son güncelleme zamanı ve hassas izin adları
saklanır. İlk açılışta hiçbir uygulama “yeni” sayılmaz.

### Kod incelemesi (yüklü uygulamalar ve APK dosyaları)
Uygulamanın içindeki derlenmiş kod (`classes*.dex`) telefonda, internetsiz
okunur. DEX “metin tablosunda” Android'in hangi özelliklerinin geçtiğine
bakılır (ör. `SmsManager.sendTextMessage`, `AccessibilityService.dispatchGesture`,
`content://sms`, `DexClassLoader`, `MediaProjection`). Kod karıştırılmış olsa
da Android'in kendi adları değişmediği için bu yöntem karıştırmaya dayanıklıdır.
Ekranı kontrol etme + SMS okuma/üstte pencere, simge gizleme + SMS/ekran okuma,
telefonu kilitleme + ekran kontrolü gibi birleşimler **kırmızı** işaretlenir.
Yüklü uygulamalarda ayrıntı ekranında, APK dosyalarında dosya kontrolünde çalışır.
**Ölçmez:** kodun gerçekte ne yaptığını, şifrelenmiş ya da sonradan indirilen
kodu; meşru kütüphaneler de bu adları içerebilir.

### Dosya kontrolü
**Ölçer:** dosyanın ilk baytlarından **gerçek türü** (PDF, APK, Office, ZIP,
EXE, ELF, DEX, resim, video, HTML…) ve uzantıyla uyumu; çift uzantı
(`fatura.pdf.apk`), dosya adında gizli yön karakteri (U+202E); APK ise
istediği izinler ve tanımladığı erişilebilirlik / cihaz yöneticisi / bildirim
hizmetleri; makrolu Office belgeleri; PDF içinde `/JavaScript`, `/Launch`,
`/EmbeddedFile`; şifre formu veya betik içeren HTML; ZIP içindeki program
dosyaları, parolalı arşivler, `../` yol hileleri; SHA-256 parmak izi.

**Ölçmez:** bilinen zararlı yazılım imzaları (imza veritabanı yok), RAR/7z
içeriği, şifreli ya da gizlenmiş (obfuscated) içerik. İçerik aramaları dosyanın
ilk 8 MB'ı ile sınırlıdır (parmak izi tüm dosyadan hesaplanır).

**Sonuç dili:** işaret bulunmazsa “**Bilinen göstergelere göre risk
bulunamadı.** Bu, dosyanın temiz olduğu anlamına gelmez.” Hiçbir dosya
“temiz” ilan edilmez.

### Mesaj kontrolü (dolandırıcılık)
Yapıştırılan ya da “Paylaş > CepAkıl” ile gönderilen mesajın **tamamı**
incelenir: aciliyet, kurum adı (PTT, e-Devlet, banka, kargo…), ödeme/IBAN,
kod/şifre isteği, ödül vaadi, yatırım/iş teklifi, yakın taklidi, uygulama
yükletme. Kod isteme, kurum adı + bağlantı + ödeme/acele, ödül + bağlantı,
yakın taklidi + para, uygulama yükletme gibi birleşimler **kırmızı** sayılır.
Gündelik mesajlarda tek bir sözcük (“hemen”, “kargo”) alarm üretmez.
Mesajdaki her bağlantı ayrıca bağlantı kurallarıyla denetlenir. **Ölçmez:**
yeni kurguları ve Türkçe dışındaki kalıpları tanımayabilir.

### QR kod kontrolü
Google Play Hizmetleri'nin hazır kod okuyucusu kullanılır; CepAkıl kamera
izni istemez. Okunan adres açılmaz, mesaj/bağlantı kurallarıyla denetlenir.

### Elle eklenmiş sertifikalar ve klavyeler
Taramada, telefona kullanıcı tarafından eklenmiş güvenlik (CA) sertifikaları
(`AndroidCAStore` içindeki `user:` kayıtları) ve açık olan, mağaza dışından
yüklenmiş klavyeler **sarı** bildirilir. İkisi de izin gerektirmez.

### Wi-Fi kontrolü
Android 12+ cihazlarda bağlı ağın şifreleme türü okunur: şifresiz ağ ve WEP
**sarı**, “Enhanced Open” bilgi notu. Ağ adı ve konum okunmaz. Android 11 ve
öncesinde şifreleme türü konum izni olmadan okunamadığı için kontrol atlanır.

### Koruma puanı
Ana sayfadaki 0–100 puan, yukarıdaki kontrollerin özetidir (ekran kilidi yok
−30, kırmızı uygulama başına −12 …). Kırmızı işaret varken puan 59'u, sarı
varken 84'ü geçmez. Bir güvenlik garantisi değildir.

### Bağlantı kontrolü
**Ölçer (bağlantı açılmadan, yalnız yazılışı):** HTTPS / HTTP, `javascript:`
ve `data:` gibi tehlikeli şemalar, `@` hilesi, IP adresi, alışılmadık port,
Punycode ve karışık alfabe (ör. Kiril “а” ile `apple.com`), çok sayıda alt alan
adı, bağlantı kısaltıcılar (bit.ly…), ücretsiz site/tünel hizmetleri
(ngrok, web.app…), kötüye kullanımı sık görülen uzantılar (.top, .xyz,
.click…), tanınmış kurum adlarının resmi olmayan adreslerde geçmesi (e-Devlet,
bankalar, kargo, PTT…), resmi adreslere harf benzerliği (`trendyoi.com`,
`faceb00k.com`, `ziraatbank.com`), APK indirme bağlantıları.

**Bilinen güvenli olmayan kaynaklar** cihaz içindeki sabit listelerdir
(kısaltıcılar, ücretsiz barındırma, şüpheli uzantılar, kurumların resmi alan
adları). Çevrimiçi bir kara liste sorgulanmaz.

**Ölçmez:** sayfanın içeriğini, yönlendirmenin nereye gittiğini, yeni
kurulmuş sahte siteleri. İşaret bulunmazsa sonuç “**Kesin sonuç
verilemiyor**” olur; bağlantılara hiçbir zaman “güvenli” denmez.

### Güvenlik önerileri
Android/uygulama güncellemeleri, bilinmeyen kaynaklar, ekran kilidi,
erişilebilirlik, cihaz yöneticileri, bildirim erişimi, izin yöneticisi,
şüpheli bağlantılar ve kod paylaşmama. Mümkün olan her öneri ilgili Android
ayar ekranını açar; üretici bir ekranı kaldırmışsa bir sonraki yedek ekran,
o da yoksa genel Ayarlar açılır.

## 4. Android sürüm ve izin kısıtları

| Konu | Açıklama |
|---|---|
| **Uygulama listesi (Android 11+)** | Android 11'den itibaren “paket görünürlüğü” kuralları, uygulamaların diğer uygulamaları görmesini sınırlar. Tüm listeyi görmek için `QUERY_ALL_PACKAGES` gerekir. Bu izin yükleme sırasında verilir, kullanıcıya sorulmaz. **Google Play**, bu izni yalnız temel işlevi buna dayanan uygulamalara (güvenlik/antivirüs uygulamaları dahil) izin verir ve yayın sırasında beyan formu ister. İş profili ya da üretici kısıtları listeyi yine de daraltabilir; uygulama bunu ekranda belirtir. |
| **Diğer uygulamaların verileri** | Android “sandbox” yapısı nedeniyle normal bir uygulama başka uygulamaların dosyalarına, belleğine ya da ağ trafiğine erişemez. Bu yüzden CepAkıl dahil hiçbir normal uygulama bir uygulamanın “temiz” olduğunu doğrulayamaz. |
| **Özel izinlerin durumu** | “Diğer uygulamaların üzerinde gösterme”, “bilinmeyen uygulamaları yükleme” gibi özel izinlerin durumu `AppOpsManager` ile okunmaya çalışılır; bazı sürümler/üreticiler buna izin vermez. Okunamazsa ekranda “durumu ayarlardan kontrol et” yazar. |
| **Yükleyen bilgisi** | Android 11+ `getInstallSourceInfo`, öncesinde `getInstallerPackageName` kullanılır. ADB ya da bazı ön yüklemelerde boş döner (“Android bildirmiyor”). |
| **Dosyalar** | Depolama izni istenmez. Storage Access Framework (`ACTION_OPEN_DOCUMENT`) yalnız kullanıcının seçtiği dosyaya geçici okuma yetkisi verir. Arka planda dosya taranamaz; bu bilinçli bir tercihtir. |
| **APK incelemesi** | `PackageManager.getPackageArchiveInfo` dosya yolu istediği için seçilen APK uygulamanın kendi önbelleğine kopyalanır, okunur ve hemen silinir. Uygulama açılışında da eski kopyalar temizlenir. |
| **Pano** | Android 12+ pano okunduğunda bildirim gösterir. CepAkıl panoyu yalnız “Panodan yapıştır” düğmesine basılınca okur. |
| **Uygulama kaldırma** | `REQUEST_DELETE_PACKAGES` (yükleme sırasında verilir) yalnız Android'in kaldırma onay penceresini açmaya yarar; Android 9+ bu izni ister. Sessiz kaldırma normal uygulamalara kapalıdır. |
| **Erişilebilirlik / cihaz yöneticisi** | CepAkıl bu yetkileri **istemez**. Yalnız hangi uygulamalarda açık olduğunu herkese açık arayüzlerden okur. |
| **Ayar ekranlarına yönlendirme** | `Settings.ACTION_*` niyetleri kullanılır. Üreticiler bazı ekranları kaldırabildiği için her yönlendirmenin yedeği vardır. Sistem güncelleme ekranının herkese açık bir niyeti yoktur; `android.settings.SYSTEM_UPDATE_SETTINGS` denenir, yoksa “Telefon hakkında” açılır. |
| **Android 15 kenardan kenara** | Hedef API 35 olduğundan ekran içeriği sistem çubuklarının altına uzanır; Compose `Scaffold` boşlukları bırakır. |

## 5. Gizlilik

- Dosya, kişi, mesaj, fotoğraf, uygulama listesi, açılan siteler ya da tarama sonucu hiçbir sunucuya **gönderilmez**; internet yalnız herkese açık listeleri indirmek içindir.
- Reklam, analiz, çökme raporlama kütüphanesi yok.
- Yalnız son tarama özeti uygulamanın özel klasöründe (SharedPreferences) saklanır; `allowBackup=false` ve `dataExtractionRules` ile buluta/başka cihaza aktarılmaz. Ayarlar'dan silinebilir.
- İzin pencereleri yalnız kullanıcı bir koruma özelliğini açtığında gösterilir; her iznin nedeni Ayarlar ekranında açıklanır.
- CI, APK'da kişisel veriye erişen izinler (SMS, kişiler, konum, kamera, mikrofon, depolama, erişilebilirlik…) bulunursa derlemeyi durdurur.

## 6. Derleme

Gereken: Android Studio (Ladybug 2024.2 veya yenisi) ya da JDK 17 + Android SDK (API 35).

```bash
cd cepakil
./gradlew testDebugUnitTest   # kural testleri (bilgisayarda, cihaz gerekmez)
./gradlew assembleDebug       # app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleRelease     # küçültülmüş yayın sürümü: app/build/outputs/apk/release/app-release.apk
./gradlew lintDebug           # Android Lint
```

Android Studio'da **File > Open** ile `cepakil/` klasörünü açmak yeterlidir.

Depodaki `.github/workflows/cepakil.yml`, `cepakil/` altında her
değişiklikte şunları çalıştırır: kural testleri, APK derlemesi, Lint,
**APK'da gereksiz izin olmadığının denetimi**, tehdit listelerinin erişilebilirliği ve **sanal Android telefonda
uçtan uca testler** (`app/src/androidTest/UcUcaTest.kt`: tarama, mağaza dışı
deneme uygulamasının — `ornek/` modülü — yakalanması, kaldırılınca listeden
düşmesi, dolandırıcılık mesajı, sekmeler). Biri başarısız olursa APK yayımlanmaz;
derlenen APK “cepakil-apk” adıyla indirilebilir.

> Hata ayıklama APK'sı test içindir. Google Play'e yüklemek için kendi imza
> anahtarınızla `assembleRelease`/`bundleRelease` çalıştırıp
> `QUERY_ALL_PACKAGES` beyan formunu doldurmanız gerekir.

## 7. Proje yapısı

```
cepakil/
├── app/src/main/java/com/cepakil/
│   ├── MainActivity.kt              Giriş, "Paylaş" ile gelen bağlantı
│   ├── analiz/                      Android'den bağımsız kurallar (test edilir)
│   │   ├── Seviye.kt                KIRMIZI / SARI / BILGI / YESIL, Bulgu
│   │   ├── IzinSozlugu.kt           İzinlerin Türkçe açıklamaları
│   │   ├── UygulamaDegerlendirici.kt
│   │   ├── CihazDegerlendirici.kt
│   │   ├── DosyaDenetleyici.kt
│   │   └── BaglantiDenetleyici.kt
│   ├── veri/                        Android arayüzlerinden okuma
│   │   ├── UygulamaKaynagi.kt  CihazKaynagi.kt  DosyaKaynagi.kt
│   │   ├── TaramaDeposu.kt          Son tarama özeti
│   │   └── AyarYonlendirici.kt      Android ayar ekranlarına yönlendirme
│   └── ui/                          Compose ekranları, tema, ViewModel'ler
└── app/src/test/java/com/cepakil/analiz/   Birim testleri
```

## 8. Bilinen sınırlar ve sonraki adımlar

- Tehdit listeleri yalnız bilinen zararlıları içerir; çok yeni sahte siteler
  listeye girene kadar yalnız yazılış kurallarıyla yakalanabilir.
- Web koruması telefon yeniden başlayınca CepAkıl açılana kadar kapalı kalır
  (Android ayarlarındaki "Her zaman açık VPN" seçilirse otomatik başlar).
- Kurum ve resmi alan adı listesi elle tutulur; güncel tutulması gerekir.
- RAR/7z arşivlerinin içi denetlenmez.
- Arayüz metinleri Kotlin kodunda Türkçe yazılmıştır; başka dil eklenecekse
  `strings.xml`'e taşınmalıdır.

## 9. İmza, sürüm ve derleme çıktıları

- **Sabit imza:** Deneme ve yayın sürümleri `imza/cepakil.jks` ile imzalanır; bu sayede yeni sürüm eskisi silinmeden
  üzerine kurulur (ayarlar ve tarama kaydı korunur). **Bu anahtar depoda açık durur**: kişisel/deneme dağıtımı için
  yeterlidir, ama anahtarı bilen biri aynı imzayla "güncelleme" görünümlü bir APK üretebilir. Uygulama mağazada ya da
  geniş çevrede dağıtılacaksa gizli tutulan ayrı bir anahtara geçilmelidir (geçişte uygulama bir kez silinip yeniden kurulur).
- **Sürüm:** `versionCode` = GitHub derleme numarası, `versionName` = `0.2.<numara>` (`-Psurum=N`).
- **Kullanıcıya giden APK** küçültülmüş yayın (release, R8) sürümüdür. Sanal telefonda uçtan uca testler deneme sürümüyle
  koşar; ardından yayın sürümü aynı telefona kurulup açılır ve çökme olmadığı denetlenir.
- **Çıktılar** (APK, ekran görüntüleri, hata kanıtları) çalışma dalına değil, her seferinde tek commit olarak üzerine
  yazılan `cepakil-cikti` dalına konur; böylece depo geçmişi büyümez. `durum.txt`: derlenen commit, sonuç, sürüm.

## 10. Tehdit veritabanının biçimi ve kuralları

- Kayıtların kendisi değil 64 bitlik özetleri sıralı dizide tutulur (~480 bin kayıt ≈ 4 MB bellek; metin olarak ~60 MB'tı).
  İndirmeden sonra `filesDir/tehdit/tehdit.bin` yazılır; açılışta yalnız bu dosya okunur (onlarca ms).
- **Ortak hizmetler:** `duckdns.org`, `blogspot.com`, `vercel.app` gibi her kullanıcıya alt alan adı veren hizmetlerin
  kendisi engellenmez, listedeki **alt alan adı** engellenir. Google/GitHub/Dropbox gibi yol tabanlı paylaşım
  hizmetleri, bağlantı kısaltıcılar ve dosya paylaşım siteleri yalnız **tam adres** eşleşirse yakalanır.
- **Korunan alanlar:** Uygulamanın tanıdığı kurumların resmi adresleri ve temel hizmetler (Google, WhatsApp, e-Devlet…)
  hiçbir liste yüzünden engellenmez.
- **Web koruması:** yalnız CepAkıl'ın kendi hizmeti çalışıyorsa "açık" görünür. Son engellenen 15 site telefonda tutulur;
  Ayarlar > Koruma'dan izin verilebilir ya da izin geri alınabilir. "Özel DNS" elle ayarlıysa kullanıcı uyarılır.
- **Testler:** `UcUcaTest.t6_koruma` sanal telefonda bildirimi, listedeki sitenin engellenmesini, normal sitenin
  çözülmesini ve "İzin ver" akışını denetler.

## 11. Arka plan davranışı, güncelleme ve hatırlatmalar

- **Mobil veri:** Günlük liste güncellemesi kotalı bağlantıda atlanır; liste 3 günden eskiyse yine de indirilir.
  "Şimdi güncelle" ve ilk onay her bağlantıda indirir. İndirilemeyen kaynaklar Ayarlar'da adıyla gösterilir.
- **Web koruması:** VPN `setMetered(false)` ile kurulur (Android VPN'leri varsayılan olarak kotalı sayar). Hizmet,
  sabit bildirimli ön plan hizmetidir (`systemExempted` türü; VPN uygulamalarına tanınır). `koruma/AcilisAlici`
  telefon açılışında ve uygulama güncellenince, kullanıcı korumayı açık bıraktıysa ve VPN onayı duruyorsa yeniden başlatır.
- **Listede olmayan sahte siteler:** `BaglantiDenetleyici.webdeEngellenmeli` yalnız "kurum adı + olta kelimesi / kötüye
  kullanılan uzantı / ücretsiz barındırma" birleşimini engeller. Harf benzerliği ve karışık alfabe web korumasında
  engelleme sebebi değildir (popüler 10.000 sitede 6 yanlış engelleme yapıyordu; yeni kuralda 1: `online-instagram.com`).
- **Anında yakalama:** Web koruması çalışırken hizmet `PACKAGE_ADDED/REPLACED` haberlerini dinler ve anlık korumayı
  hemen çalıştırır; kapalıyken 15 dakikalık periyodik iş geçerlidir.
- **Pil:** Arka plan korumalarından biri açıkken uygulama pil kısıtlaması altındaysa Ayarlar > Koruma'da uyarı ve
  "Pil kısıtlamasını kaldır" düğmesi çıkar (Samsung için "Hiç uyumayan uygulamalar" yönergesiyle).
- **Haftalık kontrol** (isteğe bağlı): `HaftalikIsi` 7 günde bir `veri/Tarayici` ile tam tarama yapar, kaydı saklar,
  incelenecek konu varsa tek bildirim gönderir.
- **Play Protect:** `package_verifier_user_consent` ayarı -1 ise "Google Play Protect kapalı" (sarı); okunamazsa sessiz.
- **Uygulama içi güncelleme:** `koruma/Guncelleme` günlük güncellemeyle birlikte ya da Ayarlar > "Yeni sürüm var mı?"
  ile `cepakil-cikti/durum.txt` dosyasını okur; daha yeni sürüm varsa ana sayfada "İndir" kartı çıkar. APK tarayıcıda
  iner, kurulumu Android sorar (`REQUEST_INSTALL_PACKAGES` istenmez). Başarısız derlemeler `cepakil-hata` dalına gider.
- **Bilinen sınır:** Web koruması yalnız UDP DNS sorgularını iletir; çok uzun yanıt gerektirip TCP'ye düşen nadir
  sorgular yanıtsız kalır.
