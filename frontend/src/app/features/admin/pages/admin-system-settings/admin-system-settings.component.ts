import { Component, effect, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { AddAuthorizedOrganizerModalComponent } from '../../overlays/add-authorized-organizer-modal/add-authorized-organizer-modal.component';
import { SystemSettingsService } from '../../../../core/services/system-settings.service';
import {
  SystemSettings,
  AuthorizedOrganizer,
} from '../../../../shared/types/system-settings.interface';
import { City } from '../../../../shared/types/dictionary.interface';

@Component({
  selector: 'app-admin-system-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardComponent,
    IconComponent,
    ButtonComponent,
    AddAuthorizedOrganizerModalComponent,
  ],
  templateUrl: './admin-system-settings.component.html',
  styleUrls: ['./admin-system-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSystemSettingsComponent {
  protected readonly settings = signal<SystemSettings | null>(null);
  protected readonly authorizedOrganizers = signal<AuthorizedOrganizer[]>([]);
  protected readonly cities = signal<City[]>([]);
  protected readonly loading = signal(false);
  protected readonly updating = signal(false);
  protected readonly eventCreationRestricted = signal(false);
  protected readonly onlinePaymentsDisabled = signal(false);
  protected readonly showAddOrganizerModal = signal(false);

  private readonly systemSettingsService = inject(SystemSettingsService);

  constructor() {
    effect(() => {
      this.loadSettings();
      this.loadAuthorizedOrganizers();
    });

    // Sync toggles with settings
    effect(() => {
      const currentSettings = this.settings();
      if (currentSettings) {
        this.eventCreationRestricted.set(currentSettings.eventCreationRestricted);
        this.onlinePaymentsDisabled.set(currentSettings.onlinePaymentsDisabled);
      }
    });

    this.loadAuthorizedOrganizers();
  }

  protected openAddOrganizerModal(): void {
    this.showAddOrganizerModal.set(true);
  }

  protected closeAddOrganizerModal(): void {
    this.showAddOrganizerModal.set(false);
  }

  protected handleAddOrganizerSuccess(): void {
    this.closeAddOrganizerModal();
    this.loadAuthorizedOrganizers();
  }

  private loadSettings(): void {
    this.systemSettingsService.getAdminSettings().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.loading.set(false);
      },
      error: (_error) => {
        this.loading.set(false);
      },
    });
  }

  private loadAuthorizedOrganizers(): void {
    this.systemSettingsService.getAuthorizedOrganizers().subscribe({
      next: (organizers) => {
        this.authorizedOrganizers.set(organizers);
      },
      error: (_error) => {
        console.error('Failed to load authorized organizers');
      },
    });
  }

  protected updateEventCreationRestricted(restricted: boolean): void {
    this.eventCreationRestricted.set(restricted);
    this.systemSettingsService.updateEventCreationRestricted(restricted).subscribe({
      next: (updated) => {
        this.settings.set(updated);
      },
      error: (_error) => {
        console.error('Failed to update event creation restriction');
        // Revert the toggle
        const current = this.settings();
        if (current) {
          this.eventCreationRestricted.set(current.eventCreationRestricted);
        }
      },
    });
  }

  protected updateOnlinePaymentsDisabled(disabled: boolean): void {
    this.onlinePaymentsDisabled.set(disabled);
    this.systemSettingsService.updateOnlinePaymentsDisabled(disabled).subscribe({
      next: (updated) => {
        this.settings.set(updated);
      },
      error: (_error) => {
        console.error('Failed to update online payments disabled');
        // Revert the toggle
        const current = this.settings();
        if (current) {
          this.onlinePaymentsDisabled.set(current.onlinePaymentsDisabled);
        }
      },
    });
  }

  protected removeAuthorizedOrganizer(organizer: AuthorizedOrganizer): void {
    // TODO: Implement confirmation modal
    this.systemSettingsService.removeAuthorizedOrganizer(organizer.userId).subscribe({
      next: () => {
        this.loadAuthorizedOrganizers();
      },
      error: (_error) => {
        console.error('Failed to remove authorized organizer');
      },
    });
  }

  protected getCityDisplayName(organizer: AuthorizedOrganizer): string {
    return organizer.city?.name || 'Wszystkie miasta';
  }
}
