import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ArrayUnique,
} from 'class-validator';
import { EventSeriesRecurrenceType } from '@zgadajsie/shared';

export class CreateSeriesFromEventDto {
  @IsString()
  @MaxLength(120)
  name: string;

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
  @IsOptional()
  time?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(60 * 24 * 7)
  durationMinutes?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(90)
  bufferDays?: number;

  @IsOptional()
  @IsBoolean()
  autoCoverImage?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  targetOccupancy?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cleanupHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minFreeSlotsBuffer?: number;
}
