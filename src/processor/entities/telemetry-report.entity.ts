import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { Processor } from './processor.entity';
import { TelemetryProfile } from './telemetry-profile.entity';
import type { TelemetryDisabledReason, TelemetryMetrics } from '../types';

@Entity()
@Unique(['processor', 'reportedAt'])
export class TelemetryReport {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Processor, (processor) => processor.telemetryReports)
  processor: Processor;

  @ManyToOne(() => TelemetryProfile, (profile) => profile.reports)
  profile: TelemetryProfile;

  @Column({ nullable: true })
  ipAddress: string;

  @Column('bigint')
  availableMemory: number;

  // Nullable: reports from app versions predating this field omit it
  @Column({ type: 'int', nullable: true })
  availableCores: number | null;

  @Column()
  networkType: string;

  @Column('bigint')
  uptime: number;

  @Column('bigint', { nullable: true })
  periodStart: number | null;

  @Column('bigint', { nullable: true })
  periodEnd: number | null;

  @Column('bigint')
  reportedAt: number;

  @Column()
  statusType: string;

  @Column('simple-json', { nullable: true })
  disabledReasons: TelemetryDisabledReason[] | null;

  @Column('text', { nullable: true })
  statusMessage: string | null;

  @Column('bigint', { nullable: true })
  sessionDuration: number | null;

  @Column('simple-json')
  metrics: TelemetryMetrics;

  @CreateDateColumn()
  createdAt: Date;
}
