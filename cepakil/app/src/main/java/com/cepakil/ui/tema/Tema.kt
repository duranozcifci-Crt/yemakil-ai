package com.cepakil.ui.tema

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.cepakil.R

/**
 * Uygulamaya gömülü Inter yazı tipi (SIL Open Font License, bkz. YAZI-TIPI-LISANSI.txt).
 * Telefonun yazı tipi ayarından bağımsız olarak her cihazda aynı görünüm sağlar;
 * telefonun yazı BOYUTU ayarı yine geçerlidir (erişilebilirlik).
 */
val Inter = FontFamily(
    Font(R.font.inter_regular, FontWeight.Normal),
    Font(R.font.inter_medium, FontWeight.Medium),
    Font(R.font.inter_semibold, FontWeight.SemiBold),
    Font(R.font.inter_bold, FontWeight.Bold),
)

private fun stil(boyut: Int, satir: Int, agirlik: FontWeight, harfAraligi: Double = 0.0) = TextStyle(
    fontFamily = Inter, fontWeight = agirlik, fontSize = boyut.sp, lineHeight = satir.sp, letterSpacing = harfAraligi.sp,
)

private val Yazi = Typography(
    displaySmall = stil(34, 40, FontWeight.Bold, -0.5),
    headlineLarge = stil(30, 36, FontWeight.Bold, -0.4),
    headlineMedium = stil(26, 32, FontWeight.Bold, -0.3),
    headlineSmall = stil(22, 28, FontWeight.SemiBold, -0.2),
    titleLarge = stil(20, 26, FontWeight.SemiBold, -0.1),
    titleMedium = stil(16, 22, FontWeight.SemiBold),
    titleSmall = stil(14, 20, FontWeight.SemiBold),
    bodyLarge = stil(16, 24, FontWeight.Normal),
    bodyMedium = stil(14, 20, FontWeight.Normal),
    bodySmall = stil(12, 16, FontWeight.Normal),
    labelLarge = stil(14, 20, FontWeight.Medium),
    labelMedium = stil(12, 16, FontWeight.Medium),
    labelSmall = stil(11, 16, FontWeight.Medium, 0.2),
)

private val Sekiller = Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(20.dp),
    extraLarge = RoundedCornerShape(28.dp),
)

private val Acik = lightColorScheme(
    primary = Color(0xFF0B5A7A),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFD3ECFA),
    onPrimaryContainer = Color(0xFF00283A),
    secondary = Color(0xFF4A5F6C),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFDDE8F0),
    onSecondaryContainer = Color(0xFF16232C),
    background = Color(0xFFF6F8FA),
    onBackground = Color(0xFF151A1E),
    surface = Color(0xFFF6F8FA),
    onSurface = Color(0xFF151A1E),
    surfaceVariant = Color(0xFFE3E8EC),
    onSurfaceVariant = Color(0xFF545F68),
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color.White,
    surfaceContainer = Color(0xFFEEF2F5),
    surfaceContainerHigh = Color(0xFFE8EDF1),
    surfaceContainerHighest = Color(0xFFE2E8ED),
    outline = Color(0xFF8A959E),
    outlineVariant = Color(0xFFDCE2E7),
    error = Color(0xFFB3261E),
)

private val Koyu = darkColorScheme(
    primary = Color(0xFF8DD0F2),
    onPrimary = Color(0xFF003549),
    primaryContainer = Color(0xFF0B4A64),
    onPrimaryContainer = Color(0xFFD3ECFA),
    secondary = Color(0xFFB4C9D6),
    onSecondary = Color(0xFF1F333D),
    secondaryContainer = Color(0xFF2E3F4A),
    onSecondaryContainer = Color(0xFFD5E4EE),
    background = Color(0xFF0E1215),
    onBackground = Color(0xFFE1E5E8),
    surface = Color(0xFF0E1215),
    onSurface = Color(0xFFE1E5E8),
    surfaceVariant = Color(0xFF2A3238),
    onSurfaceVariant = Color(0xFFAEB8C0),
    surfaceContainerLowest = Color(0xFF0A0D10),
    surfaceContainerLow = Color(0xFF161B1F),
    surfaceContainer = Color(0xFF1B2125),
    surfaceContainerHigh = Color(0xFF22292E),
    surfaceContainerHighest = Color(0xFF2B3338),
    outline = Color(0xFF78838B),
    outlineVariant = Color(0xFF2E363C),
    error = Color(0xFFFFB4AB),
)

/**
 * Durum renkleri. Renk hiçbir zaman tek başına anlam taşımaz: her durumda
 * simge ve yazılı etiket de gösterilir (renk körlüğü ve ekran okuyucular için).
 * Yazı/zemin çiftleri WCAG AA (≥4.5:1) karşıtlığını sağlayacak şekilde seçildi.
 */
@Immutable
data class DurumRenkleri(val zemin: Color, val yazi: Color, val vurgu: Color)

object Durumlar {
    fun kirmizi(koyu: Boolean) = if (koyu) DurumRenkleri(Color(0xFF3B1714), Color(0xFFFFDAD5), Color(0xFFFF8A80))
    else DurumRenkleri(Color(0xFFFDECEA), Color(0xFF7A1610), Color(0xFFC62828))

    fun sari(koyu: Boolean) = if (koyu) DurumRenkleri(Color(0xFF332705), Color(0xFFFFE08A), Color(0xFFF2C14E))
    else DurumRenkleri(Color(0xFFFFF4D6), Color(0xFF5C4300), Color(0xFFB27C00))

    fun yesil(koyu: Boolean) = if (koyu) DurumRenkleri(Color(0xFF0D2E1B), Color(0xFFC4F0D2), Color(0xFF6FD293))
    else DurumRenkleri(Color(0xFFE6F6EC), Color(0xFF14532D), Color(0xFF1E8449))

    fun gri(koyu: Boolean) = if (koyu) DurumRenkleri(Color(0xFF22292E), Color(0xFFE0E4E8), Color(0xFFAEB8C0))
    else DurumRenkleri(Color(0xFFEEF2F5), Color(0xFF2E3A44), Color(0xFF5F6B75))
}

@Composable
fun CepAkilTema(icerik: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) Koyu else Acik,
        typography = Yazi,
        shapes = Sekiller,
        content = icerik,
    )
}
