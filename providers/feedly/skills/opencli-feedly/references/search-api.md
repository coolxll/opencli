# Feedly content search API

Use this reference only when maintaining or diagnosing `providers/feedly/search.js` and its helpers.

## Endpoints and authentication

- General v3 API: `https://cloud.feedly.com/v3`
- Content search: `POST https://api.feedly.com/v3/search/contents`
- Authentication: `Authorization: Bearer <access token>`
- Token refresh: `POST https://cloud.feedly.com/v3/auth/token`

Do not persist captured Bearer tokens or cookies. Cookies observed in browser cURL exports are incidental when Bearer authentication succeeds.

## Plain-text search

```json
{
  "layers": [
    {
      "parts": [{ "text": "test" }],
      "type": "matches",
      "salience": "about"
    }
  ],
  "source": {
    "items": [
      {
        "label": "All Personal Feeds",
        "type": "stream",
        "id": "user/<user-id>/category/global.all"
      },
      {
        "label": "Business & Strategy",
        "type": "publicationBucket",
        "id": "byf:business-and-strategy",
        "tier": "tier1"
      },
      {
        "label": "Tech Blogs",
        "type": "publicationBucket",
        "id": "byf:tech",
        "tier": "tier1"
      }
    ]
  }
}
```

Known query parameters include `count`, `newerThan`, `olderThan`, `ct`, and `cv`. Treat captured desktop client metadata as version-sensitive.

## Verified template shape

On 2026-07-16, the Feedly web template `Competitors — Partnerships AND Company` produced:

```json
{
  "layers": [
    {
      "parts": [{ "id": "nlp/f/businessEvent/partnership" }],
      "type": "matches",
      "salience": "about"
    },
    {
      "parts": [{ "id": "nlp/f/entity/gz:org:openai" }],
      "type": "matches",
      "salience": "mention",
      "searchHint": "org"
    }
  ]
}
```

The first layer selects a Feedly machine-learning model. The second selects a resolved organization entity. Entity selection searches aliases; a `{ "text": "OpenAI" }` fallback is less precise.

The browser page stores its search builder state in the `options` query parameter as base64url-encoded JSON. Useful fields include:

- `layers`: structured search conditions
- `bundles`: source presets
- `refineMode`: selected bundle
- `publishedFilter`: UI time preset
- `languages`: selected languages

Use this URL state as discovery evidence, not as a stable public contract.

## Source bundles observed

- `customMode`: personal `global.all` + `byf:business-and-strategy` + `byf:tech`
- `allFeedlyMode`: personal `global.all` + `discovery:all-topics`
- `boardMode`: `user/<id>/tag/global.all`
- `annotatedMode`: `user/<id>/tag/global.annotated`

The current CLI exposes only the `customMode` subset through `--scope`.

## Implementation boundary

Full template support requires:

1. Multiple layers in the request body.
2. Stable built-in template-to-model mappings.
3. Entity/model autocomplete or resolution.
4. A plain-text fallback when resolution fails.
5. Clear errors for Feedly plan-gated models such as Market Intelligence features.

Do not claim exact template parity until the resolver request and response have fixture-backed tests.
