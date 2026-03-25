import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { Event } from '../../shared/types/event.interface';
import { AppTitleService } from '../services/app-title.service';

function eventResolvedTitle(prefix: string): ResolveFn<string> {
  return (route: ActivatedRouteSnapshot) => {
    const event = route.parent?.data?.['event'] as Event | undefined;

    if (!event?.title) {
      return prefix;
    }

    return AppTitleService.buildRawResolvedTitle(prefix, event.title, event.city?.name);
  };
}

export function setEventResolvedTitle(prefix: string) {
  return {
    resolvedTitle: eventResolvedTitle(prefix),
  };
}
