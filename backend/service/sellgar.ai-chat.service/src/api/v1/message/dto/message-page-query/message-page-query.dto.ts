import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class MessagePageQueryDto {
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @IsOptional()
  @IsString()
  beforeId?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
