---
title: 前端 JS 中的二进制
date: '2019-07-10'
spoiler: 💾
---

## blob

Blob 对象是一个只读的 file-like 对象，用于维护二进制数据。ArrayBuffer 对象是一个字节数组，用于维护固定长度的二进制数据。通常 ArrayBuffer 需要借助 TypedArray 或 DataView 来读写二进制内容。

TypedArray 类包括以下几个：

- Int8Array：8位有符号整数，长度1个字节。
- Uint8Array：8位无符号整数，长度1个字节。
- Uint8ClampedArray：8位无符号整数，长度1个字节，溢出处理不同。
- Int16Array：16位有符号整数，长度2个字节。
- Uint16Array：16位无符号整数，长度2个字节。
- Int32Array：32位有符号整数，长度4个字节。
- Uint32Array：32位无符号整数，长度4个字节。
- Float32Array：32位浮点数，长度4个字节。
- Float64Array：64位浮点数，长度8个字节。

Blob 除了维护二进制数据之外，还提供 MIME 类型作为元数据。

Blob 和 ArrayBuffer 之间的相互转换：

```js
const text = '<div>Hello World</div>'
const blob = new Blob([text], { type: 'text/html' })
// const textReader = new FileReader()
// textReader.readAsText(blob)
// textReader.onload = function () {
//   console.log(textReader.result)
// }

const bufReader = new FileReader()
bufReader.readAsArrayBuffer(blob)
bufReader.onload = function () {
  console.log(new Uint8Array(bufReader.result))
  // [60, 100, 105, 118, 62, 72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 60, 47, 100, 105, 118, 62]
}

const u8Buf = new Uint8Array([60, 100, 105, 118, 62, 72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 60, 47, 100, 105, 118, 62])
const u8Blob = new Blob([u8Buf], { type: 'text/html' })

const textReader = new FileReader()
textReader.readAsText(u8Blob)
textReader.onload = function () {
  console.log(textReader.result) // <div>Hello World</div>
}
```

我们可以通过 `URL.createObjectURL` 方法为 Blob 创建一个资源定位符，格式为 `blob:${scheme}://${domain}/${hash_id}`。

例如：

```js
const url = URL.createObjectURL(blob)
// blob:https://xnix.me/7691ca26-96e7-47e1-bc92-ce5330c383e7
```

这个 Blob URL 的生命周期随着当前页面的刷新或者关闭而结束。或者通过 `URL.revokeObjectURL` 方法释放一个 Blob URL 资源。

## 实战案例

### 图片预览

```html
<input id="upload" type="file" />
<img id="preview" src="" alt="preview"/>
```

```js
const upload = document.querySelector('#upload')
const preview = document.querySelector('#preview')

upload.onchange = function() {
  const file = upload.files[0]
  const src = URL.createObjectURL(file)
  preview.src = src
}
```

同样这个方法也适用于上传视频的预览。

### 加载网络视频

```js
function ajax(url, cb) {
  const xhr = new XMLHttpRequest()
  xhr.open('get', url)
  xhr.responseType = 'blob' // ""|"text"-字符串 "blob"-Blob对象 "arraybuffer"-ArrayBuffer对象
  xhr.onload = function() {
    cb(xhr.response)
  }
  xhr.send()
}

ajax('video.mp4', function(res) {
  const src = URL.createObjectURL(res)
  video.src = src
})
```

更深入的可以了解下流处理技术。
