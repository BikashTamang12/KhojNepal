import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { FinderClaimStatus } from '../enums/finder-claim-status.enum.js';

export class FinderReviewClaimDto {
  @IsIn([FinderClaimStatus.CONFIRMED, FinderClaimStatus.DISPUTED])
  finderStatus: FinderClaimStatus.CONFIRMED | FinderClaimStatus.DISPUTED;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  finderNotes?: string;
}
