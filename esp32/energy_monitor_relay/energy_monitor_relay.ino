/*
 * Smart Power Management System — ESP32 Firmware with Relay Control
 *
 * Features:
 *  - Reads voltage (ZMPT101B) + current (ACS712) every 5 seconds
 *  - POSTs sensor data to backend /api/readings
 *  - Polls /api/relays every 5 seconds and actuates relay pins accordingly
 *  - Reports current relay state back in every POST payload
 *
 * Pin Wiring:
 *  GPIO 34  — ACS712 current sensor (Load 1)
 *  GPIO 35  — ACS712 voltage sensor (ZMPT101B)
 *  GPIO 26  — Relay module IN1  (Load 1)  ← active LOW
 *  GPIO 27  — Relay module IN2  (Load 2)  ← active LOW
 *
 * Relay module wiring:
 *  VCC  → 5V (or 3.3V depending on your module)
 *  GND  → GND
 *  IN1  → GPIO 26
 *  IN2  → GPIO 27
 *  COM  → Live wire of the load
 *  NO   → Load terminal  (Normally Open — load is OFF by default)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===== WiFi =====
const char* WIFI_SSID     = "Galaxy M31s4140";
const char* WIFI_PASSWORD = "pfug8318";

// ===== Server =====
const char* SERVER_URL  = "http://172.24.230.155:5000/api/readings";
const char* RELAY_URL   = "http://172.24.230.155:5000/api/relays?deviceId=esp32-1";
const char* DEVICE_ID   = "esp32-1";

// ===== Sensor Pins =====
const int CURRENT_PIN = 35;
const int VOLTAGE_PIN = 34;

// ===== Relay Pins (active LOW — LOW = relay ON) =====
const int RELAY1_PIN = 26;   // Load 1
const int RELAY2_PIN = 27;   // Load 2

// ===== ACS712 / ZMPT101B config (same as energy_monitor_test) =====
const float ACS712_SENSITIVITY = 0.066;
float       VOLTAGE_MULTIPLIER =147;
const int   SAMPLES            = 2000;
const int   SAMPLE_DELAY       = 100;   // µs
const float ADC_REF            = 3.3;
const float ADC_MAX            = 4095.0;
const float CURRENT_NOISE_FLOOR = 1.5;
const float VOLTAGE_NOISE_FLOOR = 5.0;

// ===== Load Detection Thresholds =====
const float LOAD_DETECTION_THRESHOLD = 0.05;  // Amps - above this = load is ON

// ===== Timing =====
const unsigned long SENSOR_INTERVAL = 5000;   // ms — send readings
const unsigned long RELAY_INTERVAL  = 2000;   // ms — poll relay state (faster response)

// ===== State =====
float currentOffset = 2048.0;
float voltageOffset = 2048.0;
bool  relay1State   = false;   // false = OFF
bool  relay2State   = false;
unsigned long lastSensorTime = 0;
unsigned long lastRelayTime  = 0;

// ============================================================
void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // Relay pins — set HIGH first (relay OFF) before setting as OUTPUT
  // to avoid a brief ON pulse on boot
  digitalWrite(RELAY1_PIN, HIGH);
  digitalWrite(RELAY2_PIN, HIGH);
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);

  Serial.println("\n=== Smart Power Management System ===");
  Serial.println("Calibrating sensor offsets (no load)...");
  delay(2000);
  calibrateOffsets();
  Serial.printf("  Current offset: %.1f  Voltage offset: %.1f\n",
                currentOffset, voltageOffset);

  connectWiFi();
  Serial.println("System ready.\n");
}

// ============================================================
void loop() {
  if (WiFi.status() != WL_CONNECTED) reconnectWiFi();

  unsigned long now = millis();

  // ── Poll relay state from backend ──────────────────────────
  if (now - lastRelayTime >= RELAY_INTERVAL) {
    lastRelayTime = now;
    pollRelayState();
  }

  // ── Read sensors and POST to backend ───────────────────────
  if (now - lastSensorTime >= SENSOR_INTERVAL) {
    lastSensorTime = now;

    float current = readCurrentRMS();
    float voltage = readVoltageRMS();
    float power   = voltage * current;

    // ── Load Detection ──────────────────────────────────────────
    bool loadDetected = (current > LOAD_DETECTION_THRESHOLD);

    Serial.println("\n========== READINGS ==========");
    Serial.printf("Voltage : %.2f V\n", voltage);
    Serial.printf("Current : %.3f A\n", current);
    Serial.printf("Power   : %.2f W\n", power);
    Serial.printf("Relay1  : %s\n", relay1State ? "ON" : "OFF");
    Serial.printf("Relay2  : %s\n", relay2State ? "ON" : "OFF");
    Serial.printf("Load    : %s (%.3fA)\n", loadDetected ? "DETECTED" : "NO LOAD", current);
    Serial.println("==============================");

    sendSensorData(voltage, current, power, loadDetected);
  }
}

// ============================================================
// RELAY POLLING
// GET /api/relays?deviceId=esp32-1
// Response: { relays: [ {channel:"load1", state:"on"}, ... ] }
// ============================================================
void pollRelayState() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(RELAY_URL);
  http.setTimeout(4000);

  int code = http.GET();
  if (code == 200) {
    String body = http.getString();
    StaticJsonDocument<512> doc;
    DeserializationError err = deserializeJson(doc, body);

    if (!err && doc["success"]) {
      JsonArray relays = doc["relays"].as<JsonArray>();
      for (JsonObject r : relays) {
        const char* channel = r["channel"];
        const char* state   = r["state"];
        bool wantOn = (strcmp(state, "on") == 0);

        if (strcmp(channel, "load1") == 0) {
          if (wantOn != relay1State) {
            relay1State = wantOn;
            // Active LOW relay: LOW = ON, HIGH = OFF
            digitalWrite(RELAY1_PIN, wantOn ? LOW : HIGH);
            Serial.printf("→ Relay 1 set to %s\n", wantOn ? "ON" : "OFF");
          }
        } else if (strcmp(channel, "load2") == 0) {
          if (wantOn != relay2State) {
            relay2State = wantOn;
            digitalWrite(RELAY2_PIN, wantOn ? LOW : HIGH);
            Serial.printf("→ Relay 2 set to %s\n", wantOn ? "ON" : "OFF");
          }
        }
      }
    }
  } else {
    Serial.printf("Relay poll failed: HTTP %d\n", code);
  }
  http.end();
}

// ============================================================
// SENSOR DATA POST
// ============================================================
void sendSensorData(float voltage, float current, float power, bool loadDetected) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["voltage"]  = round(voltage  * 10)   / 10.0;
  doc["current"]  = round(current  * 1000) / 1000.0;
  doc["power"]    = round(power    * 10)   / 10.0;
  // Report current relay state so backend stays in sync
  doc["relay1"]   = relay1State ? "on" : "off";
  doc["relay2"]   = relay2State ? "on" : "off";
  // Report actual load detection
  doc["loadDetected"] = loadDetected;

  String body;
  serializeJson(doc, body);
  Serial.print("Sending: "); Serial.println(body);

  int code = http.POST(body);
  if (code > 0) {
    Serial.printf("✓ HTTP %d\n", code);
  } else {
    Serial.printf("✗ %s\n", http.errorToString(code).c_str());
  }
  http.end();
}

// ============================================================
// CALIBRATION & SENSOR READING (same logic as energy_monitor_test)
// ============================================================
void calibrateOffsets() {
  const int N = 3000;
  long sumI = 0, sumV = 0;
  for (int i = 0; i < N; i++) {
    sumI += analogRead(CURRENT_PIN);
    sumV += analogRead(VOLTAGE_PIN);
    delayMicroseconds(100);
  }
  currentOffset = sumI / (float)N;
  voltageOffset = sumV / (float)N;
}

float readCurrentRMS() {
  double sumSq = 0.0;
  for (int i = 0; i < SAMPLES; i++) {
    float s = (float)analogRead(CURRENT_PIN) - currentOffset;
    sumSq += s * s;
    delayMicroseconds(SAMPLE_DELAY);
  }
  float rmsADC = sqrt(sumSq / SAMPLES);
  float rmsV   = rmsADC * (ADC_REF / ADC_MAX);
  float current = rmsV / ACS712_SENSITIVITY;
  return (current < CURRENT_NOISE_FLOOR) ? 0.0 : current;
}

float readVoltageRMS() {
  double sumSq = 0.0;
  for (int i = 0; i < SAMPLES; i++) {
    float s = (float)analogRead(VOLTAGE_PIN) - voltageOffset;
    sumSq += s * s;
    delayMicroseconds(SAMPLE_DELAY);
  }
  float rmsADC = sqrt(sumSq / SAMPLES);
  float rmsV   = rmsADC * (ADC_REF / ADC_MAX);
  float voltage = rmsV * VOLTAGE_MULTIPLIER;
  return (voltage < VOLTAGE_NOISE_FLOOR) ? 0.0 : voltage;
}

// ============================================================
void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());
}

void reconnectWiFi() {
  Serial.println("Reconnecting WiFi...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}
