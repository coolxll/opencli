# Feedly

**Mode**: 🔑 Local API · **Domain**: `cloud.feedly.com`

## Commands

| Command | Description |
|---------|-------------|
| `opencli feedly profile` | Verify token and show profile metadata |
| `opencli feedly unread` | List unread entries |
| `opencli feedly categories` | List categories with unread counts |
| `opencli feedly subscriptions` | List subscriptions with unread counts |
| `opencli feedly counts` | List raw unread marker counts |
| `opencli feedly streams` | List global, category, and feed streams |
| `opencli feedly mark-read` | Mark entries as read |

## Usage Examples

```bash
opencli feedly profile -f json
opencli feedly unread --limit 20 -f json
opencli feedly unread --stream-id "user/<id>/category/global.all" --limit 10
opencli feedly streams
opencli feedly mark-read --ids "entry-id-1,entry-id-2" --confirm MARK_READ
```

## Prerequisites

- No browser required.
- Configure `FEEDLY_CONFIG_PATH`, or create `~/.opencli/feedly.json`.
- The config JSON must contain `refresh_token` or `access_token`.
- Token refresh tries `client_id=feedly`, then `client_id=feedlydev`.

Example:

```json
{
  "refresh_token": "..."
}
```
