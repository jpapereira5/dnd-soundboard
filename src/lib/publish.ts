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
  action: '',
  /** The question that receives the link: entry.<number> */
  field: '',
}

export const PUBLISH_ENABLED = PUBLISH_FORM.action !== '' && PUBLISH_FORM.field !== ''

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
