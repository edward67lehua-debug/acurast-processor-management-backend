import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import { ProcessorStatusDto } from './dto/device-status.dto';
import { ProcessorListItem } from './types';

export interface ProcessorListTemplateData {
  devices?: ProcessorListItem[];
  error?: string;
}

export interface ProcessorStatusTemplateData {
  processorStatus?: ProcessorStatusDto;
  error?: string;
}

export interface ProcessorHistoryTemplateData {
  processorAddress: string;
  history?: ProcessorStatusDto[];
  error?: string;
}

export interface ProcessorGraphTemplateData {
  processorAddress: string;
  error?: string;
}

@Injectable()
export class TemplateService {
  private readonly deviceListTemplate: HandlebarsTemplateDelegate<ProcessorListTemplateData>;
  private readonly deviceStatusTemplate: HandlebarsTemplateDelegate<ProcessorStatusTemplateData>;
  private readonly deviceHistoryTemplate: HandlebarsTemplateDelegate<ProcessorHistoryTemplateData>;
  private readonly deviceGraphTemplate: HandlebarsTemplateDelegate<ProcessorGraphTemplateData>;

  constructor() {
    try {
      // Try both development and production paths
      const possiblePaths = [
        path.join(__dirname, 'templates'),
        path.join(process.cwd(), 'dist', 'src', 'processor', 'templates'),
      ];

      let templatePath = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          templatePath = p;
          break;
        }
      }

      if (!templatePath) {
        throw new Error('Template directory not found');
      }

      // Load and compile templates
      this.deviceListTemplate = Handlebars.compile<ProcessorListTemplateData>(
        fs.readFileSync(path.join(templatePath, 'device-list.html'), 'utf-8'),
      );
      this.deviceStatusTemplate =
        Handlebars.compile<ProcessorStatusTemplateData>(
          fs.readFileSync(
            path.join(templatePath, 'device-status.html'),
            'utf-8',
          ),
        );
      this.deviceHistoryTemplate =
        Handlebars.compile<ProcessorHistoryTemplateData>(
          fs.readFileSync(
            path.join(templatePath, 'device-history.html'),
            'utf-8',
          ),
        );
      this.deviceGraphTemplate = Handlebars.compile<ProcessorGraphTemplateData>(
        fs.readFileSync(path.join(templatePath, 'device-graph.html'), 'utf-8'),
      );

      // Register helper for timestamp formatting
      Handlebars.registerHelper('formatTimestamp', (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleString();
      });
    } catch (error) {
      console.error('Error loading templates:', error);
      throw new HttpException(
        'Failed to initialize templates',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  renderDeviceList(data: ProcessorListTemplateData): string {
    return this.deviceListTemplate(data);
  }

  renderDeviceStatus(data: ProcessorStatusTemplateData): string {
    return this.deviceStatusTemplate(data);
  }

  renderDeviceHistory(data: ProcessorHistoryTemplateData): string {
    return this.deviceHistoryTemplate(data);
  }

  renderDeviceGraph(data: ProcessorGraphTemplateData): string {
    return this.deviceGraphTemplate(data);
  }
}
