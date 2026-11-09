import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../../users/enums/user-role.enum.js';

export class UpdateUserStatusDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
