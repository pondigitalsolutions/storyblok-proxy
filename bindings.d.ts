// Bindings object passed in through the request handler of the CloudFlare worker
// and contains the KV storage namespaces for handling storage and other services.
// @see wrangler.toml for storage configuration.
interface Bindings {
  // env variables configured in CloudFlare.
  OKTA_AUDIENCE: string;
  OKTA_ISSUER: string;
  OKTA_CLIENTID: string;
  STORYBLOK_APIKEY: string;
  SENTRY_DSN: string;
  ENVIRONMENT: string;
  VERSION: string;
}
