export const SITE_TITLE = 'Shimeji Blog';
export const SITE_DESCRIPTION = '.NET/C#・BIツール・AIについて書くエンジニアブログ';

// カテゴリのスラッグ（URL用） → 表示名のマッピング
export const CATEGORY_ORDER = ['dotnet', 'bi', 'ai'] as const;

export const CATEGORY_LABELS: Record<string, string> = {
	dotnet: '.NET/C#',
	bi: 'BIツール',
	ai: 'AI',
};

export const CATEGORY_ICONS: Record<string, string> = {
	dotnet: 'code',
	bi: 'bar_chart',
	ai: 'smart_toy',
	flutter: 'phone_android',
};

export function getCategoryLabel(slug: string): string {
	return CATEGORY_LABELS[slug] ?? slug;
}
