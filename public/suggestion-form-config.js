// Suggestion + contact forms POST directly to the site's own /api/submit endpoint
// (a Cloudflare Pages Function / Worker that emails the team via Resend). Visitors
// stay on the page and get instant feedback instead of opening their email client.
window.RWWC_SUGGESTION_SUBMISSION = {
  mode: "endpoint",
  endpoint: {
    // Same-origin API route handled by functions/api/submit.js (or the standalone worker).
    url: "/api/submit",
  },
  email: {
    to: "contact@ai-safety-resources.com",
  },
  appsScript: {
    endpointUrl:
      "https://script.google.com/macros/s/AKfycbwQY1XXNQxh1_6rxTrMEXlk3aDUidhsQM8hq5T0Qzbv8tfErjqldlDub98STgnHtXj9DA/exec",
    sheetUrl:
      "https://docs.google.com/spreadsheets/d/1OTDiyBuIVTqnYXzXp3asMoRSA4wYNBywBRePgtIZfyY/edit?usp=sharing",
  },
  googleForm: {
    formViewUrl: "https://docs.google.com/forms/d/e/REPLACE_WITH_FORM_ID/viewform",
    formResponseUrl: "https://docs.google.com/forms/d/e/REPLACE_WITH_FORM_ID/formResponse",
    fields: {
      name: "entry.1000000001",
      author: "entry.1000000002",
      email: "entry.1000000006",
      link: "entry.1000000003",
      pages: "entry.1000000004",
      track: "entry.1000000005",
    },
  },
};
