/**
 * Energy calculation utilities
 * Since we only store voltage, current, and power,
 * we calculate energy based on power readings over time
 */

// Assume readings are taken every 5 seconds (configurable)
const READING_INTERVAL_SECONDS = 5;

/**
 * Calculate total energy from power readings
 * @param {Array} readings - Array of readings with power field
 * @returns {Number} - Total energy in kWh
 */
function calculateEnergyFromReadings(readings) {
  if (!readings || readings.length === 0) return 0;
  
  // Sum all power readings
  const totalPower = readings.reduce((sum, reading) => sum + (reading.power || 0), 0);
  
  // Average power
  const avgPower = totalPower / readings.length;
  
  // Energy (kWh) = (avgPower * count * interval_seconds) / (3600 * 1000)
  const energy = (avgPower * readings.length * READING_INTERVAL_SECONDS) / (3600 * 1000);
  
  return energy;
}

/**
 * Calculate energy from aggregated power data
 * @param {Number} avgPower - Average power in Watts
 * @param {Number} count - Number of readings
 * @returns {Number} - Total energy in kWh
 */
function calculateEnergyFromAverage(avgPower, count) {
  if (!avgPower || !count) return 0;
  
  // Energy (kWh) = (avgPower * count * interval_seconds) / (3600 * 1000)
  const energy = (avgPower * count * READING_INTERVAL_SECONDS) / (3600 * 1000);
  
  return energy;
}

module.exports = {
  calculateEnergyFromReadings,
  calculateEnergyFromAverage,
  READING_INTERVAL_SECONDS
};
