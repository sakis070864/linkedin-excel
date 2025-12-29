import React from 'react';
import ReactDOM from 'react-dom/client';
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./services/authConfig";
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

// Safe root creation handling for HMR (Hot Module Replacement)
let root = (rootElement as any)._reactRootContainer;
if (!root) {
    root = ReactDOM.createRoot(rootElement);
}

// Initialize MSAL and handle any pending redirects before mounting
msalInstance.initialize().then(() => {
    // Check if we are returning from a redirect
    msalInstance.handleRedirectPromise().then((response) => {
        // If we just returned from a redirect with a valid account, set it as active
        if (response && response.account) {
            msalInstance.setActiveAccount(response.account);
        } else {
            // Otherwise, check if there are any accounts in cache and set the first one active
            const accounts = msalInstance.getAllAccounts();
            if (accounts.length > 0) {
                msalInstance.setActiveAccount(accounts[0]);
            }
        }

        root.render(
            <MsalProvider instance={msalInstance}>
                <App />
            </MsalProvider>
        );
    }).catch(error => {
        // Suppress specific cache error that occurs on refresh during dev/hot-reload
        if (error.errorCode === "no_token_request_cache_error") {
             console.warn("Auth cache mismatch detected (safe to ignore on refresh):", error);
        } else {
             console.error("Redirect handling failed:", error);
        }
        
        // Render app anyway to allow user to try again
        root.render(
            <MsalProvider instance={msalInstance}>
                <App />
            </MsalProvider>
        );
    });
});