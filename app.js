/*
 * Big Twos API
 * June 30, 2022
 * This file contains the endpoints for the Big Twos API. They query the database
 * depending on the GET/POST endpoints the user provides requests to. It also handles
 * errors for both invalid user input and internal server errors.
 */
"use strict";
const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");
const express = require("express");
const app = express();
const multer = require("multer");
const crypto = require("crypto");

const path = require("path");
const fs = require("fs");
const os = require("os");

const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const auth = require("./auth");

const INVALID_PARAM_ERROR = 400;
const INVALID_TOKEN_ERROR = 403;
const SERVER_ERROR = 500;
const SERVER_ERROR_MSG = "An error occurred on the server :( Try again later.";

// Set up Global configuration access
dotenv.config({override: true});

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: true})); // built-in middleware
// for application/json
app.use(express.json()); // built-in middleware
// for multipart/form-data (required with FormData)
app.use(multer().none()); // requires the "multer" module

app.get("/login", auth, (req, res) => {
  res.render('login.ejs')
})

app.post("/login", async (req, res) => {
  try {
    const db = await getDBConnection();
    let user = req.body.username;
    let query = `
        SELECT salt, hash, name, token
        FROM friends
        WHERE user = ?;
    `
    let verifyUser = await db.get(query, user);
    if (verifyUser == undefined) {
      res.status(INVALID_PARAM_ERROR);
      res.render('login', {message: "The username or pasword is incorrect."});
      // req.app.locals.message = "The username or pasword is incorrect.";
    } else {
      let hash = crypto.createHash('sha256').update(req.body.password + verifyUser.salt).digest('base64');
  
      if (verifyUser.hash != hash) {
        res.status(INVALID_PARAM_ERROR);
        res.render('login', {message: "The username or pasword is incorrect."});
      } else {
          const token = jwt.sign(
            { user_id: user },
            verifyUser.token,
            {
              expiresIn: "1h",
            }
          );
         
          let query = `
            SELECT user
            FROM players
            WHERE name = ?;
          `
          let checkIfLoggedIn = await db.all(query, verifyUser.name);
          
          // if a single entry of the same name is the same user name then they are already logged in
          if (!checkIfLoggedIn.some(item=>item.user == user)) {

            // set pid
            let playerId = parseInt(Math.random() * (9999999999 - 9000000000) + 9000000000);
            query = `
                SELECT pid
                FROM players
                WHERE pid = ?;
            `;
            let verifyId = await db.get(query, playerId);
            while (verifyId != undefined && verifyId.length != 0) {
                playerId = parseInt(Math.random() * (9999999999 - 9000000000) + 9000000000);
                verifyId = await db.get(query, playerId);
            }
            
            query = `
                INSERT INTO players (name, pid, user)
                VALUES (?, ?, ?);
            `;
    
            await db.run(query, [verifyUser.name, playerId, user])
          }
        
          // no matter what, fetch the pid (guranteed to exist)
          query = `
            SELECT pid, name
            FROM players
            WHERE user = ?;
          `
          let getId = await db.get(query, user);
          
          // setEnvValue("JWT_Token",token)
          // setEnvValue("PID",getId.pid.toString())

          process.env.JWT_Token = token;
          process.env.PID = getId.pid.toString();
          res.redirect("/");
          
          // res.render('login.ejs', {
          //   name: getId.name,
          //   pid: getId.pid.toString(),
          //   token: token
          // })
          // res.send(`Welcome ${getId.name}! Your player id is: ${getId.pid.toString()}\nYour token is: ${token}`);
      }
    }
    db.close();
  } catch (err) {
    console.log(err)
    res.status(SERVER_ERROR);
    res.render('login.ejs', {message: SERVER_ERROR_MSG});
  }
})

function setEnvValue(key, value) {
  // read file from hdd & split if from a linebreak to a array
  const ENV_VARS = fs.readFileSync("./.env", "utf8").split(os.EOL);

  // find the env we want based on the key
  const target = ENV_VARS.indexOf(ENV_VARS.find((line) => {
      return line.match(new RegExp(key));
  }));

  // replace the key/value with the new value
  ENV_VARS.splice(target, 1, `${key}=${value}`);

  // write everything back to the file system
  fs.writeFileSync("./.env", ENV_VARS.join(os.EOL));
}

/**
 * Establishes and returns a connection to the BigTwos database.
 * @returns {sqlite3.Database} A connection to the big2.db sqlite3 database.
 */
async function getDBConnection() {
  const db = await sqlite.open({
    filename: "big2.db",
    driver: sqlite3.Database
  });
  return db;
}

// specify root directory for static files
app.use('/', [auth, express.static(path.join(__dirname, "/static"))]);
const PORT = process.env.PORT || 8080;
app.listen(PORT);
