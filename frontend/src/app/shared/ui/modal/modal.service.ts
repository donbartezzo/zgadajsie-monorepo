import { Injectable, signal, Type } from '@angular/core';
import { Subject } from 'rxjs';

export interface ModalConfig {
  component: Type<unknown>;
  inputs?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class ModalService {
  private readonly stateSignal = signal<ModalConfig | null>(null);
  readonly state = this.stateSignal.asReadonly();

  /** Emits after any mutation action in a modal (approve, ban, lock, etc.) */
  readonly refresh$ = new Subject<void>();

  open(component: Type<unknown>, inputs?: Record<string, unknown>): void {
    this.stateSignal.set({ component, inputs });
  }

  close(): void {
    this.stateSignal.set(null);
  }

  requestRefresh(): void {
    this.refresh$.next();
  }
}
