import { IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { ClaimStatus } from '../enums/claim-status.enum.js';
import { FinderClaimStatus } from '../enums/finder-claim-status.enum.js';

export class QueryClaimsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ClaimStatus)
  status?: ClaimStatus;

  @IsOptional()
  @IsEnum(FinderClaimStatus)
  finderStatus?: FinderClaimStatus;

  @IsOptional()
  @IsIn(['submitted', 'received', 'all'])
  role?: 'submitted' | 'received' | 'all' = 'all';

  @IsOptional()
  @IsUUID()
  itemId?: string;
}
