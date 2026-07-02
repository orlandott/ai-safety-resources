// Suggestion + contact submissions post to the first-party API (/api/submit,
// a Cloudflare Pages Function that emails via Resend — see functions/api/submit.js).
// If the API is unreachable or unconfigured, the forms fall back to opening the
// visitor's email client (mailto) using `email.to` below.
//
// Other modes remain supported for alternative deployments:
//   mode: "email"        → always use the visitor's email client
//   mode: "apps_script"  → POST to appsScript.endpointUrl (Google Apps Script)
//   mode: "google_form"  → POST to googleForm.formResponseUrl (entry.* mappings)
window.RWWC_SUGGESTION_SUBMISSION = {
  mode: "api",
  api: {
    endpoint: "/api/submit",
  },
  email: {
    to: "contact@ai-safety-resources.com",
  },
};
