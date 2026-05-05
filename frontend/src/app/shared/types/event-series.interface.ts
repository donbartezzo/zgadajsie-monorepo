import {
  EventSeriesRecurrenceType,
  EventSeriesBase,
  EventSeriesPreviewItem,
} from '@zgadajsie/shared';
import { EventBase } from './event-base.interface';

export type { EventSeriesRecurrenceType, EventSeriesBase, EventSeriesPreviewItem };

export interface EventSeriesView extends EventSeriesBase {
  events: EventBase[];
}
