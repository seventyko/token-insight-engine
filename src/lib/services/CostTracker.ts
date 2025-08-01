import { SEARCH_CONFIG } from '../config/searchConfig';

export interface CostMetrics {
  totalQueries: number;
  totalCost: number;
  dailyCost: number;
  remainingBudget: number;
  warningTriggered: boolean;
}

export interface CostEntry {
  timestamp: number;
  cost: number;
  queries: number;
  operation: string;
}

export class CostTracker {
  private static instance: CostTracker;
  private dailyCosts: Map<string, CostEntry[]> = new Map();
  private readonly STORAGE_KEY = 'search_cost_tracker';

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): CostTracker {
    if (!CostTracker.instance) {
      CostTracker.instance = new CostTracker();
    }
    return CostTracker.instance;
  }

  private getTodayKey(): string {
    return new Date().toISOString().split('T')[0];
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.dailyCosts = new Map(Object.entries(data));
      }
    } catch (error) {
      console.warn('Failed to load cost data from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.dailyCosts);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save cost data to storage:', error);
    }
  }

  private cleanOldEntries(): void {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    for (const [date, entries] of this.dailyCosts) {
      const filteredEntries = entries.filter(entry => entry.timestamp > thirtyDaysAgo);
      if (filteredEntries.length === 0) {
        this.dailyCosts.delete(date);
      } else {
        this.dailyCosts.set(date, filteredEntries);
      }
    }
  }

  recordCost(queries: number, operation: string): number {
    const cost = queries * SEARCH_CONFIG.COST_CONTROLS.costPerQuery;
    const today = this.getTodayKey();
    
    if (!this.dailyCosts.has(today)) {
      this.dailyCosts.set(today, []);
    }

    const todayCosts = this.dailyCosts.get(today)!;
    todayCosts.push({
      timestamp: Date.now(),
      cost,
      queries,
      operation,
    });

    this.cleanOldEntries();
    this.saveToStorage();

    return cost;
  }

  canAffordOperation(queries: number): boolean {
    const estimatedCost = queries * SEARCH_CONFIG.COST_CONTROLS.costPerQuery;
    const currentDailyCost = this.getDailyCost();
    
    return (currentDailyCost + estimatedCost) <= SEARCH_CONFIG.COST_CONTROLS.dailySpendLimit;
  }

  getDailyCost(date?: string): number {
    const targetDate = date || this.getTodayKey();
    const entries = this.dailyCosts.get(targetDate) || [];
    return entries.reduce((sum, entry) => sum + entry.cost, 0);
  }

  getRemainingBudget(): number {
    const dailyCost = this.getDailyCost();
    return Math.max(0, SEARCH_CONFIG.COST_CONTROLS.dailySpendLimit - dailyCost);
  }

  isWarningTriggered(): boolean {
    const dailyCost = this.getDailyCost();
    const threshold = SEARCH_CONFIG.COST_CONTROLS.dailySpendLimit * SEARCH_CONFIG.COST_CONTROLS.warningThreshold;
    return dailyCost >= threshold;
  }

  getMetrics(): CostMetrics {
    const today = this.getTodayKey();
    const todayEntries = this.dailyCosts.get(today) || [];
    
    // Calculate total metrics across all days
    let totalQueries = 0;
    let totalCost = 0;
    
    for (const entries of this.dailyCosts.values()) {
      for (const entry of entries) {
        totalQueries += entry.queries;
        totalCost += entry.cost;
      }
    }

    const dailyCost = this.getDailyCost();

    return {
      totalQueries,
      totalCost,
      dailyCost,
      remainingBudget: this.getRemainingBudget(),
      warningTriggered: this.isWarningTriggered(),
    };
  }

  getCostHistory(days: number = 7): Array<{ date: string; cost: number; queries: number }> {
    const history: Array<{ date: string; cost: number; queries: number }> = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      const entries = this.dailyCosts.get(dateKey) || [];
      const cost = entries.reduce((sum, entry) => sum + entry.cost, 0);
      const queries = entries.reduce((sum, entry) => sum + entry.queries, 0);
      
      history.push({ date: dateKey, cost, queries });
    }
    
    return history;
  }

  reset(): void {
    this.dailyCosts.clear();
    localStorage.removeItem(this.STORAGE_KEY);
  }
}