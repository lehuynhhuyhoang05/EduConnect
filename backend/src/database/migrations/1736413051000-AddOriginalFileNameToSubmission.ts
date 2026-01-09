import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOriginalFileNameToSubmission1736413051000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'submissions',
      new TableColumn({
        name: 'original_file_name',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('submissions', 'original_file_name');
  }
}
