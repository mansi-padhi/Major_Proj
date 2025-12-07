// Transform API data to FusionCharts format
import moment from 'moment';

const ELECTRICITY_RATE = 3; // ₹ per kWh

// Transform dashboard summary data for Chart 1 (Electricity vs Gas doughnut)
export function transformDashboardChart1(dashboardData, period = 'month') {
  const data = period === 'today' ? dashboardData.today : dashboardData.month;

  // For now, we only have electricity data (no gas)
  // Split 60% electricity, 40% "other" as placeholder
  const totalCost = parseFloat(data.cost) || 0;
  const electricityCost = totalCost * 0.6;
  const gasCost = totalCost * 0.4;

  const totalLabel = period === 'today' ?
    `Total <br> $${totalCost.toFixed(2)}` :
    `Total <br> $${totalCost.toFixed(0)}`;

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
      numberPrefix: "$",
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
      defaultCenterLabel: totalLabel,
      centerLabel: "$label<br>$value",
      centerLabelBold: "1",
      centerLabelFontSize: "20",
      enableRotation: "0",
      transposeAnimation: "1",
      plotToolText: "<div>$label<br>$dataValue ($percentValue)<div>"
    },
    data: [
      {
        label: "Electricity",
        value: electricityCost.toFixed(2)
      },
      {
        label: "Gas",
        value: gasCost.toFixed(2)
      }
    ]
  };
}

// Transform readings data for time-series charts (Charts 2-7)
export function transformTimeSeriesChart(readings, period = 'month', chartType = 'energy') {
  if (!readings || !readings.data || readings.data.length === 0) {
    return getEmptyChartData(period, chartType);
  }

  let categories = [];
  let dataPoints = [];
  const data = readings.data;

  if (period === 'today') {
    // Data is grouped by hour with _id as hour
    const hourlyData = Array(24).fill(0);

    data.forEach(item => {
      const hour = item._id;
      if (hour >= 0 && hour < 24) {
        let value = 0;
        if (chartType === 'energy') {
          value = parseFloat(item.totalEnergy || 0);
        } else if (chartType === 'power') {
          value = parseFloat(item.avgPower || 0);
        } else if (chartType === 'voltage') {
          value = parseFloat(item.avgVoltage || 0);
        } else if (chartType === 'current') {
          value = parseFloat(item.avgCurrent || 0);
        }
        hourlyData[hour] = value;
      }
    });

    for (let i = 0; i < 24; i++) {
      categories.push({ label: `${i}:00` });
      dataPoints.push({ value: hourlyData[i].toFixed(3) });
    }
  } else if (period === 'month') {
    // Data is grouped by day with _id as day
    const daysInMonth = moment().daysInMonth();
    const dailyData = Array(daysInMonth).fill(0);

    data.forEach(item => {
      const day = item._id - 1; // _id is 1-based, array is 0-based
      if (day >= 0 && day < daysInMonth) {
        let value = 0;
        if (chartType === 'energy') {
          value = parseFloat(item.totalEnergy || 0);
        } else if (chartType === 'power') {
          value = parseFloat(item.avgPower || 0);
        } else if (chartType === 'voltage') {
          value = parseFloat(item.avgVoltage || 0);
        } else if (chartType === 'current') {
          value = parseFloat(item.avgCurrent || 0);
        }
        dailyData[day] = value;
      }
    });

    for (let i = 0; i < daysInMonth; i++) {
      categories.push({ label: `${i + 1}` });
      dataPoints.push({ value: dailyData[i].toFixed(3) });
    }
  } else if (period === 'year') {
    // Data is grouped by month with _id as month (1-12)
    const monthlyData = Array(12).fill(0);

    data.forEach(item => {
      const month = item._id - 1; // _id is 1-based, array is 0-based
      if (month >= 0 && month < 12) {
        let value = 0;
        if (chartType === 'energy') {
          value = parseFloat(item.totalEnergy || 0);
        } else if (chartType === 'power') {
          value = parseFloat(item.avgPower || 0);
        } else if (chartType === 'voltage') {
          value = parseFloat(item.avgVoltage || 0);
        } else if (chartType === 'current') {
          value = parseFloat(item.avgCurrent || 0);
        }
        monthlyData[month] = value;
      }
    });

    for (let i = 0; i < 12; i++) {
      categories.push({ label: moment().month(i).format('MMM') });
      dataPoints.push({ value: monthlyData[i].toFixed(3) });
    }
  }

  return {
    chart: getChartConfig(chartType),
    categories: [{ category: categories }],
    dataset: [{
      seriesname: getSeriesName(chartType),
      data: dataPoints
    }]
  };
}

function getChartConfig(chartType) {
  return {
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
    numberSuffix: chartType === 'power' ? " W" : " kWh",
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
  };
}

function getSeriesName(chartType) {
  const names = {
    energy: 'Energy',
    power: 'Power',
    voltage: 'Voltage',
    current: 'Current'
  };
  return names[chartType] || 'Value';
}

function getEmptyChartData(period, chartType) {
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
    chart: getChartConfig(chartType),
    categories: [{ category: categories }],
    dataset: [{
      seriesname: getSeriesName(chartType),
      data: dataPoints
    }]
  };
}

// Transform cost data
export function transformCostChart(costData, period = 'month') {
  // Placeholder - will be implemented based on cost API structure
  return {
    chart: getChartConfig('cost'),
    data: []
  };
}

// Transform appliances data
export function transformAppliancesChart(appliancesData, period = 'month') {
  // Placeholder - will be implemented based on appliances API structure
  return {
    chart: getChartConfig('appliances'),
    data: []
  };
}
