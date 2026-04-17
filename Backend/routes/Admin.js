const express = require("express");
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require("dotenv").config();

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY; // get secret key from .env file
const TOKEN_HEADER_KEY = process.env.TOKEN_HEADER_KEY; // get header key for token from .env file

const connPool = require("../config/DBConnection"); // get database connection pool

router.use(express.json()); // use json middleware to parse json request bodies

// test username/password: admin2@weha.com:AdminTestingWEHA2026123@

// when user is authenticated, generate a JWT token and send it back to the client
router.post("/login", async(req, res) => {
    const {username, password} = req.body;
    if (!username || !password) 
    {
        return res.status(400).json({message: "Username and password are required"});  
    }

    try 
    {
        // select the password hash from the database for the username provided by the client
        const queryUserSql = 'SELECT  `AdminID`,`PasswordHash` FROM admin WHERE `Email` = ?;';
        const getCredsResult = await connPool.execute(queryUserSql, [username]);

        // check if select query returned a result
        if(getCredsResult[0].length != 0)
        {
            // if passwordHash found for user exists in database, compare the password hash with the password provided by the client
            
            // check if password is correct, if so then generate JWT token
            if (await bcrypt.compare(password, getCredsResult[0][0].PasswordHash)) {
                let data = {
                    time: Date(), // add current time to token data for tracking session and user activity
                    adminId: getCredsResult[0][0].AdminID, // add admin id to token data
                };
                
                // set up token with 1 hour expiration time and data payload containing admin id and current time                    
                const token = jwt.sign(data, JWT_SECRET_KEY, { expiresIn: '1h' }); 
                // return token to client, signifying successful login and allowing client to use token for authentication on future requests to protected routes in the server
                return res.status(200).json({message: "Login successful", token: token}); 
                
            }
            // else the password is incorrect and return error message to client
            else 
            {
                return res.status(401).json({message: "Invalid username or password"});
            }
        }
        else 
        {
            return res.status(401).json({message: "Invalid username or password"});
        }

    }
    catch (error) 
    {
        console.error("Error during login:", error);
        return res.status(500).json({message: "ERROR: " + error.message});
    }   
});

router.post("/logout", async(req, res) => {
    return res.status(200).json({message: "User Logged Out"});
});

module.exports = router; // export login and logout