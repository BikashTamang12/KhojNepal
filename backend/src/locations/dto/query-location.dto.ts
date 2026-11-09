import { IsOptional, IsString, MaxLength } from 'class-validator';

export class QueryLocationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  municipality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  q?: string;
}
