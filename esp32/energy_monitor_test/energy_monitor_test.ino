#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===== WiFi =====
const char* WIFI_SSID     = "Galaxy M31s4140";
const char* WIFI_PASSWORD = "pfug8318";

// ===== Server =====
const char* SERVER_URL = "http://172.24.230.155:5000/api/readings";
const char* DEVICE_ID  = "esp32-1";

// ===== Pins =====
const int CURRENT_PIN = 35;
const int VOLTAGE_PIN = 34;

// ===== ACS712 Sensitivity =====
// Use the value matching YOUR module variant:
//   5A  model → 0.185
//   20A model → 0.100
//   30A model → 0.066
const float ACS712_SENSITIVITY = 0.066; // V per Amp

// ===== ZMPT101B Multiplier =====
// This MUST be tuned against a real multimeter reading.
// Step-by-step instructions are in calibrateVoltageMultiplier() below.
float VOLTAGE_MULTIPLIER = 140.86; // calibrated value from relay firmware

// ===== Sampling Config =====
// 2000 samples @ 100µs each = 200ms → covers 10 full 50Hz cycles
const int   SAMPLES        = 2000;
const int   SAMPLE_DELAY   = 100;   // microseconds between samples
const int   INTERVAL       = 5000;  // ms between send cycles

// ===== ADC Constants =====
const float ADC_REF        = 3.3;
const float ADC_MAX        = 4095.0;

// ===== Noise Floors (tune if needed) =====
const float CURRENT_NOISE_FLOOR = 1.5; // Amps  — below this → 0
const float VOLTAGE_NOISE_FLOOR = 5.0;  // Volts — below this → 0

// ===== Calibrated Midpoints (set in setup) =====
float currentOffset = 2048.0;
float voltageOffset = 2048.0;

unsigned long lastTime = 0;

// ============================================================
void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  Serial.println("\n=== ESP32 Energy Monitor ===");
  Serial.println("Calibrating midpoint offsets...");
  Serial.println(">> Make sure NO load is connected during this step!");
  delay(3000); // give you time to read the message

  calibrateOffsets();

  Serial.printf("  Current pin offset: %.1f ADC counts\n", currentOffset);
  Serial.printf("  Voltage pin offset: %.1f ADC counts\n", voltageOffset);

  // --- VOLTAGE MULTIPLIER CALIBRATION HELPER ---
  // Uncomment this block, note the "Raw RMS Voltage" printed, measure
  // mains with a multimeter, then set:
  //   VOLTAGE_MULTIPLIER = multimeter_reading / raw_rms_voltage_printed
  // Then comment it back out.
  //
  // calibrateVoltageMultiplier();

  connectWiFi();
}

// ============================================================
void loop() {
  if (WiFi.status() != WL_CONNECTED) reconnectWiFi();

  if (millis() - lastTime > INTERVAL) {
    lastTime = millis();

    float current = readCurrentRMS();
    float voltage = readVoltageRMS();
    float power   = voltage * current;

    Serial.println("\n========== READINGS ==========");
    Serial.printf("Voltage : %.2f V\n",  voltage);
    Serial.printf("Current : %.3f A\n",  current);
    Serial.printf("Power   : %.2f W\n",  power);
    Serial.println("==============================");

    sendData(voltage, current, power);
  }
}

// ============================================================
// AUTO-CALIBRATE midpoint offset.
// Both ACS712 and ZMPT101B output ~VCC/2 when idle.
// We sample that idle value and subtract it later so the
// AC waveform is centered around 0 before RMS math.
// ============================================================
void calibrateOffsets() {
  const int CAL_SAMPLES = 3000;
  long sumI = 0, sumV = 0;

  for (int i = 0; i < CAL_SAMPLES; i++) {
    sumI += analogRead(CURRENT_PIN);
    sumV += analogRead(VOLTAGE_PIN);
    delayMicroseconds(100);
  }

  currentOffset = sumI / (float)CAL_SAMPLES;
  voltageOffset = sumV / (float)CAL_SAMPLES;
}

// ============================================================
// RMS CURRENT
//
// 1. Subtract offset so the signal swings around 0
// 2. Square each sample, accumulate, divide, square-root → RMS ADC counts
// 3. Convert ADC counts → volts (using 3.3V / 4095 scale)
// 4. Convert sensor output voltage → Amps using ACS712 sensitivity
// ============================================================
float readCurrentRMS() {
  double sumSq = 0.0;

  for (int i = 0; i < SAMPLES; i++) {
    float sample = (float)analogRead(CURRENT_PIN) - currentOffset;
    sumSq += sample * sample;
    delayMicroseconds(SAMPLE_DELAY);
  }

  float rmsADC     = sqrt(sumSq / SAMPLES);
  float rmsSensorV = rmsADC * (ADC_REF / ADC_MAX); // convert to volts
  float current    = rmsSensorV / ACS712_SENSITIVITY;

  return (current < CURRENT_NOISE_FLOOR) ? 0.0 : current;
}

// ============================================================
// RMS VOLTAGE
//
// Same RMS approach. After getting the raw RMS sensor voltage,
// multiply by VOLTAGE_MULTIPLIER (your calibration factor) to
// get actual mains voltage.
// ============================================================
float readVoltageRMS() {
  double sumSq = 0.0;

  for (int i = 0; i < SAMPLES; i++) {
    float sample = (float)analogRead(VOLTAGE_PIN) - voltageOffset;
    sumSq += sample * sample;
    delayMicroseconds(SAMPLE_DELAY);
  }

  float rmsADC     = sqrt(sumSq / SAMPLES);
  float rmsSensorV = rmsADC * (ADC_REF / ADC_MAX);
  float voltage    = rmsSensorV * VOLTAGE_MULTIPLIER;

  return (voltage < VOLTAGE_NOISE_FLOOR) ? 0.0 : voltage;
}

// ============================================================
// VOLTAGE MULTIPLIER CALIBRATION HELPER
// Uncomment the call in setup() to use this.
// It prints raw RMS voltage from the sensor every 2 seconds.
// Compare that to your multimeter and compute:
//   VOLTAGE_MULTIPLIER = multimeter_V / raw_printed_V
// ============================================================
void calibrateVoltageMultiplier() {
  Serial.println("\n>>> VOLTAGE CALIBRATION MODE <<<");
  Serial.println("Measure mains with a multimeter.");
  Serial.println("Then: VOLTAGE_MULTIPLIER = multimeter_reading / Raw_RMS_V below");
  Serial.println("Connect live voltage now...\n");

  while (true) {
    double sumSq = 0.0;
    for (int i = 0; i < SAMPLES; i++) {
      float sample = (float)analogRead(VOLTAGE_PIN) - voltageOffset;
      sumSq += sample * sample;
      delayMicroseconds(SAMPLE_DELAY);
    }
    float rmsADC     = sqrt(sumSq / SAMPLES);
    float rmsSensorV = rmsADC * (ADC_REF / ADC_MAX);

    Serial.printf("Raw RMS Voltage from sensor: %.4f V  (ADC rms: %.1f)\n",
                  rmsSensorV, rmsADC);
    delay(2000);
  }
}

// ============================================================
void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());
}

void reconnectWiFi() {
  Serial.println("Reconnecting WiFi...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

// ============================================================
void sendData(float voltage, float current, float power) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<200> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["voltage"]  = round(voltage  * 10)    / 10.0;
  doc["current"]  = round(current  * 1000)  / 1000.0;
  doc["power"]    = round(power    * 10)    / 10.0;

  String body;
  serializeJson(doc, body);
  Serial.print("Sending: "); Serial.println(body);

  int code = http.POST(body);
  if (code > 0) {
    Serial.printf("✓ Sent (HTTP %d)\n", code);
    Serial.println(http.getString());
  } else {
    Serial.printf("✗ Failed: %s\n", http.errorToString(code).c_str());
  }
  http.end();
}