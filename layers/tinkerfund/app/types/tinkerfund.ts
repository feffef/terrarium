// Both Spaces share one schema (tenant.config.ts), so prod's generated item
// types describe qa's documents too.
import type {
  TinkerfundProdCommentsCollectionItem,
  TinkerfundProdPagesCollectionItem,
  TinkerfundProdPromotionsCollectionItem,
} from '@nuxt/content'

export type TinkerfundPage = TinkerfundProdPagesCollectionItem
export type TinkerfundCampaign = NonNullable<TinkerfundPage['campaign']>
export type TinkerfundReward = TinkerfundCampaign['rewards'][number]
export type TinkerfundAddon = NonNullable<TinkerfundCampaign['addons']>[number]
export type TinkerfundStretchGoal = NonNullable<TinkerfundCampaign['stretchGoals']>[number]
export type TinkerfundComment = TinkerfundProdCommentsCollectionItem['comments'][number]
export type TinkerfundPromotion = TinkerfundProdPromotionsCollectionItem

/** What an "Add to cart" button asks for; the Cart story (#1383) takes it from here. */
export type TinkerfundCartRequest =
  | { campaign: string; reward: string; options: Record<string, string>; quantity: number }
  | { campaign: string; addon: string; quantity: number }
