const EventEmitter = require("events");
class Readable extends EventEmitter {
    constructor(options = {}) {
        super();
        this.encoding = options.encoding || null; // 字符编码
        this.start = options.start || 0; // 读取文件的起始位置
        this.highWaterMark = options.highWaterMark || 64 * 1024; // 每次读取文件的字节数
 
        this.flowing = '';
        this.reading = false; // 如果正在读取，则不再读取
        this.hasReadableListening = false; // 是否有监听readable
        this.emitReadable = false; // 当缓存区的长度等于 0 的时候， 触发 readable
        this.arr = []; // 缓存区
        this.len = 0; // 缓存区的长度
        this.ended = false;

        if (options) {
            if (typeof options.read === 'function')
              this._read = options.read;
        
            if (typeof options.destroy === 'function')
              this._destroy = options.destroy;
        }
    }
};
Readable.prototype._destroy = function(err, cb) {
    cb(err);
};
Readable.prototype._read = function(n) {
    throw new Error('_read undefined');
};
Readable.prototype.read = function(n) {
    // 如果读取大于了 highWaterMark，重新计算 highWaterMark，并重新读取
    if (n > this.len) {
        // 计算新的 highWaterMark，方法摘自 NodeJS 源码
        this.highWaterMark = computeNewHighWaterMark(n);
    }
    
    if(this.flowing && this.len) {
        n = this.arr[0].length;
    }
    if (n > this.len && this.ended) {
        n = this.len;
    }

    // 将要返回的数据
    let buffer = null;
 
    // 如果读取的字节数大于 0 小于等于当前缓存 Buffer 的总长度
    if (n > 0 && n <= this.len) {
        // 则从缓存中取出
        buffer = Buffer.alloc(n);
 
        let current; // 存储每次从缓存区读出的第一个 Buffer
        let index = 0; // 每次读取缓存 Buffer 的索引
        let flag = true; // 是否结束整个 while 循环的标识
 
        // 开始读取
        while (flag && (current = this.arr.shift())) {
            for (let i = 0; i < current.length; i++) {
                // 将缓存中取到的 Buffer 的内容读到自己定义的 Buffer 中
                buffer[index++] = current[i];
 
                // 如果当前索引值已经等于了读取个数，结束 for 循环
                if (index === n) {
                    flag = false;
 
                    // 取出当前 Buffer 没有消耗的
                    let residue = current.slice(i + 1);
 
                    // 在读取后维护缓存的长度
                    this.len -= n;
 
                    // 如果 BUffer 真的有剩下的就给塞回到缓存中
                    if (residue.length) {
                        this.arr.unshift(residue);
                    }
 
                    break;
                }
            }
        }
    }
    if (this.hasReadableListening) {
        // 如果当前的缓存区大小小于 highWaterMark，就要读取
        if (!this.ended && this.len < this.highWaterMark) {
            this.emitReadable = true;
            // 如果不是正在读取才开始读取
            if (!this.reading) {
                this.reading = true;
                this._read(); // 正真读取的方法
            }
        }
    }
 
    // 将 buffer 转回创建可读流设置成的编码格式
    if (buffer) {
        buffer = this.encoding ? buffer.toString(this.encoding) : buffer;
    }
 
    return buffer;
};
// 暂停读取
ReadStream.prototype.pause = function() {
    this.flowing = false;
};

// 恢复读取
ReadStream.prototype.resume = function() {
    this.flowing = true;
    if (!this.isEnd) this.read();
};
// 连接可读流和可写流的方法 pipe
ReadStream.prototype.pipe = function(dest) {
    // 开始读取
    this.on("data", data => {
        // 如果超出可写流的 highWaterMark，暂停读取
        let flag = dest.write(data);
        if (!flag) this.pause();
    });
 
    dest.on("drain", () => {
        // 当可写流清空内存时恢复读取
        this.resume();
    });
 
    this.on("end", () => {
        // 在读取完毕后关闭文件
        this.destroy();
    });
};
function computeNewHighWaterMark(n) {
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
    return n;
}
Readable.prototype.on = function(ev, fn) {
    const res = EventEmitter.prototype.on.call(this, ev, fn);
  
    if (ev === 'data') {
        this.hasReadableListening = this.listenerCount('readable') > 0;
        if (this.flowing !== false){
            this.flowing = !this.hasReadableListening;
            this.read();
        }
    } else if (ev === 'readable') {
      if (!this.hasReadableListening) {
        this.flowing = false;
        this.hasReadableListening = true;
        this.read(0);
      }
    }
  
    return res;
};
Readable.prototype.off = function(ev, fn) {
    const res = EventEmitter.prototype.off.call(this, ev, fn);
    this.hasReadableListening = this.listenerCount('readable') > 0;
    if (ev === 'readable') {
        if (this.listenerCount('data') > 0) {
            this.flowing = true;
            this.read();
        } else if (!hasReadableListening) {
            this.flowing = null;
        }
    }
}
// 导出模块
module.exports = Readable;
