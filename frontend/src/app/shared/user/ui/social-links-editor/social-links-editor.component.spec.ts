import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SocialLinksEditorComponent } from './social-links-editor.component';

describe('SocialLinksEditorComponent', () => {
  let fixture: ComponentFixture<SocialLinksEditorComponent>;
  let component: SocialLinksEditorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SocialLinksEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SocialLinksEditorComponent);
    component = fixture.componentInstance;
  });

  it('prefilluje linki z initialLinks', () => {
    fixture.componentRef.setInput('initialLinks', ['https://fb.com/jan']);
    fixture.detectChanges();
    expect(component.links()).toEqual(['https://fb.com/jan']);
  });

  it('dodaje pusty link do limitu 3', () => {
    component.addLink();
    component.addLink();
    component.addLink();
    component.addLink(); // ponad limit — ignorowane
    expect(component.links().length).toBe(3);
    expect(component.canAdd()).toBe(false);
  });

  it('usuwa link po indeksie', () => {
    component.links.set(['a', 'b', 'c']);
    component.removeLink(1);
    expect(component.links()).toEqual(['a', 'c']);
  });

  it('aktualizuje link po indeksie', () => {
    component.links.set(['a', 'b']);
    component.updateLink(1, 'https://x.com');
    expect(component.links()).toEqual(['a', 'https://x.com']);
  });

  it('wykrywa niepoprawny URL (nie http(s))', () => {
    component.links.set(['javascript:alert(1)']);
    expect(component.hasInvalid()).toBe(true);
  });

  it('akceptuje poprawne https i puste pola', () => {
    component.links.set(['https://fb.com/jan', '']);
    expect(component.hasInvalid()).toBe(false);
  });

  it('onSave emituje przycięte, niepuste linki', () => {
    const spy = jest.fn();
    component.save.subscribe(spy);
    component.links.set(['  https://fb.com  ', '', '  ']);
    component.onSave();
    expect(spy).toHaveBeenCalledWith(['https://fb.com']);
  });

  it('onSave nie emituje gdy jest niepoprawny URL', () => {
    const spy = jest.fn();
    component.save.subscribe(spy);
    component.links.set(['not-a-url']);
    component.onSave();
    expect(spy).not.toHaveBeenCalled();
  });
});
