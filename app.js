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
const cookieParser = require("cookie-parser");
const app = express();

const multer = require("multer");
const crypto = require("crypto");

const path = require("path");
const fs = require("fs");
const os = require("os");

const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const auth = require("./auth");

const INVALID_PARAM_ERROR = 400;
const INVALID_STATE_ERROR = 401;
const SERVER_ERROR = 500;
const SERVER_ERROR_MSG = "An error occurred on the server :( Try again later.";

// Set up Global configuration access
dotenv.config();

app.set("view engine", "ejs");

app.use(cookieParser());
app.use(express.urlencoded({ extended: true })); // built-in middleware
// for application/json
app.use(express.json()); // built-in middleware
// for multipart/form-data (required with FormData)
app.use(multer().none()); // requires the "multer" module

/** An instance of the game object. Lifecycle (BigTwos.js)
 * @type {BigTwos}
 */
let game;
const BigTwos = require("./BigTwos.js");

/* +-----------------------_____ LOGIC-----------------------+ */

// startGame endpoint to initiate game
// init linked list structure for each player db.all
/* Player {
 *  List<cards> cards
 *  Player next
 *  
 *  makeMove(List<cards>) subtract cards with passed in cards  
 * }
 *
 */
// wait for post requests from each player to: move(cards[])

/**
 * Endpoint: /startGame
 * Type: GET
 * Return format: text
 * Authorization from log-in required.
 * Starts a new game of BigTwos with the currently logged-in and ready players.
 */
app.get("/startGame", auth, async (req, res) => {
  try {
    if (!game) {
      const db = await getDBConnection();
      let pids = await db.all(`
      SELECT pid
        FROM players;
      `);
      pids = pids.map(row=>row.pid);
      game = new BigTwos(pids);
      res.send("Started new game of BigTwos...");
      console.log(game.toString());
    } else {
      res.send("A game already exists...")
    }
  } catch (err) {
    console.log(err);
    res.status(SERVER_ERROR).send(SERVER_ERROR_MSG);
  }
});

/**
 * Endpoint: /currentPlayer
 * Type: GET
 * Return format: text
 * Authorization from log-in required.
 * Returns the pid of the authorized player making the request.
 */
app.get("/currentPlayer", auth, (req,res) => {
  if (!game) {
    res.status(INVALID_STATE_ERROR).send("Invalid request. There is no game in progress.");
  } else {
    res.send(game.currentPlayer);
  }
});

/**
 * Endpoint: /currentHand
 * Type: GET
 * Return format: JSON
 * Authorization from log-in required.
 * Returns a JSON of the set of cards for the authorized player making the request.
 */
app.get("/currentHand", auth, (req, res)=> {
  if (!game) {
    res.status(INVALID_STATE_ERROR).send("Invalid request. There is no game in progress.");
  } else {
    if (!res.locals.pid) {
      res.status(SERVER_ERROR).send("PID not found");
    } else {
      /**@type {Set<number>}*/
      let deckSet = game.playerCards(res.locals.pid);
      if (!deckSet) {
          res.status(SERVER_ERROR).send("Hand was undefined. Internal PID mismatch.");
        } else {
          res.type("json");
          res.send(JSON.stringify([...deckSet]));
      }
    }
  }
});

app.get("/login", auth, (req, res) => {
  res.render("login.ejs");
});

app.post("/login", async (req, res) => {
  try {
    const db = await getDBConnection();
    let user = req.body.username;
    let query = `
        SELECT salt, hash, name
        FROM friends
        WHERE user = ?;
    `;
    let verifyUser = await db.get(query, user);
    if (verifyUser == undefined) {
      res.status(INVALID_PARAM_ERROR);
      res.render("login", { message: "The username or pasword is incorrect." });
      // req.app.locals.message = "The username or pasword is incorrect.";
    } else {
      let hash = crypto
        .createHash("sha256")
        .update(req.body.password + verifyUser.salt)
        .digest("base64");

      if (verifyUser.hash != hash) {
        res.status(INVALID_PARAM_ERROR);
        res.render("login", {
          message: "The username or pasword is incorrect."
        });
      } else {
        const token = jwt.sign({ user_id: user }, process.env.TOKEN_KEY, {
          expiresIn: "1h" // make 30 min
        });

        let query = `
            SELECT user
            FROM players
            WHERE name = ?;
          `;
        let checkIfLoggedIn = await db.all(query, verifyUser.name);

        // if a single entry of the same name is the same user name then they are already logged in
        if (!checkIfLoggedIn.some(item => item.user == user)) {
          // set pid
          let playerId = parseInt(
            Math.random() * (9999999999 - 9000000000) + 9000000000
          );
          query = `
                SELECT pid
                FROM players
                WHERE pid = ?;
            `;
          let verifyId = await db.get(query, playerId);
          while (verifyId != undefined && verifyId.length != 0) {
            playerId = parseInt(
              Math.random() * (9999999999 - 9000000000) + 9000000000
            );
            verifyId = await db.get(query, playerId);
          }

          query = `
                INSERT INTO players (name, pid, user, token)
                VALUES (?, ?, ?, ?);
            `;

          await db.run(query, [verifyUser.name, playerId, user, token]);
        }

        res.cookie("access_token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
        })
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
    console.log(err);
    res.status(SERVER_ERROR);
    res.render("login.ejs", { message: SERVER_ERROR_MSG });
  }
});


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
app.use("/", [auth, express.static(path.join(__dirname, "/static"))]);
const PORT = process.env.PORT || 8080;
app.listen(PORT);
