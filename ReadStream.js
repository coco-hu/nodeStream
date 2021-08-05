const fs = require("fs");
const Readable = require("./Readable");
class ReadStream extends Readable {
    constructor(path, options = {}) {
        super(options);
        this.path = path; // 读取文件的路径
        this.flags = options.flags || "r"; // 文件标识位
        this.fd = options.fd || null; // 文件描述符
        this.mode = options.mode || 0o666; // 权限位
        this.autoClose = options.autoClose || true; // 是否自动关闭
        this.start = options.start || 0; // 读取文件的起始位置
        this.end = options.end || null; // 读取文件的结束位置（包含）
        this.pos = this.start; // 下次读取文件的位置（变化的）

        // 创建可读流要打开文件
        this.open();
    }
}
// 打开文件
ReadStream.prototype.open = function() {
    fs.open(this.path, this.flags, this.mode, (err, fd) => {
        if (err) {
            this.emit("error", err);
            if (this.autoClose) {
                this.destroy();
                return;
            }
        }
        this.fd = fd;
        this.emit("open");
    });
};
// 关闭文件
ReadStream.prototype.detroy = function() {
    if (typeof this.fd === "number") {
        fs.close(this.fd, () => {
            this.emit("close");
        });
        return;
    }
    this.emit("close");
};
ReadStream.prototype._read = function() {
    if (typeof this.fd !== "number") {
        return this.once("open", () => this._read());
    }
   // 如过设置了结束位置，读到结束为止就不能再读了
    // 如果最后一次读取真实读取数应该小于 highWaterMark
    // 所以每次读取的字节数应该和 highWaterMark 取最小值
    let howMuchToRead = this.end
        ? Math.min(this.highWaterMark, this.end - this.pos + 1)
        : this.highWaterMark;
    let buffer = Buffer.alloc(this.highWaterMark);
    
    // 读取文件
    fs.read(
        this.fd,
        buffer,
        0,
        howMuchToRead,
        this.pos,
        (err, bytesRead) => {
            if (bytesRead > 0) {
                this.arr.push(buffer); // 缓存
                this.len += bytesRead; // 维护缓存区长度
                this.pos += bytesRead; // 维护下一次读取位置
                this.reading = false; // 读取完毕
 
                // 触发 readable 事件
                if (this.emitReadable) {
                    // 触发后更改触发状态为 false
                    this.emitReadable = false;
                    this.emit("readable");
                }
                // 根据编码处理 data 回调返回的数据
                const realBuf = this.encoding
                    ? buffer.toString(this.encoding)
                    : buffer;
 
                // 触发 data 事件并传递数据
                this.emit("data", realBuf);
 
                // 递归读取
                if (this.flowing) {
                    this.read();
                }
            } else {
                // 如果读完触发结束事件
                this.emit("end");
                this.ended = true;
                this.detroy(); // 关闭文件
            }
        }
    );
};

// 导出模块
module.exports = ReadStream;