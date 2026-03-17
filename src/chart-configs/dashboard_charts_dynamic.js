// Dynamic chart configurations that use Redux state data
import moment from 'moment';
import { transformDashboardChart1, transformTimeSeriesChart } from '../utils/chartDataTransformer';

// Chart 1: Cost Breakdown (Doughnut Chart)
export function getDashboardChart1Config(dashboardData, period = 'month') {
  if (!dashboardData || !dashboardData[period]) {
    return getDefaultChart1Config(period);
  }
  return transformDashboardChart1(dashboardData, period);
}

// Chart 2: Energy Consumption Over Time
export function getDashboardChart2Config(readings, period = 'month') {
  return transformTimeSeriesChart(readings, period, 'energy');
}

// Chart 3: Power Usage Over Time
export function getDashboardChart3Config(readings, period = 'month') {
  return transformTimeSeriesChart(readings, period, 'power');
}

// Chart 4: Active Appliances (Horizontal Stacked Bar)
export function getDashboardChart4Config(readings, period = 'month') {
  if (!readings || !readings.data || readings.data.length === 0) {
    return getEmptyStackedBarChart(period);
  }

  const data = readings.data;
  
  // Calculate average current for each sensor across the period
  // Then calculate power: P = V × I
  const VOLTAGE = 3.3; // Voltage for calculation (Note: This should be mains voltage 230V for accurate power readings)
  let totalSensor1Current = 0;
  let totalSensor2Current = 0;
  let count = 0;
  
  data.forEach(item => {
    // If sensor data is available in aggregated results, use it
    // Otherwise, estimate from total current (sensor1 ≈ 30%, sensor2 ≈ 70% based on typical readings)
    if (item.avgSensor1 !== undefined && item.avgSensor2 !== undefined) {
      totalSensor1Current += parseFloat(item.avgSensor1 || 0);
      totalSensor2Current += parseFloat(item.avgSensor2 || 0);
    } else if (item.avgCurrent !== undefined) {
      // Estimate split based on typical ratio
      const avgCurrent = parseFloat(item.avgCurrent || 0);
      totalSensor1Current += avgCurrent * 0.30;
      totalSensor2Current += avgCurrent * 0.70;
    }
    count++;
  });
  
  const avgSensor1Current = count > 0 ? totalSensor1Current / count : 0;
  const avgSensor2Current = count > 0 ? totalSensor2Current / count : 0;
  
  // Calculate power for each load: P = V × I
  const load1Power = VOLTAGE * avgSensor1Current;
  const load2Power = VOLTAGE * avgSensor2Current;
  
  const categories = [
    { label: "Load 1" },
    { label: "Load 2" }
  ];
  
  const dataPoints = [
    { 
      value: load1Power.toFixed(2),
      toolText: `Load 1: ${load1Power.toFixed(2)} W (${avgSensor1Current.toFixed(3)} A)`
    },
    { 
      value: load2Power.toFixed(2),
      toolText: `Load 2: ${load2Power.toFixed(2)} W (${avgSensor2Current.toFixed(3)} A)`
    }
  ];

  return {
    chart: {
      bgColor: "#1D1B41",
      bgAlpha: "0",
      canvasBgAlpha: "0",
      showBorder: "0",
      showCanvasBorder: "0",
      showValues: "1",
      showAlternateHGridColor: "0",
      paletteColors: "#58E2C2",
      drawCustomLegendIcon: "1",
      baseFontSize: "14",
      baseFontColor: "#FDFDFD",
      baseFont: "Nunito Sans",
      numberSuffix: " W",
      toolTipBgcolor: "#484E69",
      toolTipPadding: "5",
      toolTipBorderRadius: "2",
      toolTipBorderAlpha: "30",
      tooltipBorderThickness: "0.7",
      toolTipColor: "#FDFDFD",
      showXAxisLine: "1",
      showYAxisLine: "1",
      xAxisLineColor: "#9092A4",
      yAxisLineColor: "#9092A4",
      divLineColor: "#414761",
      divLineAlpha: "100",
      divLineDashed: "1",
      placeValuesInside: "0",
      valueFontColor: "#FDFDFD"
    },
    categories: [{ category: categories }],
    dataset: [{
      seriesname: 'Power Usage',
      data: dataPoints
    }]
  };
}

// Chart 5: Current Over Time
export function getDashboardChart5Config(readings, period = 'month') {
  return transformTimeSeriesChart(readings, period, 'current');
}

// Chart 6: Cost Over Time
export function getDashboardChart6Config(readings, period = 'month') {
  if (!readings || !readings.data || readings.data.length === 0) {
    return getEmptyLineChart(period, 'Cost', '$');
  }

  let categories = [];
  let dataPoints = [];
  const RATE = 0.12;
  const data = readings.data;

  if (period === 'today') {
    const hourlyData = Array(24).fill(0);
    
    data.forEach(item => {
      const hour = item._id;
      if (hour >= 0 && hour < 24) {
        hourlyData[hour] = parseFloat(item.totalEnergy || 0);
      }
    });

    for (let i = 0; i < 24; i++) {
      categories.push({ label: `${i}:00` });
      const cost = hourlyData[i] * RATE;
      dataPoints.push({ value: cost.toFixed(2) });
    }
  } else if (period === 'month') {
    const daysInMonth = moment().daysInMonth();
    const dailyData = Array(daysInMonth).fill(0);
    
    data.forEach(item => {
      const day = item._id - 1;
      if (day >= 0 && day < daysInMonth) {
        dailyData[day] = parseFloat(item.totalEnergy || 0);
      }
    });

    for (let i = 0; i < daysInMonth; i++) {
      categories.push({ label: `${i + 1}` });
      const cost = dailyData[i] * RATE;
      dataPoints.push({ value: cost.toFixed(2) });
    }
  } else if (period === 'year') {
    const monthlyData = Array(12).fill(0);
    
    data.forEach(item => {
      const month = item._id - 1;
      if (month >= 0 && month < 12) {
        monthlyData[month] = parseFloat(item.totalEnergy || 0);
      }
    });

    for (let i = 0; i < 12; i++) {
      categories.push({ label: moment().month(i).format('MMM') });
      const cost = monthlyData[i] * RATE;
      dataPoints.push({ value: cost.toFixed(2) });
    }
  }

  return {
    chart: {
      bgColor: "#1D1B41",
      bgAlpha: "0",
      canvasBgAlpha: "0",
      showBorder: "0",
      showCanvasBorder: "0",
      showValues: "0",
      showAlternateHGridColor: "0",
      paletteColors: "#F7E53B",
      drawCustomLegendIcon: "1",
      baseFontSize: "14",
      baseFontColor: "#FDFDFD",
      baseFont: "Nunito Sans",
      numberPrefix: "₹",
      toolTipBgcolor: "#484E69",
      toolTipPadding: "5",
      toolTipBorderRadius: "2",
      toolTipBorderAlpha: "30",
      tooltipBorderThickness: "0.7",
      toolTipColor: "#FDFDFD",
      showXAxisLine: "1",
      showYAxisLine: "1",
      xAxisLineColor: "#9092A4",
      yAxisLineColor: "#9092A4",
      divLineColor: "#414761",
      divLineAlpha: "100",
      divLineDashed: "1"
    },
    categories: [{ category: categories }],
    dataset: [{
      seriesname: 'Cost',
      data: dataPoints
    }]
  };
}

// Chart 7: Cumulative Energy
export function getDashboardChart7Config(readings, period = 'month') {
  if (!readings || !readings.data || readings.data.length === 0) {
    return getEmptyLineChart(period, 'Cumulative Energy', ' kWh');
  }

  let categories = [];
  let dataPoints = [];
  let cumulative = 0;
  const data = readings.data;

  if (period === 'today') {
    const hourlyData = Array(24).fill(0);
    
    data.forEach(item => {
      const hour = item._id;
      if (hour >= 0 && hour < 24) {
        hourlyData[hour] = parseFloat(item.totalEnergy || 0);
      }
    });

    for (let i = 0; i < 24; i++) {
      categories.push({ label: `${i}:00` });
      cumulative += hourlyData[i];
      dataPoints.push({ value: cumulative.toFixed(3) });
    }
  } else if (period === 'month') {
    const daysInMonth = moment().daysInMonth();
    const dailyData = Array(daysInMonth).fill(0);
    
    data.forEach(item => {
      const day = item._id - 1;
      if (day >= 0 && day < daysInMonth) {
        dailyData[day] = parseFloat(item.totalEnergy || 0);
      }
    });

    for (let i = 0; i < daysInMonth; i++) {
      categories.push({ label: `${i + 1}` });
      cumulative += dailyData[i];
      dataPoints.push({ value: cumulative.toFixed(3) });
    }
  } else if (period === 'year') {
    const monthlyData = Array(12).fill(0);
    
    data.forEach(item => {
      const month = item._id - 1;
      if (month >= 0 && month < 12) {
        monthlyData[month] = parseFloat(item.totalEnergy || 0);
      }
    });

    for (let i = 0; i < 12; i++) {
      categories.push({ label: moment().month(i).format('MMM') });
      cumulative += monthlyData[i];
      dataPoints.push({ value: cumulative.toFixed(3) });
    }
  }

  return {
    chart: {
      bgColor: "#1D1B41",
      bgAlpha: "0",
      canvasBgAlpha: "0",
      showBorder: "0",
      showCanvasBorder: "0",
      showValues: "0",
      showAlternateHGridColor: "0",
      paletteColors: "#58E2C2",
      drawCustomLegendIcon: "1",
      baseFontSize: "14",
      baseFontColor: "#FDFDFD",
      baseFont: "Nunito Sans",
      numberSuffix: " kWh",
      toolTipBgcolor: "#484E69",
      toolTipPadding: "5",
      toolTipBorderRadius: "2",
      toolTipBorderAlpha: "30",
      tooltipBorderThickness: "0.7",
      toolTipColor: "#FDFDFD",
      showXAxisLine: "1",
      showYAxisLine: "1",
      xAxisLineColor: "#9092A4",
      yAxisLineColor: "#9092A4",
      divLineColor: "#414761",
      divLineAlpha: "100",
      divLineDashed: "1"
    },
    categories: [{ category: categories }],
    dataset: [{
      seriesname: 'Cumulative Energy',
      data: dataPoints
    }]
  };
}

// Default/fallback configurations
function getDefaultChart1Config(period) {
  return {
    chart: {
      showBorder: "0",
      showShadow: "0",
      use3DLighting: "0",
      showLabels: "0",
      showValues: "0",
      paletteColors: "#58E2C2, #F7E53B",
      bgColor: "#1D1B41",
      bgAlpha: "0",
      canvasBgAlpha: "0",
      doughnutRadius: "75",
      pieRadius: "95",
      numberPrefix: "₹",
      plotBorderAlpha: "0",
      toolTipBgcolor: "#484E69",
      toolTipPadding: "7",
      toolTipBorderRadius: "3",
      toolTipBorderAlpha: "30",
      tooltipBorderThickness: "0.7",
      toolTipColor: "#FDFDFD",
      baseFont: "Nunito Sans",
      baseFontSize: "14",
      baseFontColor: "#FDFDFD",
      showLegend: "1",
      legendShadow: "0",
      legendBorderAlpha: "0",
      drawCustomLegendIcon: "1",
      legendBgAlpha: "0",
      chartTopMargin: "-10",
      canvasTopMargin: "-10",
      chartBottomMargin: "20",
      canvasBottomMargin: "20",
      legendNumColumns: "1",
      legendPosition: "RIGHT",
      defaultCenterLabel: "Total <br> $0",
      centerLabel: "$label<br>$value",
      centerLabelBold: "1",
      centerLabelFontSize: "20",
      enableRotation: "0",
      transposeAnimation: "1",
      plotToolText: "<div>$label<br>$dataValue ($percentValue)<div>"
    },
    data: [
      { label: "Electricity", value: "0" },
      { label: "Gas", value: "0" }
    ]
  };
}

function getEmptyStackedBarChart(period) {
  return {
    chart: {
      bgColor: "#1D1B41",
      bgAlpha: "0",
      canvasBgAlpha: "0",
      showBorder: "0",
      showCanvasBorder: "0",
      showValues: "1",
      showAlternateHGridColor: "0",
      paletteColors: "#58E2C2",
      drawCustomLegendIcon: "1",
      baseFontSize: "14",
      baseFontColor: "#FDFDFD",
      baseFont: "Nunito Sans",
      numberSuffix: " W",
      toolTipBgcolor: "#484E69",
      toolTipPadding: "5",
      toolTipBorderRadius: "2",
      toolTipBorderAlpha: "30",
      tooltipBorderThickness: "0.7",
      toolTipColor: "#FDFDFD",
      showXAxisLine: "1",
      showYAxisLine: "1",
      xAxisLineColor: "#9092A4",
      yAxisLineColor: "#9092A4",
      divLineColor: "#414761",
      divLineAlpha: "100",
      divLineDashed: "1",
      placeValuesInside: "0",
      valueFontColor: "#FDFDFD"
    },
    categories: [{ category: [
      { label: "Load 1" },
      { label: "Load 2" }
    ] }],
    dataset: [{
      seriesname: 'Power Usage',
      data: [
        { value: "0" },
        { value: "0" }
      ]
    }]
  };
}

function getEmptyLineChart(period, seriesName, suffix) {
  let categories = [];
  let dataPoints = [];

  if (period === 'today') {
    for (let i = 0; i < 24; i++) {
      categories.push({ label: `${i}:00` });
      dataPoints.push({ value: "0" });
    }
  } else if (period === 'month') {
    const daysInMonth = moment().daysInMonth();
    for (let i = 0; i < daysInMonth; i++) {
      categories.push({ label: `${i + 1}` });
      dataPoints.push({ value: "0" });
    }
  } else if (period === 'year') {
    for (let i = 0; i < 12; i++) {
      categories.push({ label: moment().month(i).format('MMM') });
      dataPoints.push({ value: "0" });
    }
  }

  return {
    chart: {
      bgColor: "#1D1B41",
      bgAlpha: "0",
      canvasBgAlpha: "0",
      showBorder: "0",
      showCanvasBorder: "0",
      showValues: "0",
      showAlternateHGridColor: "0",
      paletteColors: "#58E2C2",
      drawCustomLegendIcon: "1",
      baseFontSize: "14",
      baseFontColor: "#FDFDFD",
      baseFont: "Nunito Sans",
      numberSuffix: suffix,
      toolTipBgcolor: "#484E69",
      toolTipPadding: "5",
      toolTipBorderRadius: "2",
      toolTipBorderAlpha: "30",
      tooltipBorderThickness: "0.7",
      toolTipColor: "#FDFDFD",
      showXAxisLine: "1",
      showYAxisLine: "1",
      xAxisLineColor: "#9092A4",
      yAxisLineColor: "#9092A4",
      divLineColor: "#414761",
      divLineAlpha: "100",
      divLineDashed: "1"
    },
    categories: [{ category: categories }],
    dataset: [{
      seriesname: seriesName,
      data: dataPoints
    }]
  };
}
