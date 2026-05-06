import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { CardComponent } from '../../../../shared/ui/card/card.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { AdminService, CronStatus, CronLog } from '../../../../core/services/admin.service';

@Component({
  selector: 'app-admin-crons',
  imports: [CommonModule, IconComponent, CardComponent, ButtonComponent, DatePipe],
  template: `
    <div class="p-4">
      <h1 class="text-xl font-bold text-neutral-900 mb-6">Zarządzanie cronami</h1>
      <div class="space-y-3">
        @for (cron of crons(); track cron.name) {
          <app-card>
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <h3 class="font-medium text-neutral-900">{{ cron.name }}</h3>
                  @if (cron.lastError) {
                    <span
                      class="px-2 py-0.5 text-xs font-medium text-danger bg-danger/10 rounded-full"
                    >
                      BŁĄD
                    </span>
                  } @else if (cron.lastRun) {
                    <span
                      class="px-2 py-0.5 text-xs font-medium text-success bg-success/10 rounded-full"
                    >
                      OK
                    </span>
                  } @else {
                    <span
                      class="px-2 py-0.5 text-xs font-medium text-warning bg-warning/10 rounded-full"
                    >
                      NIGDY
                    </span>
                  }
                </div>
                <div class="text-xs text-neutral-500 space-y-1">
                  @if (cron.lastRun) {
                    <p>Ostatnie uruchomienie: {{ cron.lastRun | date: 'short' }}</p>
                  }
                  @if (cron.nextRun) {
                    <p>Następne uruchomienie: {{ cron.nextRun | date: 'short' }}</p>
                  }
                  @if (cron.lastDurationMs !== null) {
                    <p>Czas trwania: {{ (cron.lastDurationMs / 1000).toFixed(2) }}s</p>
                  }
                  @if (cron.lastError) {
                    <p class="text-danger">Błąd: {{ cron.lastError }}</p>
                  }
                </div>
              </div>
              <div class="flex items-center gap-2">
                <app-button (clicked)="toggleLogs(cron.name)" variant="ghost" size="sm">
                  @if (expandedCron() === cron.name) {
                    Ukryj logi
                  } @else {
                    Pokaż logi
                  }
                </app-button>
                <app-button
                  (clicked)="triggerCron(cron.name)"
                  [disabled]="triggering() === cron.name"
                  [loading]="triggering() === cron.name"
                  variant="outline"
                  size="sm"
                >
                  Uruchom ręcznie
                </app-button>
              </div>
            </div>
            @if (expandedCron() === cron.name) {
              <div class="mt-4 pt-4 border-t border-neutral-200">
                <div class="mb-2 text-xs font-medium text-neutral-600">Ostatnie uruchomienia</div>
                @if (loadingLogs()) {
                  <div class="text-xs text-neutral-500">Ładowanie logów...</div>
                } @else if (cronLogs().length === 0) {
                  <div class="text-xs text-neutral-500">Brak logów</div>
                } @else {
                  <div class="space-y-2 max-h-64 overflow-y-auto">
                    @for (log of cronLogs(); track log.id) {
                      <div class="p-2 bg-neutral-50 rounded text-xs">
                        <div class="flex items-center justify-between mb-1">
                          <span class="font-medium text-neutral-700">
                            {{ log.startedAt | date: 'short' }}
                          </span>
                          @if (log.error) {
                            <span class="text-danger">BŁĄD</span>
                          } @else if (log.completedAt) {
                            <span class="text-success">OK</span>
                          } @else {
                            <span class="text-warning">TRWA</span>
                          }
                        </div>
                        @if (log.durationMs !== null) {
                          <div class="text-neutral-500">
                            Czas: {{ (log.durationMs / 1000).toFixed(2) }}s
                          </div>
                        }
                        @if (log.error) {
                          <div class="text-danger mt-1 break-all">{{ log.error }}</div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </app-card>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCronsComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  readonly crons = signal<CronStatus[]>([]);
  readonly triggering = signal<string | null>(null);
  readonly expandedCron = signal<string | null>(null);
  readonly cronLogs = signal<CronLog[]>([]);
  readonly loadingLogs = signal(false);

  ngOnInit(): void {
    this.loadCrons();
  }

  loadCrons(): void {
    this.adminService.getCronStatus().subscribe((response) => {
      this.crons.set(response.crons);
    });
  }

  triggerCron(name: string): void {
    this.triggering.set(name);
    this.adminService.triggerCron(name).subscribe({
      next: () => {
        this.triggering.set(null);
        this.loadCrons();
        if (this.expandedCron() === name) {
          this.loadLogs(name);
        }
      },
      error: () => {
        this.triggering.set(null);
      },
    });
  }

  toggleLogs(name: string): void {
    if (this.expandedCron() === name) {
      this.expandedCron.set(null);
      this.cronLogs.set([]);
    } else {
      this.expandedCron.set(name);
      this.loadLogs(name);
    }
  }

  loadLogs(name: string): void {
    this.loadingLogs.set(true);
    this.adminService.getCronLogs(name, 50).subscribe({
      next: (response) => {
        this.cronLogs.set(response.logs);
        this.loadingLogs.set(false);
      },
      error: () => {
        this.loadingLogs.set(false);
      },
    });
  }
}
