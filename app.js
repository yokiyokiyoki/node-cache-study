const http = require("http");
const path = require("path");
const url = require("url");
const fs = require("fs");
const mime = require("mime");
const crypto = require("crypto");
const zlib = require("zlib");

// 静态资源目录
const staticPath = "/public/";
// 定义Expires规则
const Expires = {
  fileMatch: /(gif|png|jpg|js|css)$/gi,
  maxAge: 60 * 60 * 24 * 365
};

const app = http.createServer((req, res) => {
  const pathname = url.parse(req.url).pathname;
  const extname = path.extname(req.url);
  const filePath = path.join(__dirname, staticPath, pathname);
  const isFile = fs.existsSync(filePath);

  // 文件不存在返回404
  if (!isFile) {
    send404(res, pathname);
    return;
  }

  fs.readFile(filePath, "binary", (err, file) => {
    if (err) {
      // 文件读取出错
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(err);
      return;
    } else {
      // Expires 和 Cache-Control 缓存

      if (extname.match(Expires.fileMatch)) {
        let expires = new Date();
        expires.setTime(expires.getTime() + Expires.maxAge * 1000);
        res.setHeader("Expires", expires.toUTCString());
        res.setHeader("Cache-Control", "max-age=" + Expires.maxAge);
      }

      // Last-Modified / If-Modified-Since缓存

      let stat = fs.statSync(filePath);
      let lastModified = stat.mtime.toUTCString();
      res.setHeader("Last-Modified", lastModified);

      if (
        req.headers["if-modified-since"] &&
        lastModified == req.headers["if-modified-since"]
      ) {
        res.writeHead(304, "Not Modified");
        res.end();
        return;
      }

      // Etag  Last-Modified 作为 hash 缓存
      let hashStr = fs.statSync(filePath).mtime.toUTCString();
      let hash = crypto
        .createHash("sha1")
        .update(hashStr)
        .digest("base64");
      if (req.headers["if-none-match"] == hash) {
        res.writeHead(304, "Not Modified");
        res.end();
        return;
      }
      res.setHeader("Etag", hash);

      // 正常写文件

      res.writeHead(200, { "Content-Type": mime.getType(extname) });
      res.write(file, "binary");
      res.end();
      return;
    }
  });

  // res.end(fs.existsSync(pathname));
});

app.listen(3002, () => {
  console.log("listening on port 3002");
});

function send404(res, pathname) {
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end(`${pathname} is not found !`);
}
