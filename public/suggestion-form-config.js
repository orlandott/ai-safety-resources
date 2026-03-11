// Keep this file in git so submission routing and mappings are managed by pull requests.
// Submissions go to /api/submit (Cloudflare Function), which forwards to Apps Script.
// To post directly to Apps Script instead, set endpointUrl to the full script URL.
window.RWWC_SUGGESTION_SUBMISSION = {
  mode: "apps_script",
  appsScript: {
    endpointUrl: "/api/submit",
    sheetUrl:
      "https://docs.google.com/spreadsheets/d/1OTDiyBuIVTqnYXzXp3asMoRSA4wYNBywBRePgtIZfyY/edit?usp=sharing",
    // Optional: override URLs for submission tracker views (defaults to sheetUrl).
    submissionTracker: {
      pipelineUrl: undefined,
      calendarUrl: undefined,
      tableViewUrl: undefined,
    },
  },
  googleForm: {
    formViewUrl: "https://docs.google.com/forms/d/e/REPLACE_WITH_FORM_ID/viewform",
    formResponseUrl: "https://docs.google.com/forms/d/e/REPLACE_WITH_FORM_ID/formResponse",
    fields: {
      name: "entry.1000000001",
      author: "entry.1000000002",
      email: "entry.1000000006", // optional
      link: "entry.1000000003",
      pages: "entry.1000000004",
      track: "entry.1000000005",
    },
  },
};
