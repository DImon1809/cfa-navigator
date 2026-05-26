import type { ArticleSection } from '../types';

const contentRegistry: Record<string, () => Promise<{ default: ArticleSection[] }>> = {
  'gde-kupit-cfa': () => import('./gde-kupit-cfa'),
  'cfa-vs-vklad': () => import('./cfa-vs-vklad'),
  'kak-kupit-kriptu-legalno-v-rossii': () => import('./kak-kupit-kriptu-legalno-v-rossii'),
  'krypto-zakony-rossiya-2026': () => import('./krypto-zakony-rossiya-2026'),
  'rasplachivatsya-kriptoj-za-tovar-iz-kitaya': () => import('./rasplachivatsya-kriptoj-za-tovar-iz-kitaya'),
  'ved-mezhdunarodnye-raschety-kriptoj': () => import('./ved-mezhdunarodnye-raschety-kriptoj'),
};

export async function getArticleContent(slug: string): Promise<ArticleSection[] | null> {
  const loader = contentRegistry[slug];
  if (!loader) return null;
  const mod = await loader();
  return mod.default;
}
