const mongoose = require('mongoose');

const readingSchema = new mongoose.Schema({
  // Core sensor data (from ESP32)
  deviceId: {
    type: String,
    required: true,
    default: 'ESP32_001',
    index: true
  },
  voltage: {
    type: Number,
    required: true,
    min: 0
  },
  current: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Optional: Individual sensor readings (for dual-sensor setups)
  sensor1: {
    type: Number,
    min: 0
  },
  sensor2: {
    type: Number,
    min: 0
  },
  
  // Calculated fields (auto-calculated by backend)
  power: {
    type: Number,
    required: false,  // Will be calculated in pre-save hook
    min: 0
  },
  energy: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Optional fields for future phases
  appliance: {
    type: String,
    enum: ['All', 'Heating & AC', 'Lighting', 'Plug Loads', 'Refrigeration', 'Other'],
    default: 'All'
  },
  location: {
    type: String,
    default: 'Home'
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for faster queries
readingSchema.index({ timestamp: -1, deviceId: 1 });
readingSchema.index({ deviceId: 1, timestamp: -1 });
readingSchema.index({ appliance: 1, timestamp: -1 });

// Pre-save hook to calculate power and energy
readingSchema.pre('save', async function() {
  // Calculate power (P = V × I) if not provided
  if (!this.power || this.power === 0) {
    this.power = this.voltage * this.current;
  }
  
  // Calculate incremental energy if this is a new reading
  if (this.isNew) {
    try {
      // Get the last reading for this device
      const lastReading = await mongoose.model('Reading')
        .findOne({ deviceId: this.deviceId })
        .sort({ timestamp: -1 });
      
      if (lastReading) {
        // Calculate time difference in hours
        const timeDiffMs = this.timestamp - lastReading.timestamp;
        const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
        
        // Calculate energy: E (kWh) = P (W) × t (hours) / 1000
        // Use average power between this and last reading
        const avgPower = (this.power + lastReading.power) / 2;
        this.energy = (avgPower * timeDiffHours) / 1000;
      } else {
        // First reading, assume 5 seconds interval
        this.energy = (this.power * 5) / (3600 * 1000);
      }
    } catch (error) {
      console.error('Error calculating energy:', error);
      // Fallback: assume 5 second interval
      this.energy = (this.power * 5) / (3600 * 1000);
    }
  }
});

// Virtual for cost calculation
readingSchema.virtual('cost').get(function() {
  const ELECTRICITY_RATE = 0.12; // $ per kWh
  return (this.energy * ELECTRICITY_RATE).toFixed(2);
});

// Method to get formatted data for frontend
readingSchema.methods.toFrontend = function() {
  const data = {
    deviceId: this.deviceId,
    voltage: parseFloat(this.voltage.toFixed(2)),
    current: parseFloat(this.current.toFixed(3)),
    power: parseFloat(this.power.toFixed(2)),
    energy: parseFloat(this.energy.toFixed(6)),
    appliance: this.appliance,
    location: this.location,
    timestamp: this.timestamp,
    cost: this.cost
  };
  
  // Include individual sensor readings if available
  if (this.sensor1 !== undefined) {
    data.sensor1 = parseFloat(this.sensor1.toFixed(3));
  }
  if (this.sensor2 !== undefined) {
    data.sensor2 = parseFloat(this.sensor2.toFixed(3));
  }
  
  return data;
};

module.exports = mongoose.model('Reading', readingSchema);
