import { routes } from './app.routes';
import { ProjectComponent } from './features/pattern-tracking/components/project/project.component';
import { ProjectInspectorComponent } from './features/project-management/components/project-inspector/project-inspector.component';
import { ProjectSelectorComponent } from './features/project-management/components/project-selector/project-selector.component';
import { SettingsComponent } from './features/settings/components/settings/settings.component';

describe('App Routes Configuration', () => {
  describe('Routes Structure', () => {
    it('should have valid routes array', () => {
      expect(routes).toBeTruthy();
      expect(Array.isArray(routes)).toBe(true);
      expect(routes.length).toBeGreaterThan(0);
    });

    it('should include all required route paths', () => {
      const routePaths = routes.map((route) => route.path);

      expect(routePaths).toContain('project');
      expect(routePaths).toContain('project/:id');
      expect(routePaths).toContain('project-selector');
      expect(routePaths).toContain('project-inspector');
      expect(routePaths).toContain('settings');
      expect(routePaths).toContain('');
    });

    it('should have correct component mappings', () => {
      const projectRoute = routes.find((route) => route.path === 'project');
      const projectWithIdRoute = routes.find(
        (route) => route.path === 'project/:id'
      );
      const selectorRoute = routes.find(
        (route) => route.path === 'project-selector'
      );
      const inspectorRoute = routes.find(
        (route) => route.path === 'project-inspector'
      );
      const settingsRoute = routes.find((route) => route.path === 'settings');

      expect(projectRoute?.component).toBe(ProjectComponent);
      expect(projectWithIdRoute?.component).toBe(ProjectComponent);
      expect(selectorRoute?.component).toBe(ProjectSelectorComponent);
      expect(inspectorRoute?.component).toBe(ProjectInspectorComponent);
      expect(settingsRoute?.component).toBe(SettingsComponent);
    });

    it('should have default redirect to project', () => {
      const defaultRoute = routes.find((route) => route.path === '');

      expect(defaultRoute).toBeTruthy();
      expect(defaultRoute?.redirectTo).toBe('/project');
      expect(defaultRoute?.pathMatch).toBe('full');
    });
  });

  describe('Route Definitions', () => {
    it('should define project route without parameters', () => {
      const route = routes.find((r) => r.path === 'project');

      expect(route).toBeTruthy();
      expect(route?.component).toBe(ProjectComponent);
      expect(route?.path).not.toContain(':');
    });

    it('should define project route with id parameter', () => {
      const route = routes.find((r) => r.path === 'project/:id');

      expect(route).toBeTruthy();
      expect(route?.component).toBe(ProjectComponent);
      expect(route?.path).toContain(':id');
    });

    it('should define project-selector route', () => {
      const route = routes.find((r) => r.path === 'project-selector');

      expect(route).toBeTruthy();
      expect(route?.component).toBe(ProjectSelectorComponent);
    });

    it('should define project-inspector route', () => {
      const route = routes.find((r) => r.path === 'project-inspector');

      expect(route).toBeTruthy();
      expect(route?.component).toBe(ProjectInspectorComponent);
    });

    it('should define settings route', () => {
      const route = routes.find((r) => r.path === 'settings');

      expect(route).toBeTruthy();
      expect(route?.component).toBe(SettingsComponent);
    });
  });

  describe('Route Validation', () => {
    it('should have unique non-empty paths (except default)', () => {
      const nonEmptyPaths = routes
        .filter((route) => route.path !== '')
        .map((route) => route.path);
      const uniquePaths = [...new Set(nonEmptyPaths)];

      expect(nonEmptyPaths.length).toBe(uniquePaths.length);
    });

    it('should have exactly one default route', () => {
      const defaultRoutes = routes.filter((route) => route.path === '');

      expect(defaultRoutes.length).toBe(1);
    });

    it('should have valid route objects', () => {
      routes.forEach((route) => {
        expect(route).toBeTruthy();
        expect(typeof route.path).toBe('string');

        // Each route should have either a component or a redirectTo
        expect(route.component || route.redirectTo).toBeTruthy();
      });
    });

    it('should not have conflicting routes', () => {
      // Check that project and project/:id don't conflict inappropriately
      const projectRoutes = routes.filter(
        (route) => route.path === 'project' || route.path === 'project/:id'
      );

      expect(projectRoutes.length).toBe(2);
      expect(
        projectRoutes.every((route) => route.component === ProjectComponent)
      ).toBe(true);
    });
  });

  describe('Import Dependencies', () => {
    it('should import required components', () => {
      expect(ProjectComponent).toBeTruthy();
      expect(ProjectInspectorComponent).toBeTruthy();
      expect(ProjectSelectorComponent).toBeTruthy();
      expect(SettingsComponent).toBeTruthy();
    });

    it('should export routes array', () => {
      expect(routes).toBeDefined();
      expect(typeof routes).toBe('object');
      expect(Array.isArray(routes)).toBe(true);
    });
  });
});
