/*
 * IoT Energy Monitor - TEST VERSION (No Sensors Required)
 * 
 * This version generates simulated voltage and current readings
 * Perfect for testing the backend API without hardware
 * 
 * Hardware Required:
 * - ESP32 Development Board only
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===== WiFi Configuration =====
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ===== Server Configuration =====
const char* SERVER_URL = "http://192.168.1.100:5000/api/readings";  // Change to your server IP
const char* DEVICE_ID = "ESP32_TEST";

// ===== Configuration =====
const int READING_INTERVAL = 5000;  // Send data every 5 seconds

// ===== Global Variables =====
unsigned long lastReadingTime = 0;
int readingCount = 0;
int successCount = 0;
int failCount = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n=================================");
  Serial.println("IoT Energy Monitor - TEST MODE");
  Serial.println("=================================\n");
  
  // Connect to WiFi
  connectWiFi();
  
  Serial.println("\n✓ System Ready!");
  Serial.println("Generating simulated readings...\n");
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠ WiFi disconnected. Reconnecting...");
    connectWiFi();
  }
  
  // Send readings at specified interval
  if (millis() - lastReadingTime >= READING_INTERVAL) {
    lastReadingTime = millis();
    
    // Generate simulated readings
    float voltage = generateVoltage();
    float current = generateCurrent();
    
    // Display readings
    Serial.println("─────────────────────────────────");
    Serial.printf("Reading #%d (SIMULATED)\n", ++readingCount);
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

// ===== Generate Simulated Voltage =====
float generateVoltage() {
  // Simulate AC voltage around 220V with some variation
  float baseVoltage = 220.0;
  float variation = random(-10, 11);  // ±10V variation
  return baseVoltage + variation;
}

// ===== Generate Simulated Current =====
float generateCurrent() {
  // Simulate varying current load (0.5A to 10A)
  // Simulate different appliances being on/off
  int scenario = random(0, 5);
  
  switch(scenario) {
    case 0:  // Low load (LED lights)
      return random(50, 150) / 100.0;  // 0.5 - 1.5A
    case 1:  // Medium load (TV, computer)
      return random(150, 300) / 100.0;  // 1.5 - 3.0A
    case 2:  // High load (AC, heater)
      return random(500, 1000) / 100.0;  // 5.0 - 10.0A
    case 3:  // Variable load
      return random(200, 600) / 100.0;  // 2.0 - 6.0A
    default:  // Very low load (standby)
      return random(10, 50) / 100.0;  // 0.1 - 0.5A
  }
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
  
  Serial.print("Sending: ");
  Serial.println(jsonString);
  
  // Send POST request
  int httpCode = http.POST(jsonString);
  
  bool success = false;
  if (httpCode > 0) {
    if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
      String response = http.getString();
      
      // Parse and display response
      StaticJsonDocument<512> responseDoc;
      DeserializationError error = deserializeJson(responseDoc, response);
      
      if (!error) {
        Serial.println("Server Response:");
        Serial.printf("  Power: %.2f W\n", responseDoc["data"]["power"].as<float>());
        Serial.printf("  Energy: %.6f kWh\n", responseDoc["data"]["energy"].as<float>());
      }
      
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
