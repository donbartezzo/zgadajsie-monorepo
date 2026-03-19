import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { EventAreaService } from '../../services/event-area.service';

@Component({
  selector: 'app-event-area',
  imports: [RouterOutlet],
  template: '<router-outlet />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventAreaComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly eventArea = inject(EventAreaService);

  ngOnInit(): void {
    const eventId = this.route.snapshot.paramMap.get('id') ?? '';
    const citySlug = this.route.snapshot.paramMap.get('citySlug') ?? '';
    this.eventArea.init(eventId, citySlug);
  }

  ngOnDestroy(): void {
    this.eventArea.destroy();
  }
}
