import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../theme.service';

@Component({
  selector: 'app-header',
  imports: [RouterModule],
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly theme = inject(ThemeService);
  private isDark = false;

  toggleTheme(event: Event): void {
    event.preventDefault();
    this.isDark = !this.isDark;
    this.theme.setTheme(this.isDark ? 'dark' : 'light');
  }
}
