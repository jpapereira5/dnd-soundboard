/**
 * Sends the session link to a Google Form after every change, so the form's
 * response sheet in Drive always holds the latest version. A form accepts
 * anonymous submissions, so the page needs no token or login. Leave `action`
 * empty to disable.
 *
 * To set up: make a form with one "Resposta longa" question, open its
 * pre-filled link to read the `entry.<number>` of that question, and link
 * the form to a response sheet. The sheet's last row is always the latest link.
 */
export const PUBLISH_FORM = {
  /** The form's submit URL: https://docs.google.com/forms/d/e/<id>/formResponse */
  action: 'https://docs.google.com/forms/d/e/1FAIpQLScGKbCqGQJ5oYyGi8kGO6FauF_pk-LzcUEtkd3bgyNWrmpUdQ/formResponse',
  /** The question that receives the link: entry.<number> */
  field: 'entry.1928532683',
}

export const PUBLISH_ENABLED = PUBLISH_FORM.action !== '' && PUBLISH_FORM.field !== ''

/**
 * The sheet the form writes into, read back when the page opens so every
 * computer starts from the latest link. The sheet must be shared as
 * "anyone with the link can view". `gid` is the response tab's id.
 */
export const READ_SHEET = {
  id: '1JG6Q-6JVjn8sPOhBXaey65-3i4c04o_0VmXwkaJuw2U',
  gid: '226234950',
}

export const READ_ENABLED = READ_SHEET.id !== '' && READ_SHEET.gid !== ''

/** Newest link in the response sheet, or null when the sheet is empty. */
export async function fetchLatestLink(): Promise<string | null> {
  if (!READ_ENABLED) return null
  const query = encodeURIComponent('select B order by A desc limit 1')
  const url = `https://docs.google.com/spreadsheets/d/${READ_SHEET.id}/gviz/tq?tqx=out:csv&gid=${READ_SHEET.gid}&tq=${query}&_=${Date.now()}`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`a folha respondeu ${r.status}`)
  const text = (await r.text()).replace(/^\uFEFF/, '')
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  const last = lines.at(-1) ?? ''
  const value = last.startsWith('"') ? last.slice(1, -1).replace(/""/g, '"') : last
  return value.startsWith('http') ? value : null
}

/**
 * Fire-and-forget POST. Google Forms answers with a page, not CORS headers,
 * so the request goes out as no-cors: it is delivered, but the browser hides
 * the response, so success cannot be confirmed here.
 */
export async function publishLink(link: string): Promise<void> {
  if (!PUBLISH_ENABLED) return
  const body = new URLSearchParams({ [PUBLISH_FORM.field]: link })
  await fetch(PUBLISH_FORM.action, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
}
