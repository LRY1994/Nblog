module.exports = {
    port:3000,
    session:{//session: express-session 的配置信息
        secret:'myblog',
        key:'myblog',
        maxAge:2592000000
    },
    mongodb:'mongodb://localhost:27017/myblog'
};