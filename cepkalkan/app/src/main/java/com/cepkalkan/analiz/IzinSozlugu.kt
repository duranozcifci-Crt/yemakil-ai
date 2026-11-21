package com.cepkalkan.analiz

/**
 * Android izinlerinin sade Türkçe açıklamaları.
 *
 * Her açıklama iznin NELERE OLANAK VERDİĞİNİ anlatır; bir uygulamanın bu izni
 * istemesi tek başına zararlı olduğunu göstermez.
 */
object IzinSozlugu {

    enum class Tur {
        /** Kullanıcıya sorulan "tehlikeli" izinler: verilip verilmediği okunabilir. */
        CALISMA_ZAMANI,

        /** Ayarlardan ayrıca açılan özel izinler: durumu her zaman okunamaz. */
        OZEL,

        /** Hizmet bağlama izinleri: kullanıcının ayarlardan açtığı hizmetler. */
        HIZMET,
    }

    enum class Grup(val ad: String, val aciklama: String, val hassas: Boolean = true) {
        SMS("SMS", "Kısa mesajlarını okuyabilir, gönderebilir ya da gelen mesajları görebilir. Bankaların gönderdiği doğrulama kodları da buna dahildir."),
        KISILER("Kişiler", "Rehberindeki kişileri ve telefondaki hesap listesini görebilir."),
        ARAMA_KAYITLARI("Arama kayıtları", "Kimi aradığını, kimin seni aradığını ve görüşme sürelerini görebilir."),
        TELEFON("Telefon", "Arama yapabilir, telefon numaranı ve hat bilgilerini okuyabilir."),
        KONUM("Konum", "Uygulama açıkken nerede olduğunu görebilir."),
        ARKA_PLAN_KONUM("Arka planda konum", "Uygulama kapalıyken de nerede olduğunu görebilir."),
        MIKROFON("Mikrofon", "Ses kaydı yapabilir."),
        KAMERA("Kamera", "Fotoğraf ve video çekebilir."),
        TAKVIM("Takvim", "Takvimindeki etkinlikleri görebilir ya da değiştirebilir."),
        MEDYA("Fotoğraf, video ve dosyalar", "Telefonundaki fotoğrafları, videoları ve müzikleri okuyabilir."),
        TUM_DOSYALAR("Tüm dosyalara erişim", "Telefonun ortak depolamasındaki neredeyse tüm dosyaları okuyup değiştirebilir."),
        VUCUT("Vücut sensörleri", "Nabız gibi sağlık sensörlerinden veri okuyabilir."),
        UST_KATMAN("Diğer uygulamaların üzerinde gösterme", "Başka uygulamaların üstüne pencere çizebilir. Sahte giriş ekranı göstermek için kötüye kullanılabilir."),
        UYGULAMA_YUKLEME("Bilinmeyen uygulamaları yükleme", "Senin onayınla başka uygulama dosyaları (APK) yükletebilir."),
        KULLANIM_VERISI("Kullanım verisi", "Hangi uygulamaları ne zaman kullandığını görebilir."),
        ERISILEBILIRLIK("Erişilebilirlik hizmeti", "Açılırsa ekrandaki her şeyi okuyabilir ve senin adına dokunabilir. Engelli kullanıcılar için yapılmıştır; bankacılık dolandırıcılığında en çok kötüye kullanılan özelliktir."),
        CIHAZ_YONETICISI("Cihaz yöneticisi", "Açılırsa ekranı kilitleyebilir, şifre kurallarını değiştirebilir ve kendisinin kaldırılmasını zorlaştırabilir."),
        BILDIRIM_ERISIMI("Bildirim erişimi", "Açılırsa gelen tüm bildirimleri, içindeki doğrulama kodlarıyla birlikte okuyabilir."),
        UYGULAMA_LISTESI("Uygulama listesi", "Telefonda yüklü uygulamaları görebilir.", hassas = false),
    }

    data class Tanim(val izin: String, val grup: Grup, val tur: Tur)

    private const val A = "android.permission."

    private val tanimlar: Map<String, Tanim> = listOf(
        Tanim("${A}READ_SMS", Grup.SMS, Tur.CALISMA_ZAMANI),
        Tanim("${A}RECEIVE_SMS", Grup.SMS, Tur.CALISMA_ZAMANI),
        Tanim("${A}SEND_SMS", Grup.SMS, Tur.CALISMA_ZAMANI),
        Tanim("${A}RECEIVE_MMS", Grup.SMS, Tur.CALISMA_ZAMANI),
        Tanim("${A}RECEIVE_WAP_PUSH", Grup.SMS, Tur.CALISMA_ZAMANI),
        Tanim("${A}READ_CONTACTS", Grup.KISILER, Tur.CALISMA_ZAMANI),
        Tanim("${A}WRITE_CONTACTS", Grup.KISILER, Tur.CALISMA_ZAMANI),
        Tanim("${A}GET_ACCOUNTS", Grup.KISILER, Tur.CALISMA_ZAMANI),
        Tanim("${A}READ_CALL_LOG", Grup.ARAMA_KAYITLARI, Tur.CALISMA_ZAMANI),
        Tanim("${A}WRITE_CALL_LOG", Grup.ARAMA_KAYITLARI, Tur.CALISMA_ZAMANI),
        Tanim("${A}PROCESS_OUTGOING_CALLS", Grup.ARAMA_KAYITLARI, Tur.CALISMA_ZAMANI),
        Tanim("${A}CALL_PHONE", Grup.TELEFON, Tur.CALISMA_ZAMANI),
        Tanim("${A}READ_PHONE_STATE", Grup.TELEFON, Tur.CALISMA_ZAMANI),
        Tanim("${A}READ_PHONE_NUMBERS", Grup.TELEFON, Tur.CALISMA_ZAMANI),
        Tanim("${A}ANSWER_PHONE_CALLS", Grup.TELEFON, Tur.CALISMA_ZAMANI),
        Tanim("${A}ACCESS_FINE_LOCATION", Grup.KONUM, Tur.CALISMA_ZAMANI),
        Tanim("${A}ACCESS_COARSE_LOCATION", Grup.KONUM, Tur.CALISMA_ZAMANI),
        Tanim("${A}ACCESS_BACKGROUND_LOCATION", Grup.ARKA_PLAN_KONUM, Tur.CALISMA_ZAMANI),
        Tanim("${A}RECORD_AUDIO", Grup.MIKROFON, Tur.CALISMA_ZAMANI),
        Tanim("${A}CAMERA", Grup.KAMERA, Tur.CALISMA_ZAMANI),
        Tanim("${A}READ_CALENDAR", Grup.TAKVIM, Tur.CALISMA_ZAMANI),
        Tanim("${A}WRITE_CALENDAR", Grup.TAKVIM, Tur.CALISMA_ZAMANI),
        Tanim("${A}READ_EXTERNAL_STORAGE", Grup.MEDYA, Tur.CALISMA_ZAMANI),
        Tanim("${A}READ_MEDIA_IMAGES", Grup.MEDYA, Tur.CALISMA_ZAMANI),
        Tanim("${A}READ_MEDIA_VIDEO", Grup.MEDYA, Tur.CALISMA_ZAMANI),
        Tanim("${A}READ_MEDIA_AUDIO", Grup.MEDYA, Tur.CALISMA_ZAMANI),
        Tanim("${A}MANAGE_EXTERNAL_STORAGE", Grup.TUM_DOSYALAR, Tur.OZEL),
        Tanim("${A}BODY_SENSORS", Grup.VUCUT, Tur.CALISMA_ZAMANI),
        Tanim("${A}SYSTEM_ALERT_WINDOW", Grup.UST_KATMAN, Tur.OZEL),
        Tanim("${A}REQUEST_INSTALL_PACKAGES", Grup.UYGULAMA_YUKLEME, Tur.OZEL),
        Tanim("${A}PACKAGE_USAGE_STATS", Grup.KULLANIM_VERISI, Tur.OZEL),
        Tanim("${A}BIND_ACCESSIBILITY_SERVICE", Grup.ERISILEBILIRLIK, Tur.HIZMET),
        Tanim("${A}BIND_DEVICE_ADMIN", Grup.CIHAZ_YONETICISI, Tur.HIZMET),
        Tanim("${A}BIND_NOTIFICATION_LISTENER_SERVICE", Grup.BILDIRIM_ERISIMI, Tur.HIZMET),
        Tanim("${A}QUERY_ALL_PACKAGES", Grup.UYGULAMA_LISTESI, Tur.OZEL),
    ).associateBy { it.izin }

    fun tanim(izin: String): Tanim? = tanimlar[izin]

    /** "android.permission.READ_SMS" → "READ_SMS" (ekranda teknik ad olarak gösterilir). */
    fun kisaAd(izin: String): String = izin.substringAfterLast('.')

    /** Konum, mikrofon gibi "çekirdek" kişisel veri grupları (çok sayıda izin kuralı için). */
    val kisiselVeriGruplari = setOf(Grup.SMS, Grup.KISILER, Grup.ARAMA_KAYITLARI, Grup.KONUM, Grup.MIKROFON, Grup.KAMERA)
}
