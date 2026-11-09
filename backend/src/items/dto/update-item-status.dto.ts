import { IsEnum } from 'class-validator';
import { ItemStatus } from '../enums/item-status.enum.js';

export class UpdateItemStatusDto {
  @IsEnum(ItemStatus)
  status: ItemStatus;
}
