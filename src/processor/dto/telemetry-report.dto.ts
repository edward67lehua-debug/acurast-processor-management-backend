import { ApiProperty } from '@nestjs/swagger';
import type {
  TelemetryEnvironment,
  TelemetryPeriod,
  TelemetryFailures,
  TelemetryMetrics,
  TelemetryDisabledReason,
  TelemetryStatus,
  TelemetryReportRequest,
  TelemetryReportResponse,
  TelemetryLatestResponse,
  TelemetryHistoryResponse,
  TelemetryReportsResponse,
} from '../types';

export class TelemetryEnvironmentDto implements TelemetryEnvironment {
  @ApiProperty({ description: 'Device manufacturer' })
  manufacturer: string;

  @ApiProperty({ description: 'Device model' })
  model: string;

  @ApiProperty({
    description:
      'SoC "manufacturer model" (e.g. "Google Tensor G3"), or "unknown"',
  })
  cpu: string;

  @ApiProperty({
    description: 'Supported ABIs, primary first, comma-separated',
    required: false,
  })
  arch?: string;

  @ApiProperty({
    description: 'Total CPU cores of the device',
    required: false,
  })
  cores?: number;

  @ApiProperty({
    description: 'CPU cores available to the app at report time',
    required: false,
  })
  availableCores?: number;

  @ApiProperty({ description: 'Android SDK version the device runs' })
  osVersion: number;

  @ApiProperty({ description: 'Total RAM in bytes, -1 when unknown' })
  totalMemory: number;

  @ApiProperty({
    description: 'RAM available at report time in bytes, -1 when unknown',
  })
  availableMemory: number;

  @ApiProperty({ description: 'Whether the device is a low RAM device' })
  lowRamDevice: boolean;

  @ApiProperty({
    description: 'Network type (wifi, cellular, ethernet, vpn, none, unknown)',
  })
  networkType: string;

  @ApiProperty({
    description: 'How long the app process has been running, in milliseconds',
  })
  uptime: number;

  @ApiProperty({ description: 'The Acurast network the processor operates on' })
  network: string;
}

export class TelemetryPeriodDto implements TelemetryPeriod {
  @ApiProperty({
    description: 'Timestamp of the first recorded event',
    required: false,
  })
  start?: number;

  @ApiProperty({
    description: 'Timestamp of the last recorded event',
    required: false,
  })
  end?: number;

  @ApiProperty({ description: 'Timestamp the report was created' })
  reportedAt: number;
}

export class TelemetryFailuresDto implements TelemetryFailures {
  @ApiProperty({ description: 'Number of not-ready failures' })
  notReady: number;

  @ApiProperty({ description: 'Number of timeouts' })
  timeouts: number;

  @ApiProperty({ description: 'Number of fatal failures' })
  fatal: number;

  @ApiProperty({ description: 'Number of other failures' })
  other: number;
}

export class TelemetryMetricsDto implements TelemetryMetrics {
  @ApiProperty({ description: 'Total successful requests in the period' })
  totalSuccesses: number;

  @ApiProperty({ description: 'Total failed requests in the period' })
  totalFailures: number;

  @ApiProperty({
    description:
      'Mean duration (ms) of the successful requests, 0 when there were none',
  })
  avgTime: number;

  @ApiProperty({
    description: 'Duration of the fastest successful request',
    required: false,
  })
  minTime?: number;

  @ApiProperty({
    description: 'Duration of the slowest successful request',
    required: false,
  })
  maxTime?: number;

  @ApiProperty({
    description: 'Failed requests broken down by failure class',
    type: TelemetryFailuresDto,
  })
  failures: TelemetryFailuresDto;

  @ApiProperty({
    description: 'Most frequent failure messages and their occurrence counts',
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  failureMessages: Record<string, number>;

  @ApiProperty({ description: 'Number of consecutive failures' })
  consecutiveFailures: number;

  @ApiProperty({
    description: 'Number of times the engine was restarted in the period',
  })
  restarts: number;

  @ApiProperty({
    description: 'How long after the session start the first request succeeded',
    required: false,
  })
  timeToFirstSuccess?: number;

  @ApiProperty({
    description: 'Longest span (ms) of consecutive not-ready failures',
  })
  longestNotReady: number;
}

export class TelemetryDisabledReasonDto implements TelemetryDisabledReason {
  @ApiProperty({
    description: 'Why the engine is out of use',
    enum: ['user', 'failure'],
  })
  type: 'user' | 'failure';

  @ApiProperty({ description: 'Timestamp when the reason took effect' })
  at: number;
}

export class TelemetryStatusDto implements TelemetryStatus {
  @ApiProperty({
    description: 'Reported engine health',
    enum: ['ok', 'disabled'],
  })
  type: 'ok' | 'disabled';

  @ApiProperty({
    description: 'Engine health metrics recorded over the report period',
    type: TelemetryMetricsDto,
  })
  metrics: TelemetryMetricsDto;

  @ApiProperty({
    description:
      'Why the engine is disabled, in the order the reasons took effect',
    type: [TelemetryDisabledReasonDto],
    required: false,
  })
  reasons?: TelemetryDisabledReasonDto[];

  @ApiProperty({ description: 'Last failure message', required: false })
  message?: string;

  @ApiProperty({
    description:
      'How long the session ran until the engine was taken out of use',
    required: false,
  })
  sessionDuration?: number;
}

export class TelemetryReportDto implements TelemetryReportRequest {
  @ApiProperty({ description: 'Processor address' })
  processorAddress: string;

  @ApiProperty({ description: 'Processor type (core or lite)' })
  processorType: string;

  @ApiProperty({ description: 'App version code' })
  appVersion: string;

  @ApiProperty({ description: 'Platform (android or ios)' })
  platform: string;

  @ApiProperty({ description: 'Public IP address of the processor' })
  ipAddress: string;

  @ApiProperty({
    description: 'Device and runtime context the processor operates in',
    type: TelemetryEnvironmentDto,
  })
  environment: TelemetryEnvironmentDto;

  @ApiProperty({
    description: 'Time window the report covers',
    type: TelemetryPeriodDto,
  })
  period: TelemetryPeriodDto;

  @ApiProperty({
    description: 'Reported health of the monitored engine',
    type: TelemetryStatusDto,
  })
  status: TelemetryStatusDto;
}

export class TelemetryReportResponseDto implements TelemetryReportResponse {
  @ApiProperty({ description: 'Whether the report was accepted' })
  success: boolean;
}

export class TelemetryLatestResponseDto implements TelemetryLatestResponse {
  @ApiProperty({
    description: 'Latest telemetry report',
    type: TelemetryReportDto,
  })
  report: TelemetryReportDto;
}

export class TelemetryHistoryResponseDto implements TelemetryHistoryResponse {
  @ApiProperty({
    description: 'List of historical telemetry reports',
    type: [TelemetryReportDto],
  })
  reports: TelemetryReportDto[];
}

export class TelemetryReportsResponseDto implements TelemetryReportsResponse {
  @ApiProperty({
    description: 'Latest telemetry report of each processor',
    type: [TelemetryReportDto],
  })
  reports: TelemetryReportDto[];
}
