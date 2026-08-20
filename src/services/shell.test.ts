import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const revealItemInDir = vi.fn()
const openPath = vi.fn()

vi.mock('@tauri-apps/plugin-opener', () => ({ revealItemInDir, openPath }))

type Global = { __TAURI_INTERNALS__?: unknown }

/** Pretend the app is running inside the shell, or not. */
function underTauri(yes: boolean) {
  if (yes) (globalThis as Global).__TAURI_INTERNALS__ = {}
  else delete (globalThis as Global).__TAURI_INTERNALS__
}

async function shell() {
  return await import('@/services/shell')
}

describe('shell', () => {
  beforeEach(() => {
    revealItemInDir.mockReset().mockResolvedValue(undefined)
    openPath.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    underTauri(false)
    vi.restoreAllMocks()
  })

  it('knows whether there is a desktop to ask', async () => {
    const { canReachDesktop } = await shell()
    underTauri(false)
    expect(canReachDesktop()).toBe(false)
    underTauri(true)
    expect(canReachDesktop()).toBe(true)
  })

  it('does nothing at all in a browser', async () => {
    underTauri(false)
    const complaint = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { openPath: open, revealInFolder } = await shell()

    await expect(open('C:/x/y.mkv')).resolves.toBeUndefined()
    await expect(revealInFolder('C:/x')).resolves.toBeUndefined()

    // Quietly, though. There is no desktop here and that is not a failure.
    expect(openPath).not.toHaveBeenCalled()
    expect(revealItemInDir).not.toHaveBeenCalled()
    expect(complaint).not.toHaveBeenCalled()
  })

  it('hands the path over when there is a desktop', async () => {
    underTauri(true)
    const { openPath: open, revealInFolder } = await shell()

    await open('C:/Downloads/Some Release/video.mkv')
    await revealInFolder('C:/Downloads/Some Release')

    expect(openPath).toHaveBeenCalledWith('C:/Downloads/Some Release/video.mkv')
    expect(revealItemInDir).toHaveBeenCalledWith('C:/Downloads/Some Release')
  })

  it('ignores an empty path rather than opening the current directory', async () => {
    underTauri(true)
    const { openPath: open } = await shell()
    await open('')
    expect(openPath).not.toHaveBeenCalled()
  })

  it('says so when the handoff fails', async () => {
    // The regression this exists for: `opener:default` does not grant
    // `open_path`, so the plugin rejected every call and the old catch block
    // swallowed it. A double click did nothing and reported nothing, which is
    // the hardest kind of bug to find. A refusal has to reach the console.
    underTauri(true)
    const complaint = vi.spyOn(console, 'error').mockImplementation(() => {})
    openPath.mockRejectedValue(new Error('opener.open_path not allowed'))
    const { openPath: open } = await shell()

    await expect(open('C:/Downloads/video.mkv')).resolves.toBeUndefined()

    expect(complaint).toHaveBeenCalledTimes(1)
    expect(String(complaint.mock.calls[0]?.[0])).toContain('C:/Downloads/video.mkv')
  })

  it('says so when a reveal fails too', async () => {
    underTauri(true)
    const complaint = vi.spyOn(console, 'error').mockImplementation(() => {})
    revealItemInDir.mockRejectedValue(new Error('no such path'))
    const { revealInFolder } = await shell()

    await expect(revealInFolder('D:/gone')).resolves.toBeUndefined()

    expect(complaint).toHaveBeenCalledTimes(1)
  })
})
