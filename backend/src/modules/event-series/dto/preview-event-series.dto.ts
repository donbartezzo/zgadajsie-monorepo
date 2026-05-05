import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
  ArrayUnique,
} from 'class-validator';
import { EventSeriesRecurrenceType } from '@zgadajsie/shared';

export class PreviewEventSeriesDto {
  @IsEnum(EventSeriesRecurrenceType)
  recurrenceType: EventSeriesRecurrenceType;

  @ValidateIf((o) => o.recurrenceType === EventSeriesRecurrenceType.INTERVAL)
  @IsInt()
  @Min(1)
  @Max(90)
  intervalDays?: number;

  @ValidateIf((o) => o.recurrenceType === EventSeriesRecurrenceType.WEEKLY)
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek?: number[];

  @Matches(/^\d{2}:\d{2}$/)
  time: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsInt()
  @Min(15)
  @Max(60 * 24 * 7)
  durationMinutes: number;

  @IsString()
  startDate: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  count?: number;
}
