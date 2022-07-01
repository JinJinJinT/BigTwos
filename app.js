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
const { debugPort } = require("process");

const INVALID_PARAM_ERROR = 400;
const SERVER_ERROR = 500;
const SERVER_ERROR_MSG = "An error occurred on the server :( Try again later.";

app.use(express.urlencoded({extended: true})); // built-in middleware
// for application/json
app.use(express.json()); // built-in middleware
// for multipart/form-data (required with FormData)
app.use(multer().none()); // requires the "multer" module

// app.get("/", (req,res)=>{
//   res.render('index.ejs')
// })

app.get("/login", (req, res) => {
    res.render('login.ejs');
})

app.post("/login", async (req, res) => {
  res.type("text");
  try {
    const db = await getDBConnection();
    let user = req.body.username;
    let query = `
        SELECT salt, hash, name
        FROM friends
        WHERE user = ?;
    `
    let verifyUser = await db.get(query, user);
    if (verifyUser == undefined) {
      res
          .status(INVALID_PARAM_ERROR)
          .send("The username or pasword is incorrect.");
    } else {
      let hash = crypto.createHash('sha256').update(req.body.password + verifyUser.salt).digest('base64');
  
      if (verifyUser.hash != hash) {
          res
            .status(INVALID_PARAM_ERROR)
            .send("The username or pasword is incorrect.");
      } else {
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
          res.send(`Welcome ${getId.name}! Your player id is: ${getId.pid.toString()}`);
      }
    }
    db.close();
  } catch (err) {
    console.log(err)
    res.status(SERVER_ERROR).send(SERVER_ERROR_MSG);
  }
})


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
app.use(express.static("static"));
const PORT = process.env.PORT || 8080;
app.listen(PORT);
