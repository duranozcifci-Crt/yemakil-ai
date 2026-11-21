// Yalnız otomatik testlerde kullanılan, kodsuz deneme uygulaması:
// CepAkıl'ın "mağaza dışı + SMS izni" uygulamasını yakalayıp yakalamadığı ve
// kaldırılınca listeden düşüp düşmediği sanal telefonda denetlenir.
plugins {
    id("com.android.application")
}

android {
    namespace = "com.cepakil.ornek"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.cepakil.ornek"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1"
    }
    lint { abortOnError = false }
}
