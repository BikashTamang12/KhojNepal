import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { MatchStatus } from '../enums/match-status.enum.js';

export class QueryMatchesDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @IsOptional()
  @IsUUID()
  itemId?: string;
}
