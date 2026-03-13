import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

export interface BreadcrumbConfig {
 parent: string;
 label: string;
}

@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
 private readonly router = inject(Router);
 private readonly destroyRef = inject(DestroyRef);

 private readonly dynamicContext = signal<Record<string, string>>({});
 private readonly breadcrumbConfig = signal<BreadcrumbConfig | null>(null);
 private readonly routeParams = signal<Record<string, string>>({});

 readonly parentUrl = computed<string | null>(() => {
 const config = this.breadcrumbConfig();
 if (!config) {
 return null;
 }

 const params = { ...this.routeParams(), ...this.dynamicContext() };
 return this.resolveParams(config.parent, params);
 });

 readonly parentLabel = computed<string>(() => {
 return this.breadcrumbConfig()?.label ?? '';
 });

 constructor() {
 this.router.events
 .pipe(
 filter((e) => e instanceof NavigationEnd),
 takeUntilDestroyed(this.destroyRef),
 )
 .subscribe(() => {
 this.dynamicContext.set({});
 this.updateFromRoute();
 });

 this.updateFromRoute();
 }

 setContext(ctx: Record<string, string>): void {
 this.dynamicContext.update((prev) => ({ ...prev, ...ctx }));
 }

 private updateFromRoute(): void {
 let route: ActivatedRouteSnapshot = this.router.routerState.snapshot.root;
 while (route.firstChild) {
 route = route.firstChild;
 }

 const breadcrumb = route.data['breadcrumb'] as BreadcrumbConfig | undefined;
 this.breadcrumbConfig.set(breadcrumb ?? null);

 const params: Record<string, string> = {};
 let current: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
 while (current) {
 Object.assign(params, current.params);
 current = current.firstChild;
 }
 this.routeParams.set(params);
 }

 private resolveParams(template: string, params: Record<string, string>): string | null {
 let resolved = template;
 const placeholders = template.match(/:(\w+)/g);
 if (placeholders) {
 for (const placeholder of placeholders) {
 const paramName = placeholder.substring(1);
 const value = params[paramName];
 if (!value) {
 return null;
 }
 resolved = resolved.replace(placeholder, value);
 }
 }
 return resolved;
 }
}
