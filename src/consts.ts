export const SITE_TITLE = 'Astro Blog';
export const SITE_DESCRIPTION = 'Welcome to my website!';

// カテゴリのスラッグ（URL用） → 表示名のマッピング
export const CATEGORY_LABELS: Record<string, string> = {
	dotnet: '.NET/C#',
	bi: 'BIツール',
	flutter: 'Flutter',
	ai: 'AI',
};

export function getCategoryLabel(slug: string): string {
	return CATEGORY_LABELS[slug] ?? slug;
}
