const querystring = require("querystring")

module.exports = (req, res, next) => {
    if (req.protocol + '://' + req.get('host') + req.originalUrl === process.env.URL || req.path[req.path.length-1] !== "/")
        return next()

    if (JSON.stringify(req.query) === "{}") {
        return res.redirect(req.protocol + '://' + req.get('host') + (req.path).slice(0, -1))
    } else {
        if (req.path === "/")
            return next()
            
        return res.redirect(req.protocol + '://' + req.get('host') + (req.path).slice(0, -1) + "?" + querystring.stringify(req.query))
    }
}