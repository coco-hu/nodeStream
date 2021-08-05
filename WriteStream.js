// 引入依赖模块
const fs = require("fs");
const Writeable = require("./Writeable");
 
// 创建 WriteStream 类
class WriteStream extends Writeable {
    constructor(path, options = {}) {
        super(options);
        // 创建可写流参数传入的属性
        this.path = path; // 写入文件的路径
        this.flags = options.flags || "w"; // 文件标识位
        this.fd = options.fd || null; // 文件描述符
        this.mode = options.mode || 0o666; // 权限位
        this.autoClose = options.autoClose || true; // 是否自动关闭
        this.start = options.start || 0; // 写入文件的起始位置
        this.pos = this.start; // 下次写入文件的位置（变化的）
 
        // 创建可写流要打开文件
        this.open();
    }
}
// 打开文件
WriteStream.prototype.open = function() {
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
WriteStream.prototype.detroy = function() {
    if (typeof this.fd === "number") {
        fs.close(fd, () => {
            this.emit("close");
        });
        return;
    }
    this.emit("close");
};

// 真正的写入文件操作的方法
WriteStream.prototype._write = function(chunk, encoding, callback) {
    // 由于 open 异步执行，write 是在创建实例时同步执行
    // write 执行可能早于 open，此时不存在文件描述符
    if (typeof this.fd !== "number") {
        // 因为 open 用 emit 触发了 open 事件，所以在这是重新执行 write
        return this.once("open", () => this._write(chunk, encoding, callback));
    }
 
    // 读取文件
    fs.write(this.fd, chunk, 0, chunk.length, this.pos, (err, bytesWritten) => {
        // 维护下次写入的位置和缓存区 Buffer 的总字节数
        this.pos += bytesWritten;
        this.len -= bytesWritten;
        callback();
    });
};

// 导出模块 
module.exports = WriteStream;
