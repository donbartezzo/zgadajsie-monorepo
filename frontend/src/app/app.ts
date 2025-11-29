import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ThemeService } from './theme.service';

@Component({
  standalone: true,
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly theme = inject(ThemeService);
  protected title = 'frontend';

  private isDark = false;

  toggleTheme(): void {
    this.isDark = !this.isDark;
    this.theme.setTheme(this.isDark ? 'dark' : 'light');
  }
}
