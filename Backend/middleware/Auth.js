const dotenv = require("dotenv").config();
const jwt = require("jsonwebtoken");

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY; // get secret key from .env file
const TOKEN_HEADER_KEY = process.env.TOKEN_HEADER_KEY; // get header key for token from .env file

module.exports = function auth(req, res, next) {
    try 
    {
        const token = req.header(TOKEN_HEADER_KEY); // get token from request header using header key from .env file
        
        const verified = jwt.verify(token, JWT_SECRET_KEY); // verify authent
        if(verified)
        {
            console.log("SUCCESSFUL ");
            next(); // call next middleware so code doesn't hang after verifying jwt token
        }
    }
    catch(error)
    {
        return res.status(401).json({message: "Access Denied: Invalid or missing token"});
    }
}