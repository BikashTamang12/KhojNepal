import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateHandoverActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
