import type { ProviderManifest } from './types';

// 自动收集 manifest
const modules = import.meta.glob('./**/manifest.ts', { eager: true }) as Record<string, any>;

export const providerManifests: ProviderManifest[] = Object.values(modules)
  .map((m: any) => m.default as ProviderManifest)
  .filter(Boolean)
  .sort((a, b) => a.name.localeCompare(b.name));

export function findProvider(id: string): ProviderManifest | undefined {
  return providerManifests.find((p) => p.id === id);
}
