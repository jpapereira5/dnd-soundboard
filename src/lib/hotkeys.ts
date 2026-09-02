/** Scene N is triggered by digit N (1..9). */
export const SCENE_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/** SFX buttons get letters in keyboard order. */
export const SFX_KEYS = [...'qwertyuiop', ...'asdfghjkl', ...'zxcvbnm']

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}
