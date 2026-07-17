import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Headers,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ProcessorService } from './processor.service';
import { TelemetryService } from './telemetry.service';
import { WhitelistService } from '../whitelist/whitelist.service';
import { CheckInRequestDto, CheckInResponseDto } from './dto/check-in.dto';
import {
  TelemetryReportDto,
  TelemetryReportResponseDto,
} from './dto/telemetry-report.dto';

@ApiTags('processor')
@Controller('processor')
export class ProcessorController {
  private readonly logger = new Logger(ProcessorController.name);

  constructor(
    private readonly processorService: ProcessorService,
    private readonly telemetryService: TelemetryService,
    private readonly whitelistService: WhitelistService,
    private readonly configService: ConfigService,
  ) {}

  @Post('check-in')
  @ApiOperation({ summary: 'Submit a device check-in' })
  @ApiHeader({
    name: 'X-Device-Signature',
    description: 'Digital signature of the check-in request',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Check-in successful',
    type: CheckInResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Processor not whitelisted' })
  async checkIn(
    @Body() checkInRequest: CheckInRequestDto,
    @Headers('x-device-signature') signature: string,
  ): Promise<CheckInResponseDto> {
    this.assertWhitelisted(checkInRequest.deviceAddress, 'check-in');

    this.logger.log(
      `New check-in received from ${checkInRequest.deviceAddress}`,
    );
    try {
      const serviceResponse = await this.processorService.handleCheckIn(
        checkInRequest,
        signature,
      );

      const refreshInterval = parseInt(
        this.configService.get<string>('REFRESH_INTERVAL_IN_SECONDS', '60'),
        10,
      );

      return {
        success: serviceResponse.success,
        refreshIntervalInSeconds: isNaN(refreshInterval) ? 60 : refreshInterval,
      };
    } catch (error) {
      throw this.toHttpException(
        error,
        'check-in',
        checkInRequest.deviceAddress,
      );
    }
  }

  @Post('telemetry')
  @ApiOperation({ summary: 'Submit a telemetry report' })
  @ApiHeader({
    name: 'X-Device-Signature',
    description: 'Digital signature of the telemetry report',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Telemetry report accepted',
    type: TelemetryReportResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Processor not whitelisted' })
  async submitTelemetryReport(
    @Body() report: TelemetryReportDto,
    @Headers('x-device-signature') signature: string,
    @Headers() headers: Record<string, string>,
  ): Promise<TelemetryReportResponseDto> {
    this.logger.log(
      `Incoming telemetry POST\n` +
        `headers: ${JSON.stringify(headers)}\n` +
        `x-device-signature: ${signature}\n` +
        `body: ${JSON.stringify(report)}`,
    );

    this.assertWhitelisted(report.processorAddress, 'telemetry report');

    this.logger.log(
      `New telemetry report received from ${report.processorAddress}`,
    );
    try {
      return await this.telemetryService.handleReport(report, signature);
    } catch (error) {
      throw this.toHttpException(
        error,
        'telemetry report',
        report.processorAddress,
      );
    }
  }

  private assertWhitelisted(address: string, context: string): void {
    if (!this.whitelistService.shouldHandleProcessor(address)) {
      this.logger.warn(
        `Rejecting ${context} from non-whitelisted processor: ${address}`,
      );
      throw new ForbiddenException(`Processor ${address} is not whitelisted.`);
    }
  }

  private toHttpException(
    error: unknown,
    context: string,
    address: string,
  ): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    if (error instanceof Error) {
      this.logger.error(
        `Error during ${context} for ${address}: ${error.message}`,
        error.stack,
      );
      return new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    this.logger.error(
      `Unknown error type during ${context} for ${address}: ${JSON.stringify(error)}`,
    );
    return new HttpException(
      `Unknown server error during ${context}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
