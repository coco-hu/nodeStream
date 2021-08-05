// 引入依赖模块
const EventEmitter = require("events");
 
// 创建 WriteStream 类
class WriteStream extends EventEmitter {
    constructor(options = {}) {
        super();
        // 创建可写流参数传入的属性
        this.encoding = options.encoding || "utf8"; // 字符编码
        this.highWaterMark = options.highWaterMark || 16 * 1024; // 对比写入字节数的标识
 
        this.writing = false; // 是否正在写入
        this.needDrain = false; // 是否需要触发 drain 事件
        this.buffer = []; // 缓存，正在写入就存入缓存中
        this.len = 0; // 当前缓存的个数
 
        if (typeof options.write === 'function')
        this._write = options.write;
  
    }
}
// 写入文件的方法，只要逻辑为写入前的处理
WriteStream.prototype.write = function(
    chunk,
    encoding = this.encoding,
    callback
) {
    // 为了方便操作将要写入的数据转换成 Buffer
    chunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
 
    // 维护缓存的长度
    this.len += chunk.lenth;
 
    // 维护是否触发 drain 事件的标识
    this.needDrain = this.highWaterMark <= this.len;
 
    // 如果正在写入
    if (this.writing) {
        this.buffer.push({
            chunk,
            encoding,
            callback
        });
    } else {
        // 更改标识为正在写入，再次写入的时候走缓存
        this.writing = true;
        // 如果已经写入清空缓存区的内容
        this._write(chunk, encoding, () => this.clearBuffer());
    }
 
    return !this.needDrain;
};

// 清空缓存方法
WriteStream.prototype.clearBuffer = function() {
    // 先写入的在数组前面，从前面取出缓存中的 Buffer
    let buf = this.buffer.shift();
 
    // 如果存在 buf，证明缓存还有 Buffer 需要写入
    if (buf) {
        // 递归 _write 按照编码将数据写入文件
        this._write(buf.chunk, buf.encoding, () => this.clearBuffer);
    } else {
        // 如果没有 buf，说明缓存内的内容已经完全写入文件并清空，需要触发 drain 事件
        this.emit("drain");
 
        // 更改正在写入状态
        this.writing = false;
 
        // 更改是否需要触发 drain 事件状态
        this.needDrain = false;
    }
};

// 导出模块 
module.exports = WriteStream;
