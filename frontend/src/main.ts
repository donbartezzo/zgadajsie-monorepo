import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { registerLocaleData } from '@angular/common';
import pl from '@angular/common/locales/pl';

registerLocaleData(pl);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
