package com.cepakil.koruma

import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.VpnService
import android.os.ParcelFileDescriptor
import com.cepakil.analiz.BaglantiDenetleyici
import com.cepakil.analiz.DnsPaketi
import com.cepakil.analiz.Seviye
import com.cepakil.analiz.TehditKaynagi
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.InetSocketAddress
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

/**
 * Web koruması: telefonda çalışan, yalnız DNS sorgularını yakalayan yerel bir VPN.
 *
 * Nasıl: Telefonun DNS sunucusu olarak sanal bir adres (10.111.222.2) tanımlanır ve yalnız
 * bu adres VPN'e yönlendirilir. Bir uygulama "ornek.com nerede?" diye sorduğunda soru
 * buraya gelir; alan adı tehdit listesindeyse ya da sahte site kurallarına göre kırmızıysa
 * "böyle bir site yok" yanıtı verilir, değilse soru telefonun gerçek DNS sunucusuna iletilir.
 *
 * Gizlilik: Sitelerin içeriği, şifreli trafik ve diğer tüm bağlantılar VPN'e girmez.
 * Sorulan alan adları kaydedilmez ve hiçbir CepAkıl sunucusuna gönderilmez.
 */
class CepAkilVpn : VpnService() {

    @Volatile private var calisiyor = false
    private var arayuz: ParcelFileDescriptor? = null
    private var okuyucu: Thread? = null
    private val havuz = Executors.newFixedThreadPool(4)
    private val kararlar = ConcurrentHashMap<String, Boolean>()
    private var sonBildirim = 0L
    @Volatile private var kararVeritabani: com.cepakil.analiz.TehditVeritabani? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == DURDUR) {
            durdur(); stopSelf(); return START_NOT_STICKY
        }
        if (!calisiyor) baslat()
        return START_STICKY
    }

    override fun onRevoke() { durdur(); super.onRevoke() }
    override fun onDestroy() { durdur(); super.onDestroy() }

    private fun baslat() {
        val a = Builder()
            .setSession("CepAkıl web koruması")
            .addAddress(SANAL_IP, 32)
            .addDnsServer(SANAL_DNS)
            .addRoute(SANAL_DNS, 32)
            .setBlocking(true)
        try { a.addDisallowedApplication(packageName) } catch (_: Exception) { }
        arayuz = try { a.establish() } catch (_: Exception) { null } ?: return
        calisiyor = true
        acik = true
        Thread { TehditGuncelleyici.yukle(this) }.start()
        okuyucu = Thread(::dongu, "cepakil-dns").apply { start() }
    }

    private fun durdur() {
        calisiyor = false
        acik = false
        try { arayuz?.close() } catch (_: Exception) { }
        arayuz = null
        okuyucu?.interrupt()
        okuyucu = null
    }

    private fun dongu() {
        val fd = arayuz?.fileDescriptor ?: return
        val giris = FileInputStream(fd)
        val cikis = FileOutputStream(fd)
        val tampon = ByteArray(32767)
        while (calisiyor) {
            val n = try { giris.read(tampon) } catch (_: Exception) { break }
            if (n <= 0) continue
            val udp = DnsPaketi.ipv4UdpCoz(tampon, n) ?: continue
            if (udp.hedefPort != 53) continue
            val ad = DnsPaketi.sorguAdi(udp.veri)
            if (ad != null && engelle(ad)) {
                yaz(cikis, udp, DnsPaketi.nxdomain(udp.veri))
                bildir(ad)
                continue
            }
            havuz.execute {
                val yanit = ilet(udp.veri) ?: return@execute
                yaz(cikis, udp, yanit)
            }
        }
    }

    @Synchronized
    private fun yaz(cikis: FileOutputStream, sorgu: DnsPaketi.Udp, yanit: ByteArray) {
        try {
            cikis.write(DnsPaketi.ipv4UdpPaketle(sorgu.hedefIp, sorgu.kaynakIp, sorgu.hedefPort, sorgu.kaynakPort, yanit))
        } catch (_: Exception) { }
    }

    /** Alan adı engellensin mi? Tehdit listesi + sahte site kuralları (kırmızı). Sonuç önbelleğe alınır. */
    private fun engelle(ad: String): Boolean {
        val a = KorumaAyarlari(this)
        if (a.izinliSiteler.any { ad == it || ad.endsWith(".$it") }) return false
        // Liste yenilenince eski kararlar geçersiz olur.
        val db = TehditKaynagi.veritabani
        if (db !== kararVeritabani || kararlar.size > 4000) { kararlar.clear(); kararVeritabani = db }
        return kararlar.getOrPut(ad) { db?.hostListede(ad) == true || sahteSiteMi(ad) }
    }

    /**
     * Listede olmasa da alan adının kendisi açıkça sahteyse engellenir: kurum adı + kötüye
     * kullanılan uzantı / ücretsiz barındırma, karışık alfabe ya da harf oynanmış taklit.
     * Kurumun kendi adının başka uzantısı (ör. trendyol.com.tr) şirketin kendisine ait
     * olabileceği için engellenmez.
     */
    private fun sahteSiteMi(ad: String): Boolean {
        val s = BaglantiDenetleyici.denetle("https://$ad")
        if (s.seviye != Seviye.KIRMIZI) return false
        val sld = BaglantiDenetleyici.kayitliAlanAdi(ad).substringBefore('.')
        if (BaglantiDenetleyici.kurumlar.any { k -> k.resmi.any { it.substringBefore('.') == sld } }) return false
        return s.bulgular.any { b ->
            b.seviye == Seviye.KIRMIZI && (b.baslik.contains("çok benziyor") || b.baslik.contains("Karışık alfabe") || b.baslik.contains("resmi adres değil"))
        }
    }

    private fun bildir(ad: String) {
        val a = KorumaAyarlari(this)
        a.engellenenSayisi = a.engellenenSayisi + 1
        a.engellenenEkle(ad)
        val simdi = System.currentTimeMillis()
        if (simdi - sonBildirim < 5_000) return
        sonBildirim = simdi
        Bildirimler.siteEngellendi(this, ad)
    }

    /** DNS sorusunu telefonun gerçek DNS sunucusuna (VPN dışından) iletir. */
    private fun ilet(sorgu: ByteArray): ByteArray? {
        for (sunucu in gercekDnsSunuculari()) {
            try {
                DatagramSocket().use { s ->
                    protect(s)
                    s.soTimeout = 4000
                    s.send(DatagramPacket(sorgu, sorgu.size, InetSocketAddress(sunucu, 53)))
                    val t = ByteArray(4096)
                    val p = DatagramPacket(t, t.size)
                    s.receive(p)
                    return t.copyOf(p.length)
                }
            } catch (_: Exception) { }
        }
        return null
    }

    private fun gercekDnsSunuculari(): List<InetAddress> {
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val gercek = try {
            @Suppress("DEPRECATION")
            cm.allNetworks.filter { n ->
                val nc = cm.getNetworkCapabilities(n)
                nc != null && !nc.hasTransport(NetworkCapabilities.TRANSPORT_VPN) && nc.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            }.flatMap { cm.getLinkProperties(it)?.dnsServers.orEmpty() }
        } catch (_: Exception) { emptyList() }
        return (gercek + listOf(InetAddress.getByName("1.1.1.1"), InetAddress.getByName("8.8.8.8"))).distinct()
    }

    companion object {
        const val DURDUR = "cepakil.vpn.durdur"
        private const val SANAL_IP = "10.111.222.1"
        private const val SANAL_DNS = "10.111.222.2"

        fun baslat(context: Context) {
            context.startService(Intent(context, CepAkilVpn::class.java))
        }

        fun durdur(context: Context) {
            context.startService(Intent(context, CepAkilVpn::class.java).setAction(DURDUR))
        }

        /** CepAkıl'ın KENDİ web koruması şu an çalışıyor mu? (Başka bir VPN'in açık olması sayılmaz.) */
        @Volatile private var acik = false
        fun aktifMi(@Suppress("UNUSED_PARAMETER") context: Context): Boolean = acik

        /**
         * Telefonda "Özel DNS" elle bir sağlayıcıya ayarlı mı? Öyleyse site adı sorguları şifreli
         * olarak doğrudan o sağlayıcıya gider ve web koruması onları göremez.
         */
        fun ozelDnsElleAyarli(context: Context): Boolean = try {
            android.provider.Settings.Global.getString(context.contentResolver, "private_dns_mode") == "hostname"
        } catch (_: Exception) { false }
    }
}
