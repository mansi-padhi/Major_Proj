// ESP32 + TWO ACS712 30A sensors
// Sensors powered from 5V
// Outputs connected to ESP32 ADC pins via 10k/20k resistor dividers
//
// Sensor 1 OUT -> 10k -> GPIO34 -> 20k -> GND
// Sensor 2 OUT -> 10k -> GPIO35 -> 20k -> GND

#include <WiFi.h>
#include <HTTPClient.h>

// -------------------- USER SETTINGS --------------------
const int ACS1_PIN = 34;       // Sensor 1 OUT (via divider) -> GPIO34
const int ACS2_PIN = 35;       // Sensor 2 OUT (via divider) -> GPIO35

const float ADC_VREF = 3.3;    // ESP32 ADC reference voltage (3.3V)
const int   ADC_RES  = 4095;   // 12-bit ADC: 0–4095

// ACS712 sensitivity:
// 5A version  = 0.185 V/A
// 20A version = 0.100 V/A
// 30A version = 0.066 V/A
const float SENSITIVITY = 0.066;  // Volts per Ampere for 30A version

// Divider factor: sensor_out -> 10k -> ADC pin -> 20k -> GND
// Vesp = Vsensor * (20k / (10k + 20k)) = Vsensor * (2/3)
// => Vsensor = Vesp * (3/2) = Vesp * 1.5
const float DIVIDER_GAIN = 1.5;

// Offsets (sensor voltage at 0A, will be measured)
float offset1 = 0.0;
float offset2 = 0.0;

// ------------ WiFi + SERVER SETTINGS ------------
const char* ssid     = "Realme";
const char* password = "mansi1603";
const char* SERVER_URL = "http://10.97.183.155:5000/api/readings";
const char* DEVICE_ID  = "esp32-1";
const float MAINS_VOLTAGE = 230.0;   // adjust if needed

// Send data every POST_INTERVAL ms
const unsigned long POST_INTERVAL = 6000; // 6 seconds
unsigned long lastPostTime = 0;

// -------------------------------------------------------
void connectWiFi();
void sendToServer(float current1, float current2);

// -------------------------------------------------------
// SETUP
// -------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println();
  Serial.println("=== ESP32 + TWO ACS712 30A Current Sensors ===");

  // Connect to WiFi
  connectWiFi();

  Serial.println("Make sure NO LOAD is connected during calibration...");
  delay(2000);

  // Optional: ensure ADC is 12-bit
  analogReadResolution(12);

  offset1 = calibrateSensor(ACS1_PIN);
  offset2 = calibrateSensor(ACS2_PIN);

  Serial.print("Sensor 1 zero offset (V): ");
  Serial.println(offset1, 4);
  Serial.print("Sensor 2 zero offset (V): ");
  Serial.println(offset2, 4);

  Serial.println("Calibration done. Now you can connect the loads.");
  Serial.println("Reading currents...\n");
}

// -------------------------------------------------------
// LOOP
// -------------------------------------------------------
void loop() {
  float current1 = readCurrent(ACS1_PIN, offset1);
  float current2 = readCurrent(ACS2_PIN, offset2);

  Serial.print("Sensor1: ");
  Serial.print(current1, 3);
  Serial.print(" A\t");
  Serial.print("Sensor2: ");
  Serial.print(current2, 3);
  Serial.println(" A");

  // Send to backend every POST_INTERVAL ms
  unsigned long now = millis();
  if (now - lastPostTime >= POST_INTERVAL) {
    lastPostTime = now;
    sendToServer(current1, current2);
  }

  delay(300); // update every 0.3 s
}

// -------------------------------------------------------
// Functions
// -------------------------------------------------------

// Measure sensor zero offset (sensor output voltage at 0A)
float calibrateSensor(int pin) {
  const int samples = 500;
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    int raw = analogRead(pin);
    sum += raw;
    delay(2);
  }
  float avgRaw = (float)sum / samples;

  // Voltage at ESP32 pin
  float vEsp = (avgRaw * ADC_VREF) / ADC_RES;

  // Real sensor output voltage before divider
  float vSensor = vEsp * DIVIDER_GAIN;

  return vSensor;  // Offset voltage at 0A
}

// Read current (in Amps) from a given sensor
float readCurrent(int pin, float offset) {
  const int samples = 100;
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    int raw = analogRead(pin);
    sum += raw;
    delay(2);
  }
  float avgRaw = (float)sum / samples;

  // Voltage at ESP32 ADC pin
  float vEsp = (avgRaw * ADC_VREF) / ADC_RES;

  // Sensor output voltage
  float vSensor = vEsp * DIVIDER_GAIN;

  // Convert to current: I = (V - Voffset) / sensitivity
  float current = (vSensor - offset) / SENSITIVITY;

  // If you only care about magnitude (ignore direction), uncomment:
  // if (current < 0) current = -current;

  return current;
}

// -------------------------------------------------------
// WiFi + HTTP
// -------------------------------------------------------
void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("✅ WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("❌ WiFi connection failed.");
  }
}

void sendToServer(float current1, float current2) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, trying to reconnect...");
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("Still not connected, skipping POST.");
      return;
    }
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  // Build JSON body
  String json = "{";
  json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  json += "\"sensor1\":" + String(current1, 3) + ",";
  json += "\"sensor2\":" + String(current2, 3) + ",";
  json += "\"voltage\":" + String(MAINS_VOLTAGE, 1);
  json += "}";

  Serial.print("POSTing: ");
  Serial.println(json);

  int httpResponseCode = http.POST(json);

  if (httpResponseCode > 0) {
    Serial.print("Server response code: ");
    Serial.println(httpResponseCode);
    String payload = http.getString();
    Serial.println("Response: " + payload);
  } else {
    Serial.print("Error in POST: ");
    Serial.println(httpResponseCode);
  }

  http.end();
}
