import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsObject,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

class EventRoleDto {
  @IsString()
  key: string;

  @IsString()
  title: string;

  @IsString()
  desc: string;

  @IsInt()
  @Min(0)
  slots: number;

  @IsBoolean()
  isDefault: boolean;
}

class EventRoleConfigDto {
  @IsString()
  disciplineSlug: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventRoleDto)
  roles: EventRoleDto[];
}

export class CreateEventDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  disciplineId: string;

  @IsString()
  facilityId: string;

  @IsString()
  levelId: string;

  @IsString()
  cityId: string;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

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

  @IsString()
  address: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsString()
  coverImageId?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  recurringRule?: string;

  @IsOptional()
  @IsString()
  rules?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EventRoleConfigDto)
  roleConfig?: EventRoleConfigDto;
}
