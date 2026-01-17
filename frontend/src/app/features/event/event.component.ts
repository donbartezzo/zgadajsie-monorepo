import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../../core/icons/icon.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-event',
  imports: [IconComponent],
  templateUrl: './event.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventComponent {
  constructor(private readonly router: Router) {}

  // Static mock data for now, matching the template content
  readonly title = 'Paintball at the Park';
  readonly category = 'Outdoor Events';
  readonly dateShort = 'AUG 28';
  readonly dateFull = '28 August 2025 - 09:00 AM';
  readonly subtitle = "Over 150 Participants Have RSVP'ed.";
  readonly location = 'Area 51, Nevada';
  readonly organiserName = 'Enabled Studio';
  readonly organiserRole = 'Event Organiser';
  readonly attendeesCount = 135;
  readonly scheduleDateLabel = 'Sun, 28 August';
  readonly scheduleTimeLabel = '06:00 - 12:00 PM';
  readonly placeCountry = 'United States';
  readonly placeAddress = 'California, Palo Alto\n1st Apple Street, 31515';
  readonly ticketPrice = '$10 USD';

  onBackClick(): void {
    this.router.navigate(['/events']);
  }
}
