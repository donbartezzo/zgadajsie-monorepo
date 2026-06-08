import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ContactFormComponent } from '../../../../shared/contact/ui/contact-form.component';
import { ContactSource } from '@zgadajsie/shared';

@Component({
  selector: 'app-contact',
  imports: [ContactFormComponent],
  template: `
    <div class="p-4">
      <h1 class="text-2xl font-bold text-neutral-900 mb-6">Kontakt</h1>
      <div class="bg-white rounded-2xl shadow-xs p-6">
        <app-contact-form [source]="ContactSource.CONTACT_PAGE" />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactComponent {
  readonly ContactSource = ContactSource;
}
