import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ReportType } from '../enums/report-type.enum.js';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(5000)
  description: string;

  @IsEnum(ReportType)
  reportType: ReportType;

  @IsUUID()
  categoryId: string;

  @IsUUID()
  locationId: string;

  @IsDateString()
  dateLostOrFound: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  specificLocationDetails?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  contactInfo?: string;
}
