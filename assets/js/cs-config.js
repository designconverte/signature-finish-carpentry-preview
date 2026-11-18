/* Public module configuration (no secrets). Tracking IDs come later; with every ID null no external script loads.
   Lead destination is server-side (lead.php). */
window.CS_CONFIG = {
  siteId: 'signature-finish-carpentry',
  lead: {
    endpoint: '/api/lead.php',
    redirect: '/thank-you/',
    smsConsentVersion: 'sms-project-en-v1-2026-11-17'
  },
  serviceArea: {
    zips: ['01450', '01451', '01460', '01467', '01470', '01471', '01472', '01505', '01520', '01522', '01523', '01532', '01541', '01545', '01546', '01564', '01581', '01718', '01719', '01720', '01730', '01740', '01741', '01742', '01745', '01746', '01748', '01760', '01770', '01772', '01773', '01775', '01776', '01778', '01784', '01803', '01805', '01810', '01812', '01824', '01825', '01827', '01845', '01863', '01864', '01867', '01885', '01886', '01889', '01890', '01899', '01921', '01940', '01949', '01983', '02030', '02052', '02090', '02420', '02421', '02445', '02446', '02447', '02457', '02458', '02459', '02460', '02461', '02462', '02464', '02465', '02466', '02467', '02468', '02474', '02476', '02478', '02479', '02481', '02482', '02492', '02493', '02494', '02495', '03031', '03032', '03033', '03036', '03049', '03051', '03052', '03110', '03811', '03841', '05501', '05544'],
    outOfArea: 'accept-with-message'
  },
  tracking: {
    mode: 'gtm',
    ga4: null,
    metaPixel: null,
    googleAds: null,
    gtm: null,
    consentDefault: 'granted',
    leadValue: null,
    debugParam: 'cs_debug'
  }
};

// preview copy: the form is simulated and nothing is tracked
window.CS_CONFIG = Object.assign({}, window.CS_CONFIG, { preview: true });
window.CS_CONFIG.lead = Object.assign({}, window.CS_CONFIG.lead, { endpoint: '/signature-finish-carpentry-preview/api/lead.php', redirect: null });
window.CS_CONFIG.tracking = Object.assign({}, window.CS_CONFIG.tracking, { mode: 'off', ga4: null, metaPixel: null, googleAds: null, gtm: null });
