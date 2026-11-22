package com.cepakil.analiz

import java.util.Locale

/**
 * Yüklü bir uygulamanın Android'den okunabilen bilgilerini (istediği izinler,
 * nereden yüklendiği, açık hizmetleri) kurallarla değerlendirir.
 *
 * Bu bir zararlı yazılım taraması DEĞİLDİR: uygulamanın kodu incelenmez, imza
 * veritabanıyla karşılaştırılmaz. Sonuç "zararlı/temiz" değil, "incele" önerisidir.
 */
object UygulamaDegerlendirici {

    data class UygulamaBilgisi(
        val paket: String,
        val ad: String,
        val sistemUygulamasi: Boolean,
        /** Yükleyen uygulamanın paket adı (ör. com.android.vending). Bilinmiyorsa null. */
        val yukleyen: String?,
        val hedefSdk: Int,
        /** İzin adı → verilmiş mi. Özel izinlerde "verildi" bilgisi güvenilir değildir. */
        val izinler: Map<String, Boolean>,
        val kategori: Kategori = Kategori.BILINMIYOR,
        val erisilebilirlikAcik: Boolean = false,
        val cihazYoneticisiAcik: Boolean = false,
        val bildirimErisimiAcik: Boolean = false,
        val varsayilanSmsUygulamasi: Boolean = false,
        /** Bilinmeyen kaynaklardan yükleme izni açık mı? Okunamadıysa null. */
        val bilinmeyenKaynakIzni: Boolean? = null,
        val surum: String? = null,
        /** Son yükleme/güncelleme zamanı (ms). Yeni uygulama takibi için. */
        val sonGuncelleme: Long = 0,
        /**
         * Telefonun sistem uygulamalarıyla AYNI imzayı taşıyor: telefon üreticisinin
         * (ör. Samsung) kendi uygulaması. İmza üreticinin gizli anahtarı olmadan
         * taklit edilemez; bu yüzden güvenilir kaynak sayılır.
         */
        val ureticiUygulamasi: Boolean = false,
    )

    /** ApplicationInfo.category karşılığı (Android 8+ uygulamalar kendisi bildirir). */
    enum class Kategori { OYUN, SES, VIDEO, FOTOGRAF, SOSYAL, HABER, HARITA, VERIMLILIK, ERISILEBILIRLIK, BILINMIYOR }

    data class Sonuc(val bilgi: UygulamaBilgisi, val seviye: Seviye, val bulgular: List<Bulgu>)

    /** Bilinen uygulama mağazaları (yükleyen paket adları). */
    val bilinenMagazalar = setOf(
        "com.android.vending", "com.google.android.feedback", "com.huawei.appmarket",
        "com.sec.android.app.samsungapps", "com.xiaomi.market", "com.xiaomi.mipicks",
        "com.heytap.market", "com.oppo.market", "com.bbk.appstore", "com.vivo.appstore",
        "com.amazon.venezia", "org.fdroid.fdroid", "com.aurora.store", "com.oneplus.market",
        "com.transsion.phoenix", "com.lenovo.leos.appstore", "com.miui.packageinstaller.market",
    )

    /** Sık kullanılan, sınırlı iş yapan uygulama türleri: kişisel veri izni beklenmez. */
    private val basitUygulamaSozcukleri = listOf(
        "fener", "flashlight", "torch", "hesap makinesi", "calculator", "duvar kağıdı",
        "wallpaper", "pusula", "compass", "qr", "barkod", "barcode", "pil", "battery",
        "temizle", "cleaner", "booster", "hızlandır", "not defteri", "notepad", "zil sesi", "ringtone",
    )

    /** Web uygulamalarını (WebAPK) ana ekrana ekleyen tarayıcılar. */
    val tarayicilar = setOf(
        "com.android.chrome", "com.chrome.beta", "com.chrome.dev", "com.sec.android.app.sbrowser",
        "com.sec.android.app.sbrowser.beta", "org.mozilla.firefox", "com.microsoft.emmx", "com.opera.browser", "com.brave.browser",
    )

    fun magazadanMi(yukleyen: String?): Boolean = yukleyen != null && yukleyen in bilinenMagazalar

    fun degerlendir(u: UygulamaBilgisi): Sonuc {
        val b = mutableListOf<Bulgu>()
        val verilenGruplar = u.izinler.filter { it.value }.keys
            .mapNotNull { IzinSozlugu.tanim(it) }
            .filter { it.tur == IzinSozlugu.Tur.CALISMA_ZAMANI }
            .map { it.grup }.toSet()
        val istenenGruplar = u.izinler.keys.mapNotNull { IzinSozlugu.tanim(it)?.grup }.toSet()
        // Sistem ve üretici uygulamalarına "mağaza dışı" ya da "beklenmedik izin" kuralları uygulanmaz.
        val ozel = u.sistemUygulamasi || u.ureticiUygulamasi
        val webUygulamasi = u.paket.startsWith("org.chromium.webapk.") || u.yukleyen in tarayicilar
        val magazaDisi = !ozel && !webUygulamasi && !magazadanMi(u.yukleyen)
        // Google Play hassas izinleri (SMS, arama kaydı, arka plan konum…) yayından önce kendisi denetler.
        val playden = u.yukleyen == "com.android.vending"

        if (webUygulamasi && !ozel) {
            b += Bulgu(
                Seviye.BILGI, "Tarayıcıdan eklenmiş web uygulaması",
                "Bir web sitesinin ana ekrana eklenmiş hâli. Tarayıcının içinde çalışır; uygulama mağazası denetiminden geçmez ama sıradan bir uygulamanın yetkilerine de sahip değildir.",
            )
        }
        if (magazaDisi) {
            b += Bulgu(
                Seviye.SARI, "Bilinen bir mağazadan yüklenmemiş",
                if (u.yukleyen == null) "Android bu uygulamayı neyin yüklediğini bildirmiyor. Bir dosyadan (APK) ya da bilgisayardan yüklenmiş olabilir. Tanıdığın bir uygulama değilse incele."
                else "Yükleyen: ${u.yukleyen}. Google Play gibi bilinen bir mağaza değil. Dosyadan ya da başka bir uygulama aracılığıyla yüklenmiş olabilir.",
            )
        }

        if (u.erisilebilirlikAcik) {
            b += Bulgu(
                if (magazaDisi) Seviye.KIRMIZI else Seviye.SARI, "Erişilebilirlik hizmeti açık",
                "Bu uygulama ekrandaki her şeyi okuyabilir ve senin adına dokunabilir. Bunu sen bilerek açtıysan (ör. ekran okuyucu, parola yöneticisi) sorun olmayabilir; hatırlamıyorsan kapat." +
                    if (magazaDisi) " Mağaza dışından yüklenmiş bir uygulamada bu birleşim bankacılık dolandırıcılığında sık görülür." else "",
            )
        }

        if (u.cihazYoneticisiAcik) {
            b += Bulgu(
                if (magazaDisi) Seviye.KIRMIZI else Seviye.SARI, "Cihaz yöneticisi olarak etkin",
                "Ekranı kilitleyebilir ve kaldırılmasını zorlaştırabilir. İş telefonu yönetimi ya da \"cihazımı bul\" gibi uygulamalar bunu kullanır; tanımıyorsan güvenlik ayarlarından yetkisini kaldır.",
            )
        }

        if (u.bildirimErisimiAcik && !ozel) {
            b += Bulgu(
                if (magazaDisi) Seviye.SARI else Seviye.BILGI, "Bildirimlerini okuyabiliyor",
                "Gelen bildirimleri, içindeki doğrulama kodlarıyla birlikte görebilir. Akıllı saat ya da otomasyon uygulamaları için normaldir.",
            )
        }

        val smsOkuma = listOf("READ_SMS", "RECEIVE_SMS").any { u.izinler["android.permission.$it"] == true }
        if (smsOkuma && !u.varsayilanSmsUygulamasi && !ozel) {
            b += Bulgu(
                when { magazaDisi -> Seviye.KIRMIZI; playden -> Seviye.BILGI; else -> Seviye.SARI }, "SMS okuma izni var",
                "Bu uygulama mesaj uygulaman değil ama SMS'lerini okuyabiliyor; bankaların gönderdiği tek kullanımlık şifreler dahil." +
                    if (playden) " Google Play bu izni yalnız denetleyip onayladığı uygulamalara verir (ör. doğrulama kodunu otomatik okuma)." else " Gerçekten gerekli mi?",
            )
        }

        val ustKatman = "android.permission.SYSTEM_ALERT_WINDOW" in u.izinler
        if (ustKatman && !ozel && (magazaDisi || u.erisilebilirlikAcik)) {
            b += Bulgu(
                Seviye.SARI, "Diğer uygulamaların üzerinde gösterme istiyor",
                "Başka uygulamaların üstüne pencere çizebilir. Mağaza dışı bir uygulamada sahte giriş ekranı için kullanılabilir. Durumunu uygulama ayarlarından kontrol et.",
            )
        }

        if ("android.permission.REQUEST_INSTALL_PACKAGES" in u.izinler && !ozel) {
            val acik = u.bilinmeyenKaynakIzni == true
            b += Bulgu(
                when {
                    acik && magazaDisi -> Seviye.KIRMIZI
                    acik || magazaDisi -> Seviye.SARI
                    else -> Seviye.BILGI
                },
                if (acik) "Uygulama yükleme izni AÇIK" else "Başka uygulama yükleyebilir",
                if (acik) "Bu uygulamaya \"bilinmeyen uygulamaları yükleme\" izni verilmiş. Tarayıcı ya da dosya yöneticisi değilse ve buna ihtiyacın yoksa kapat."
                else "Bu izni istiyor; Android yine de her yükleme için ayrıca onayını sorar. Tarayıcılar ve dosya yöneticileri için normaldir.",
            )
        }

        if (!ozel && IzinSozlugu.Grup.ARKA_PLAN_KONUM in verilenGruplar) {
            b += Bulgu(if (playden) Seviye.BILGI else Seviye.SARI, "Arka planda konum izni verilmiş", "Uygulama kapalıyken de konumunu alabilir. Navigasyon, aile takip ya da konum paylaşımı dışında nadiren gerekir.")
        }

        val kisiselVerilen = verilenGruplar.intersect(IzinSozlugu.kisiselVeriGruplari)
        if (!ozel && kisiselVerilen.size >= 4) {
            b += Bulgu(
                if (magazaDisi) Seviye.SARI else Seviye.BILGI, "Çok sayıda hassas izin verilmiş",
                "${kisiselVerilen.joinToString { it.ad.lowercase(Locale("tr")) }} izinleri verilmiş. Her birinin bu uygulama için gerçekten gerekli olup olmadığını düşün.",
            )
        }

        // Beklenmedik izinler: oyun ya da basit araç uygulamasında kişisel veri izinleri.
        val adKucuk = u.ad.lowercase(Locale("tr"))
        val basit = u.kategori == Kategori.OYUN || basitUygulamaSozcukleri.any { adKucuk.contains(it) }
        val beklenmedik = verilenGruplar.intersect(setOf(IzinSozlugu.Grup.SMS, IzinSozlugu.Grup.KISILER, IzinSozlugu.Grup.ARAMA_KAYITLARI, IzinSozlugu.Grup.MIKROFON))
        if (!ozel && basit && beklenmedik.isNotEmpty()) {
            b += Bulgu(
                Seviye.SARI, "Bu tür bir uygulama için beklenmedik izin",
                "${if (u.kategori == Kategori.OYUN) "Bir oyun" else "Basit bir araç uygulaması"} için ${beklenmedik.joinToString { it.ad.lowercase(Locale("tr")) }} izni alışılmadık. Uygulama ayarlarından izni kaldırabilirsin.",
            )
        }

        if (!ozel && u.hedefSdk in 1..22) {
            b += Bulgu(
                Seviye.SARI, "Çok eski Android için yapılmış",
                "Bu uygulama Android 6 öncesi kurallara göre hazırlanmış (hedef API ${u.hedefSdk}). Bu tür uygulamalar izinleri yükleme anında toplu alabilir. Uzun süredir güncellenmemiş olabilir.",
            )
        } else if (!ozel && u.hedefSdk in 23..28) {
            b += Bulgu(Seviye.BILGI, "Eski Android sürümünü hedefliyor", "Hedef API ${u.hedefSdk}. Uzun süredir güncellenmemiş olabilir; yeni Android'in bazı gizlilik korumaları bu uygulamaya tam uygulanmaz.")
        }

        if (!ozel && IzinSozlugu.Grup.TUM_DOSYALAR in istenenGruplar) {
            b += Bulgu(Seviye.BILGI, "Tüm dosyalara erişim istiyor", "Dosya yöneticisi ve yedekleme uygulamaları için normaldir. Başka bir uygulamaysa izin durumunu ayarlardan kontrol et.")
        }

        val sirali = b.oneminGoreSirala()
        return Sonuc(u, sirali.enYuksekSeviye(), sirali)
    }
}
