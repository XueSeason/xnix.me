---
title: 你需要学习的 webpack 知识点
date: '2019-05-21'
spoiler: 📦
---

webpack 理解为前端资源打包工具，资源不仅仅是 js 文件，可以是任意文件（通过对应的 loader 实现）。

webpack 通过创建依赖图，明确所有需要打包的资源。

引出两个概念：

- module 资源文件
- bundle 包文件，包含多个资源

浏览器执行中，runtime 代码会通过 manifest 连接多个模块。**通过分析 manifest 是优化打包效率的关键之一。**

小知识点：

> 打包的导出目录通常是 dist，这里 dist 是 distribution 的缩写。

## split

通过 `import()` 语法告诉 webpack 进行代码分割。

通过`注释`可以确定 bundle 命名，import 这类注释称之为`魔法注释(Magic Comments)`

```js
import(/* webpackChunkName: "lodash" */ 'lodash')
```

分割出的 bundle 可以利用 `preload` 和 `prefetch` 浏览器特性进行资源加速。

webpack 4.6.0+ 支持 preload 和 prefetch 来提升加载速度。

- prefetch: 资源可能在后续被用到
- preload: 资源可能在当前被用到

preload 和 prefetch 的区别：

- preload 和父 chunk 并行加载。
- preload chunk 会立即被下载，prefetch chunk 会在浏览器 idle 期间被下载。

例如：

```js
import(/* webpackPrefetch: true */ 'LoginModal');
```

> webpack 在父 chunk 被加载完成后，才会添加 prefetch 标签资源。

```js
import(/* webpackPreload: true */ 'ChartingLibrary');
```

> 考虑到浏览器并发请求数，错误地使用 webpack preload 会影响性能。

## cache

webpack 的 entry chunk 包含确定的业务代码、第三方代码、特定的运行时和 manifest。

混在一起打包会导致 hash 不具备映射性造成无法进行缓存，需要将其抽离。

配置 `optimization.runtimeChunk` 和 `optimization.splitChunks.cacheGroups.vendor` 来抽离 runtime 和 vendor。

引入新的 module 会造成其他 `module.id` 的改变：

- main 的 hash 改变，因为业务代码改变（引入新的 module）。
- vendor 的 hash 改变，因为 `module.id` 改变。
- runtime 的 hash 改变，因为添加了新的 module 引用。

可以使用 `NamedModulesPlugin` 和 `HashedModuleIdsPlugin` 解决，生产环境建议用 HashedModuleIdsPlugin。

## library

基于 webpack 实现一个库，需要考虑以下几点：

1. 设置 `externals` 避免打包基础依赖。
1. 设置库名 `output.filename`。
1. 设置库暴露的变量名 `output.library`。
1. 设置构建目标平台 `output.libraryTarget`。
1. package.json 设置 `main` 和 `module` 字段。

## performance

提高 Webpack 打包性能的几点建议：

1. 保证最新版本的 Webpack，Node.js 以及 npm (或 yarn)。
1. 使用 `DllPlugin` 抽离变动少的代码。
1. 使用 `thread-loader` 将昂贵的 loader 交给 worker pool。（IPC 同样昂贵，worker 数量需要控制在一个合理的范围）
1. 使用 `cache-loader` 持久化缓存。
1. 设置合理的 `devtool`，大多数情况下 cheap-module-eval-source-map 是最佳选择。

关于 devtool 的使用，可以参考[《source-map 的玩法》](/have-fun-with-source-map/)