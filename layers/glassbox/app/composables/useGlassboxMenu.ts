/** The sidebar's phone menu, shared by every Glass Box page that carries it. Closing returns focus to the opener so keyboard users keep their place; the template needs ref="menuButton" and the sidebar id="gb-nav". */
export function useGlassboxMenu() {
  const route = useRoute()
  const menuOpen = ref(false)
  const menuButton = useTemplateRef<HTMLButtonElement>('menuButton')
  watch(() => route.path, () => { menuOpen.value = false })

  async function openMenu() {
    menuOpen.value = true
    await nextTick()
    document.querySelector<HTMLElement>('#gb-nav .close')?.focus()
  }
  function closeMenu() {
    if (!menuOpen.value) return
    menuOpen.value = false
    menuButton.value?.focus()
  }
  return { menuOpen, openMenu, closeMenu }
}
