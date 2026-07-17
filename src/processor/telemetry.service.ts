import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { createHash } from 'crypto';
import {
  TelemetryReportRequest,
  TelemetryReportResponse,
  TelemetryLatestResponse,
  TelemetryHistoryResponse,
  TelemetryReportsResponse,
} from './types';
import { TelemetryReport } from './entities/telemetry-report.entity';
import { TelemetryProfile } from './entities/telemetry-profile.entity';
import { Processor } from './entities/processor.entity';
import { SignatureService } from './signature.service';
import { TelemetryReportDto } from './dto/telemetry-report.dto';

/** The static fields of a report that make up its deduplicated profile. */
type ProfileFields = Omit<TelemetryProfile, 'id' | 'hash' | 'reports'>;

@Injectable()
export class TelemetryService {
  private profileCache = new Map<string, TelemetryProfile>();

  constructor(
    @InjectRepository(TelemetryReport)
    private telemetryReportRepository: Repository<TelemetryReport>,
    @InjectRepository(TelemetryProfile)
    private telemetryProfileRepository: Repository<TelemetryProfile>,
    @InjectRepository(Processor)
    private processorRepository: Repository<Processor>,
    private signatureService: SignatureService,
  ) {}

  private async getOrCreateProcessor(address: string): Promise<Processor> {
    let processor = await this.processorRepository.findOne({
      where: { address },
    });
    if (!processor) {
      processor = this.processorRepository.create({ address });
      processor = await this.processorRepository.save(processor);
    }
    return processor;
  }

  private extractProfileFields(report: TelemetryReportRequest): ProfileFields {
    return {
      processorType: report.processorType,
      appVersion: report.appVersion,
      platform: report.platform,
      manufacturer: report.environment.manufacturer,
      model: report.environment.model,
      cpu: report.environment.cpu,
      arch: report.environment.arch ?? null,
      cores: report.environment.cores ?? null,
      osVersion: report.environment.osVersion,
      totalMemory: report.environment.totalMemory,
      lowRamDevice: report.environment.lowRamDevice,
      network: report.environment.network,
    };
  }

  private hashProfile(fields: ProfileFields): string {
    const canonical = [
      fields.processorType,
      fields.appVersion,
      fields.platform,
      fields.manufacturer,
      fields.model,
      fields.cpu,
      fields.arch ?? '',
      fields.cores ?? '',
      fields.osVersion,
      fields.totalMemory,
      fields.lowRamDevice,
      fields.network,
    ].join('|');
    return createHash('sha256').update(canonical).digest('hex');
  }

  private async getOrCreateProfile(
    report: TelemetryReportRequest,
  ): Promise<TelemetryProfile> {
    const fields = this.extractProfileFields(report);
    const hash = this.hashProfile(fields);

    const cached = this.profileCache.get(hash);
    if (cached) {
      return cached;
    }

    let profile = await this.telemetryProfileRepository.findOne({
      where: { hash },
    });
    if (!profile) {
      profile = this.telemetryProfileRepository.create({ ...fields, hash });
      try {
        profile = await this.telemetryProfileRepository.save(profile);
      } catch (error) {
        // Another request may have created the same profile concurrently
        if (
          error instanceof QueryFailedError &&
          (error.driverError as { code?: string })?.code === '23505'
        ) {
          profile = await this.telemetryProfileRepository.findOneOrFail({
            where: { hash },
          });
        } else {
          throw error;
        }
      }
    }
    this.profileCache.set(hash, profile);
    return profile;
  }

  private transformToDto(report: TelemetryReport): TelemetryReportDto {
    return {
      processorAddress: report.processor.address,
      processorType: report.profile.processorType,
      appVersion: report.profile.appVersion,
      platform: report.profile.platform,
      ipAddress: report.ipAddress,
      environment: {
        manufacturer: report.profile.manufacturer,
        model: report.profile.model,
        cpu: report.profile.cpu,
        arch: report.profile.arch ?? undefined,
        cores: report.profile.cores ?? undefined,
        availableCores: report.availableCores ?? undefined,
        osVersion: report.profile.osVersion,
        totalMemory: report.profile.totalMemory,
        availableMemory: report.availableMemory,
        lowRamDevice: report.profile.lowRamDevice,
        networkType: report.networkType,
        uptime: report.uptime,
        network: report.profile.network,
      },
      period: {
        start: report.periodStart ?? undefined,
        end: report.periodEnd ?? undefined,
        reportedAt: report.reportedAt,
      },
      status: {
        type: report.statusType as 'ok' | 'disabled',
        metrics: report.metrics,
        reasons: report.disabledReasons ?? undefined,
        message: report.statusMessage ?? undefined,
        sessionDuration: report.sessionDuration ?? undefined,
      },
    };
  }

  async handleReport(
    report: TelemetryReportRequest,
    signature: string,
  ): Promise<TelemetryReportResponse> {
    // Verify the signature first
    const isValid = await this.signatureService.verifyTelemetryReportSignature(
      report,
      signature,
    );
    if (!isValid) {
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }

    const [processor, profile] = await Promise.all([
      this.getOrCreateProcessor(report.processorAddress),
      this.getOrCreateProfile(report),
    ]);

    const telemetryReport = this.telemetryReportRepository.create({
      processor,
      profile,
      ipAddress: report.ipAddress,
      availableMemory: report.environment?.availableMemory,
      availableCores: report.environment?.availableCores ?? null,
      networkType: report.environment?.networkType,
      uptime: report.environment?.uptime,
      periodStart: report.period?.start ?? null,
      periodEnd: report.period?.end ?? null,
      reportedAt: report.period?.reportedAt,
      statusType: report.status?.type,
      disabledReasons: report.status?.reasons ?? null,
      statusMessage: report.status?.message ?? null,
      sessionDuration: report.status?.sessionDuration ?? null,
      metrics: report.status?.metrics,
    });

    try {
      await this.telemetryReportRepository.save(telemetryReport);
    } catch (error) {
      // Ignore duplicate reports (same processor and reportedAt)
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === '23505' &&
        error.message.includes('duplicate key value violates unique constraint')
      ) {
        console.warn(
          'Duplicate telemetry report detected',
          report.processorAddress,
          report.period?.reportedAt,
        );
        return { success: true };
      }
      throw error;
    }

    return { success: true };
  }

  async getLatestReport(
    processorAddress: string,
  ): Promise<TelemetryLatestResponse> {
    const latestReport = await this.telemetryReportRepository
      .createQueryBuilder('report')
      .innerJoinAndSelect('report.processor', 'processor')
      .innerJoinAndSelect('report.profile', 'profile')
      .where('processor.address = :address', { address: processorAddress })
      .orderBy('report.reportedAt', 'DESC')
      .take(1)
      .getOne();

    if (!latestReport) {
      throw new NotFoundException('No telemetry reports found for processor');
    }

    return { report: this.transformToDto(latestReport) };
  }

  async getReportHistory(
    processorAddress: string,
    limit: number,
  ): Promise<TelemetryHistoryResponse> {
    const reports = await this.telemetryReportRepository.find({
      where: { processor: { address: processorAddress } },
      order: { reportedAt: 'DESC' },
      take: limit,
      relations: ['processor', 'profile'],
    });

    if (!reports.length) {
      throw new NotFoundException('No telemetry reports found for processor');
    }

    return {
      reports: reports.map((report) => this.transformToDto(report)),
    };
  }

  async getAllLatestReports(): Promise<TelemetryReportsResponse> {
    const reports = await this.telemetryReportRepository
      .createQueryBuilder('report')
      .innerJoinAndSelect('report.processor', 'processor')
      .innerJoinAndSelect('report.profile', 'profile')
      .where((qb) => {
        const subQuery = qb
          .subQuery()
          .select('MAX(r2.reportedAt)')
          .from(TelemetryReport, 'r2')
          .innerJoin('r2.processor', 'p2')
          .where('p2.address = processor.address')
          .getQuery();
        return 'report.reportedAt = ' + subQuery;
      })
      .orderBy('report.reportedAt', 'DESC')
      .getMany();

    return {
      reports: reports.map((report) => this.transformToDto(report)),
    };
  }
}
