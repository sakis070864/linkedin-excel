import { Configuration, PublicClientApplication } from "@azure/msal-browser";
import { MSAL_CONFIG } from "../constants";

const msalConfiguration: Configuration = {
  auth: {
    clientId: MSAL_CONFIG.clientId,
    authority: MSAL_CONFIG.authority,
    redirectUri: MSAL_CONFIG.redirectUri,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true,
  },
};

export const msalInstance = new PublicClientApplication(msalConfiguration);