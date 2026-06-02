import { IsString, IsNotEmpty } from 'class-validator';

export class MarkByGroupDto {
  @IsString()
  @IsNotEmpty()
  groupKey: string;
}
