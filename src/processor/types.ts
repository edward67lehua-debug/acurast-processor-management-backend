import { NetworkTypeEnum, BatteryHealthState } from './enums';

export interface TemperatureReadings {
  battery?: number;
  cpu?: number;
  gpu?: number;
  ambient?: number;
}

export interface ProcessorStatus {
  address: string;
  timestamp: number;
  batteryLevel: number;
  isCharging: boolean;
  batteryHealth?: BatteryHealthState;
  temperatures?: TemperatureReadings;
  networkType: NetworkTypeEnum;
  ssid?: string;
}

export interface CheckInRequest {
  deviceAddress: string;
  platform: number; // 0 = Android, 1 = iOS
  timestamp: number;
  batteryLevel: number;
  isCharging: boolean;
  batteryHealth?: BatteryHealthState;
  temperatures?: TemperatureReadings;
  networkType: NetworkTypeEnum;
  ssid?: string;
}

export interface CheckInResponse {
  success: boolean;
}

export interface StatusesResponse {
  processorStatuses: ProcessorStatus[];
}

export interface StatusResponse {
  processorStatus: ProcessorStatus;
}

export interface HistoryResponse {
  history: ProcessorStatus[];
}

export interface ProcessorListItem {
  address: string;
  lastSeen: number;
  batteryLevel: number;
  isCharging: boolean;
  networkType: NetworkTypeEnum;
  ssid?: string;
}

export interface ListResponse {
  devices: ProcessorListItem[];
}

export interface BulkStatusResponse {
  processorStatuses: Record<string, ProcessorStatus>;
}

export interface TelemetryEnvironment {
  manufacturer: string;
  model: string;
  cpu: string; // SoC "manufacturer model", or "unknown"
  arch?: string; // supported ABIs, primary first, comma-separated; missing on reports from older app versions
  cores?: number; // total CPU cores of the device; missing on reports from older app versions
  availableCores?: number; // CPU cores available to the app at report time; missing on reports from older app versions
  osVersion: number;
  totalMemory: number;
  availableMemory: number;
  lowRamDevice: boolean;
  networkType: string;
  uptime: number;
  network: string;
}

export interface TelemetryPeriod {
  start?: number;
  end?: number;
  reportedAt: number;
}

export interface TelemetryFailures {
  notReady: number;
  timeouts: number;
  fatal: number;
  other: number;
}

export interface TelemetryMetrics {
  totalSuccesses: number;
  totalFailures: number;
  avgTime: number;
  minTime?: number;
  maxTime?: number;
  failures: TelemetryFailures;
  failureMessages: Record<string, number>;
  consecutiveFailures: number;
  restarts: number;
  timeToFirstSuccess?: number;
  longestNotReady: number;
}

export interface TelemetryDisabledReason {
  type: 'user' | 'failure';
  at: number;
}

export interface TelemetryStatus {
  type: 'ok' | 'disabled';
  metrics: TelemetryMetrics;
  reasons?: TelemetryDisabledReason[];
  message?: string;
  sessionDuration?: number;
}

export interface TelemetryReportRequest {
  processorAddress: string;
  processorType: string; // 'core' | 'lite'
  appVersion: string;
  platform: string; // 'android' | 'ios'
  ipAddress: string;
  environment: TelemetryEnvironment;
  period: TelemetryPeriod;
  status: TelemetryStatus;
}

export interface TelemetryReportResponse {
  success: boolean;
}

export interface TelemetryLatestResponse {
  report: TelemetryReportRequest;
}

export interface TelemetryHistoryResponse {
  reports: TelemetryReportRequest[];
}

export interface TelemetryReportsResponse {
  reports: TelemetryReportRequest[];
}
