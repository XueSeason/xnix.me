---
title: React 沉思录
date: '2019-05-27'
spoiler: ⚛︎
---

打开 [React](https://reactjs.org/) 的官网，我们可以看到这样一句话：

> A JavaScript library for building user interfaces

React 是一个构建界面的库，即 UI 库。

然后列了三个 React 的特点：

1. Declarative 增强开发体验
1. Component-Based 构建复杂界面
1. Learn Once, Write Anywhere 跨平台

第一个特点声明式编程。相对传统的命令式编程告诉计算机如何去做（how），声明式编程是告诉计算机去做什么（what）。在使用 React 的感受就是，我们只需要描述这个 UI 是什么（what），而不需要知道如何（how）将 UI 渲染到屏幕上。这里的如何（how），指的是查找、操作 DOM 对象等操作；而什么（what），指通过 JSX 来描述 UI 结构。

第二个特点是组件化，通过函数或者 class 来编写组件，可以将复杂的 UI 拆分成多个组件来达到关注点分离的效果，同时被拆分的组件也可以被复用，提高代码的可维护性。React 组件符合函数式编程的思想。即 `f(data) -> UI`。f 是纯函数，即每次输入相同的 data 一定得到相同的 UI。同时启发于函数式编程的高阶函数概念，React 也引出了高阶组件的概念进行重用组件。即 `f(component) -> otherComponent`。

第三个特点就是所谓的跨平台，对应的就是官方的 React Native 框架。跨平台需要做到隐藏平台内部操作细节，统一平台差异。

这里为了实现声明式和跨平台的功能，React 内部必须存在一个机制，将声明式的代码映射到对应的 UI，同样需要一个中间层将 UI 渲染到各个平台。

这个内部机制就是 React 的杀手锏 - [React Element Tree](https://github.com/acdlite/react-fiber-architecture#reconciliation-versus-rendering)。在 Web 环境下，有一个更加熟知的称呼 Virtual DOM。

## Virtual DOM

React 通过 Virtual DOM 很好地隐藏了各个平台的操作细节，通过构造 Virtual DOM Tree 将 UI 输出到不同端。**使用 Virtual DOM 不代表没有操作原生 DOM，而是交给了框架层，业务代码几乎不操作原生 DOM。**

频繁地操作原生 DOM 会引发性能问题，React 需要做出一些权衡操作来达到性能的[可观性](https://www.zhihu.com/question/31809713/answer/53544875)，从而避免在开发过程中过多地关注性能优化的问题。

那么 React 是如何减少开发人员的性能上的思考负担？

在实际开发中，操作原生 DOM 是非常昂贵的。DOM 属于`渲染引擎`，在浏览器内核中和 `JS 引擎`是彼此独立的。一旦发生`跨界交流`，需要走桥接接口，这个操作是昂贵的。

![Bridge](./bridge.png)

修改 DOM 对象的属性的代价就更加昂贵，会导致渲染引擎进行重绘重排。

(JS 操作DOM) -> (Style 重新计算) -> (Layout 重排) -> (Paint 重绘) -> (Composite 合并多个渲染层显示到屏幕)

所以解决性能的关键点在于：

1. 减少过桥的次数
1. 减少修改 DOM 对象属性的次数

操作 Virtual DOM 是廉价的，因为只涉及到 JS 引擎，操作的 Virtual DOM 树也只是一个 plain object three。

所以我们将原生 DOM 的操作转移到 Virtual DOM Tree 上，从而减少不必要的过桥次数，最终通过 diff 得到的一个最小改动 `Patch` 作用于原生 DOM 上，从而减少修改 DOM 对象属性的次数。

## Reconciliation

传统的 diff 算法，对比任意两颗树，获得最小修改次数的复杂度位 O(n^3)，React 使用一种简单高效的方式将复杂度降低到 O(n)。这种方式称之为 reconciliation。

通常移动不同子树到其他不同层级的子节点上的情况十分罕见，React 进行了从上至下的同级比较的方式，在影响极小的性能代价下大大的降低来复杂度。

针对同级节点的比较，主要做了以下几个工作：

1. 不同类型的 React Element，不进行 diff，直接替换（div -> span、div -> Counter、Comment -> Counter）。
1. 相同类型的 Dom Element，修改对应节点的属性，然后递归子节点。
1. 相同类型的 Component Element，当前节点维持数据状态，递归更新子节点属性，调用子实例的 `componentWillReceiveProps()` 和 `componentWillUpdate()` 方法。
1. 使用 key 优化列表节点，启发 React 重用子节点。

上述 React Element = Dom Delement ∪ Component Element。

注意因为 Component Element 一定不是叶子节点，所以它每次改变都会引发一系列的子节点的重新生成。

React 提供了

```js
boolean shouldComponentUpdate(object nextProps, object nextState)
```

让开发人员介入进行性能优化。

你要确保 shouldComponentUpdate 内部的计算时间要小于组件 render 创建子节点的时间，否则会造成负优化。这里也就引出了 shouldComponentUpdate 计算优化的问题。推荐使用 [immutable-js](https://immutable-js.github.io/immutable-js/)。

## React Fiber

v16 之前的 React 存在以下几点问题：

1. 很小的数据改动都会生成完整的 Virtual DOM Tree，如果 Virtual DOM Tree 很庞大，反而影响性能。
1. 比较 Virtual DOM Tree 的过程是同步的，如果 Virtual DOM Tree 很庞大也会引发性能问题。

过去 render 是同步的，作用于大组件树会出现卡顿现象。v16 版本之后引入的 [React Fiber](https://www.youtube.com/watch?v=ZCuYPiUIONs) 就是为了改变这种情况，一套新的 reconciliation 算法。

Fiber 的概念由来是 Process 和 Thread 引出的，也就是比线程控制更细粒度的概念。

React Fiber 将一次更新任务，分为多个分片，一个分片结束后会释放主线程的控制权，即保证了渲染帧率，也保证了响应性。

通过 `requestIdleCallback` 在 CPU 空闲期执行低优先级的任务，`requestAnimationFrame` 在下一个动画帧执行优先级任务。

React Fiber 将更新分成两个阶段：`render/reconciliation` 和 `commit`。

- render/reconciliation 阶段，将更新任务分片执行，该阶段可以被中断。
- commit 阶段，同步一次性将更新同步到原生 DOM，不可被中断。

## React Fiber 引入对生命周期函数的影响

这里可能会出现低优先级任务执行会被高优先级任务中断，造成当前任务作废，需要重新开始。

在 render/reconciliation 阶段可能会`多次`调用以下生命周期函数：

- componentWillMount 存在副作用，可能会有影响
- componentWillReceiveProps 影响不大
- shouldComponentUpdate 纯函数无影响
- componentWillUpdate 存在副作用，可能会有影响

commit 阶段会和过去一样调用以下函数：

- componentDidMount
- componentDidUpdate
- componentWillUnmount

## 设计原则

React 对上层来说是可响应的（reactive），但是对于内部实现却是基于调度[（schedule）](https://reactjs.org/docs/design-principles.html#scheduling)。

- UI 的更新没必要所有都立即生效，否则会浪费资源，造成掉帧和降低用户体验。
- 刷新数据的频率比帧率快时，将多个更新整合成批处理。
- 快速响应高优先级的任务（用户点击按钮触发动画），中断低优先级任务（从网络加载数据渲染视图），避免掉帧。
- 使用基于 pull 方式而不是基于 push 方式更新。

虽然在 React Fiber 之前的版本，并没有做到这些，但是最初的设计原则就是`调度更新视图`（scheduling an update）。

在设计 React 之初，让 setState 是异步的原因就是：保留 React schedule 和对任务分片的能力。

这里讲的 push 的方式是由开发者决定具体逻辑，pull 的方式由框架决定具体逻辑，反转控制即 IoC。

## [Beyond React 16](https://reactjs.org/blog/2018/03/01/sneak-peek-beyond-react-16.html)

从两个出发点优化：

1. 计算能力 -> CPU -> Time slicing
1. 网络速度 -> IO -> Suspense

### Time slicing

- React 不会在渲染过程中阻塞线程。
- 当设备足够快的时候，感官上是同步的。
- 当设备不够快的时候，感官上是可响应的。
- 只有最后的渲染状态才被展示。

### Suspense

挂起渲染，等待异步数据加载完毕，再渲染。

- 在得到数据前，阻止状态更新。
- 在快网络下，当渲染树进入 ready 状态后开始渲染。
- 在慢网络下，精确地控制加载状态。
- 同时存在高级和低级的 API。

理想的情况是点击之后停留在当前页，如果接口响应很快，那么渲染是几乎瞬间完成的，没有白屏；如果接口响应很慢，也只会在当前页或者说列表项的里面出现 Spinner，在这个期间用户还可以点击其它地方，浏览其它内容。类似于 Apple 的 setting 页面。

合并状态的流程，类比 Git 的 rebase 操作。

## 其他知识点

### requestAnimationFrame

RAF 根据 MDN 的描述做了这么一件事，在下一次`重绘前`，`请求浏览器`调用`指定的函数`来`更新动画`。

通常 requestAnimationFrame 会在大约 16.6ms 后执行，但是当 tab 或者 `iframe` 进入后台会被暂停（节省性能和电量）。16.7ms 主要是为了保存 60Hz 的刷新率。

requestAnimationFrame 的回调函数接受一个 [DOMHighResTimeStamp](https://developer.mozilla.org/en-US/docs/Web/API/DOMHighResTimeStamp) 参数，表示当前回调执行的时间点（单位ms）。

### React Hint

[React hint](https://github.com/oliviertassinari/react-swipeable-views/issues/453#issuecomment-417939459)，这里可以称为 `pre-rendering`，也就是预渲染。
