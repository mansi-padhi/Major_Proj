/*
 * IoT Energy Monitoring System - ESP32 Firmware (DUAL SENSOR)
 * 
 * Hardware Requirements:
 * - ESP32 Development Board
 * - 2x ACS712 Current Sensors (30A version)
 * 
 * Pin Connections:
 * - ACS712 #1 (Load 1) OUT -> GPIO 34 (ADC1_CH6)
 * - ACS712 #2 (Load 2) OUT -> GPIO 35 (ADC1_CH7)
 * - Both sensors VCC -> 3.3V or 5V
 * - Both sensors GND -> GND
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===== WiFi Configuration =====
const char* WIFI_SSID = "YOUR_WIFI_SSID";        // Change this
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"; // Change this

// ===== Server Configuration =====
const char* SERVER_URL = "http://10.164.131.99:5000/api/readings";
const char* DEVICE_ID = "esp32-1";

// ===== Sensor Pin Configuration =====
const int CURRENT_PIN_1 = 34;  // ACS712 #1 (Load 1) connected to GPIO 34
const int CURRENT_PIN_2 = 35;  // ACS712 #2 (Load 2) connected to GPIO 35

// ===== Calibration Constants =====
// ACS712 Current Sensor (30A version)
const float CURRENT_SENSITIVITY = 0.066;  // 66mV per Amp for 30A version
const float CURRENT_OFFSET = 1.65;        // ADC offset voltage (3.3V / 2)
const float VOLTAGE_DEFAULT = 230.0;      // Default AC voltage (India standard)

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
  Serial.println("Dual ACS712 Sensor Configuration");
  Serial.println("=================================\n");
  
  // Configure ADC
  analogReadResolution(12);  // 12-bit ADC (0-4095)
  analogSetAttenuation(ADC_11db);  // Full range: 0-3.3V
  
  // Connect to WiFi
  connectWiFi();
  
  Serial.println("\n✓ System Ready!");
  Serial.println("Starting energy monitoring...");
  Serial.printf("Sending data every %d seconds\n\n", READING_INTERVAL / 1000);
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
    
    // Read both current sensors
    float current1 = readCurrent(CURRENT_PIN_1);
    float current2 = readCurrent(CURRENT_PIN_2);
    float voltage = VOLTAGE_DEFAULT;
    
    // Display readings
    Serial.println("─────────────────────────────────");
    Serial.printf("Reading #%d\n", ++readingCount);
    Serial.printf("Voltage:   %.2f V\n", voltage);
    Serial.printf("Load 1:    %.3f A  (%.2f W)\n", current1, voltage * current1);
    Serial.printf("Load 2:    %.3f A  (%.2f W)\n", current2, voltage * current2);
    Serial.printf("Total:     %.3f A  (%.2f W)\n", current1 + current2, voltage * (current1 + current2));
    
    // Send to server
    bool success = sendReading(voltage, current1, current2);
    
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

// ===== Read Current (RMS) =====
float readCurrent(int pin) {
  float sum = 0;
  
  // Take multiple samples for RMS calculation
  for (int i = 0; i < SAMPLES; i++) {
    int rawValue = analogRead(pin);
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
bool sendReading(float voltage, float sensor1, float sensor2) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ WiFi not connected");
    return false;
  }
  
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);  // 10 second timeout
  
  // Create JSON payload matching backend expectations
  StaticJsonDocument<300> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["sensor1"] = round(sensor1 * 1000) / 1000.0;  // Round to 3 decimals
  doc["sensor2"] = round(sensor2 * 1000) / 1000.0;  // Round to 3 decimals
  doc["voltage"] = round(voltage * 100) / 100.0;    // Round to 2 decimals
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.print("Sending: ");
  Serial.println(jsonString);
  
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
      String response = http.getString();
      if (response.length() > 0) {
        Serial.println("Error details:");
        Serial.println(response);
      }
    }
  } else {
    Serial.printf("✗ Connection Error: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
  return success;
}
