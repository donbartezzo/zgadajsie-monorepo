import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateEventSeriesDto } from './create-event-series.dto';

export class UpdateEventSeriesDto extends PartialType(CreateEventSeriesDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
