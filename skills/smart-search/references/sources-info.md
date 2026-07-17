# 资讯 / 知识

用于新闻、百科、通用知识、中文科技资讯。

## 站点

### google

- 适用：通用网页搜索、跨站点兜底
- 使用前先运行：`opencli google -h`

### wikipedia

- 适用：名词解释、背景知识、历史事实
- 使用前先运行：`opencli wikipedia -h`

### reuters

- 适用：国际新闻、事实性报道
- 使用前先运行：`opencli reuters -h`

### weibo

- 适用：微博热点、话题、中文舆论
- 使用前先运行：`opencli weibo -h`

### 36kr

- 适用：中文科技、创业、融资资讯
- 使用前先运行：`opencli 36kr -h`

### substack

- 适用：newsletter、作者订阅内容、长文
- 使用前先运行：`opencli substack -h`

### feedly

- 适用：搜索用户已经订阅的 RSS、newsletter 和个人 Feedly 信息流，也可搜索 Feedly 的商业与技术出版物桶
- 前提：本地已配置 Feedly `refresh_token` 或 `access_token`；该适配器不依赖浏览器
- 使用前先运行：`opencli feedly -h` 和 `opencli feedly search -h`
- 需要更完整的鉴权、范围与模板搜索边界时，读取 `opencli-feedly`

## 路由提示

- 背景知识与定义，优先 `wikipedia`
- 通用网页与跨站信息，优先 `google`
- 国际新闻优先 `reuters`
- 中文科技资讯优先 `36kr`
- 用户明确要求搜索“我的订阅 / 我的 RSS / Feedly”时，优先 `feedly`，不要替换成通用网页搜索
- 当 AI 回答过于泛化时，用这些源补充事实和链接
