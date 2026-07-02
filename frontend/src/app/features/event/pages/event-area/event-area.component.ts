import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { Event as EventModel } from '../../../../shared/types';
import { EventAreaService } from '../../services/event-area.service';
import { LayoutSlotDirective } from '../../../../shared/layouts/page-layout/layout-slot.directive';
import { EventNavRailComponent } from '../../ui/event-nav-rail/event-nav-rail.component';

@Component({
  selector: 'app-event-area',
  imports: [RouterOutlet, LayoutSlotDirective, EventNavRailComponent],
  // Rail nawigacyjny strefy wydarzenia rejestrujemy raz w aside slocie layoutu.
  // EventAreaComponent przeżywa nawigację między dziećmi, więc rail jest trwały
  // (layoutConfig.reset() nie czyści slotów). Aside renderuje się tylko dla widoków `two-column`.
  template: `
    <ng-template appLayoutSlot="aside">
      <app-event-nav-rail />
    </ng-template>

    <router-outlet />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
})
export class EventAreaComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly eventArea = inject(EventAreaService);

  ngOnInit(): void {
    const eventId = this.route.snapshot.paramMap.get('id') ?? '';
    const citySlug = this.route.snapshot.paramMap.get('citySlug') ?? '';
    const resolvedEvent = this.route.snapshot.data['event'] as EventModel | null;
    this.eventArea.init(eventId, citySlug, resolvedEvent ?? undefined);
  }

  ngOnDestroy(): void {
    this.eventArea.destroy();
  }
}
