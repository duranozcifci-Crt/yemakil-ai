package com.cepakil.ui.ekranlar

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.ContentPaste
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Sms
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.cepakil.analiz.BaglantiDenetleyici
import com.cepakil.analiz.MesajDenetleyici
import com.cepakil.analiz.Seviye
import com.cepakil.ui.bilesenler.Baglam
import com.cepakil.ui.bilesenler.BilgiDurumu
import com.cepakil.ui.bilesenler.BolumBasligi
import com.cepakil.ui.bilesenler.BulguGrubu
import com.cepakil.ui.bilesenler.BuyukDugme
import com.cepakil.ui.bilesenler.DurumKarti
import com.cepakil.ui.bilesenler.DurumRozeti
import com.cepakil.ui.bilesenler.Grup
import com.cepakil.ui.bilesenler.GrupAyraci
import com.cepakil.ui.bilesenler.IkincilDugme
import com.cepakil.ui.bilesenler.Satir
import com.cepakil.ui.bilesenler.SinirNotu
import com.cepakil.ui.bilesenler.UstCubuk
import com.cepakil.veri.QrOkuyucu

/**
 * Mesaj ve bağlantı kontrolü: tamamen cihazda, bağlantı AÇILMADAN yapılır.
 * Uygulamanın internet izni olmadığı için hiçbir metin dışarı gönderilmez.
 */
@Composable
fun BaglantiEkrani(paylasilan: String?, paylasilanKullanildi: () -> Unit) {
    var metin by rememberSaveable { mutableStateOf("") }
    var sonuc by rememberSaveable(stateSaver = sonucKaydedici) { mutableStateOf<MesajDenetleyici.Sonuc?>(null) }
    var qrHata by rememberSaveable { mutableStateOf<String?>(null) }
    val pano = LocalClipboardManager.current
    val klavye = LocalSoftwareKeyboardController.current
    val context = LocalContext.current

    val denetle = {
        klavye?.hide()
        sonuc = MesajDenetleyici.denetle(metin)
    }

    // "Paylaş > CepAkıl" ile gelen mesaj ya da bağlantı: kutuya yaz ve hemen denetle.
    LaunchedEffect(paylasilan) {
        if (!paylasilan.isNullOrBlank()) {
            metin = paylasilan
            sonuc = MesajDenetleyici.denetle(paylasilan)
            paylasilanKullanildi()
        }
    }

    Column(Modifier.fillMaxSize()) {
        UstCubuk("Mesaj ve bağlantı kontrolü")
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Text(
                    "Şüphelendiğin SMS'i, WhatsApp mesajını ya da bağlantıyı yapıştır. Mesajın tamamı dolandırıcılık kalıplarına göre incelenir; bağlantılar açılmaz.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            item {
                OutlinedTextField(
                    value = metin,
                    onValueChange = { metin = it; sonuc = null },
                    placeholder = { Text("Mesajı ya da bağlantıyı buraya yapıştır") },
                    leadingIcon = { Icon(Icons.Filled.Sms, contentDescription = null) },
                    trailingIcon = {
                        if (metin.isNotEmpty()) {
                            IconButton(onClick = { metin = ""; sonuc = null }) { Icon(Icons.Filled.Clear, contentDescription = "Temizle") }
                        }
                    },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text, imeAction = ImeAction.Search, autoCorrectEnabled = false),
                    keyboardActions = KeyboardActions(onSearch = { if (metin.isNotBlank()) denetle() }),
                    minLines = 3,
                    maxLines = 8,
                    shape = MaterialTheme.shapes.medium,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Pano yalnız kullanıcı bu düğmeye bastığında okunur.
                    IkincilDugme("Yapıştır", {
                        pano.getText()?.text?.let { metin = it; sonuc = MesajDenetleyici.denetle(it) }
                    }, ikon = Icons.Filled.ContentPaste, modifier = Modifier.weight(1f))
                    // QR: Google'ın hazır okuyucusu; CepAkıl kamera izni istemez.
                    IkincilDugme("QR okut", {
                        qrHata = null
                        QrOkuyucu.oku(context, basarili = { deger ->
                            metin = deger
                            sonuc = MesajDenetleyici.denetle(deger)
                        }, hata = { qrHata = it })
                    }, ikon = Icons.Filled.QrCodeScanner, modifier = Modifier.weight(1f))
                }
            }
            qrHata?.let { h -> item { Text(h, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium) } }
            item {
                BuyukDugme("Kontrol et", denetle, ikon = Icons.Filled.Search, etkin = metin.isNotBlank())
            }

            val s = sonuc
            if (s == null) {
                item {
                    BilgiDurumu(
                        Icons.Filled.Link, "Kontrol edilecek mesaj yok",
                        "Mesaja uzun basıp \"Paylaş > CepAkıl\" seçeneğiyle de buraya gönderebilirsin. QR kodları \"QR okut\" ile kontrol et.",
                    )
                }
            } else {
                item {
                    val baslik = when (s.seviye) {
                        Seviye.KIRMIZI -> if (s.mesajMi) "Dolandırıcılık işaretleri var" else "Tehlike göstergeleri var"
                        Seviye.SARI -> "Dikkat gerektiren işaretler var"
                        else -> "Kesin sonuç verilemiyor"
                    }
                    Column(Modifier.semantics { liveRegion = LiveRegionMode.Polite }) {
                        DurumKarti(s.seviye, baslik, s.ozet.substringAfter(". ", s.ozet), Baglam.BAGLANTI)
                    }
                }
                if (s.mesajMi) {
                    if (s.bulgular.isNotEmpty()) {
                        item { BolumBasligi("Mesajda bulunan işaretler") }
                        item { BulguGrubu(s.bulgular, Baglam.BAGLANTI) }
                    }
                    if (s.baglantilar.isNotEmpty()) {
                        item { BolumBasligi("Mesajdaki bağlantılar") }
                        item {
                            Grup {
                                s.baglantilar.forEachIndexed { i, b ->
                                    if (i > 0) GrupAyraci(16.dp)
                                    Satir(
                                        baslik = b.alanAdi ?: b.girilen.take(60),
                                        aciklama = b.bulgular.firstOrNull()?.baslik ?: "Bilinen göstergeye rastlanmadı",
                                        alt = { DurumRozeti(b.seviye, Baglam.BAGLANTI) },
                                    )
                                }
                            }
                        }
                    }
                } else {
                    s.baglantilar.firstOrNull()?.alanAdi?.let { alan ->
                        item {
                            BilgiSatirlari(listOf("Gideceği site" to alan, "Kayıtlı alan adı" to BaglantiDenetleyici.kayitliAlanAdi(alan)))
                        }
                    }
                    if (s.bulgular.isNotEmpty()) {
                        item { BolumBasligi("Bulunan işaretler") }
                        item { BulguGrubu(s.bulgular, Baglam.BAGLANTI) }
                    }
                }
                item {
                    SinirNotu(
                        "Bağlantıyı açma, kod paylaşma, para gönderme. Kurumun resmi uygulamasını ya da bildiğin numarasını kullanarak kendin doğrula. " +
                            "Bankalar, kargo firmaları ve e-Devlet SMS ile şifre, kod ya da kart bilgisi istemez.",
                        "Ne yapmalı?",
                    )
                }
            }
            item {
                SinirNotu(
                    "Mesaj, Türkçe dolandırıcılık kalıplarına (aciliyet, kurum adı, ödeme/kod isteği, ödül, yakın taklidi, uygulama yükletme) göre incelenir; " +
                        "bağlantılar açılmadan yalnız yazılışına bakılır. CepAkıl internete bağlanmadığı için yeni kurulmuş sahte siteleri ve yeni kurguları tanımayabilir; " +
                        "işaret bulunmaması mesajın güvenli olduğunu göstermez.",
                )
            }
        }
    }
}

/** Ekran döndürülünce sonuç kaybolmasın: girilen metinden yeniden hesaplanır. */
private val sonucKaydedici = Saver<MesajDenetleyici.Sonuc?, String>(
    save = { it?.girdi ?: "" },
    restore = { if (it.isEmpty()) null else MesajDenetleyici.denetle(it) },
)
