import { SquareClient, SquareEnvironment } from 'square';

/**
 * Returns a Square API client authenticated with the given access token.
 */
export function getSquareClient(accessToken: string): SquareClient {
  return new SquareClient({
    token: accessToken,
    environment:
      process.env.SQUARE_ENVIRONMENT === 'production'
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
  });
}

/**
 * Returns a Square client with no access token — used only for
 * OAuth token exchange (obtainToken / revokeToken).
 */
export function getSquareOAuthClient(): SquareClient {
  return new SquareClient({
    environment:
      process.env.SQUARE_ENVIRONMENT === 'production'
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
  });
}

/** Base URL for the Square OAuth authorize page. */
export function getSquareAuthorizeBaseUrl(): string {
  return process.env.SQUARE_ENVIRONMENT === 'production'
    ? 'https://connect.squareup.com/oauth2/authorize'
    : 'https://connect.squareupsandbox.com/oauth2/authorize';
}
