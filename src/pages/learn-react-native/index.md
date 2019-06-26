---
title: React Native 初探
date: '2019-06-27'
spoiler: ⚛︎
---

> 本文只针对 iOS 平台 Swift 版 App 进行探讨。

## 与现有 App 整合的能力

iOS 平台：

1. 通过 CocoaPods 引入 RN 依赖
1. 原生添加 RCRootView 作为 RN 组件的容器，注册 RN 组件
1. 启动 RN Server 和 App

客户端需要安装 RN 依赖，需要借助 [Cocoapods](https://cocoapods.org/)，对于前端的同学可以理解为 iOS 界的 npm。

创建 Podfile（类似于 package.json）用于管理项目依赖

```bash
pod init # 类比 npm init
```

追加 Podfile 内容

```ruby
source 'https://github.com/CocoaPods/Specs.git'

# Required for Swift apps
platform :ios, '9.0' # 如果安装依赖失败，在修改版本
use_frameworks!

# The target name is most likely the name of your project.
target 'YourProjectName' do # 这里修改为具体项目名称

  # Your 'node_modules' directory is probably in the root of your project,
  # but if not, adjust the `:path` accordingly
  pod 'React', :path => '../node_modules/react-native', :subspecs => [
    'Core',
    'CxxBridge', # Include this for RN >= 0.47
    'DevSupport', # Include this to enable In-App Devmenu if RN >= 0.43
    'RCTText',
    'RCTNetwork',
    'RCTWebSocket', # needed for debugging
    # Add any other subspecs you want to use in your project
  ]
  # Explicitly include Yoga if you are using RN >= 0.42.0
  pod "yoga", :path => "../node_modules/react-native/ReactCommon/yoga"

  # Third party deps podspec link
  pod 'DoubleConversion', :podspec => '../node_modules/react-native/third-party-podspecs/DoubleConversion.podspec'
  pod 'glog', :podspec => '../node_modules/react-native/third-party-podspecs/glog.podspec'
  pod 'Folly', :podspec => '../node_modules/react-native/third-party-podspecs/Folly.podspec'

end
```

安装依赖

```bash
pod install
```

安装完后会生成 `.xcworkspace` 后缀的项目文件，打开后会发现集成了 Podfile 下的依赖。

在 Xcode 中追加 `info.plist` 内容忽略开发环境 ATS 限制。

info.plist 右键点击 source code

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSExceptionDomains</key>
    <dict>
        <key>localhost</key>
        <dict>
            <key>NSTemporaryExceptionAllowsInsecureHTTPLoads</key>
            <true/>
        </dict>
    </dict>
</dict>
```

否则 App 只能访问 HTTPS 协议的地址。

在 React Native 项目组中修改 package.json 文件，添加命令

```json
"scripts": {
  "start": "yarn react-native start"
}
```

注册组件

```js
import { AppRegistry } from 'react-native'
AppRegistry.registerComponent(YourName, () => App);
```

回到 Xcode 在需要展示 RN 的地方，添加如下代码（Swift 版本）

```swift
let jsCodeLocation = URL(string: "http://localhost:8080/index.bundle?platform=ios")

let rootView = RCTRootView(
    bundleURL: jsCodeLocation,
    moduleName: "YourName", // RN 中注册的组件名
    initialProperties: nil,
    launchOptions: nil
)
let vc = UIViewController()
vc.view = rootView
self.present(vc, animated: true, completion: nil)
```

然后在 Xcode 运行 Cmd + R 启动 App，在 RN 项目下执行 npm start 启动 RN Server，就可以看到集成的 RN 视图。

## RN 调用原生 UI

由于 Swfit 语言自身不支持宏(Marco)，RN 和 iOS 原生沟通需要借助此特性，所以我们需要通过桥接的方式让 Swift 项目接入 Objc 代码。

根据官方的例子，先在 Xcode 中新建 RNTMapManager 类

```c
// RNTMapManager.h
#import <React/RCTViewManager.h>

@interface RNTMapManager : RCTViewManager
@end

// RNTMapManager.m
#import <MapKit/MapKit.h>
#import <React/RCTViewManager.h>
#import "./RNTMapManager.h"

@implementation RNTMapManager
RCT_EXPORT_MODULE(RNTMap)
- (UIView *)view {
    return [[MKMapView alloc] init];
}
@end
```

主要分三步走：

1. 创建 RCTViewManager 的子类
1. 添加 `RCT_EXPORT_MODULE()` 宏
1. 实现 `-(UIView *)view` 方法

同时导入 header 暴露给 Swift

```c
// YourProject-Bridging-Header.h
#import "RNTMapManager.h"
```

到这里原生的工作完毕，我们需要在 RN 中注册该组件：

```tsx
// MapView.tsx
import { requireNativeComponent } from 'react-native'

const RNTMap = requireNativeComponent('RNTMap')
export default RNTMap
```

最后我们就可以像使用其他组件一样使用 MapView 组件了

```tsx
import React, { Component } from 'react'
import MapView from './MapView'

interface Props {}
export default class App extends Component<Props> {
  render() {
    return (
      <MapView style={{ flex: 1 }} />
    );
  }
}
```

其他暴露自定义属性和事件，具体参考[官方文档](https://facebook.github.io/react-native/docs/0.59/native-components-ios)

## 打包

在发布时，我们不能像开发模式下，让 App 访问本地服务器获取 RN 资源。需要将 RN 资源打包到 App 中。

首先执行 RN 的打包命令

```bash
react-native bundle --entry-file index.js --platform ios --dev false --bundle-output ios/bundle/main.jsbundle --assets-dest ios/bundle
```

会为 iOS 平台生成一个 `main.jsbundle`，配置信息和我们熟悉的 Webpack 和像：

- entry-file 打包的入口文件
- platform 构建平台 iOS/Android
- dev 开发模式 true/false
- bundle-output 打包后的出口文件
- assets-dest 资源目录

上文中[与现有 App 整合的能力](#与现有-app-整合的能力)中，修改加载 RN 的 Swift 代码：

```swift{1-7}
var jsCodeLocation: URL?
#if DEBUG
    jsCodeLocation = RCTBundleURLProvider.sharedSettings()?.jsBundleURL(forBundleRoot: "index", fallbackResource: "bundle/main")
//            jsCodeLocation = URL(string: "http://localhost:8081/index.bundle?platform=ios")
#else
    jsCodeLocation = Bundle.main.url(forResource: "bundle/main", withExtension: "jsbundle")
#endif

let rootView = RCTRootView(
    bundleURL: jsCodeLocation,
    moduleName: "MduRnApp",
    initialProperties: nil,
    launchOptions: nil
)
let vc = UIViewController()
vc.view = rootView
self.present(vc, animated: true, completion: nil)
```

在 RN 中 JS Bundle 的获取方式有两种：

1. Packager Server URL
1. Local Bundle Path

我们需要理解 `- (NSURL *)jsBundleURLForBundleRoot:(NSString *)bundleRoot fallbackResource:(NSString *)resourceName;` 这个方法

> Returns the jsBundleURL for a given bundle entrypoint and the fallback offline JS bundle if the packager is not running.

该方法首先会检查正在运行的打包服务器(Packager Server)是否开启并且能提供指定的 bundle，例如根据上文的 `index` 参数会访问 `http://localhost:8081/index.bundle?platform=ios` 地址，如果命中则返回相应的 bundle；否则会返回本地的 JS Bundle 文件，默认是 `main.jsbundle`，这里我们使用打包后的地址 `bundle/main`。

最后正式环境，需要通过 Apple 官方的 Bundle 访问本地资源。

## 热更新

JS 文件和对应的图片资源组成一个 RN 包。通常和对应平台的二进制包一起发布(ipa 或者 apk)。热更新可以让 RN 资源和服务器资源保持同步。为了提高健壮性，App 会保持上次更新的备份，当遇到热更新引起的 bug 时可以自动进行回滚。

所以热更新具备以下优点：

- 让 App 具备离线体验
- 和 Web 一样快速更新
- 自动回滚，保证 App 的可用性

目前 RN 热更新最成熟的方案出自微软的 [App Center](https://appcenter.ms/)。

### 配置

#### 安装插件(iOS)

添加 Code Push 依赖

```ruby
# CodePush plugin dependency
pod 'CodePush', :path => '../node_modules/react-native-code-push'
```

然后重新 `pod install` 安装依赖。

修改加载 RN 的逻辑：

```swift{1,8}
import CodePush // 引入依赖

/** 加载逻辑 **/
var jsCodeLocation: URL?
#if DEBUG
    jsCodeLocation = RCTBundleURLProvider.sharedSettings()?.jsBundleURL(forBundleRoot: "index", fallbackResource: "bundle/main")
#else
    jsCodeLocation = CodePush.bundleURL(forResource: "bundle/main", withExtension: "jsbundle")
#endif
```

如果需要进行包的自签名提高安全性，可以在 info.plist 追加配置信息：

```xml
<key>CodePushPublicKey</key>
<string>-----BEGIN PUBLIC KEY-----{public key}-----END PUBLIC KEY-----</string>
```

然后在打包的时候，提供 `privateKeyPath` 参数。

#### 打包发布

通过命令行进行打包发布操作：

```bash
code-push register 注册账号
code-push app add <appName> <os> react-native 创建 app
code-push deployment ls <appName> -k 查看部署环境
code-push release <appName> <bundleDict> <version> 发布
# 或者使用 release-react 发布
code-push release-react <appName> <os>
```

具体命令参考[官方文档](https://github.com/microsoft/code-push/blob/master/cli/README-cn.md)

#### 配置 deployment key

使用 `code-push deployment ls <appName> -k` 命令获取 deployment key。

具体 Xcode 配置过程参考[官方文档](https://github.com/microsoft/react-native-code-push/blob/master/docs/multi-deployment-testing-ios.md)

需要注意的是按照文档配置完后，需要重新 `pod install`，否则无法找到 staging 相关的配置文件(xxx-Staging-output-files.xcfilelist)。

#### 验证

改动 RN 代码，重新打包并上传服务器

```bash
code-push release-react <appName> <os>
```

查看线上状态

```bash
code-push deployment ls <appName>
```

添加调试代码

```swift{2}
super.viewDidLoad()
    RCTSetLogThreshold(RCTLogLevel.info)
}
```

运行代码查看是否热更新生效或者使用命令行查询

```bash
code-push deployment history <appName> Staging
```

## 结语

到这里关于 RN 的大部分核心的知识点就介绍完了，或许这不是跨平台的最终解决方案，但是对于以后跨平台开发一定是具有很大的启发意义。去年的 Flutter 和今年的 SwiftUI 多少都能看到 React 的思想和理念。

所以用什么框架并不重要，重要的是对于技术风向的嗅探能力，这种能力当然也是建立在了解各大框架的思想上。
