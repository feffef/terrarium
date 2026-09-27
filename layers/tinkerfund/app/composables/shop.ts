/** The Space a Tinkerfund component renders in, its Collections and its links. */
export function useTinkerfundSpace() {
  const found = useSpace('tinkerfund')
  return {
    ...found,
    link: (path = '') => tinkerfundPath(found.space, path),
    campaignLink: (slug: string) => tinkerfundCampaignPath(found.space, slug),
  }
}

/** The Space's `shop` document, and its zones' and payment methods' names. */
export async function useTinkerfundShop() {
  const { space, collections } = useTinkerfundSpace()
  const { data: shop, status, error } = await useAsyncData(`tinkerfund-shop-${space}`, () => queryCollection(collections.shop).first())
  return {
    shop,
    status,
    error,
    zoneName: (id: string | undefined) => shop.value?.zones.find((z) => z.id === id)?.name ?? id ?? '',
    paymentLabel: (id: string | undefined) => shop.value?.payments.find((p) => p.id === id)?.label ?? id ?? '',
  }
}
