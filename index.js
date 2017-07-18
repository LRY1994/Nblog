var path = require('path');
var express = require('express');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);//将 session 存储于 mongodb，结合 express-session 使用
var flash = require('connect-flash');//页面通知提示的中间件，基于 session 实现
/** config-lite 会根据环境变量（NODE_ENV,test,production,developement）的不同从当前执行进程目录下的 config 目录加载不同的配置文件。
 * 如果不设置 NODE_ENV，则读取默认的 default 配置文件，
 * 如果设置了 NODE_ENV，则会合并指定的配置文件和 default 配置文件作为配置
 * 如果程序以 NODE_ENV=test node app 启动，则 config-lite 会依次降级查找 
 * config/test.js、config/test.json、config/test.node、config/test.yml、config/test.yaml 并合并 default 配置;*/
var config = require('config-lite')(__dirname);//读取配置文件
var routes = require('./routes');
var pkg = require('./package');
var winston = require('winston');
var expressWinston = require('express-winston');
var app = express();

// 设置模板目录
app.set('views', path.join(__dirname, 'views'));
// 设置模板引擎为 ejs  npm i ejs --save
app.set('view engine', 'ejs');

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));

// session 中间件
app.use(session({
  name: config.session.key,// 设置 cookie 中保存 session id 的字段名称
  secret: config.session.secret,// 通过设置 secret 来计算 hash 值并放在 cookie 中，使产生的 signedCookie 防篡改
  resave: true,// 强制更新 session
  saveUninitialized: false,// 设置为 false，强制创建一个 session，即使用户未登录
  cookie: {
    maxAge: config.session.maxAge// 过期时间，过期后 cookie 中的 session id 自动删除
  },
  store: new MongoStore({// 将 session 存储到 mongodb
    url: config.mongodb// mongodb 地址
  })
}));

// flash 中间件，用来显示通知
app.use(flash());

// 处理表单及文件上传的中间件
app.use(require('express-formidable')({
  uploadDir: path.join(__dirname, 'public/img'),// 上传文件目录
  keepExtensions: true// 保留后缀
}));

/*
Once set, the value of app.locals properties persist throughout the life of the application, 
in contrast with 
res.locals properties that are valid only for the lifetime of the request.
*/
// 设置模板全局常量
app.locals.blog = {
  title: pkg.name,
  description: pkg.description
};

// 添加模板必需的三个变量
app.use(function (req, res, next) {
  res.locals.user = req.session.user;
  res.locals.success = req.flash('success').toString();
  res.locals.error = req.flash('error').toString();
  next();
});

/*
需要注意的是：记录正常请求日志的中间件要放到 routes(app) 之前，
记录错误请求日志的中间件要放到 routes(app) 之后。
*/ 

// 正常请求的日志
app.use(expressWinston.logger({
  transports: [
    new (winston.transports.Console)({
      json: true,
      colorize: true
    }),
    new winston.transports.File({
      filename: 'logs/success.log'
    })
  ]
}));
// 路由
routes(app);
// 错误请求的日志
app.use(expressWinston.errorLogger({
  transports: [
    new winston.transports.Console({
      json: true,
      colorize: true
    }),
    new winston.transports.File({
      filename: 'logs/error.log'
    })
  ]
}));

// error page
app.use(function (err, req, res, next) {
  res.render('error', {
    error: err
  });
});


// 监听端口，启动程序
app.listen(config.port, function () {
  console.log(`${pkg.name} listening on port ${config.port}`);
});