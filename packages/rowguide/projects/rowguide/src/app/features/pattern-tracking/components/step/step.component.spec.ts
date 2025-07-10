import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepComponent } from './step.component';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { routes } from '../../../../app.routes';
import { provideRouter } from '@angular/router';

describe('StepComponent', () => {
  let component: StepComponent;
  let fixture: ComponentFixture<StepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepComponent, LoggerTestingModule],
      providers: [provideRouter(routes)],
    }).compileComponents();

    fixture = TestBed.createComponent(StepComponent);
    component = fixture.componentInstance;
    //fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
