import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ContactFormComponent } from '../../../../shared/contact/ui/contact-form.component';
import { ContactSource } from '@zgadajsie/shared';
import { PageHeadingComponent } from '../../../../shared/ui/page-heading/page-heading.component';

@Component({
  selector: 'app-contact',
  imports: [ContactFormComponent, PageHeadingComponent],
  template: `
    <div class="p-4">
      <app-page-heading heading="Kontakt" size="2xl" spacing="lg" />
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
