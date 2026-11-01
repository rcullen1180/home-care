// Edit these to set up the site.
window.SITE_CONFIG = {
  businessName: "A la Carte Home Concierge and Pet Sitting",
  // Paste your Formspree form URL here (e.g. "https://formspree.io/f/abcdwxyz").
  // While empty, the form opens an email to contactEmail instead.
  formEndpoint: "",
  contactEmail: "rcullen80@aol.com",
  // Alternative to Formspree: a Google Form. Paste its formResponse URL and the
  // entry ids for each question. Used when formEndpoint is empty.
  googleForm: {
    action: "", // e.g. "https://docs.google.com/forms/d/e/FORM_ID/formResponse"
    fields: { name: "", email: "", phone: "", location: "", details: "", start_date: "", end_date: "" }
  }
};
