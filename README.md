# StoryBlok proxy as a CloudFlare worker

This worker acts as a middleman between the SPA frontend and the StoryBlok API. Because of the SPA nature the StoryBlok
API key is exposed in the frontend code. This is not secure.

This worker stores API keys per SPA host origin so all StoryBlok API calls be requested here. The requests however do
need an OAuth2 JWT Bearer token as an Authorization header. Use Okta OAuth2 to sign the requests to this worker.


## Architecture

- SPA: Can be a Vue or React SPA deployed to CLoudFlare
- Okta: The OAuth2 identity provider
- Worker: This StoryBlok-proxy worker deployed to CloudFlare
- StoryBlok: External CMS provided API

```mermaid
sequenceDiagram
    SPA->>+Okta: Retrieve OAuth2 access token
    Okta->>-SPA: Return access token
    SPA->>+Worker: Do StoryBlok API request
    Worker->>+StoryBlok: Forward API request with configured API token
    StoryBlok->>-Worker: Return API response
    Worker->>-SPA: Return API response
```


## Configuring the worker

The env STORYBLOK_HOST needs the default api host `https://api.storyblok.com/v1`. The v2 endpoint is not supported because
that uses StoryBloks own OAuth2 token verifier.

The env STORYBLOK_ORIGIN_TOKENS is a JSON encoded string `'[{"token":"changeme","regex":"^.+localhost:3000.*$"}]'` . It is
an array of objects with keys token (The StoryBlok API key) and regex pattern.

> The regex pattern matches with the Origin header on all requests. Make sure your regexes are specific enough as not 
> to match with multiple tokens.
