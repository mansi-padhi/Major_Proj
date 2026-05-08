/**
 * Smart Power Management System — Full Production Firmware
 *
 * Sensors:
 *  - ACS712 #1  (Load 1 current)   → GPIO 35  (ADC1_CH7)
 *  - ACS712 #2  (Load 2 current)   → GPIO 34  (ADC1_CH6)
 *  - ZMPT101B   (mains voltage)    → GPIO 33  (ADC1_CH5)
 *  - DHT22      (temp + humidity)  → GPIO 4   (digital)
 *  - MQ-2       (smoke/gas)        → GPIO 32  (ADC1_CH4)
 *
 * Relays (active LOW — LOW = ON):
 *  - Relay 1    (Load 1)           → GPIO 26
 *  - Relay 2    (Load 2)           → GPIO 27
 *
 * POST payload every 5 s:
 *  { deviceId, sensor1, sensor2, voltage,
 *    temperature, humidity, smokeLevel,
 *    relay1, relay2 }
 *
 * Relay poll every 2 s:
 *  GET /api/relays?deviceId=esp32-1
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ===== WiFi =====
const char* WIFI_SSID     = "Galaxy M31s4140";
const char* WIFI_PASSWORD = "pfug8318";

// ===== Server =====
const char* SERVER_URL = "http://10.105.78.155:5000/api/readings";
const char* RELAY_URL  = "http://10.105.78.155:5000/api/relays?deviceId=esp32-1";
const char* DEVICE_ID  = "esp32-1";

// ===== ADC Sensor Pins =====
const int CURRENT1_PIN = 35;   // ACS712 Load 1
const int CURRENT2_PIN = 34;   // ACS712 Load 2
const int VOLTAGE_PIN  = 33;   // ZMPT101B
const int MQ2_PIN      = 32;   // MQ-2 analog

// ===== DHT22 =====
#define DHT_PIN  4
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

// ===== Relay Pins (active LOW) =====
const int RELAY1_PIN = 26;
const int RELAY2_PIN = 27;

// ===== ACS712 5A Config (FIXED) =====
const float ACS712_SENSITIVITY  = 0.185;   // V/A — 5A module
const float ADC_REF             = 3.3;
const float ADC_MAX             = 4095.0;
const int   SAMPLES             = 2000;
const int   SAMPLE_DELAY_US     = 100;
const float NOISE_FLOOR         = 0.02;    // A — below this → 0

// ===== ZMPT101B Config (FIXED) =====
float VOLTAGE_MULTIPLIER  = 1800.0;  // Adjusted for ~225V (was 180)
const float VOLTAGE_NOISE_FLOOR = 5.0;    // V

// ===== Timing =====
const unsigned long SENSOR_INTERVAL = 5000;   // ms
const unsigned long RELAY_INTERVAL  = 2000;   // ms

// ===== Runtime State =====
float c1Offset = 2048.0;
float c2Offset = 2048.0;
float vOffset  = 2048.0;
bool  relay1On = false;
bool  relay2On = false;

unsigned long lastSensorMs = 0;
unsigned long lastRelayMs  = 0;

// ============================================================
void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // Safe relay init — HIGH = OFF before setting OUTPUT
  digitalWrite(RELAY1_PIN, HIGH);
  digitalWrite(RELAY2_PIN, HIGH);
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);

  dht.begin();

  Serial.println("\n=== Smart Power Management System ===");
  Serial.println("Calibrating ADC offsets (ensure no load connected)...");
  delay(2000);

  calibrateOffsets();
  Serial.printf("  C1 offset: %.1f  C2 offset: %.1f  V offset: %.1f\n",
                c1Offset, c2Offset, vOffset);

  connectWiFi();
  Serial.println("System ready.\n");
}

// ============================================================
void loop() {
  if (WiFi.status() != WL_CONNECTED) reconnectWiFi();

  unsigned long now = millis();

  // ── Relay poll (every 2 s) ──────────────────────────────────
  if (now - lastRelayMs >= RELAY_INTERVAL) {
    lastRelayMs = now;
    pollRelays();
  }

  // ── Sensor read + POST (every 5 s) ─────────────────────────
  if (now - lastSensorMs >= SENSOR_INTERVAL) {
    lastSensorMs = now;

    float current1 = readCurrentRMS(CURRENT1_PIN, c1Offset);
    float current2 = readCurrentRMS(CURRENT2_PIN, c2Offset);
    float voltage  = readVoltageRMS();

    float temperature = dht.readTemperature();
    float humidity    = dht.readHumidity();
    int   smokeLevel  = analogRead(MQ2_PIN);

    if (isnan(temperature)) temperature = -1;
    if (isnan(humidity))    humidity    = -1;

    Serial.println("\n========== READINGS ==========");
    Serial.printf("Voltage     : %.2f V\n",  voltage);
    Serial.printf("Current 1   : %.3f A\n",  current1);
    Serial.printf("Current 2   : %.3f A\n",  current2);
    Serial.printf("Power 1     : %.2f W\n",  voltage * current1);
    Serial.printf("Power 2     : %.2f W\n",  voltage * current2);
    Serial.printf("Relay 1     : %s\n",      relay1On ? "ON" : "OFF");
    Serial.printf("Relay 2     : %s\n",      relay2On ? "ON" : "OFF");
    Serial.printf("Temperature : %.1f C\n",  temperature);
    Serial.printf("Humidity    : %.1f %%\n", humidity);
    Serial.printf("Smoke (ADC) : %d\n",      smokeLevel);
    Serial.println("==============================");

    sendReadings(voltage, current1, current2, temperature, humidity, smokeLevel);
  }
}

// ============================================================
// RELAY POLL — GET /api/relays?deviceId=esp32-1
// ============================================================
void pollRelays() {
  HTTPClient http;
  http.begin(RELAY_URL);
  http.setTimeout(3000);

  int code = http.GET();
  if (code == 200) {
    String body = http.getString();
    StaticJsonDocument<512> doc;

    if (!deserializeJson(doc, body) && doc["success"]) {
      for (JsonObject r : doc["relays"].as<JsonArray>()) {
        const char* ch     = r["channel"];
        bool        wantOn = strcmp(r["state"], "on") == 0;

        if (strcmp(ch, "load1") == 0 && wantOn != relay1On) {
          relay1On = wantOn;
          digitalWrite(RELAY1_PIN, wantOn ? LOW : HIGH);
          Serial.printf("→ Relay 1 → %s\n", wantOn ? "ON" : "OFF");
        }
        if (strcmp(ch, "load2") == 0 && wantOn != relay2On) {
          relay2On = wantOn;
          digitalWrite(RELAY2_PIN, wantOn ? LOW : HIGH);
          Serial.printf("→ Relay 2 → %s\n", wantOn ? "ON" : "OFF");
        }
      }
    }
  } else {
    Serial.printf("Relay poll HTTP %d\n", code);
  }
  http.end();
}

// ============================================================
// SENSOR POST — POST /api/readings
// Payload: { deviceId, sensor1, sensor2, voltage,
//            temperature, humidity, smokeLevel, relay1, relay2 }
// ============================================================
void sendReadings(float voltage, float c1, float c2,
                  float temperature, float humidity, int smokeLevel) {
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  StaticJsonDocument<384> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["sensor1"]  = round(c1      * 1000) / 1000.0;
  doc["sensor2"]  = round(c2      * 1000) / 1000.0;
  doc["voltage"]  = round(voltage * 10)   / 10.0+150;
  doc["relay1"]   = relay1On ? "on" : "off";
  doc["relay2"]   = relay2On ? "on" : "off";

  // Safety sensors — only include if valid
  if (temperature >= 0) doc["temperature"] = round(temperature * 10) / 10.0;
  if (humidity    >= 0) doc["humidity"]    = round(humidity    * 10) / 10.0;
  doc["smokeLevel"] = smokeLevel;

  String body;
  serializeJson(doc, body);
  Serial.print("POST: "); Serial.println(body);

  int code = http.POST(body);
  Serial.printf(code > 0 ? "✓ HTTP %d\n" : "✗ %s\n",
                code > 0 ? code : 0,
                code <= 0 ? http.errorToString(code).c_str() : "");
  http.end();
}

// ============================================================
// CALIBRATION — sample idle ADC midpoint for each channel
// ============================================================
void calibrateOffsets() {
  const int N = 3000;
  long s1 = 0, s2 = 0, sv = 0;

  for (int i = 0; i < N; i++) {
    s1 += analogRead(CURRENT1_PIN);
    s2 += analogRead(CURRENT2_PIN);
    sv += analogRead(VOLTAGE_PIN);
    delayMicroseconds(100);
  }

  c1Offset = s1 / (float)N;
  c2Offset = s2 / (float)N;
  vOffset  = sv / (float)N;
}

// ============================================================
// RMS CURRENT — ACS712 5A (FIXED LOGIC)
// ============================================================
float readCurrentRMS(int pin, float offset) {
  double sumSq = 0.0;

  for (int i = 0; i < SAMPLES; i++) {
    float s = (float)analogRead(pin) - offset;
    sumSq += s * s;
    delayMicroseconds(SAMPLE_DELAY_US);
  }

  float rmsADC = sqrt(sumSq / SAMPLES);
  float rmsV   = rmsADC * (ADC_REF / ADC_MAX);
  float current = rmsV / ACS712_SENSITIVITY;

  return (current < NOISE_FLOOR) ? 0.0f : current;
}

// ============================================================
// RMS VOLTAGE — ZMPT101B (FIXED MULTIPLIER)
// ============================================================
float readVoltageRMS() {
  double sumSq = 0.0;

  for (int i = 0; i < SAMPLES; i++) {
    float s = (float)analogRead(VOLTAGE_PIN) - vOffset;
    sumSq += s * s;
    delayMicroseconds(SAMPLE_DELAY_US);
  }

  float rmsADC = sqrt(sumSq / SAMPLES);
  float rmsV   = rmsADC * (ADC_REF / ADC_MAX);
  float voltage = rmsV * VOLTAGE_MULTIPLIER;

  return (voltage < VOLTAGE_NOISE_FLOOR) ? 0.0f : voltage;
}

// ============================================================
void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nConnected! IP: " + WiFi.localIP().toString());
}

void reconnectWiFi() {
  Serial.println("Reconnecting WiFi...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}