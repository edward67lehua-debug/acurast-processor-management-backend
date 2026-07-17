import { Controller, Get, Query, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ProcessorService } from './processor.service';
import { TemplateService } from './template.service';

@ApiTags('processor')
@Controller('processor/web')
export class ProcessorWebController {
  constructor(
    private readonly processorService: ProcessorService,
    private readonly templateService: TemplateService,
  ) {}

  @Get('list')
  async getDeviceList(@Res() res: Response): Promise<void> {
    try {
      const response = await this.processorService.getProcessorList();
      const html = this.templateService.renderDeviceList({
        devices: response.devices,
      });
      res.send(html);
    } catch (error) {
      const html = this.templateService.renderDeviceList({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch device list',
      });
      res.send(html);
    }
  }

  @Get(':address/status')
  async getDeviceStatus(
    @Param('address') address: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const response = await this.processorService.getProcessorStatus(address);
      const html = this.templateService.renderDeviceStatus({
        processorStatus: response.processorStatus,
      });
      res.send(html);
    } catch (error) {
      const html = this.templateService.renderDeviceStatus({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch device status',
      });
      res.send(html);
    }
  }

  @Get(':address/history')
  async getDeviceHistory(
    @Param('address') address: string,
    @Query('limit') limit: string = '100',
    @Res() res: Response,
  ): Promise<void> {
    try {
      const response = await this.processorService.getDeviceHistory(
        address,
        parseInt(limit),
      );
      const html = this.templateService.renderDeviceHistory({
        processorAddress: address,
        history: response.history,
      });
      res.send(html);
    } catch (error) {
      const html = this.templateService.renderDeviceHistory({
        processorAddress: address,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch device history',
      });
      res.send(html);
    }
  }

  @Get(':address/graph')
  async getDeviceGraph(
    @Param('address') address: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const html = this.templateService.renderDeviceGraph({
        processorAddress: address,
      });
      res.send(html);
    } catch (error) {
      const html = this.templateService.renderDeviceGraph({
        processorAddress: address,
        error:
          error instanceof Error ? error.message : 'Failed to load graph page',
      });
      res.send(html);
    }
  }
}
