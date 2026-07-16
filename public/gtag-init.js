// Google tag (gtag.js) bootstrap with Consent Mode v2. Kept in a separate
// self-hosted file rather than inline so the CSP script-src can stay free of
// 'unsafe-inline'.
//
// Analytics cookies are denied by default in the EEA, UK, and Switzerland and
// only set after the visitor opts in via the consent banner below. Whether
// (and in which variant) the banner shows is decided by a geo-IP lookup
// against /api/geo (Cloudflare's country resolution); if the lookup fails the
// strictest variant is shown. Google independently applies the regional
// consent default from the request's origin, so a visitor whose banner never
// appears still gets no cookies.
//
// Banner layout: first screen offers Accept and Configure; Configure opens a
// second screen where Essential is always on and Analytics is an opt-in
// checkbox. France and Germany (CNIL / DSK guidance) additionally get an
// immediate Decline button on the first screen.
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

(function () {
  var STORAGE_KEY = "analytics-consent";
  // EU member states plus the rest of the EEA (IS, LI, NO), the UK, and
  // Switzerland — everywhere an ePrivacy-style opt-in applies.
  var CONSENT_REGIONS = [
    "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE",
    "IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
    "IS","LI","NO","GB","CH"
  ];
  // Countries whose regulators require a first-layer decline button.
  var IMMEDIATE_DECLINE = ["FR", "DE"];

  // This site runs no advertising: every ad signal stays permanently denied.
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted"
  });
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    region: CONSENT_REGIONS
  });

  var stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  if (stored === "granted" || stored === "denied") {
    gtag("consent", "update", { analytics_storage: stored });
  }

  gtag("js", new Date());
  gtag("config", "G-MCRWR4G369");

  // Resolves to an upper-cased ISO country code, or null when the lookup
  // fails — null makes the caller fall back to the strictest banner variant.
  function fetchCountry() {
    return fetch("/api/geo")
      .then(function (res) {
        if (!res.ok) throw new Error("geo lookup failed: " + res.status);
        return res.json();
      })
      .then(function (data) {
        return typeof data.country === "string" && data.country.length === 2
          ? data.country.toUpperCase()
          : null;
      })
      .catch(function () {
        return null;
      });
  }

  // Kicked off at parse time (only when a choice is still needed) so the
  // lookup runs in parallel with the rest of the page load.
  var pendingGeo =
    stored !== "granted" && stored !== "denied" ? fetchCountry() : null;

  var declineFirstLayer = false;

  function setChoice(choice) {
    try { localStorage.setItem(STORAGE_KEY, choice); } catch (e) {}
    stored = choice;
    gtag("consent", "update", { analytics_storage: choice });
    var banner = document.getElementById("cookie-consent");
    if (banner) banner.remove();
  }

  function firstScreenMarkup() {
    var decline = declineFirstLayer
      ? '<button type="button" class="cookie-consent-button" data-consent="denied">Decline</button>'
      : "";
    return (
      '<p class="cookie-consent-copy">We use Google Analytics cookies to understand overall site traffic. ' +
      'See our <a href="/privacy/">privacy policy</a>.</p>' +
      '<div class="cookie-consent-actions">' +
      '<button type="button" class="cookie-consent-button" data-action="configure">Configure</button>' +
      decline +
      '<button type="button" class="cookie-consent-button cookie-consent-accept" data-consent="granted">Accept</button>' +
      "</div>"
    );
  }

  function configScreenMarkup() {
    var analyticsOn = stored === "granted" ? " checked" : "";
    return (
      '<p class="cookie-consent-copy">Choose which cookies this site may use.</p>' +
      '<div class="cookie-consent-options">' +
      '<label class="cookie-consent-option">' +
      '<input type="checkbox" checked disabled />' +
      "<span><strong>Essential</strong> — keeps the site working: your theme and reading list, stored only on this device. Always on.</span>" +
      "</label>" +
      '<label class="cookie-consent-option">' +
      '<input type="checkbox" id="cookie-consent-analytics"' + analyticsOn + " />" +
      "<span><strong>Analytics</strong> — Google Analytics cookies that help us measure overall traffic.</span>" +
      "</label>" +
      "</div>" +
      '<div class="cookie-consent-actions">' +
      '<button type="button" class="cookie-consent-button cookie-consent-accept" data-action="save">Save choices</button>' +
      "</div>"
    );
  }

  function showBanner(screen) {
    var banner = document.getElementById("cookie-consent");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "cookie-consent";
      banner.className = "cookie-consent";
      banner.setAttribute("role", "region");
      banner.setAttribute("aria-label", "Cookie consent");
      banner.addEventListener("click", function (ev) {
        var el = ev.target;
        if (!el || !el.getAttribute) return;
        var choice = el.getAttribute("data-consent");
        if (choice) return setChoice(choice);
        var action = el.getAttribute("data-action");
        if (action === "configure") {
          banner.innerHTML = configScreenMarkup();
        } else if (action === "save") {
          var box = document.getElementById("cookie-consent-analytics");
          setChoice(box && box.checked ? "granted" : "denied");
        }
      });
      document.body.appendChild(banner);
    }
    banner.innerHTML = screen === "config" ? configScreenMarkup() : firstScreenMarkup();
  }

  function init() {
    // The "cookie settings" link on the privacy page jumps straight to the
    // configure screen so a visitor can change their choice at any time.
    var reopen = document.getElementById("cookie-settings");
    if (reopen) {
      reopen.addEventListener("click", function (ev) {
        ev.preventDefault();
        showBanner("config");
      });
    }
    if (pendingGeo) {
      pendingGeo.then(function (country) {
        // A later visit in the same session may have stored a choice already.
        if (stored === "granted" || stored === "denied") return;
        // Unknown country (lookup failed): fail safe to the strictest
        // variant rather than silently skipping consent.
        if (country !== null && CONSENT_REGIONS.indexOf(country) === -1) return;
        declineFirstLayer = country === null || IMMEDIATE_DECLINE.indexOf(country) !== -1;
        showBanner();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
