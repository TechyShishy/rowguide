import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { ShorthandService } from './loader/shorthand.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    importProvidersFrom(LoggerModule.forRoot({ level: NgxLoggerLevel.DEBUG })),
    ShorthandService,
  ],
};
