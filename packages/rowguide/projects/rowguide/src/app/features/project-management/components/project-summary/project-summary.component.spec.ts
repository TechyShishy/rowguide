import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectSummaryComponent } from './project-summary.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { provideRouter } from '@angular/router';
import { routes } from '../../../../app.routes';
import { Capacitor } from '@capacitor/core';

describe('ProjectSummaryComponent', () => {
  let component: ProjectSummaryComponent;
  let fixture: ComponentFixture<ProjectSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ProjectSummaryComponent,
        BrowserAnimationsModule,
        LoggerTestingModule,
      ],
      providers: [provideRouter(routes)],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectSummaryComponent);
    component = fixture.componentInstance;

    // Mock the project data
    component.project = { rows: [], name: 'Mock Project' };

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have project name defined', () => {
    expect(component.project.name).toBe('Mock Project');
  });

  describe('downloadProject', () => {
    it('should call saveToDownloadsNative on android', async () => {
      spyOn(Capacitor, 'getPlatform').and.returnValue('android');
      spyOn(component, 'saveToDownloadsNative' as any).and.returnValue(
        Promise.resolve({ uri: 'content://downloads/test', path: 'Downloads/Mock Project.rgp' })
      );

      await component.downloadProject();

      expect((component as any).saveToDownloadsNative).toHaveBeenCalledWith(
        'Mock Project.rgp',
        'application/octet-stream',
        jasmine.any(String)
      );
    });

    it('should show snackbar after successful android save', async () => {
      spyOn(Capacitor, 'getPlatform').and.returnValue('android');
      spyOn(component, 'saveToDownloadsNative' as any).and.returnValue(
        Promise.resolve({ uri: 'content://downloads/test', path: 'Downloads/Mock Project.rgp' })
      );
      const snackBar = (component as any).snackBar;
      spyOn(snackBar, 'open');

      await component.downloadProject();

      expect(snackBar.open).toHaveBeenCalledWith(
        'Saved to Downloads/Mock Project.rgp',
        'OK',
        jasmine.objectContaining({ duration: 4000 })
      );
    });

    it('should show error snackbar when android save fails', async () => {
      spyOn(Capacitor, 'getPlatform').and.returnValue('android');
      spyOn(component, 'saveToDownloadsNative' as any).and.returnValue(
        Promise.reject(new Error('storage unavailable'))
      );
      const snackBar = (component as any).snackBar;
      spyOn(snackBar, 'open');

      await component.downloadProject();

      expect(snackBar.open).toHaveBeenCalledWith(
        'Download failed: storage unavailable',
        'Dismiss',
        jasmine.objectContaining({ duration: 6000 })
      );
    });

    it('should call downloadBlobInBrowser on non-android platform', async () => {
      spyOn(Capacitor, 'getPlatform').and.returnValue('web');
      spyOn(component, 'downloadBlobInBrowser' as any);

      await component.downloadProject();

      expect((component as any).downloadBlobInBrowser).toHaveBeenCalledWith(
        jasmine.any(Uint8Array),
        'Mock Project.rgp'
      );
    });

    it('should sanitize filename characters invalid on android', async () => {
      component.project = { ...component.project, name: 'My/Project:Name' };
      spyOn(Capacitor, 'getPlatform').and.returnValue('android');
      spyOn(component, 'saveToDownloadsNative' as any).and.returnValue(
        Promise.resolve({ uri: 'content://downloads/test', path: 'Downloads/test.rgp' })
      );

      await component.downloadProject();

      expect((component as any).saveToDownloadsNative).toHaveBeenCalledWith(
        'My_Project_Name.rgp',
        jasmine.any(String),
        jasmine.any(String)
      );
    });
  });
});
