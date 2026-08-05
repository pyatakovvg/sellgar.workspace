import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DisplayMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  correlationId: string;

  @IsString()
  @IsNotEmpty()
  chatId: string;
}
