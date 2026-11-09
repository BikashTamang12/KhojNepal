import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ClaimStatus } from '../enums/claim-status.enum.js';

export class AdminReviewClaimDto {
  @IsIn([ClaimStatus.APPROVED, ClaimStatus.REJECTED])
  status: ClaimStatus.APPROVED | ClaimStatus.REJECTED;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNotes?: string;
}
