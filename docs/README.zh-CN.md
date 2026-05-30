# Swarms Marketplace CLI

![Swarms CLI 图片](../img.png)

[![npm version](https://img.shields.io/npm/v/swarms-market.svg)](https://www.npmjs.com/package/swarms-market)
[![node](https://img.shields.io/node/v/swarms-market.svg)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/swarms-market.svg)](../LICENSE)

[Swarms Marketplace](https://swarms.world) 的官方命令行客户端。在终端中即可发布 Agent、Prompt 和 Token,浏览目录,并领取您所发行 Token 化产品的创作者手续费 —— 全程脚本化,原生支持 CI/CD 和无界面环境。

> 🌐 其他语言版本:[English](../README.md) · [日本語](./README.ja.md) · [हिन्दी](./README.hi.md) · [Deutsch](./README.de.md) · [Polski](./README.pl.md) · [Português (BR)](./README.pt-BR.md) · [Français](./README.fr.md)

---

## 概述

`swarms` 是 Swarms Marketplace HTTP API 之上的完全可脚本化客户端。它直接映射到驱动 Marketplace 业务的操作:

- **批量发布产品。** 通过单条命令、一个 JSON 清单或 CI 中的清单目录,将 Agent、Prompt 和工具推送到市场。无需浏览器,无需手动表单。
- **链上发币。** 一次调用即可将 Agent 代币化,包括代币符号、计价货币、图像与费率模式。发行交易由运行时提供的钱包密钥签名。
- **单笔或批量领取创作者手续费。** 可针对单个 Token、您拥有的全部 Token,或一次性扫描市场上每一个代币化 mint 进行批量领取,具有"失败继续"语义。
- **审计您的目录。** 将您已发布的产品以结构化树形渲染,过滤仅显示已代币化项,或以 JSON 输出供下游仪表盘使用。
- **发现市场。** 翻页浏览每一个代币化产品(无需 API key),以扁平列表或 JSON 形式输出,适用于索引、镜像或分析。
- **完全自动化。** 当设置了正确的环境变量时,每条命令都是非交互式的,返回标准退出码,并在非 TTY 或 `$CI` 下自动禁用动画 / 提示。

### 功能一览

| 功能                              | 命令                                              | 是否需要鉴权          |
| --------------------------------- | ------------------------------------------------- | --------------------- |
| 打开 API key 页面                 | `swarms api-key`                                  | 无需                  |
| 验证环境鉴权                      | `swarms login` · `swarms whoami`                  | 需要 API key          |
| 发布 Agent                        | `swarms launch agent`                             | 需要 API key          |
| 发布 Prompt                       | `swarms launch prompt`                            | 需要 API key          |
| 为 Agent 发行链上 Token           | `swarms launch token`                             | 需要 API key + 钱包密钥 |
| 列出您发布的产品                  | `swarms list`                                     | 需要 API key          |
| 浏览所有代币化产品                | `swarms list-tokenized`(别名 `swarms tokens`)   | 无需                  |
| 打开某个产品的列表页              | `swarms open <id\|ca>`                            | 无需                  |
| 领取单个 mint 的手续费            | `swarms claim --ca <mint>`                        | 需要钱包密钥          |
| 批量领取手续费                    | `swarms claim-all`                                | 需要钱包密钥          |
| 任意读取命令的 JSON 输出          | `--json` 选项                                     | 与父命令相同          |

## 兼容性

| 要求         | 支持范围                                                                  |
| ------------ | ------------------------------------------------------------------------- |
| Node.js      | ≥ 18(使用原生 `fetch`)                                                  |
| 包管理器     | `npm`、`pnpm`、`yarn`、`bun`                                              |
| 操作系统     | macOS、Linux、Windows(PowerShell + WSL);macOS / Linux 为主要平台        |
| 终端         | 任何 VT100 兼容终端;需要支持 Unicode 块字符                              |
| CI Runner    | GitHub Actions、GitLab CI、CircleCI、Buildkite、Jenkins 等                |

## 安装

```bash
# 全局安装(推荐用于日常 / shell 使用)
npm install -g swarms-market

# 或者不安装直接运行(适合 CI)
npx swarms-market@latest --help

# 在 CI 中固定特定版本
npm install -g swarms-market@0.1.0
```

安装后验证:

```bash
swarms --version
swarms --help
```

> **注意:** npm 上的包名为 `swarms-market`,但安装后生成的二进制名为 `swarms`。如果您已经安装了 Python 的 `swarms` 包(它也提供了同名二进制),它们会在 `PATH` 中相互遮盖。运行 `which swarms` 查看实际生效的是哪一个;卸载不需要的那个,或者直接通过 `npx swarms-market <command>` 调用本工具。

### 卸载

```bash
npm uninstall -g swarms-market
```

## 快速开始

```bash
# 1. 获取 API key(会打开 https://swarms.world/platform/api-keys)
swarms api-key

# 2. 导出
export SWARMS_API_KEY="sk-…"
export SWARMS_USERNAME="your-username"   # 可选,但能在多数命令中省略 --user

# 3. 验证鉴权
swarms login

# 4. 通过清单发布您的第一个 Agent
swarms launch agent \
  --name "Hello Agent" \
  --description "Says hi" \
  --code-file ./agent.py \
  --free

# 5. 查看您已发布的内容
swarms list

# 6. 浏览市场
swarms list-tokenized
```

## 鉴权

在 <https://swarms.world/platform/api-keys> 获取 key(或运行 `swarms api-key`)。Key 可在该页面创建、命名和吊销。

```bash
export SWARMS_API_KEY="sk-…"
swarms whoami      # 确认 key 已加载;打印前/后 4 个字符
```

不修改账户的只读命令(尤其是 `list-tokenized` 与 `api-key` 打开器)无需 API key。其他所有命令均需要。

## 配置

所有配置都基于环境变量。CLI 不读取也不写入任何配置文件。

| 变量                          | 用途                                                                                  | 默认值                  |
| ----------------------------- | ------------------------------------------------------------------------------------- | ----------------------- |
| `SWARMS_API_KEY`              | 用于市场接口(发布、列表、账户范围的读取)的 Bearer Token。                            | _鉴权必需_              |
| `SWARMS_USERNAME`             | `list` 的默认 `--user`。让 `swarms list` 无需任何参数即可运行。                       | _(传入 --user)_        |
| `SWARMS_WALLET_PRIVATE_KEY`   | 用于链上操作的钱包私钥(base58)。仅保存在内存中。                                    | _(未设置则提示)_       |
| `PRIVATE_KEY`                 | `SWARMS_WALLET_PRIVATE_KEY` 的别名,兼容常见的 `.env` 约定。                          | _(未设置则提示)_       |
| `SWARMS_NO_ANIM`              | 设为任意值即可在交互终端中也禁用欢迎动画。                                            | _(TTY 下播放动画)_     |
| `CI`                          | 设置时自动禁用欢迎动画(各大 CI 提供商均会设置)。                                    | _(自动检测)_           |
| `TERM=dumb`                   | 同样禁用动画。                                                                        | _(自动检测)_           |
| `NO_COLOR`                    | 由 `chalk` 识别 —— 设置后完全禁用 ANSI 颜色。在某些 CI 日志查看器中很有用。           | _(默认开启颜色)_       |

## 命令参考

```
swarms api-key                在浏览器中打开 API key 页面
swarms login                  验证已设置 SWARMS_API_KEY
swarms whoami                 显示当前 key(已掩码)和 base URL

swarms launch agent           发布 Agent
swarms launch prompt          发布 Prompt
swarms launch token           为 Agent 在链上发行 Token

swarms list                   将您已发布的产品渲染为红/白色树形
swarms list-tokenized         市场上所有代币化产品
                              (别名: swarms tokens)
swarms open <id|ca>           在浏览器中打开产品列表页

swarms claim                  领取单个代币化产品的手续费(按 token mint)
swarms claim-all              跨多个产品批量领取手续费
```

随时运行 `swarms <command> --help` 获取规范的参数列表。子命令的帮助(`swarms launch --help`、`swarms list-tokenized --help` 等)采用相同的渲染。

详细的子命令文档、清单格式与工作流示例请参阅[英文 README](../README.md#command-reference)。

## 安全模型

CLI 面向凭证必须可审计、可重现的环境而设计。

**鉴权。**
API key 仅从 `$SWARMS_API_KEY` 读取,并通过 HTTPS 以 `Authorization: Bearer <key>` 发送。CLI 不会在磁盘上写入、缓存或持久化 API key。Key 在 <https://swarms.world/platform/api-keys> 管理,可随时吊销。

**钱包私钥处理。**
`claim`、`claim-all` 和 `launch token` 所需的钱包私钥按以下顺序获取:显式 `--private-key` 参数 → `$SWARMS_WALLET_PRIVATE_KEY` → `$PRIVATE_KEY` → 交互提示(隐式输入,不回显、不保存到历史)。私钥仅在一条命令执行期间保留在进程内存中,**绝不**写入磁盘、记录日志或缓存。CLI 没有任何"记住我的钱包"模式。

**传输。**
所有请求均使用 HTTPS 访问 `https://swarms.world`。主机名是硬编码的 —— 不存在环境变量覆盖 —— 因此一个误设的 shell 变量不会把 Bearer key 或钱包私钥重定向到其他主机。CLI 在任何参数下都不会禁用 TLS 校验。

**遥测。**
CLI 不发送任何形式的遥测数据。它仅在被调用时,向[命令参考](../README.md#command-reference)中列出的市场 API 端点发起网络请求。

## 退出码

| 退出码 | 含义                                                                |
| ------ | ------------------------------------------------------------------- |
| 0      | 成功                                                                |
| 1      | 命令错误 —— 无效输入、校验失败或 API 非 2xx 响应                    |
| 130    | 被 SIGINT(Ctrl-C)中断;退出时光标会被恢复                         |

`claim-all` 在任意一笔领取失败时返回 1,即使其他成功;请检查输出底部的汇总行了解每个 mint 的状态。

## 许可证

Apache License 2.0。参见 [LICENSE](../LICENSE)。
