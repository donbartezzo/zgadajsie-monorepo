import { Pipe, PipeTransform, inject } from '@angular/core';
import { DateLabelsService } from '../services/date-labels.service';

@Pipe({ name: 'eventDuration', standalone: true })
export class EventDurationPipe implements PipeTransform {
  private readonly dateLabels = inject(DateLabelsService);

  transform(startsAt: string | Date | undefined, endsAt: string | Date | undefined): string {
    return this.dateLabels.formatDuration(startsAt, endsAt);
  }
}
