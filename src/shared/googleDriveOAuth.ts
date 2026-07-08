/** Web application OAuth client (implicit grant via launchWebAuthFlow). No client secret. */
export const GOOGLE_CLIENT_ID =
  '396134497577-2m6sk6i4tr3596cnnn9nfolsl3rvn44h.apps.googleusercontent.com';

/** Registered in Google Cloud for extension ID ehbkfdgpbemaimepgeeflenhbbpgokoj */
export const GOOGLE_OAUTH_REDIRECT_URI_REGISTERED =
  'https://ehbkfdgpbemaimepgeeflenhbbpgokoj.chromiumapp.org/';

export const GOOGLE_DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

/** For “Connected as …” in Settings (read-only email). */
export const GOOGLE_USERINFO_EMAIL_SCOPE = 'https://www.googleapis.com/auth/userinfo.email';

export const GOOGLE_OAUTH_SCOPES = `${GOOGLE_DRIVE_APPDATA_SCOPE} ${GOOGLE_USERINFO_EMAIL_SCOPE}`;