import { IsNumber, Min, Max } from 'class-validator';

export class TopupDto {
  @IsNumber()
  @Min(1)
  @Max(10000)
  amount: number;
}
