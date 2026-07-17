import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CacheService } from './cache.service';

@ApiTags('processor')
@Controller('processor/debug')
export class ProcessorDebugController {
  constructor(private readonly cacheService: CacheService) {}

  @Get('cache/status')
  @ApiOperation({ summary: 'Get cache status information' })
  @ApiResponse({
    status: 200,
    description: 'Cache status information',
  })
  async getCacheStatus() {
    return {
      processorCache: {
        size: this.cacheService.getProcessorCacheSize(),
        capacity: this.cacheService.getProcessorCacheCapacity(),
      },
      deviceStatusCache: {
        size: this.cacheService.getProcessorStatusCacheSize(),
        capacity: this.cacheService.getProcessorStatusCacheCapacity(),
      },
      networkTypeCache: {
        size: this.cacheService.getNetworkTypeCacheSize(),
        capacity: this.cacheService.getNetworkTypeCacheCapacity(),
      },
      batteryHealthCache: {
        size: this.cacheService.getBatteryHealthCacheSize(),
        capacity: this.cacheService.getBatteryHealthCacheCapacity(),
      },
    };
  }

  @Get('cache/contents')
  @ApiOperation({ summary: 'Get cache contents' })
  @ApiResponse({
    status: 200,
    description: 'Cache contents',
  })
  async getCacheContents() {
    return {
      processorCache: this.cacheService.getProcessorCacheContents(),
      processorStatusCache: this.cacheService.getProcessorStatusCacheContents(),
      networkTypeCache: this.cacheService.getNetworkTypeCacheContents(),
      batteryHealthCache: this.cacheService.getBatteryHealthCacheContents(),
      ssidCache: this.cacheService.getSsidCacheContents(),
    };
  }
}
