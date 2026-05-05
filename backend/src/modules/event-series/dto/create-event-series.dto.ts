import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
  ArrayUnique,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventSeriesRecurrenceType } from '@zgadajsie/shared';

class SeriesEventRoleDto {
  @IsString()
  key: string;

  @IsInt()
  @Min(0)
  slots: number;

  @IsBoolean()
  isDefault: boolean;
}

class SeriesEventRoleConfigDto {
  @IsString()
  disciplineSlug: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeriesEventRoleDto)
  roles: SeriesEventRoleDto[];
}

export class CreateEventSeriesDto {
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
  time: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsInt()
  @Min(15)
  @Max(60 * 24 * 7)
  durationMinutes: number;

  @IsDateString()
  startDate: string;

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

  // Pola szablonu wydarzeń (templateSnapshot)

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  disciplineSlug: string;

  @IsString()
  facilitySlug: string;

  @IsString()
  levelSlug: string;

  @IsString()
  citySlug: string;

  @IsString()
  address: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerPerson?: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  minParticipants?: number;

  @IsInt()
  @Min(2)
  @Max(100)
  maxParticipants: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  ageMin?: number;

  @IsOptional()
  @IsInt()
  @Max(120)
  ageMax?: number;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  visibility?: string;

  @IsOptional()
  @IsString()
  coverImageId?: string;

  @IsOptional()
  @IsString()
  rules?: string;

  @IsOptional()
  @IsBoolean()
  facilityReserved?: boolean;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SeriesEventRoleConfigDto)
  roleConfig?: SeriesEventRoleConfigDto;
}
