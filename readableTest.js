// 引入依赖
const path = require("path");
const ReadStream = require("./ReadStream");
 
let rs = new ReadStream(path.join(__dirname, './1.txt'), {
    encoding: "utf8",
    start: 0,
    highWaterMark: 3
});
 
rs.on("readable", () => {
    let r = true;
    while(r){
        r = rs.read(2);
        console.log('readed:', r);
        console.log('bufferd:', rs.len);
    }
});