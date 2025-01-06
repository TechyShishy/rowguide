import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepComponent } from './step.component';
import { LoggerTestingModule } from 'ngx-logger/testing';

describe('StepComponent', () => {
  let component: StepComponent;
  let fixture: ComponentFixture<StepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepComponent, LoggerTestingModule],
      providers: [],
    }).compileComponents();

    fixture = TestBed.createComponent(StepComponent);
    component = fixture.componentInstance;
    //fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
