import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  DisciplineProfileFormComponent,
  DisciplineProfileFormValue,
} from './discipline-profile-form.component';
import { DictionaryService } from '../../../../core/services/dictionary.service';

const mockDict = {
  getLevels: jest
    .fn()
    .mockReturnValue(of([{ slug: 'open' }, { slug: 'regular' }, { slug: 'advanced' }])),
};

describe('DisciplineProfileFormComponent', () => {
  let fixture: ComponentFixture<DisciplineProfileFormComponent>;
  let component: DisciplineProfileFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisciplineProfileFormComponent],
      providers: [{ provide: DictionaryService, useValue: mockDict }],
    }).compileComponents();

    fixture = TestBed.createComponent(DisciplineProfileFormComponent);
    component = fixture.componentInstance;
  });

  it('wyklucza poziom „open" ze słownika poziomów', () => {
    const slugs = component.levels().map((l) => l.slug);
    expect(slugs).toEqual(['regular', 'advanced']);
  });

  it('nie emituje save gdy poziom nie wybrany (wymagany)', () => {
    const spy = jest.fn();
    component.save.subscribe(spy);

    component.form.patchValue({ levelSlug: '', bio: 'cokolwiek' });
    component.onSubmit();

    expect(spy).not.toHaveBeenCalled();
    expect(component.form.controls.levelSlug.touched).toBe(true);
  });

  it('emituje save z poziomem i wizytówką', () => {
    let emitted: DisciplineProfileFormValue | undefined;
    component.save.subscribe((v) => (emitted = v));

    component.form.patchValue({ levelSlug: 'regular', bio: 'Gram od lat.' });
    component.onSubmit();

    expect(emitted).toEqual({ levelSlug: 'regular', bio: 'Gram od lat.' });
  });

  it('zamienia pustą/whitespace wizytówkę na null', () => {
    let emitted: DisciplineProfileFormValue | undefined;
    component.save.subscribe((v) => (emitted = v));

    component.form.patchValue({ levelSlug: 'advanced', bio: '   ' });
    component.onSubmit();

    expect(emitted).toEqual({ levelSlug: 'advanced', bio: null });
  });

  it('przycina białe znaki w wizytówce', () => {
    let emitted: DisciplineProfileFormValue | undefined;
    component.save.subscribe((v) => (emitted = v));

    component.form.patchValue({ levelSlug: 'regular', bio: '  opis  ' });
    component.onSubmit();

    expect(emitted).toEqual({ levelSlug: 'regular', bio: 'opis' });
  });
});
