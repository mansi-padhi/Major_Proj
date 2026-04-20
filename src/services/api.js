// API Service for Energy Monitoring Backend
const API_BASE_URL = 'http://localhost:5000/api';

class EnergyAPI {
  // Dashboard endpoints
  static async getDashboardSummary(deviceId = null) {
    const url = deviceId 
      ? `${API_BASE_URL}/dashboard/summary?deviceId=${deviceId}`
      : `${API_BASE_URL}/dashboard/summary`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch dashboard summary');
    return response.json();
  }

  static async getRealtimeStats(deviceId = null) {
    const url = deviceId 
      ? `${API_BASE_URL}/dashboard/realtime?deviceId=${deviceId}`
      : `${API_BASE_URL}/dashboard/realtime`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch realtime stats');
    return response.json();
  }

  // Readings endpoints
  static async getLatestReading(deviceId = null) {
    const url = deviceId 
      ? `${API_BASE_URL}/readings/latest?deviceId=${deviceId}`
      : `${API_BASE_URL}/readings/latest`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch latest reading');
    return response.json();
  }

  static async getTodayReadings(deviceId = null) {
    const url = deviceId 
      ? `${API_BASE_URL}/readings/today?deviceId=${deviceId}`
      : `${API_BASE_URL}/readings/today`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch today readings');
    return response.json();
  }

  static async getMonthReadings(deviceId = null, month = null, year = null) {
    let url = `${API_BASE_URL}/readings/month`;
    const params = new URLSearchParams();
    
    if (deviceId) params.append('deviceId', deviceId);
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch month readings');
    return response.json();
  }

  static async getYearReadings(deviceId = null, year = null) {
    let url = `${API_BASE_URL}/readings/year`;
    const params = new URLSearchParams();
    
    if (deviceId) params.append('deviceId', deviceId);
    if (year) params.append('year', year);
    
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch year readings');
    return response.json();
  }

  // Cost endpoints
  static async getCost(period = 'today', deviceId = null, rate = null) {
    let url = `${API_BASE_URL}/cost?period=${period}`;
    if (deviceId) url += `&deviceId=${deviceId}`;
    if (rate) url += `&rate=${rate}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch cost');
    return response.json();
  }

  static async getCostPrediction(period = 'month', deviceId = null) {
    let url = `${API_BASE_URL}/cost/prediction?period=${period}`;
    if (deviceId) url += `&deviceId=${deviceId}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch cost prediction');
    return response.json();
  }

  static async getCostComparison(period = 'month', deviceId = null) {
    let url = `${API_BASE_URL}/cost/comparison?period=${period}`;
    if (deviceId) url += `&deviceId=${deviceId}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch cost comparison');
    return response.json();
  }

  // Appliances endpoints
  static async getAppliances(period = 'today', deviceId = null) {
    let url = `${API_BASE_URL}/appliances?period=${period}`;
    if (deviceId) url += `&deviceId=${deviceId}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch appliances');
    return response.json();
  }

  static async getApplianceData(appliance, period = 'today', deviceId = null) {
    let url = `${API_BASE_URL}/appliances/${appliance}?period=${period}`;
    if (deviceId) url += `&deviceId=${deviceId}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch appliance data');
    return response.json();
  }

  // Post new reading (for ESP32 simulation)
  static async postReading(data) {
    const response = await fetch(`${API_BASE_URL}/readings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error('Failed to post reading');
    return response.json();
  }
}

export default EnergyAPI;
