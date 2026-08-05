import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CorrelationQueryDto {
  @Transform(({ value }) => (Array.isArray(value) ? value : value === undefined ? [] : [value]))
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  correlationId: string[];
}
