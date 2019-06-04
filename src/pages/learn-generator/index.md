---
title: "Generator 之旅"
date: '2018-05-15'
spoiler: 🖇
---

最近在写一个 egg 的项目，用到了 ali-oss 这个库，发现是通过 generator 来解决异步。自从 Node v7.6.0 开始支持 async/await 特性，大部分场景都没有再接触 generator。突然对这个在 ES6 版本引入的语法变得陌生，决定好好总结下。

## 迭代器

JS 中有四种表示集合的数据结构：Array，Object，Set，Map。如果我们要遍历不同类的数据，传统的面相对象方式会定义一个接口。

迭代器（Iterator）就是一个完成遍历操作的接口。主要被 ES6 的 for…of 使用，该循环语句会调用对象的迭代器接口的实现方法。实现迭代器接口的对象，我们称之为可迭代（iterable）。

迭代器接口定义了返回值为`迭代器对象`的方法。迭代器对象存在一个 next 方法，当这个方法被调用时需要返回形如: **{value:1,done:false}** 的结果。value 代表值，done 代表遍历是否结束。

伪代码如下：

```js
const iterableObj: Iterable = {
  [Symbol.iterator]: () => Iterator
}

const it: Iterator = {
  next: () => { value: any, done: boolean }
}
```

上面提到的 Array，Set 和 Map默认实现了迭代器接口。我们通过Symbol.iterator属性来实现迭代器接口：

```js
const arr = [1, 2, 3]
const it = arr[Symbol.iterator]()
it.next() // { value: 1,done: false }
it.next() // { value: 2,done: false }
it.next() // { value: 3,done: false }
it.next() // { value: undefined,done: true }
```

除了 for…of 语句，还有以下调用迭代器方法的情况：

1. 解构赋值 const [a, b] = [1, 2]
1. 扩展运算符 …[1, 2, 3]
1. yield* 后面跟的是一个可遍历的结构，它会调用该结构的遍历器接口
1. Array.from
1. Promise.all 和 Promise.race

迭代器除了一个必须实现的 next 方法，还可以有 return 和 throw 方法，return 会在 for…of 中触发 break 或者 continue 时调用，通常用于清理释放资源。

## Generator

调用 Generator 会返回一个迭代器对象，该对象维护 Generator 函数内部的状态。可以将 Generator 理解为生成一系列的值（虽然这些值是通过惰性求值得到的），然后通过返回的迭代器对象进行遍历。而 yield 用于标记每次调用 next 完成后的暂停点。next 方法可以带一个参数，该参数就会被当作上一个 yield 表达式的返回值。这个机制可以在 Generator 函数运行的不同阶段，从外部向内部注入不同的值，从而调整函数行为。

Generator 本质上就是一个迭代器生成函数，所以可以直接赋值给对象的 Symbol.iterator 属性。Generator 返回的迭代器实现了 throw 方法，可以在函数体外抛出的错误，先被 Generator 函数体内捕获。同时也实现了 return 方法，可以终结整个迭代器。

next、throw 和 return 三者共同点

```js
const g = function* (x, y) {
  let result = yield x + y;
  return result;
};

const gen = g(1, 2);
gen.next(); // Object {value: 3, done: false}

gen.next(1); // Object {value: 1, done: true}
// 相当于将 let result = yield x + y
// 替换成 let result = 1;

gen.throw(new Error('出错了')); // Uncaught Error: 出错了
// 相当于将 let result = yield x + y
// 替换成 let result = throw(new Error('出错了'));

gen.return(2); // Object {value: 2, done: true}
// 相当于将 let result = yield x + y
// 替换成 let result = return 2;
```

## yield*

先看一个例子：

```js
function* concat (iter1, iter2) {
  yield* iter1
  yield* iter2
}

// 等同于
function* concat (iter1, iter2) {
  for (const value of iter1) {
    yield value
  }
  for (const value of iter2) {
    yield value
  }
}
```

任何数据结构只要有 Iterator 接口，就可以被yield*遍历。

yield* 命令可以很方便地取出嵌套数组的所有成员。

```js
function* iterTree (tree) {
  if (Array.isArray(tree)) {
    for(let i = 0; i < tree.length; i++) {
      yield* iterTree(tree[i])
    }
  } else {
    yield tree
  }
}

const tree = [ 'a', ['b', 'c'], ['d', 'e'] ]

for(const x of iterTree(tree)) {
  console.log(x)
}
// a
// b
// c
// d
// e
```

## 协程

### 协程和线程的区别

协程和线程很相似，都有自己的执行上下文、可以共享全局变量。但是同一时间可以有多个线程处于运行状态，而运行的协程只能有一个，其他协程都处于暂停状态。此外，线程是抢先式的，协程是合作式的，执行权由协程自己分配。

Generator 函数是 ES6 对协程的实现。Generator 执行的上下文遇到 yield 会暂时退出堆栈，等到执行 next 时，这个上下文会重新加入调用栈，继续恢复之前的状态。

### CO

这里我们就不得不看看大神 TJ 的 co 库，可以看看它的源码，感受下 Generator 的强大。这里从早期的 1.0.0 版本入手。

```js
exports.wrap = function (fn, ctx) {
  return function () {
    var args = [].slice.call(arguments)
    return function (done) {
      args.push(done)
      fn.apply(ctx || this, args)
    }
  }
}
```

该工具方法其实是一个柯里化的过程，主要将接受回调的异步方法，封装成 thunk。

形式转换如下：

```js
fs.readFile(path, encoding, function(err, result) {
})
// =>
fs.readFile(path, encoding)(function(err, result) {
})
```

下面是是早期 co 的核心代码：

```js
function co (fn) {
  var gen = fn()
  var done

  function next (err, res) {
    var ret

    // error
    if (err) {
      try {
        ret = gen.throw(err)
      } catch (e) {
        if (!done) throw e
        return done(e)
      }
    }

    // ok
    if (!err) {
      try {
        // 这里可以看作 gen.next(res)
        ret = gen.send(res)
      } catch (e) {
        if (!done) throw e
        return done(e)
      }
    }

    // done
    if (ret.done) {
      if (done) done(null, ret.value)
      return
    }

    // non-function
    if (typeof ret.value !=== 'function') {
      return next(new Error('yielded a non-function'))
    }

    // thunk
    try {
      // 这是最核心的部分，相当于 fs.readFile(path, encoding)(next)
      ret.value(next)
    } catch (e) {
      process.nextTick(function () {
        next(e)
      })
    }
  }

  process.nextTick(next)

  return function (fn) {
    done = fn
  }
}
```

Generator 就是一个异步操作的容器。它的自动执行需要一种机制，当异步操作有了结果，能够自动交回执行权。

两种方法可以做到这一点：

1. 回调函数。将异步操作包装成 Thunk 函数，在回调函数里面交回执行权。
1. Promise 对象。将异步操作包装成 Promise 对象，用then方法交回执行权。

参考资料：

1. [Generator 函数的语法](http://es6.ruanyifeng.com/#docs/generator#Generator-prototype-throw)
1. [co 源代码](https://github.com/tj/co)
