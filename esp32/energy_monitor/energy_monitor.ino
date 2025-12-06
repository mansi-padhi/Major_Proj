/*
 * IoT Energy Monitoring System - ESP32 Firmware
 * 
 * Hardware Requirements:
 * - ESP32 Development Board
 * - ZMPT101B Voltage Sensor (AC Voltage)
 * - ACS712 Current Sensor (30A version recommended)
 * 
 * Pin Connections:
 * - ZMPT101B OUT -> GPIO 34 (ADC1_CH6)
 * - ACS712 OUT   -> GPIO 35 (ADC1_CH7)
 * - Both sensors VCC -> 3.3V
 * - Both sensors GND -> GND
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===== WiFi Configuration =====
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ===== Server Configuration =====
const char* SERVER_URL = "http://192.168.1.100:5000/api/readings";  // Change to your server IP
const char* DEVICE_ID = "ESP32_001";

// ===== Sensor Pin Configuration =====
const int VOLTAGE_PIN = 34;  // ZMPT101B connected to GPIO 34
const int CURRENT_PIN = 35;  // ACS712 connected to GPIO 35

// ===== Calibration Constants =====
// ZMPT101B Voltage Sensor
const float VOLTAGE_CALIBRATION = 220.0;  // Adjust based on your AC voltage
const float VOLTAGE_OFFSET = 1.65;        // ADC offset voltage (3.3V / 2)

// ACS712 Current Sensor (30A version)
const float CURRENT_SENSITIVITY = 0.066;  // 66mV per Amp for 30A version
const float CURRENT_OFFSET = 1.65;        // ADC offset voltage (3.3V / 2)

// ===== Sampling Configuration =====
const int SAMPLES = 1000;                 // Number of samples for RMS calculation
const int READING_INTERVAL = 5000;        // Send data every 5 seconds (ms)

// ===== Global Variables =====
unsigned long lastReadingTime = 0;
int readingCount = 0;
int successCount = 0;
int failCount = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n=================================");
  Serial.println("IoT Energy Monitor - ESP32");
  Serial.println("=================================\n");
  
  // Configure ADC
  analogReadResolution(12);  // 12-bit ADC (0-4095)
  analogSetAttenuation(ADC_11db);  // Full range: 0-3.3V
  
  // Connect to WiFi
  connectWiFi();
  
  Serial.println("\n✓ System Ready!");
  Serial.println("Starting energy monitoring...\n");
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠ WiFi disconnected. Reconnecting...");
    connectWiFi();
  }
  
  // Read sensors at specified interval
  if (millis() - lastReadingTime >= READING_INTERVAL) {
    lastReadingTime = millis();
    
    // Read voltage and current
    float voltage = readVoltage();
    float current = readCurrent();
    
    // Display readings
    Serial.println("─────────────────────────────────");
    Serial.printf("Reading #%d\n", ++readingCount);
    Serial.printf("Voltage: %.2f V\n", voltage);
    Serial.printf("Current: %.3f A\n", current);
    Serial.printf("Power:   %.2f W\n", voltage * current);
    
    // Send to server
    bool success = sendReading(voltage, current);
    
    if (success) {
      successCount++;
      Serial.println("✓ Data sent successfully");
    } else {
      failCount++;
      Serial.println("✗ Failed to send data");
    }
    
    Serial.printf("Success: %d | Failed: %d\n", successCount, failCount);
    Serial.println("─────────────────────────────────\n");
  }
}

// ===== WiFi Connection =====
void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
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
    Serial.println("Please check your credentials and try again.");
  }
}

// ===== Read Voltage (RMS) =====
float readVoltage() {
  float sum = 0;
  
  // Take multiple samples for RMS calculation
  for (int i = 0; i < SAMPLES; i++) {
    int rawValue = analogRead(VOLTAGE_PIN);
    float voltage = (rawValue / 4095.0) * 3.3;  // Convert to voltage
    float acVoltage = voltage - VOLTAGE_OFFSET;  // Remove DC offset
    sum += acVoltage * acVoltage;  // Square for RMS
    delayMicroseconds(100);  // Small delay between samples
  }
  
  // Calculate RMS
  float rms = sqrt(sum / SAMPLES);
  
  // Scale to actual AC voltage
  float actualVoltage = rms * VOLTAGE_CALIBRATION;
  
  return actualVoltage;
}

// ===== Read Current (RMS) =====
float readCurrent() {
  float sum = 0;
  
  // Take multiple samples for RMS calculation
  for (int i = 0; i < SAMPLES; i++) {
    int rawValue = analogRead(CURRENT_PIN);
    float voltage = (rawValue / 4095.0) * 3.3;  // Convert to voltage
    float acVoltage = voltage - CURRENT_OFFSET;  // Remove DC offset
    sum += acVoltage * acVoltage;  // Square for RMS
    delayMicroseconds(100);  // Small delay between samples
  }
  
  // Calculate RMS
  float rms = sqrt(sum / SAMPLES);
  
  // Convert to current using sensor sensitivity
  float current = rms / CURRENT_SENSITIVITY;
  
  // Filter out noise (readings below 0.1A are likely noise)
  if (current < 0.1) {
    current = 0;
  }
  
  return current;
}

// ===== Send Reading to Server =====
bool sendReading(float voltage, float current) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ WiFi not connected");
    return false;
  }
  
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);  // 5 second timeout
  
  // Create JSON payload
  StaticJsonDocument<200> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["voltage"] = round(voltage * 100) / 100.0;  // Round to 2 decimals
  doc["current"] = round(current * 1000) / 1000.0;  // Round to 3 decimals
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Send POST request
  int httpCode = http.POST(jsonString);
  
  bool success = false;
  if (httpCode > 0) {
    if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
      String response = http.getString();
      Serial.println("Server Response:");
      Serial.println(response);
      success = true;
    } else {
      Serial.printf("✗ HTTP Error: %d\n", httpCode);
    }
  } else {
    Serial.printf("✗ Connection Error: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
  return success;
}
