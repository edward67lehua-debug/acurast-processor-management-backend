import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { ProcessorService } from './processor.service';
import { TelemetryService } from './telemetry.service';
import { TelemetryApiKeyGuard } from './telemetry-api-key.guard';
import {
  StatusResponseDto,
  StatusesResponseDto,
  HistoryResponseDto,
  BulkStatusResponseDto,
} from './dto/device-status.dto';
import {
  TelemetryLatestResponseDto,
  TelemetryHistoryResponseDto,
  TelemetryReportsResponseDto,
} from './dto/telemetry-report.dto';
import { BulkStatusResponse } from './types';

@ApiTags('processor')
@Controller('processor/api')
export class ProcessorApiController {
  constructor(
    private readonly processorService: ProcessorService,
    private readonly telemetryService: TelemetryService,
  ) {}

  @Get('telemetry')
  @UseGuards(TelemetryApiKeyGuard)
  @ApiOperation({
    summary: 'Get the latest telemetry report of each processor',
  })
  @ApiHeader({
    name: 'X-Api-Key',
    description: 'Telemetry API key',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Latest telemetry reports retrieved successfully',
    type: TelemetryReportsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid API key' })
  async getAllLatestTelemetryReports(): Promise<TelemetryReportsResponseDto> {
    return this.telemetryService.getAllLatestReports();
  }

  @Get(':address/telemetry')
  @UseGuards(TelemetryApiKeyGuard)
  @ApiOperation({ summary: 'Get the latest telemetry report of a processor' })
  @ApiParam({ name: 'address', description: 'Processor address' })
  @ApiHeader({
    name: 'X-Api-Key',
    description: 'Telemetry API key',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Telemetry report retrieved successfully',
    type: TelemetryLatestResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid API key' })
  @ApiResponse({ status: 404, description: 'No telemetry reports found' })
  async getLatestTelemetryReport(
    @Param('address') address: string,
  ): Promise<TelemetryLatestResponseDto> {
    return this.telemetryService.getLatestReport(address);
  }

  @Get(':address/telemetry/history')
  @UseGuards(TelemetryApiKeyGuard)
  @ApiOperation({ summary: 'Get the telemetry report history of a processor' })
  @ApiParam({ name: 'address', description: 'Processor address' })
  @ApiHeader({
    name: 'X-Api-Key',
    description: 'Telemetry API key',
    required: true,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of reports to return (default: 100)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Telemetry report history retrieved successfully',
    type: TelemetryHistoryResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid API key' })
  @ApiResponse({ status: 404, description: 'No telemetry reports found' })
  async getTelemetryReportHistory(
    @Param('address') address: string,
    @Query('limit') limit: number = 100,
  ): Promise<TelemetryHistoryResponseDto> {
    return this.telemetryService.getReportHistory(address, limit);
  }

  @Get(':address/status')
  @ApiOperation({ summary: 'Get device status' })
  @ApiParam({ name: 'address', description: 'Device address' })
  @ApiResponse({
    status: 200,
    description: 'Device status retrieved successfully',
    type: StatusResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async getDeviceStatus(
    @Param('address') address: string,
  ): Promise<StatusResponseDto> {
    const response = await this.processorService.getProcessorStatus(address);
    return response as StatusResponseDto;
  }

  @Get(':address/history')
  @ApiOperation({ summary: 'Get device history' })
  @ApiParam({ name: 'address', description: 'Device address' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of history entries to return (default: 100)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Device history retrieved successfully',
    type: HistoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async getDeviceHistory(
    @Param('address') address: string,
    @Query('limit') limit: number = 100,
  ): Promise<HistoryResponseDto> {
    const response = await this.processorService.getDeviceHistory(
      address,
      limit,
    );
    return response as HistoryResponseDto;
  }

  @Get('status')
  @ApiOperation({ summary: 'Get all processor statuses' })
  @ApiResponse({
    status: 200,
    description: 'All latest device statuses retrieved successfully',
    type: StatusesResponseDto,
  })
  async getAllLatestProcessorStatuses(): Promise<StatusesResponseDto> {
    return this.processorService.getAllLatestProcessorStatuses();
  }

  @Get('status/bulk')
  @ApiOperation({ summary: 'Get status for multiple devices' })
  @ApiQuery({
    name: 'addresses',
    description: 'Comma-separated list of device addresses',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Device statuses retrieved successfully',
    type: BulkStatusResponseDto,
  })
  async getBulkDeviceStatus(
    @Query('addresses') addresses: string,
  ): Promise<BulkStatusResponse> {
    const addressList = addresses.split(',').map((addr) => addr.trim());
    return this.processorService.getBulkProcessorStatus(addressList);
  }

  @Get('manager/:address/processors')
  @ApiOperation({
    summary: 'Get all processor addresses for a manager by address',
  })
  @ApiParam({ name: 'address', description: 'Manager address' })
  @ApiResponse({ status: 200, description: 'Processors addresses list' })
  async getProcessorsByManagerAddress(
    @Param('address') address: string,
  ): Promise<string[]> {
    return this.processorService.getProcessorsByManagerAddress(address);
  }
}
