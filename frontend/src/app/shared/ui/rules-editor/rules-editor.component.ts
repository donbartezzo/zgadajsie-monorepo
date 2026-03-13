import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../core/icons/icon.component';
import { ButtonComponent } from '../button/button.component';

interface Rule {
 id: string;
 text: string;
 indent: number;
}

@Component({
 selector: 'app-rules-editor',
 imports: [CommonModule, FormsModule, IconComponent, ButtonComponent],
 template: `
 <div class="space-y-2">
 <h3 class="block text-sm font-medium text-neutral-700">
 Zasady wydarzenia (opcjonalne)
 </h3>
 <app-button variant="secondary" size="sm" (click)="addRule()" class="text-xs">
 <app-icon name="plus" size="xs"></app-icon>
 Dodaj zasadę
 </app-button>

 <div
 class="border border-neutral-300 rounded-xl p-3 bg-white min-h-[100px]"
 >
 @if (rules().length === 0) {
 <div class="text-neutral-500 text-sm text-center py-4">
 Brak zasad. Kliknij"Dodaj zasadę", aby rozpocząć.
 </div>
 } @else {
 <div class="space-y-2">
 @for (rule of rules(); track rule.id; let index = $index) {
 <div class="flex items-start gap-2 group" [style.margin-left.px]="rule.indent * 20">
 <span class="text-neutral-500 text-xs mt-2.5 min-w-[20px]">
 {{ index + 1 }}.
 </span>

 <input
 type="text"
 [(ngModel)]="rule.text"
 (ngModelChange)="onRuleChange()"
 placeholder="Wpisz zasadę..."
 class="flex-1 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 focus:outline-none focus:ring-1 focus:ring-primary-500"
 />

 <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <app-button
 variant="ghost"
 size="xs"
 (click)="indentRule(rule.id)"
 title="Zwiększ wcięcie"
 >
 <app-icon name="arrow-right" size="xs"></app-icon>
 </app-button>

 <app-button
 variant="ghost"
 size="xs"
 (click)="unindentRule(rule.id)"
 title="Zmniejsz wcięcie"
 >
 <app-icon name="arrow-left" size="xs"></app-icon>
 </app-button>

 <app-button
 variant="ghost"
 size="xs"
 (click)="deleteRule(rule.id)"
 title="Usuń zasadę"
 >
 <app-icon name="trash" size="xs"></app-icon>
 </app-button>
 </div>
 </div>
 }
 </div>
 }
 </div>

 <div class="text-xs text-neutral-500">
 Wskazówka: Użyj przycisków strzałek aby stworzyć zagnieżdżoną listę.
 </div>
 </div>
 `,
 changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesEditorComponent {
 readonly rules = input<Rule[]>([]);
 readonly rulesChange = output<Rule[]>();

 addRule(): void {
 const updated = [...this.rules(), { id: crypto.randomUUID(), text: '', indent: 0 }];
 this.rulesChange.emit(updated);
 }

 onRuleChange(): void {
 this.rulesChange.emit([...this.rules()]);
 }

 deleteRule(id: string): void {
 const updated = this.rules().filter((rule) => rule.id !== id);
 this.rulesChange.emit(updated);
 }

 indentRule(id: string): void {
 const updated = this.rules().map((rule) =>
 rule.id === id ? { ...rule, indent: Math.min(rule.indent + 1, 3) } : rule,
 );
 this.rulesChange.emit(updated);
 }

 unindentRule(id: string): void {
 const updated = this.rules().map((rule) =>
 rule.id === id ? { ...rule, indent: Math.max(rule.indent - 1, 0) } : rule,
 );
 this.rulesChange.emit(updated);
 }
}
