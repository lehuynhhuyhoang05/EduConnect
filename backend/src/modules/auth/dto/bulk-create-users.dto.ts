import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkCreateUsersDto {
  @ApiProperty({
    description: 'Number of test users to create',
    minimum: 1,
    maximum: 500,
    example: 100,
  })
  @IsNumber()
  @Min(1)
  @Max(500)
  count: number;
}
