import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RowComponent } from './row.component';
import { LoggerTestingModule, NGXLoggerMock } from 'ngx-logger/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NGXLogger } from 'ngx-logger';

describe('RowComponent', () => {
  let component: RowComponent;
  let fixture: ComponentFixture<RowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RowComponent, LoggerTestingModule, BrowserAnimationsModule],
      providers: [{ provide: NGXLogger, useClass: NGXLoggerMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(RowComponent);
    component = fixture.componentInstance;
    //fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
