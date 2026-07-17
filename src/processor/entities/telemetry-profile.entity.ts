import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { TelemetryReport } from './telemetry-report.entity';

/**
 * The static device/app context of a telemetry report, deduplicated across
 * reports: a processor produces a new profile row only when one of these
 * fields changes (e.g. an app or OS update).
 */
@Entity()
export class TelemetryProfile {
  @PrimaryGeneratedColumn()
  id: number;

  /** Hash over all profile fields, used for deduplication. */
  @Index()
  @Column({ unique: true })
  hash: string;

  @Column()
  processorType: string;

  @Column()
  appVersion: string;

  @Column()
  platform: string;

  @Column()
  manufacturer: string;

  @Column()
  model: string;

  @Column()
  cpu: string;

  // Nullable: reports from app versions predating these fields omit them
  @Column({ type: 'varchar', nullable: true })
  arch: string | null;

  @Column({ type: 'int', nullable: true })
  cores: number | null;

  @Column('int')
  osVersion: number;

  @Column('bigint')
  totalMemory: number;

  @Column()
  lowRamDevice: boolean;

  @Column()
  network: string;

  @OneToMany(() => TelemetryReport, (report) => report.profile)
  reports: TelemetryReport[];
}
