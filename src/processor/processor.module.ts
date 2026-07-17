import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessorController } from './processor.controller';
import { ProcessorApiController } from './processor-api.controller';
import { ProcessorWebController } from './processor-web.controller';
import { ProcessorDebugController } from './processor-debug.controller';
import { ProcessorService } from './processor.service';
import { TemplateService } from './template.service';
import { CacheService } from './cache.service';
import { SignatureService } from './signature.service';
import { DeviceStatus } from './entities/device-status.entity';
import { Processor } from './entities/processor.entity';
import { NetworkType } from './entities/network-type.entity';
import { BatteryHealth } from './entities/battery-health.entity';
import { Ssid } from './entities/ssid.entity';
import { TemperatureReading } from './entities/temperature-reading.entity';
import { Manager } from './entities/manager.entity';
import { TelemetryReport } from './entities/telemetry-report.entity';
import { TelemetryProfile } from './entities/telemetry-profile.entity';
import { WhitelistModule } from '../whitelist/whitelist.module';
import { ManagerService } from './manager.service';
import { TelemetryService } from './telemetry.service';
import { TelemetryApiKeyGuard } from './telemetry-api-key.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeviceStatus,
      Processor,
      NetworkType,
      BatteryHealth,
      Ssid,
      TemperatureReading,
      Manager,
      TelemetryReport,
      TelemetryProfile,
    ]),
    WhitelistModule,
  ],
  controllers: [
    ProcessorController,
    ProcessorApiController,
    ProcessorWebController,
    ProcessorDebugController,
  ],
  providers: [
    ProcessorService,
    TemplateService,
    TelemetryService,
    TelemetryApiKeyGuard,
    CacheService,
    SignatureService,
    ManagerService,
  ],
  exports: [CacheService],
})
export class ProcessorModule {}
