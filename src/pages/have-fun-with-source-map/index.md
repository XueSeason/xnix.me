---
title: source-map 的玩法
date: '2019-05-17'
spoiler: 🧠
---

关于 source map，之前一直是一个模糊的概念。基本的印象也就是`编译后代码`到`代码`的映射。

## webpack 中的 source-map

某次看 webpack 的文档时，关于 `deltool` 配置竟然有数十种之多。

[表格](https://webpack.js.org/configuration/devtool/#root)

devtool                        | build | rebuild | production | quality
------------------------------ | ----- | ------- | ---------- | -----------------------------
(none)                         | +++   | +++     | yes        | bundled code
eval                           | +++   | +++     | no         | generated code
cheap-eval-source-map          | +     | ++      | no         | transformed code (lines only)
cheap-module-eval-source-map   | o     | ++      | no         | original source (lines only)
eval-source-map                | --    | +       | no         | original source
cheap-source-map               | +     | o       | yes        | transformed code (lines only)
cheap-module-source-map        | o     | -       | yes        | original source (lines only)
inline-cheap-source-map        | +     | o       | no         | transformed code (lines only)
inline-cheap-module-source-map | o     | -       | no         | original source (lines only)
source-map                     | --    | --      | yes        | original source
inline-source-map              | --    | --      | no         | original source
hidden-source-map              | --    | --      | yes        | original source
nosources-source-map           | --    | --      | yes        | without source content

T> `+++` super fast, `++` fast, `+` pretty fast, `o` medium, `-` pretty slow, `--` slow

简单来说，目前建议在开发环境中使用：`cheap-module-eval-source-map`，在生产环境中使用 `cheap-module-source-map`。

虽然表格已经足够清晰，但是还是不能满足我进一步的了解。

打开一份 source-map 文件，主要有以下几个字段：

record         | type   | comment
-------------- | ------ | ----------
file            | String | 当前文件路径
sources        | Arrary | 源码路径
names          | Arrary | 名称列表
mappings       | String | 映射内容
sourcesContent | Arrary | 源码内容列表

source-map 的关键是生成的 `mappings` 内容，通过 `mappings` 可以定位到 `sourcesContent` 内部的源代码。

> source-map 中的 sources 数组和 sourcesContent 数组的内容是一一对应的，即通过 source 可以得到 sourceContent（也就是源代码）。

## 浏览器是如何根据错误信息定位到源码

通常 error 对象会有如下形式的错误栈信息，我们可以通过 `error.stack` 取得：

```plain
Error: test
    at o.created (auth.7b0f1f5b.js:1)
    at nt (chunk-vendors.f02af75c.js:20)
    at auth.7b0f1f5b.js:1
    at auth.7b0f1f5b.js:1
```

通过 stack 可以取到 `file` 和 `position` 信息。例如 `at o.created (auth.7b0f1f5b.js:1)`，其中 auth.7b0f1f5b.js 是 file，1 是 position，代表行号（根据 devtool 配置，还可以带有列号信息）。

根据 file 信息可以找到对应的编译后的 JS 文件，如下格式：

```js{2}
(function(t){/*...*/}());
//# sourceMappingURL=auth.7b0f1f5b.js.map
```

这里的注释表示对应的 source-map 文件。

然后根据错误栈的 position，通过 mappings 获取对应源码的 position。

到这里，通过 source-map 根据错误信息定位到源码。

## source-map 的生成原理

但是事情还没有结束，我们还不知道 `sources` 和 `names` 字段的用处，而且最重要的 `mappings` 字段也只是一堆编码后的字符串。所以整个映射做了什么工作呢？

首先当然要从如何生成 source-map 展开，毕竟知道如何生成也就知道如何映射定位源代码了。

生成原理可以参考这篇博客 [https://github.com/wayou/wayou.github.io/issues/9](https://github.com/wayou/wayou.github.io/issues/9)

简而言之，经历了如何过程：

1. 定义 mappings 的映射格式，源码位置|source|转码位置|name。
1. 字符提取，提取 source 和 name 到指定数组，mappings 中使用索引，源码位置|source index|转码位置|name index。
1. 记录相对位置，源码相对位置|source index|转码相对位置|name index。
1. VLQ （Variable Length Quantities）处理后，转为 base64 码。

到这里整个 source-map 的知识点也就结束了。

## 实际玩法

现在我们看看实际项目中的玩法，也就是**前端生产代码的错误定位**。

在过去，虽然开发过程的错误容易定位，但是生产环境的错误无法觉察，更难以定位。主要原因是生产环境不能有 source-map，否则相当于暴露了源代码。所以 source-map 需要传到内网，然后通过错误上报的信息，比对内网的 source-map 来定位到源码。

1. 前端打包，将非 map 资源上传到外网生产环境，map 资源上传到内网 oss。
1. 监控生产环境代码，收集错误栈信息。
1. 监控平台获取到错误栈信息，匹配对应的 source-map，映射对应的源码，定位错误。
1. 后续错误操作（图标展示，报警灯）。
