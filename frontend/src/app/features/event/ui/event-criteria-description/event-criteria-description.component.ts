import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Event as EventModel } from '../../../../shared/types';
import { IconComponent, IconName } from '../../../../core/icons/icon.component';

interface CriteriaItem {
  icon: IconName;
  iconColor: string;
  text: string;
}

@Component({
  selector: 'app-event-criteria-description',
  imports: [IconComponent],
  template: `
    <div class="space-y-3">
      @for (item of criteria(); track item.text) {
      <div class="flex items-center gap-3">
        <app-icon
          [name]="item.icon"
          size="sm"
          [class]="item.iconColor + ' shrink-0'"
          style="font-size: 14px; vertical-align: middle;"
        ></app-icon>
        <p
          class="text-sm text-neutral-700 leading-relaxed"
          style="font-size: 14px; vertical-align: middle; margin: 0;"
          [innerHTML]="item.text"
        ></p>
      </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCriteriaDescriptionComponent {
  readonly event = input.required<EventModel>();

  readonly criteria = computed<CriteriaItem[]>(() => {
    const e = this.event();
    const items: CriteriaItem[] = [];

    const venueText = this.buildVenueText(e);
    if (venueText) {
      items.push({ icon: 'map-pin', iconColor: 'text-danger-300', text: venueText });
    }

    const dateText = this.buildDateText(e);
    if (dateText) {
      items.push({ icon: 'clock', iconColor: 'text-info-400', text: dateText });
    }

    const disciplineText = this.buildDisciplineText(e);
    if (disciplineText) {
      items.push({
        icon: 'star',
        iconColor: 'text-info-400',
        text: disciplineText,
      });
    }

    const participantsText = this.buildParticipantsText(e);
    if (participantsText) {
      items.push({
        icon: 'users',
        iconColor: 'text-info-300',
        text: participantsText,
      });
    }

    const audienceText = this.buildAudienceText(e);
    if (audienceText) {
      items.push({
        icon: 'user',
        iconColor: 'text-primary-400',
        text: audienceText,
      });
    }

    const costText = this.buildCostText(e);
    items.push({
      icon: 'dollar-sign',
      iconColor: 'text-success-400',
      text: costText,
    });

    return items;
  });

  private buildVenueText(e: EventModel): string {
    const facilityPhrase = this.getFacilityPhrase(e.facility);
    const city = e.city?.name;
    const address = e.address;

    if (!facilityPhrase && !address) {
      return '';
    }

    let text = 'Wydarzenie odbywać się będzie';

    if (facilityPhrase) {
      text += ` <u>${facilityPhrase}</u>`;
    }

    if (address && city) {
      text += ` pod adresem: <strong>${address}</strong>, <strong>${city}</strong>.`;
    } else if (address) {
      text += ` pod adresem: <strong>${address}</strong>.`;
    } else if (city) {
      text += ` w miejscowości <strong>${city}</strong>.`;
    } else {
      text += '.';
    }

    return text;
  }

  private getFacilityPhrase(facility?: { name: string; slug: string }): string {
    if (!facility) {
      return '';
    }

    const slug = facility.slug;
    const facilityMap: Record<string, string> = {
      orlik: 'na Orliku',
      'hala-sportowa': 'w hali sportowej',
      balon: 'pod balonem',
      'boisko-syntetyczne': 'na boisku syntetycznym',
      'boisko-trawiaste': 'na boisku trawiastym',
      kort: 'na korcie',
      stadion: 'na stadionie',
      silownia: 'na siłowni',
      basen: 'na basenie',
      plywania: 'na pływalni',
      lodowisko: 'na lodowisku',
      skatepark: 'na skateparku',
      'sala-gimnastyczna': 'w sali gimnastycznej',
      'sciana-wspinaczkowa': 'na ścianie wspinaczkowej',
      tor: 'na torze',
      ring: 'na ringu',
      plaza: 'na plaży',
    };

    return facilityMap[slug] || `na obiekcie „<strong>${facility.name}</strong>"`;
  }

  private buildDateText(e: EventModel): string {
    if (!e.startsAt) {
      return '';
    }

    const start = new Date(e.startsAt);
    const dayName = this.getDayOfWeek(start);
    const dateStr = this.formatDate(start);
    const startTime = this.formatTime(start);

    let text = `Rozpoczyna się o godz. <strong>${startTime}</strong> w <u>${dayName}</u> <strong>${dateStr}</strong>`;

    if (e.endsAt) {
      const end = new Date(e.endsAt);
      const endTime = this.formatTime(end);
      const isSameDay = start.toDateString() === end.toDateString();

      if (isSameDay) {
        text += ` i trwa do godz. <strong>${endTime}</strong>.`;
      } else {
        const endDayName = this.getDayOfWeek(end);
        const endDateStr = this.formatDate(end);
        text += ` i trwa do godz. <strong>${endTime}</strong> w <strong>${endDayName}</strong> <strong>${endDateStr}</strong>.`;
      }
    } else {
      text += '.';
    }

    return text;
  }

  private buildDisciplineText(e: EventModel): string {
    const discipline = e.discipline?.name;
    const level = e.level?.name;

    if (!discipline) {
      return '';
    }

    let text = `Dotyczy dyscypliny „<u>${discipline}</u>"`;

    if (level) {
      text += ` i oczekuje się uczestnictwa na poziomie co najmniej „<strong>${level.toLowerCase()}</strong>".`;
    } else {
      text += '.';
    }

    return text;
  }

  private buildParticipantsText(e: EventModel): string {
    const min = e.minParticipants;
    const max = e.maxParticipants;

    if (!min && !max) {
      return '';
    }

    if (min && max) {
      return (
        `W wydarzeniu może wziąć udział maksymalnie <strong>${max}</strong> ${this.getPersonWord(
          max,
        )} ` + `i co najmniej <strong>${min}</strong>, żeby wydarzenie w ogóle mogło się odbyć.`
      );
    }

    if (max) {
      return `W wydarzeniu może wziąć udział maksymalnie <strong>${max}</strong> ${this.getPersonWord(
        max,
      )}.`;
    }

    return `Do odbycia się wydarzenia potrzeba co najmniej <strong>${min}</strong> ${this.getPersonWord(
      min ?? 0,
    )}.`;
  }

  private buildAudienceText(e: EventModel): string {
    const gender = e.gender;
    const ageMin = e.ageMin;
    const ageMax = e.ageMax;

    const genderPhrase = this.getGenderPhrase(gender);
    const agePhrase = this.getAgePhrase(ageMin, ageMax);

    if (!genderPhrase && !agePhrase) {
      return '';
    }

    let text = 'Przeznaczone jest ';

    if (genderPhrase) {
      text += genderPhrase;
    }

    if (agePhrase) {
      if (genderPhrase) {
        text += ` ${agePhrase}`;
      } else {
        text += `dla uczestników ${agePhrase}`;
      }
    }

    text += '.';
    return text;
  }

  private getGenderPhrase(gender: string): string {
    if (!gender || gender === 'ANY') {
      return 'dla <strong>wszystkich</strong> — płeć nie ma znaczenia';
    }
    if (gender === 'MALE') {
      return 'tylko dla <strong>mężczyzn</strong>';
    }
    if (gender === 'FEMALE') {
      return 'tylko dla <strong>kobiet</strong>';
    }
    return '';
  }

  private getAgePhrase(ageMin?: number, ageMax?: number): string {
    const hasMin = ageMin !== undefined && ageMin !== null && ageMin > 0;
    const hasMax = ageMax !== undefined && ageMax !== null && ageMax > 0 && ageMax < 99;

    if (!hasMin && !hasMax) {
      return '';
    }
    if (hasMin && hasMax) {
      return `w wieku <strong>${ageMin}–${ageMax}</strong> lat`;
    }
    if (hasMin) {
      return `w wieku od <strong>${ageMin}</strong> lat`;
    }
    return `w wieku do <strong>${ageMax}</strong> lat`;
  }

  private buildCostText(e: EventModel): string {
    if (e.costPerPerson > 0) {
      return `Udział w wydarzeniu wiąże się z opłatą w wysokości <strong>${e.costPerPerson} zł</strong> od osoby.`;
    }
    return 'Udział w wydarzeniu jest <strong>bezpłatny</strong>.';
  }

  private getPersonWord(count: number): string {
    if (count === 1) {
      return 'osoba';
    }
    if (count >= 2 && count <= 4) {
      return 'osoby';
    }
    return 'osób';
  }

  private getDayOfWeek(date: Date): string {
    const days = ['niedzielę', 'poniedziałek', 'wtorek', 'środę', 'czwartek', 'piątek', 'sobotę'];
    return days[date.getDay()];
  }

  private formatDate(date: Date): string {
    const day = date.getDate();
    const months = [
      'stycznia',
      'lutego',
      'marca',
      'kwietnia',
      'maja',
      'czerwca',
      'lipca',
      'sierpnia',
      'września',
      'października',
      'listopada',
      'grudnia',
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  }
}
