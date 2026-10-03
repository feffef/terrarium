// qa's component gallery (issue #1375): one page per section, in this order.

export const TINKERFUND_GALLERY = [
  {
    id: 'status',
    title: 'Campaign status',
    components: ['TinkerfundCampaignStatus'],
    summary: 'Every qa Campaign’s state, funding and countdown at qa’s pinned now.',
  },
  {
    id: 'card',
    title: 'Campaign card',
    components: ['TinkerfundBrowseCampaignCard'],
    summary: 'Every state, a zero-Backer Campaign, a title that wraps, and an On-Deal chip. Used by Home, Discover, Category and Deals.',
  },
  {
    id: 'index-table',
    title: 'Index table',
    components: ['TinkerfundBrowseIndexTable'],
    summary: 'Home’s Popular now. Pick Empty Shelf for the empty row; scroll sideways on a phone.',
  },
  {
    id: 'filters',
    title: 'Discover filters',
    components: ['TinkerfundBrowseFilters'],
    summary: 'Discover’s side column and mobile drawer. Here they filter a local list; on Discover they write the URL query.',
  },
  {
    id: 'deal-banner',
    title: 'Deal banner',
    components: ['TinkerfundBrowseDealBanner'],
    summary: 'An Active Promotion applied automatically, and a Scheduled one; qa’s expired code never shows.',
  },
  {
    id: 'readout',
    title: 'Campaign readout',
    components: ['TinkerfundCampaignReadout', 'TinkerfundProgressBar', 'TinkerfundCampaignDealBadge', 'TinkerfundCampaignAction'],
    summary: 'Back when Live, Notify me when Upcoming, a lock when Ended.',
  },
  {
    id: 'recent',
    title: 'Recently backed',
    components: ['TinkerfundCampaignRecentBackers'],
    summary: 'Every Live qa Campaign that names Backers, then the Lamp with the visitor’s own Pledge on top. The “Backed by” line shows in the Readout and Card sections: Live and Ended only, Cards Live only.',
  },
  {
    id: 'recommendations',
    title: 'Recommendations',
    components: ['TinkerfundBrowseRecommendations'],
    summary: 'A Campaign page’s two recommendation rows: the Lamp’s picks from another category, the Stapler with no picks, the Hammock whose picks leave Workshop with nothing more. Then the Cart specimen’s row, and a Stapler-only Cart falling back to its category. A sideways row on a phone.',
  },
  {
    id: 'figures',
    title: 'Figures',
    components: ['TinkerfundCampaignFigureGallery'],
    summary: 'A Campaign’s figures, one at a time.',
  },
  {
    id: 'rewards',
    title: 'Reward cards',
    components: ['TinkerfundCampaignRewardCard'],
    summary: 'Every qa Reward in its Campaign’s state: options, stock, sold out, per-Backer limits, digital, long titles.',
  },
  {
    id: 'addons',
    title: 'Add-ons, Stretch goals',
    components: ['TinkerfundCampaignAddonList', 'TinkerfundCampaignStretchGoals'],
    summary: 'Every qa Campaign’s Add-ons and Stretch goals in its state.',
  },
  {
    id: 'support',
    title: 'Bonus support',
    components: ['TinkerfundCampaignSupportCard'],
    summary: 'Live, and Ended with a refusal.',
  },
  {
    id: 'cart',
    title: 'Cart',
    components: ['TinkerfundCartGroup', 'TinkerfundCartMini'],
    summary: 'Shipped to Europe: a Reward that doesn’t ship there, sold-out lines, an Ended Campaign, and a no-Reward Pledge.',
  },
  {
    id: 'checkout',
    title: 'Checkout',
    components: ['TinkerfundCheckoutHeader', 'TinkerfundPledgeSummary'],
    summary: 'The focused header on its second step; the Cart specimen quoted with a code, then a receipt.',
  },
  {
    id: 'account',
    title: 'Account',
    components: ['TinkerfundPledgeList', 'TinkerfundPledgeState', 'TinkerfundPledgeEditor', 'TinkerfundPledgeCancel'],
    summary: 'Every Pledge state; qa’s baked Pledges plus a cancelled one; the editor on the Lamp Pledge, with its per-Backer limit, options, a digital Reward and an Add-on the Pledge holds the last of; and the cancel dialog.',
  },
  {
    id: 'updates',
    title: 'Updates',
    components: ['TinkerfundCampaignUpdates'],
    summary: 'The newest Update open, and none at all.',
  },
  {
    id: 'comments',
    title: 'Comment thread',
    components: ['TinkerfundCampaignComments'],
    summary: 'An Inventor reply one level deep, and no comments.',
  },
  {
    id: 'inventor',
    title: 'Inventor',
    components: ['TinkerfundInventorProfile'],
    summary: 'Every qa Inventor’s page body: many Campaigns, a name long enough to wrap, and none yet.',
  },
  {
    id: 'breadcrumbs',
    title: 'Breadcrumbs',
    components: ['TinkerfundShellBreadcrumbs'],
    summary: 'TinkerfundCampaignSectionNav and the mobile “Back this Campaign” bar live on each Campaign page, since they follow its scroll.',
  },
  {
    id: 'search',
    title: 'Search field',
    components: ['TinkerfundShellSearchField'],
    summary: 'Suggestions come from this Space only: “lamp” finds a Campaign, “test” an Inventor’s Campaigns, and “mug”, a prod Campaign, nothing. Enter opens the results page.',
  },
] as const

export type TinkerfundGallerySection = (typeof TINKERFUND_GALLERY)[number]
export type TinkerfundGallerySectionId = TinkerfundGallerySection['id']

export const TINKERFUND_GALLERY_FIXTURE = {
  lamp: { slug: 'last-minute-lamp', title: 'Last-Minute Lamp', reward: 'lamp', addon: 'bulb', pledge: 'TF-P-9001' },
  stapler: { slug: 'goal-exact-stapler', rewards: ['early-bird', 'stapler'], addon: 'staple' },
  hammock: { slug: 'indoor-hammock', reward: 'hammock' },
  workbench: 'self-assembling-workbench',
  code: 'TINKER10',
  zone: 'europe',
  payment: 'handshake',
  /** Refs no qa Pledge uses, for the specimens' own Pledges. */
  receipt: 'TF-P-9004',
  cancelled: 'TF-P-9009',
} as const
