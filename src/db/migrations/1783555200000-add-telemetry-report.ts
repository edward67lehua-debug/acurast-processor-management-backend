import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTelemetryReport1783555200000 implements MigrationInterface {
  name = 'AddTelemetryReport1783555200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "telemetry_profile" ("id" SERIAL NOT NULL, "hash" character varying NOT NULL, "processorType" character varying NOT NULL, "appVersion" character varying NOT NULL, "platform" character varying NOT NULL, "manufacturer" character varying NOT NULL, "model" character varying NOT NULL, "cpu" character varying NOT NULL, "arch" character varying, "cores" integer, "osVersion" integer NOT NULL, "totalMemory" bigint NOT NULL, "lowRamDevice" boolean NOT NULL, "network" character varying NOT NULL, CONSTRAINT "UQ_telemetry_profile_hash" UNIQUE ("hash"), CONSTRAINT "PK_telemetry_profile_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_telemetry_profile_hash" ON "telemetry_profile" ("hash")`,
    );
    await queryRunner.query(
      `CREATE TABLE "telemetry_report" ("id" SERIAL NOT NULL, "ipAddress" character varying, "availableMemory" bigint NOT NULL, "availableCores" integer, "networkType" character varying NOT NULL, "uptime" bigint NOT NULL, "periodStart" bigint, "periodEnd" bigint, "reportedAt" bigint NOT NULL, "statusType" character varying NOT NULL, "disabledReasons" text, "statusMessage" text, "sessionDuration" bigint, "metrics" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "processorId" integer, "profileId" integer, CONSTRAINT "UQ_telemetry_report_processor_reported_at" UNIQUE ("processorId", "reportedAt"), CONSTRAINT "PK_telemetry_report_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "telemetry_report" ADD CONSTRAINT "FK_telemetry_report_processor" FOREIGN KEY ("processorId") REFERENCES "processor"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "telemetry_report" ADD CONSTRAINT "FK_telemetry_report_profile" FOREIGN KEY ("profileId") REFERENCES "telemetry_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "telemetry_report" DROP CONSTRAINT "FK_telemetry_report_profile"`,
    );
    await queryRunner.query(
      `ALTER TABLE "telemetry_report" DROP CONSTRAINT "FK_telemetry_report_processor"`,
    );
    await queryRunner.query(`DROP TABLE "telemetry_report"`);
    await queryRunner.query(`DROP INDEX "IDX_telemetry_profile_hash"`);
    await queryRunner.query(`DROP TABLE "telemetry_profile"`);
  }
}
