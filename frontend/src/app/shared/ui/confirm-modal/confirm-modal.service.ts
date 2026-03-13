import { Injectable, signal } from '@angular/core';

export interface ConfirmModalConfig {
 title: string;
 message: string;
 confirmLabel?: string;
 cancelLabel?: string;
 variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmModalState extends ConfirmModalConfig {
 resolve: (result: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmModalService {
 private readonly stateSignal = signal<ConfirmModalState | null>(null);
 readonly state = this.stateSignal.asReadonly();

 confirm(config: ConfirmModalConfig): Promise<boolean> {
 return new Promise<boolean>((resolve) => {
 this.stateSignal.set({ ...config, resolve });
 });
 }

 /** @internal — called by ConfirmModalComponent */
 respond(result: boolean): void {
 const current = this.stateSignal();
 if (current) {
 current.resolve(result);
 this.stateSignal.set(null);
 }
 }
}
