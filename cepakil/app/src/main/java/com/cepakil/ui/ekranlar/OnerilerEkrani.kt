package com.cepakil.ui.ekranlar

import android.content.Context
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Accessibility
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.GppMaybe
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Password
import androidx.compose.material.icons.filled.PrivacyTip
import androidx.compose.material.icons.filled.Shop
import androidx.compose.material.icons.filled.SystemUpdate
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.cepakil.ui.bilesenler.IkincilDugme
import com.cepakil.ui.bilesenler.UstCubuk
import com.cepakil.veri.AyarYonlendirici
import com.cepakil.veri.CihazKaynagi

private data class Oneri(
    val ikon: ImageVector,
    val baslik: String,
    val aciklama: String,
    val durum: String? = null,
    val eylemMetni: String? = null,
    val eylem: ((Context) -> Unit)? = null,
)

@Composable
fun OnerilerEkrani(geri: () -> Unit, baglantiKontrolunaGit: () -> Unit) {
    val context = LocalContext.current
    val cihaz = remember { CihazKaynagi(context.applicationContext).oku() }

    val oneriler = listOf(
        Oneri(
            Icons.Filled.SystemUpdate, "Android güncellemelerini kontrol et",
            "Güvenlik güncellemeleri bilinen açıkları kapatır. Bildirim gelmese de ayda bir kontrol etmek iyi bir alışkanlıktır.",
            durum = "Android ${cihaz.androidSurumu}" + (cihaz.guvenlikYamasi?.let { " · güvenlik yaması: $it" } ?: ""),
            eylemMetni = "Güncelleme ayarlarını aç", eylem = { AyarYonlendirici.sistemGuncelleme(it) },
        ),
        Oneri(
            Icons.Filled.Shop, "Uygulamalarını güncel tut",
            "Google Play'de profil simgesine dokun, \"Uygulamaları ve cihazı yönet\" bölümünden güncellemeleri yükle. Aynı yerden Play Protect'in açık olduğunu da kontrol edebilirsin.",
            eylemMetni = "Google Play'i aç", eylem = { AyarYonlendirici.uygulamaGuncellemeleri(it) },
        ),
        Oneri(
            Icons.Filled.GppMaybe, "Bilinmeyen kaynaklardan yüklemeyi gözden geçir",
            "Hangi uygulamaların (tarayıcı, WhatsApp, dosya yöneticisi…) APK dosyası yükletebileceğini gör. İhtiyacın olmayanlarda izni kapat.",
            eylemMetni = "Listeyi aç", eylem = { AyarYonlendirici.bilinmeyenKaynaklar(it) },
        ),
        Oneri(
            Icons.Filled.Lock, "Ekran kilidi kullan",
            "PIN, desen ya da şifre; telefon kaybolursa ya da çalınırsa verilerini korur. Doğum tarihi gibi tahmin edilebilir PIN'lerden kaçın.",
            durum = when (cihaz.ekranKilidi) { true -> "Ekran kilidi açık"; false -> "Ekran kilidi YOK"; null -> null },
            eylemMetni = if (cihaz.ekranKilidi == true) "Güvenlik ayarlarını aç" else "Ekran kilidi kur",
            eylem = { if (cihaz.ekranKilidi == true) AyarYonlendirici.guvenlik(it) else AyarYonlendirici.ekranKilidi(it) },
        ),
        Oneri(
            Icons.Filled.Accessibility, "Erişilebilirlik izinlerini gözden geçir",
            "Bu izin bir uygulamaya ekranı okuma ve senin adına dokunma gücü verir. Listede tanımadığın bir uygulama varsa kapat.",
            eylemMetni = "Erişilebilirlik ayarlarını aç", eylem = { AyarYonlendirici.erisilebilirlik(it) },
        ),
        Oneri(
            Icons.Filled.AdminPanelSettings, "Cihaz yöneticisi uygulamalarına bak",
            "Genellikle yalnız \"Cihazımı bul\" ya da iş telefonu yönetimi burada olur. Tanımadığın bir uygulamanın yetkisini kaldır.",
            eylemMetni = "Güvenlik ayarlarını aç", eylem = { AyarYonlendirici.cihazYoneticileri(it) },
        ),
        Oneri(
            Icons.Filled.NotificationsActive, "Bildirim erişimini gözden geçir",
            "Bildirim erişimi olan uygulamalar, SMS ile gelen doğrulama kodlarını da görebilir.",
            eylemMetni = "Bildirim erişimini aç", eylem = { AyarYonlendirici.bildirimErisimi(it) },
        ),
        Oneri(
            Icons.Filled.PrivacyTip, "Uygulama izinlerini düzenli kontrol et",
            "Android'in izin yöneticisinde hangi uygulamanın konum, mikrofon, kamera ve SMS iznine sahip olduğunu görebilirsin.",
            eylemMetni = "Gizlilik ayarlarını aç", eylem = { AyarYonlendirici.gizlilik(it) },
        ),
        Oneri(
            Icons.Filled.Link, "Şüpheli bağlantıları açma",
            "Kargo, ceza, iade ya da ödül vaat eden mesajlardaki bağlantılara dokunma. Emin değilsen CepAkıl'da kontrol et ya da kurumun adresini kendin yaz.",
            eylemMetni = "Bağlantı kontrolüne git", eylem = { baglantiKontrolunaGit() },
        ),
        Oneri(
            Icons.Filled.Password, "Kodlarını kimseyle paylaşma",
            "Banka, operatör, kargo ya da devlet kurumu çalışanları telefonda SMS kodunu ya da şifreni istemez. İsteyen kişi dolandırıcı olabilir.",
        ),
    )

    Column(Modifier.fillMaxSize()) {
        UstCubuk("Güvenlik önerileri", geri)
        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Text(
                    "CepAkıl ayarları senin yerine değiştirmez. Düğmeler seni Android'in ilgili ekranına götürür; bazı telefonlarda ekran adı farklı olabilir.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            items(oneriler) { o ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(o.ikon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(28.dp))
                            Spacer(Modifier.width(12.dp))
                            Text(o.baslik, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        }
                        Spacer(Modifier.size(6.dp))
                        Text(o.aciklama, style = MaterialTheme.typography.bodyMedium)
                        if (o.durum != null) {
                            Text(o.durum, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(top = 6.dp))
                        }
                        if (o.eylemMetni != null && o.eylem != null) {
                            Spacer(Modifier.size(10.dp))
                            IkincilDugme(o.eylemMetni, { o.eylem.invoke(context) })
                        }
                    }
                }
            }
        }
    }
}
