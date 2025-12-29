export const MSAL_CONFIG = {
  // Βεβαιωθείτε ότι αυτό το Client ID αντιστοιχεί στην εφαρμογή που φτιάξατε στο Azure Portal
  clientId: "2b7463fa-e7d1-481c-a5dd-56f8fac88377",
  
  // ΑΛΛΑΓΗ: Χρησιμοποιούμε "common" για να επιτρέπονται ΟΛΟΙ οι λογαριασμοί (Προσωπικοί & Εταιρικοί)
  // ΣΗΜΕΙΩΣΗ: Αν λαμβάνετε σφάλμα "Device Verification" (AADSTS50158), αντικαταστήστε το "common"
  // με το Tenant ID της εταιρείας σας (π.χ. "12345678-abcd-efgh-...")
  authority: "https://login.microsoftonline.com/common",
  
  // ΑΛΛΑΓΗ: Σταθερό Redirect URI στο localhost:3000 όπως ζητήσατε.
  // ΠΡΟΣΟΧΗ: Πρέπει να έχετε δηλώσει το "http://localhost:3000" στο Azure Portal -> Authentication -> Single-page application.
  redirectUri: "http://localhost:3000",
};

export const SCOPES = {
  scopes: ["User.Read", "Files.ReadWrite"],
};

export const FILE_NAME = "FinancialData.xlsx";
export const TABLE_NAME = "InvoicesTable";
export const TABLE_HEADERS = ["Customer Name", "Invoice Number", "Invoice Date", "Invoice Amount", "Status", "Credit"];