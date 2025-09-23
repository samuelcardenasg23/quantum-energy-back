import { createLogger } from '../config/logger';

const logger = createLogger('Metrics');

/**
 * Metrics collection system for monitoring application performance
 * This will help us track various aspects of our application for PAM compliance
 */
export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Map<string, any> = new Map();
  private startTime: Date = new Date();

  // Singleton pattern to ensure one metrics collector instance
  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  private constructor() {
    // Initialize basic metrics
    this.initializeMetrics();
    
    // Log metrics every 30 seconds in development, 5 minutes in production
    const interval = process.env.NODE_ENV === 'production' ? 300000 : 30000;
    setInterval(() => this.logMetrics(), interval);
  }

  private initializeMetrics() {
    // HTTP Request metrics
    this.metrics.set('http_requests_total', 0);
    this.metrics.set('http_requests_by_method', new Map());
    this.metrics.set('http_requests_by_status', new Map());
    this.metrics.set('http_request_duration_total', 0);
    this.metrics.set('http_request_duration_count', 0);
    
    // Error metrics
    this.metrics.set('http_errors_total', 0);
    this.metrics.set('application_errors_total', 0);
    
    // Authentication metrics
    this.metrics.set('auth_login_attempts', 0);
    this.metrics.set('auth_login_success', 0);
    this.metrics.set('auth_login_failures', 0);
    this.metrics.set('auth_registrations', 0);
    
    // Offers metrics
    this.metrics.set('offers_created', 0);
    this.metrics.set('offers_accepted', 0);
    this.metrics.set('offers_creation_failed', 0);
    this.metrics.set('offer_energy_amount_kwh_total', 0);
    this.metrics.set('offer_energy_amount_kwh_count', 0);
    this.metrics.set('offer_price_per_kwh_total', 0);
    this.metrics.set('offer_price_per_kwh_count', 0);
    
    // Orders metrics
    this.metrics.set('orders_created', 0);
    this.metrics.set('orders_creation_failed', 0);
    this.metrics.set('order_energy_quantity_kwh_total', 0);
    this.metrics.set('order_energy_quantity_kwh_count', 0);
    this.metrics.set('order_total_price_total', 0);
    this.metrics.set('order_total_price_count', 0);
    
    // Database metrics
    this.metrics.set('db_queries_total', 0);
    this.metrics.set('db_query_duration_total', 0);
    this.metrics.set('db_errors_total', 0);
    
    // System metrics
    this.metrics.set('memory_usage_bytes', 0);
    this.metrics.set('cpu_usage_percent', 0);
  }

  /**
   * Increment a counter metric
   */
  public incrementCounter(name: string, value: number = 1, labels?: Record<string, string>) {
    const current = this.metrics.get(name) || 0;
    this.metrics.set(name, current + value);
    
    // Handle labeled metrics (like by method, status code, etc.)
    if (labels) {
      const labeledName = `${name}_by_${Object.keys(labels)[0]}`;
      const labeledMap = this.metrics.get(labeledName) || new Map();
      const labelValue = labels[Object.keys(labels)[0]];
      const labelCurrent = labeledMap.get(labelValue) || 0;
      labeledMap.set(labelValue, labelCurrent + value);
      this.metrics.set(labeledName, labeledMap);
    }
  }

  /**
   * Record a histogram/timing metric
   */
  public recordHistogram(name: string, value: number, labels?: Record<string, string>) {
    // Record total and count for average calculation
    const totalName = `${name}_total`;
    const countName = `${name}_count`;
    
    const currentTotal = this.metrics.get(totalName) || 0;
    const currentCount = this.metrics.get(countName) || 0;
    
    this.metrics.set(totalName, currentTotal + value);
    this.metrics.set(countName, currentCount + 1);
  }

  /**
   * Set a gauge metric (current value)
   */
  public setGauge(name: string, value: number) {
    this.metrics.set(name, value);
  }

  /**
   * Get current value of a metric
   */
  public getMetric(name: string): any {
    return this.metrics.get(name);
  }

  /**
   * Get all metrics as a structured object
   */
  public getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of this.metrics.entries()) {
      if (value instanceof Map) {
        // Convert Map to object for JSON serialization
        result[key] = Object.fromEntries(value);
      } else {
        result[key] = value;
      }
    }
    
    // Add calculated metrics
    result.uptime_seconds = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    result.http_request_duration_avg = this.calculateAverage('http_request_duration');
    result.db_query_duration_avg = this.calculateAverage('db_query_duration');
    
    // Add system metrics
    const memUsage = process.memoryUsage();
    result.memory_heap_used_bytes = memUsage.heapUsed;
    result.memory_heap_total_bytes = memUsage.heapTotal;
    result.memory_rss_bytes = memUsage.rss;
    result.memory_external_bytes = memUsage.external;
    
    return result;
  }

  private calculateAverage(baseName: string): number {
    const total = this.metrics.get(`${baseName}_total`) || 0;
    const count = this.metrics.get(`${baseName}_count`) || 0;
    return count > 0 ? total / count : 0;
  }

  /**
   * Log current metrics (called periodically)
   */
  private logMetrics() {
    const metrics = this.getAllMetrics();
    
    logger.info('Application metrics snapshot', {
      type: 'metrics_snapshot',
      timestamp: new Date().toISOString(),
      metrics: {
        // HTTP metrics
        requests_total: metrics.http_requests_total,
        requests_per_minute: this.calculateRate('http_requests_total', 60),
        avg_response_time_ms: Math.round(metrics.http_request_duration_avg || 0),
        error_rate_percent: this.calculateErrorRate(),
        
        // Business metrics
        login_success_rate: this.calculateLoginSuccessRate(),
        
        // System metrics
        uptime_hours: Math.round(metrics.uptime_seconds / 3600 * 100) / 100,
        memory_usage_mb: Math.round(metrics.memory_heap_used_bytes / 1024 / 1024),
        
        // Detailed breakdown (for debugging)
        requests_by_method: metrics.http_requests_by_method,
        requests_by_status: metrics.http_requests_by_status
      }
    });
  }

  private calculateRate(metricName: string, timeWindowSeconds: number): number {
    const total = this.metrics.get(metricName) || 0;
    const uptimeSeconds = (Date.now() - this.startTime.getTime()) / 1000;
    const rate = (total / uptimeSeconds) * timeWindowSeconds;
    return Math.round(rate * 100) / 100;
  }

  private calculateErrorRate(): number {
    const total = this.metrics.get('http_requests_total') || 0;
    const errors = this.metrics.get('http_errors_total') || 0;
    return total > 0 ? Math.round((errors / total) * 10000) / 100 : 0;
  }

  private calculateLoginSuccessRate(): number {
    const attempts = this.metrics.get('auth_login_attempts') || 0;
    const successes = this.metrics.get('auth_login_success') || 0;
    return attempts > 0 ? Math.round((successes / attempts) * 10000) / 100 : 0;
  }
}

// Export singleton instance
export const metrics = MetricsCollector.getInstance();
