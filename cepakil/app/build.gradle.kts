plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    // Ekran görüntüsü testleri (yalnız -Pgoruntu ile çalışır; bkz. EkranGoruntuleri.kt)
    id("app.cash.paparazzi")
}

android {
    namespace = "com.cepakil"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.cepakil"
        minSdk = 26          // Android 8.0
        targetSdk = 35       // Android 15
        // Derleme sistemi her derlemede artan bir numara verir (-Psurum=N); böylece yeni sürüm eskisinin üzerine kurulur.
        val surum = (project.findProperty("surum") as String?)?.toIntOrNull() ?: 1
        versionCode = surum
        versionName = "0.2.$surum"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    // Sabit imza: her derleme aynı anahtarla imzalanır, bu yüzden yeni sürüm eskisi silinmeden üzerine kurulur.
    // DİKKAT: Bu anahtar depoda açık durur (kişisel/deneme dağıtımı için). Uygulama mağazada ya da geniş
    // çevrede dağıtılacaksa gizli tutulan ayrı bir anahtara geçilmelidir (bkz. README "İmza").
    signingConfigs {
        create("sabit") {
            storeFile = rootProject.file("imza/cepakil.jks")
            storePassword = "cepakil-acik"
            keyAlias = "cepakil"
            keyPassword = "cepakil-acik"
        }
    }

    buildTypes {
        debug {
            signingConfig = signingConfigs.getByName("sabit")
        }
        release {
            signingConfig = signingConfigs.getByName("sabit")
            isShrinkResources = true
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
}

// Ekran görüntüsü testleri normal test çalıştırmasında atlanır.
tasks.withType<Test>().configureEach {
    if (!project.hasProperty("goruntu")) exclude("**/EkranGoruntuleri*")
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("androidx.work:work-runtime-ktx:2.10.0")
    // QR okuma: Play Hizmetleri kod okuyucusu (kamera izni gerektirmez)
    implementation("com.google.android.gms:play-services-code-scanner:16.1.0")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.navigation:navigation-compose:2.8.5")
    debugImplementation("androidx.compose.ui:ui-tooling")

    testImplementation("junit:junit:4.13.2")

    // Sanal telefonda uçtan uca testler (bkz. src/androidTest)
    androidTestImplementation(composeBom)
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
