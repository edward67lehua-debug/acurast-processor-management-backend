import { ApiProperty } from '@nestjs/swagger';
import { NetworkTypeEnum, BatteryHealthState } from '../enums';
import { CheckInRequest, CheckInResponse } from '../types';
import { TemperatureReadingsDto } from './device-status.dto';

export class CheckInRequestDto implements CheckInRequest {
  @ApiProperty({ description: 'Processor address' })
  deviceAddress: string;

  @ApiProperty({ description: 'Platform (0 = Android, 1 = iOS)' })
  platform: number;

  @ApiProperty({ description: 'Timestamp of the check-in' })
  timestamp: number;

  @ApiProperty({ description: 'Battery level percentage' })
  batteryLevel: number;

  @ApiProperty({ description: 'Whether the processor is currently charging' })
  isCharging: boolean;

  @ApiProperty({
    description: 'Battery health state',
    type: String,
    required: false,
  })
  batteryHealth?: BatteryHealthState;

  @ApiProperty({
    description: 'Temperature readings',
    type: TemperatureReadingsDto,
    required: false,
  })
  temperatures?: TemperatureReadingsDto;

  @ApiProperty({ description: 'Network type', enum: NetworkTypeEnum })
  networkType: NetworkTypeEnum;

  @ApiProperty({ description: 'Network SSID', required: false })
  ssid: string;
}

export class CheckInResponseDto implements CheckInResponse {
  @ApiProperty({ description: 'Whether the check-in was successful' })
  success: boolean;

  @ApiProperty({
    description: 'Recommended refresh interval in seconds',
    required: true,
  })
  refreshIntervalInSeconds?: number;
}
