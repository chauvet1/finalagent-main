const axios = require('axios');
const NodeCache = require('node-cache');
const { EventEmitter } = require('events');

/**
 * Real-time Data Integration Service
 * Replaces mock data with live external APIs and real-time feeds
 */
class RealTimeDataService extends EventEmitter {
  constructor() {
    super();
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minute cache
    this.weatherApiKey = process.env.WEATHER_API_KEY;
    this.mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.newsApiKey = process.env.NEWS_API_KEY;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  /**
   * Get real weather data for location-based services
   */
  async getWeatherData(latitude, longitude) {
    const cacheKey = `weather_${latitude}_${longitude}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await this.retryRequest(() => 
        axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
          params: {
            lat: latitude,
            lon: longitude,
            appid: this.weatherApiKey,
            units: 'metric'
          },
          timeout: 5000
        })
      );

      const weatherData = {
        temperature: response.data.main.temp,
        humidity: response.data.main.humidity,
        pressure: response.data.main.pressure,
        windSpeed: response.data.wind.speed,
        windDirection: response.data.wind.deg,
        visibility: response.data.visibility,
        conditions: response.data.weather[0].main,
        description: response.data.weather[0].description,
        timestamp: new Date(),
        location: {
          latitude,
          longitude,
          city: response.data.name,
          country: response.data.sys.country
        }
      };

      this.cache.set(cacheKey, weatherData);
      this.emit('weatherUpdate', weatherData);
      
      return weatherData;
    } catch (error) {
      console.error('Weather API error:', error.message);
      // Return fallback data structure
      return {
        temperature: null,
        humidity: null,
        conditions: 'Unknown',
        error: 'Weather data unavailable',
        timestamp: new Date()
      };
    }
  }

  /**
   * Get real traffic and route data
   */
  async getTrafficData(origin, destination) {
    const cacheKey = `traffic_${origin}_${destination}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await this.retryRequest(() => 
        axios.get(`https://maps.googleapis.com/maps/api/directions/json`, {
          params: {
            origin,
            destination,
            key: this.mapsApiKey,
            departure_time: 'now',
            traffic_model: 'best_guess'
          },
          timeout: 5000
        })
      );

      if (response.data.routes.length === 0) {
        throw new Error('No routes found');
      }

      const route = response.data.routes[0];
      const leg = route.legs[0];

      const trafficData = {
        distance: leg.distance.value, // meters
        duration: leg.duration.value, // seconds
        durationInTraffic: leg.duration_in_traffic?.value || leg.duration.value,
        trafficCondition: this.calculateTrafficCondition(
          leg.duration.value, 
          leg.duration_in_traffic?.value || leg.duration.value
        ),
        route: {
          summary: route.summary,
          polyline: route.overview_polyline.points,
          bounds: route.bounds
        },
        timestamp: new Date()
      };

      this.cache.set(cacheKey, trafficData);
      this.emit('trafficUpdate', trafficData);
      
      return trafficData;
    } catch (error) {
      console.error('Traffic API error:', error.message);
      return {
        distance: null,
        duration: null,
        trafficCondition: 'Unknown',
        error: 'Traffic data unavailable',
        timestamp: new Date()
      };
    }
  }

  /**
   * Get real-time security alerts and news
   */
  async getSecurityAlerts(location) {
    const cacheKey = `security_${location}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await this.retryRequest(() => 
        axios.get(`https://newsapi.org/v2/everything`, {
          params: {
            q: `security incident ${location}`,
            sortBy: 'publishedAt',
            language: 'en',
            pageSize: 10,
            apiKey: this.newsApiKey
          },
          timeout: 5000
        })
      );

      const alerts = response.data.articles.map(article => ({
        id: article.url,
        title: article.title,
        description: article.description,
        severity: this.assessSeverity(article.title, article.description),
        source: article.source.name,
        publishedAt: new Date(article.publishedAt),
        url: article.url,
        location
      }));

      this.cache.set(cacheKey, alerts);
      this.emit('securityAlertsUpdate', alerts);
      
      return alerts;
    } catch (error) {
      console.error('Security alerts API error:', error.message);
      return [];
    }
  }

  /**
   * Get real-time financial market data
   */
  async getMarketData(symbols = ['SPY', 'QQQ', 'IWM']) {
    const cacheKey = `market_${symbols.join('_')}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // Using Alpha Vantage free tier
      const marketData = {};
      
      for (const symbol of symbols) {
        const response = await this.retryRequest(() => 
          axios.get(`https://www.alphavantage.co/query`, {
            params: {
              function: 'GLOBAL_QUOTE',
              symbol,
              apikey: process.env.ALPHA_VANTAGE_API_KEY
            },
            timeout: 5000
          })
        );

        const quote = response.data['Global Quote'];
        if (quote) {
          marketData[symbol] = {
            price: parseFloat(quote['05. price']),
            change: parseFloat(quote['09. change']),
            changePercent: quote['10. change percent'],
            volume: parseInt(quote['06. volume']),
            timestamp: new Date()
          };
        }
      }

      this.cache.set(cacheKey, marketData);
      this.emit('marketUpdate', marketData);
      
      return marketData;
    } catch (error) {
      console.error('Market data API error:', error.message);
      return {};
    }
  }

  /**
   * Get real-time cryptocurrency data
   */
  async getCryptoData(symbols = ['bitcoin', 'ethereum', 'cardano']) {
    const cacheKey = `crypto_${symbols.join('_')}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await this.retryRequest(() => 
        axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
          params: {
            ids: symbols.join(','),
            vs_currencies: 'usd',
            include_24hr_change: true,
            include_24hr_vol: true
          },
          timeout: 5000
        })
      );

      const cryptoData = {};
      Object.keys(response.data).forEach(symbol => {
        const data = response.data[symbol];
        cryptoData[symbol] = {
          price: data.usd,
          change24h: data.usd_24h_change,
          volume24h: data.usd_24h_vol,
          timestamp: new Date()
        };
      });

      this.cache.set(cacheKey, cryptoData);
      this.emit('cryptoUpdate', cryptoData);
      
      return cryptoData;
    } catch (error) {
      console.error('Crypto data API error:', error.message);
      return {};
    }
  }

  /**
   * Get real-time system metrics from external monitoring
   */
  async getSystemMetrics() {
    try {
      const metrics = {
        cpu: await this.getCPUUsage(),
        memory: await this.getMemoryUsage(),
        disk: await this.getDiskUsage(),
        network: await this.getNetworkStats(),
        timestamp: new Date()
      };

      this.emit('systemMetricsUpdate', metrics);
      return metrics;
    } catch (error) {
      console.error('System metrics error:', error.message);
      return {
        error: 'System metrics unavailable',
        timestamp: new Date()
      };
    }
  }

  /**
   * Helper methods
   */
  async retryRequest(requestFn) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        if (attempt < this.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }
    
    throw lastError;
  }

  calculateTrafficCondition(normalDuration, trafficDuration) {
    const ratio = trafficDuration / normalDuration;
    if (ratio < 1.2) return 'Light';
    if (ratio < 1.5) return 'Moderate';
    if (ratio < 2.0) return 'Heavy';
    return 'Severe';
  }

  assessSeverity(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const highSeverityKeywords = ['emergency', 'critical', 'urgent', 'shooting', 'explosion', 'terrorist'];
    const mediumSeverityKeywords = ['incident', 'accident', 'theft', 'robbery', 'assault'];
    
    if (highSeverityKeywords.some(keyword => text.includes(keyword))) {
      return 'HIGH';
    }
    if (mediumSeverityKeywords.some(keyword => text.includes(keyword))) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  async getCPUUsage() {
    const os = require('os');
    const cpus = os.cpus();
    
    return new Promise((resolve) => {
      const startMeasure = cpus.map(cpu => {
        const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
        const idle = cpu.times.idle;
        return { total, idle };
      });

      setTimeout(() => {
        const endMeasure = os.cpus().map(cpu => {
          const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
          const idle = cpu.times.idle;
          return { total, idle };
        });

        const usage = startMeasure.map((start, i) => {
          const end = endMeasure[i];
          const totalDiff = end.total - start.total;
          const idleDiff = end.idle - start.idle;
          return 100 - (100 * idleDiff / totalDiff);
        });

        const avgUsage = usage.reduce((acc, val) => acc + val, 0) / usage.length;
        resolve(Math.round(avgUsage * 100) / 100);
      }, 100);
    });
  }

  async getMemoryUsage() {
    const os = require('os');
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      percentage: Math.round((usedMem / totalMem) * 100 * 100) / 100
    };
  }

  async getDiskUsage() {
    // This would typically use a system command or library
    // For now, return a placeholder structure
    return {
      total: 1000000000000, // 1TB
      used: 500000000000,   // 500GB
      free: 500000000000,   // 500GB
      percentage: 50
    };
  }

  async getNetworkStats() {
    // This would typically use system network interfaces
    // For now, return a placeholder structure
    return {
      bytesReceived: 0,
      bytesSent: 0,
      packetsReceived: 0,
      packetsSent: 0
    };
  }

  /**
   * Start real-time data polling
   */
  startRealTimeUpdates(intervals = {}) {
    const defaultIntervals = {
      weather: 300000,    // 5 minutes
      traffic: 180000,    // 3 minutes
      security: 600000,   // 10 minutes
      market: 60000,      // 1 minute
      crypto: 30000,      // 30 seconds
      system: 10000       // 10 seconds
    };

    const config = { ...defaultIntervals, ...intervals };

    // Start polling intervals
    Object.keys(config).forEach(dataType => {
      setInterval(() => {
        this.emit('pollRequest', dataType);
      }, config[dataType]);
    });

    console.log('Real-time data updates started');
  }

  /**
   * Stop all real-time updates
   */
  stopRealTimeUpdates() {
    this.removeAllListeners();
    console.log('Real-time data updates stopped');
  }
}

module.exports = RealTimeDataService;