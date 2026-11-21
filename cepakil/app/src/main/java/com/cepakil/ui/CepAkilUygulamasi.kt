package com.cepakil.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Apps
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.automirrored.filled.InsertDriveFile
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.cepakil.ui.ekranlar.AnaEkran
import com.cepakil.ui.ekranlar.AyarlarEkrani
import com.cepakil.ui.ekranlar.BaglantiEkrani
import com.cepakil.ui.ekranlar.DosyaEkrani
import com.cepakil.ui.ekranlar.KaldirmaEkrani
import com.cepakil.ui.ekranlar.OnerilerEkrani
import com.cepakil.ui.ekranlar.UygulamaDetayEkrani
import com.cepakil.ui.ekranlar.UygulamalarEkrani

private enum class Sekme(val rota: String, val etiket: String, val ikon: ImageVector) {
    ANA("ana", "Ana sayfa", Icons.Filled.Home),
    UYGULAMALAR("uygulamalar", "Uygulamalar", Icons.Filled.Apps),
    DOSYA("dosya", "Dosya", Icons.AutoMirrored.Filled.InsertDriveFile),
    BAGLANTI("baglanti", "Bağlantı", Icons.Filled.Link),
    AYARLAR("ayarlar", "Ayarlar", Icons.Filled.Settings),
}

/**
 * Uygulamanın iskeleti: alt gezinme çubuğu + ekranlar.
 * [paylasilanMetin] başka bir uygulamadan "Paylaş" ile gelen bağlantıdır.
 */
@Composable
fun CepAkilUygulamasi(paylasilanMetin: String?, paylasilanKullanildi: () -> Unit) {
    val nav = rememberNavController()
    val taramaVm: TaramaViewModel = viewModel()
    val uygulamalarVm: UygulamalarViewModel = viewModel()
    val dosyaVm: DosyaViewModel = viewModel()
    val girdi by nav.currentBackStackEntryAsState()
    val rota = girdi?.destination?.route

    LaunchedEffect(paylasilanMetin) {
        if (!paylasilanMetin.isNullOrBlank()) sekmeyeGit(nav, Sekme.BAGLANTI.rota)
    }

    Scaffold(
        bottomBar = {
            NavigationBar {
                Sekme.entries.forEach { s ->
                    val secili = rota == s.rota ||
                        (s == Sekme.UYGULAMALAR && (rota?.startsWith("uygulama/") == true || rota?.startsWith("kaldir/") == true)) ||
                        (s == Sekme.ANA && rota == "oneriler")
                    NavigationBarItem(
                        selected = secili,
                        onClick = { sekmeyeGit(nav, s.rota) },
                        icon = { Icon(s.ikon, contentDescription = null) },
                        label = { Text(s.etiket, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                    )
                }
            }
        },
    ) { ic ->
        NavHost(nav, startDestination = Sekme.ANA.rota, modifier = Modifier.padding(ic)) {
            composable(Sekme.ANA.rota) {
                AnaEkran(taramaVm, uygulamayaGit = { nav.navigate("uygulama/$it") }, onerilereGit = { nav.navigate("oneriler") })
            }
            composable(Sekme.UYGULAMALAR.rota) {
                UygulamalarEkrani(uygulamalarVm) { nav.navigate("uygulama/$it") }
            }
            composable("uygulama/{paket}") { e ->
                val paket = e.arguments?.getString("paket").orEmpty()
                UygulamaDetayEkrani(paket, geri = { nav.popBackStack() }, kaldirmayaGit = { nav.navigate("kaldir/$paket") })
            }
            composable("kaldir/{paket}") { e ->
                KaldirmaEkrani(e.arguments?.getString("paket").orEmpty()) { nav.popBackStack() }
            }
            composable(Sekme.DOSYA.rota) { DosyaEkrani(dosyaVm) }
            composable(Sekme.BAGLANTI.rota) { BaglantiEkrani(paylasilanMetin, paylasilanKullanildi) }
            composable(Sekme.AYARLAR.rota) { AyarlarEkrani(taramaVm, uygulamalarVm) }
            composable("oneriler") {
                OnerilerEkrani(geri = { nav.popBackStack() }, baglantiKontrolunaGit = { sekmeyeGit(nav, Sekme.BAGLANTI.rota) })
            }
        }
    }
}

private fun sekmeyeGit(nav: NavHostController, rota: String) {
    nav.navigate(rota) {
        popUpTo(nav.graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}
