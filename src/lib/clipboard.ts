import { detailOf, notify } from '@/state/notice-store'

/**
 * Copy something, and say so.
 *
 * Every copy in the app used to be `void navigator.clipboard?.writeText(v)`,
 * which has three separate problems and looks fine.
 *
 * **It never confirmed.** The menu closed and nothing else changed, so the
 * only way to find out whether a copy had worked was to paste somewhere and
 * look. A clipboard write leaves no trace on screen by its nature, which is
 * exactly the case a passing message exists for.
 *
 * **It swallowed failures.** `writeText` returns a promise that rejects when
 * the document is not focused or permission is refused, and `void` threw that
 * away. A refused copy and a successful one were indistinguishable.
 *
 * **The optional chain hid the worst case.** Where `navigator.clipboard` is
 * undefined, which is any non-secure context, `?.` made the whole expression a
 * silent no-op. Not a caught error, not a warning: nothing happened and
 * nothing said so.
 *
 * `what` is the thing in the user's words and lands in "Copied magnet link",
 * so it is lower case and names the content, not the field.
 *
 * The value is deliberately never shown. A magnet is hundreds of characters
 * and a save path is a line of its own; the confirmation says which thing was
 * copied, and the clipboard now holds the rest.
 */
export async function copy(what: string, value: string): Promise<boolean> {
  const write = navigator.clipboard?.writeText.bind(navigator.clipboard)

  if (!write) {
    notify({
      tone: 'warn',
      what: `Copy ${what}`,
      detail: 'the clipboard is not available here',
    })
    return false
  }

  try {
    await write(value)
    notify({ tone: 'ok', what: `Copied ${what}` })
    return true
  } catch (cause) {
    const detail = detailOf(cause)
    notify(
      detail === undefined
        ? { tone: 'warn', what: `Copy ${what}` }
        : { tone: 'warn', what: `Copy ${what}`, detail },
    )
    return false
  }
}
