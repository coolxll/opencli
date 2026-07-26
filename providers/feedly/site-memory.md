# feedly

## 域名

- 通用 API：`https://cloud.feedly.com/v3`
- 内容搜索 API：`https://api.feedly.com/v3`
- Web：`https://feedly.com`

## 默认鉴权

`Strategy.LOCAL` + `Authorization: Bearer <access_token>`。配置来自 `FEEDLY_CONFIG_PATH` 或 `~/.opencli/feedly.json`，支持 `refresh_token` 自动续期。不要把浏览器抓包中的 token 或 cookie 写入源码、fixture 或 site memory。

## 已知 endpoint

- `GET /profile` — 账户信息与 user id
- `GET /streams/contents` — 信息流内容，支持 `streamId/count/continuation`
- `POST https://api.feedly.com/v3/search/contents` — 内容搜索，body 为 `layers + source`
- `GET /categories` — 分类
- `GET /subscriptions` — 订阅源
- `GET /markers/counts` — 未读计数
- `POST /markers` — 标记已读
- `POST /auth/token` — refresh token 换 access token

## 搜索结构

普通关键词：

```json
{"layers":[{"parts":[{"text":"test"}],"type":"matches","salience":"about"}]}
```

已验证的 Competitors 模板：

```json
{
  "layers": [
    {"parts":[{"id":"nlp/f/businessEvent/partnership"}],"type":"matches","salience":"about"},
    {"parts":[{"id":"nlp/f/entity/gz:org:openai"}],"type":"matches","salience":"mention","searchHint":"org"}
  ]
}
```

Web 搜索页的 `options` URL 参数是 base64url JSON，可用于侦察 `layers/bundles/refineMode/publishedFilter/languages`。这是内部状态，不当作稳定公共 API。

## 坑 / 陷阱

- 搜索 API host 与其他 v3 API 不同。
- `ct/cv` 来自桌面客户端抓包，可能随版本漂移。
- 模板搜索依赖 Feedly NLP model/entity id；仅传文本能回退搜索，但没有实体别名能力。
- 部分业务事件模型属于 Market Intelligence，可能返回计划权限错误。
- `newerThan/olderThan` 是 epoch milliseconds；`newerThan` 必须早于 `olderThan`。
- 搜索结果正常入口是 `items[]`；空数组不是 adapter 故障。

## 可参考的 adapter

- `providers/feedly/search.js`
- `providers/feedly/unread.js`
- `providers/feedly/utils.js`
