/*
 * IoT Energy Monitoring System - ESP32 Firmware (DUAL SENSOR)
 * 
 * Hardware Requirements:
 * - ESP32 Development Board
 * - 2x ACS712 Current Sensors (30A version)
 * - ZMPT101B Voltage Sensor (optional)
 * 
 * Pin Connections:
 * - ACS712 #1 (Load 1) OUT -> GPIO 34 (ADC1_CH6)
 * - ACS712 #2 (Load 2) OUT -> GPIO 35 (ADC1_CH7)
 * - ZMPT101B OUT -> GPIO 32 (optional)
 * - All sensors VCC -> 3.3V or 5V
 * - All sensors GND -> GND
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===== WiFi Configuration =====
const char* WIFI_SSID = "YOUR_WIFI_SSID";           // ← Change this to your WiFi name
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";   // ← Change this to your WiFi password

// ===== Server Configuration =====
const char* SERVER_URL = "http://192.168.1.100:5000/api/readings";  // ← Change to your laptop's IP
const char* DEVICE_ID = "esp32-1";

// ===== Pin Configuration =====
const int CURRENT_PIN_1 = 34;  // ACS712 #1 (Load 1)
const int CURRENT_PIN_2 = 35;  // ACS712 #2 (Load 2)
const int VOLTAGE_PIN = 32;    // ZMPT101B (optional)

// ===== Calibration Constants =====
// ACS712 30A: 66mV/A sensitivity
const float CURRENT_OFFSET = 1.65;        // Half of 3.3V (sensor zero point)
const float CURRENT_SENSITIVITY = 0.066;  // 66mV per Ampere

// ZMPT101B Voltage Sensor
const float VOLTAGE_OFFSET = 1.65;
const float VOLTAGE_MULTIPLIER = 180.0;   // Adjust based on your mains voltage (230V AC)

// ===== Measurement Configuration =====
const int SAMPLES = 1000;           // Number of samples for RMS calculation
const int SAMPLE_DELAY_US = 100;    // Delay between samples (microseconds)
const int SEND_INTERVAL = 6000;     // Send data every 6 seconds

// ===== Global Variables =====
unsigned long lastSendTime = 0;
int sendCount = 0;

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n========================================");
  Serial.println("  IoT Energy Monitor - Dual Sensor");
  Serial.println("========================================\n");

  // Configure ADC
  analogReadResolution(12);  // 12-bit resolution (0-4095)
  analogSetAttenuation(ADC_11db);  // Full range 0-3.3V

  // Connect to WiFi
  connectWiFi();
  
  Serial.println("\n✓ System Ready!");
  Serial.println("Starting measurements...\n");
}

// ================= MAIN LOOP =================
void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠ WiFi disconnected! Reconnecting...");
    reconnectWiFi();
  }

  // Send data at specified interval
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = millis();
    sendCount++;

    // Read sensors
    float voltage = readVoltage();
    float current1 = readCurrent(CURRENT_PIN_1);
    float current2 = readCurrent(CURRENT_PIN_2);

    // Calculate power
    float power1 = voltage * current1;
    float power2 = voltage * current2;
    float totalPower = power1 + power2;

    // Display readings
    Serial.println("========================================");
    Serial.printf("Reading #%d\n", sendCount);
    Serial.println("========================================");
    Serial.printf("Voltage:      %.2f V\n", voltage);
    Serial.printf("Current L1:   %.3f A\n", current1);
    Serial.printf("Current L2:   %.3f A\n", current2);
    Serial.printf("Power L1:     %.2f W\n", power1);
    Serial.printf("Power L2:     %.2f W\n", power2);
    Serial.printf("Total Power:  %.2f W\n", totalPower);
    Serial.println("----------------------------------------");

    // Send to server
    sendData(voltage, current1, current2);
  }
}

// ================= WiFi Functions =================
void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n✗ WiFi Connection Failed!");
    Serial.println("Please check SSID and password");
  }
}

void reconnectWiFi() {
  WiFi.disconnect();
  delay(1000);
  connectWiFi();
}

// ================= Sensor Reading Functions =================

// Read current from ACS712 sensor (RMS calculation)
float readCurrent(int pin) {
  float sumSquares = 0;
  int validSamples = 0;

  for (int i = 0; i < SAMPLES; i++) {
    int rawValue = analogRead(pin);
    float voltage = rawValue * (3.3 / 4095.0);  // Convert to voltage
    float centered = voltage - CURRENT_OFFSET;   // Remove DC offset
    sumSquares += centered * centered;
    validSamples++;
    delayMicroseconds(SAMPLE_DELAY_US);
  }

  // Calculate RMS voltage
  float rmsVoltage = sqrt(sumSquares / validSamples);
  
  // Convert to current using sensor sensitivity
  float current = rmsVoltage / CURRENT_SENSITIVITY;

  // Noise filter - ignore very small currents
  if (current < 0.05) {
    current = 0.0;
  }

  return current;
}

// Read voltage from ZMPT101B sensor (RMS calculation)
float readVoltage() {
  float sumSquares = 0;
  int validSamples = 0;

  for (int i = 0; i < SAMPLES; i++) {
    int rawValue = analogRead(VOLTAGE_PIN);
    float voltage = rawValue * (3.3 / 4095.0);  // Convert to voltage
    float centered = voltage - VOLTAGE_OFFSET;   // Remove DC offset
    sumSquares += centered * centered;
    validSamples++;
    delayMicroseconds(SAMPLE_DELAY_US);
  }

  // Calculate RMS voltage
  float rmsVoltage = sqrt(sumSquares / validSamples);
  
  // Scale to actual mains voltage
  float mainsVoltage = rmsVoltage * VOLTAGE_MULTIPLIER;

  // If voltage sensor not connected or reading is too low, use default 230V
  if (mainsVoltage < 100 || mainsVoltage > 300) {
    mainsVoltage = 230.0;  // Default to 230V AC
  }

  return mainsVoltage;
}

// ================= Data Transmission =================
void sendData(float voltage, float current1, float current2) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ Cannot send - WiFi not connected");
    return;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);  // 5 second timeout

  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["sensor1"] = round(current1 * 1000) / 1000.0;  // Load 1 current (3 decimals)
  doc["sensor2"] = round(current2 * 1000) / 1000.0;  // Load 2 current (3 decimals)
  doc["voltage"] = round(voltage * 10) / 10.0;       // Voltage (1 decimal)

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  Serial.print("Sending to server: ");
  Serial.println(jsonPayload);

  // Send POST request
  int httpCode = http.POST(jsonPayload);

  // Check response
  if (httpCode > 0) {
    Serial.printf("✓ Server Response: HTTP %d\n", httpCode);
    
    if (httpCode == 200 || httpCode == 201) {
      String response = http.getString();
      Serial.println("Response: " + response);
      Serial.println("✓ Data saved successfully!");
    }
  } else {
    Serial.printf("✗ HTTP Error: %s\n", http.errorToString(httpCode).c_str());
    Serial.println("Check if server is running and IP address is correct");
  }

  http.end();
  Serial.println("========================================\n");
}
