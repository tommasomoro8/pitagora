module.exports = (development) => {
    if (development) return (req, res, next) => {
        next();
    }

    else return (req, res, next) => {
        if (!req.secure)
            return res.redirect("https://" + req.headers.host + req.url);
 
        next();
    }
}