/*
 * Big Twos API
 * Instructor: Tal Wolman
 * Section AG (Donovan and Austin)
 * June 27 2022
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

const INVALID_PARAM_ERROR = 400;
const SERVER_ERROR = 500;
const SERVER_ERROR_MSG = "An error occurred on the server. Try again later.";

// prettier-ignore
app.use(express.urlencoded({extended: true})); // built-in middleware
// for application/json
app.use(express.json()); // built-in middleware
// for multipart/form-data (required with FormData)
app.use(multer().none()); // requires the "multer" module

app.get("/login", (req, res) => {
    res.render('login.ejs');
})

/**
 * Endpoint: /yipper/yips
 * Type: GET
 * Return format: JSON
 * Query parameters: search - optional parameter to specify a term to search for.
 * Responds with all id's that have the search term in anywhere in the yip text. If no search term
 * is specified, it responds with the id, name, yip, hashtag, likes, and date from the yips table
 * in a JSON format in the order of descending date.
 */
app.get("/yipper/yips", async (req, res) => {
  try {
    const db = await getDBConnection();
    let search = req.query.search;
    res.type("json");

    let query = `
    SELECT id, name, yip, hashtag, likes, date
    FROM yips
    ORDER BY DATETIME(date) DESC;
    `;

    if (search !== undefined) {
      query = `
          SELECT id
          FROM yips
          WHERE yip LIKE '%${search}%';
      `;
    }

    const yips = await db.all(query);

    // prettier-ignore
    let response = {yips: []};

    response.yips = yips;
    res.send(JSON.stringify(response));
    await db.close();
  } catch (err) {
    res.type("text");
    res.status(SERVER_ERROR).send(SERVER_ERROR_MSG);
  }
});

/**
 * Endpoint: /yipper/user/:user
 * Type: GET
 * Return format: JSON
 * Query parameters: none.
 * Responds with the name, yip, hashtag, and date for all yips for a designated user
 * ordered by the date in descending order.
 */
app.get("/yipper/user/:user", async (req, res) => {
  try {
    const db = await getDBConnection();
    let user = req.params.user;
    res.type("json");

    let query = `
    SELECT name, yip, hashtag, date
    FROM yips
    WHERE name = '${user}'
    ORDER BY DATETIME(date) DESC;
    `;

    let hasUser = await userExists(user, db);
    if (hasUser) {
      const yips = await db.all(query);
      res.send(JSON.stringify(yips));
    } else {
      res.status(INVALID_PARAM_ERROR).send("Yikes. User does not exist.");
    }
    await db.close();
  } catch (err) {
    res.type("text");
    res.status(SERVER_ERROR).send(SERVER_ERROR_MSG);
  }
});

/**
 * Endpoint: /yipper/likes
 * Type: POST
 * Return format: plain text
 * Body parameters: id - id of yip to update
 * Increments the likes for a yip of the given id by 1 and responds with the new value.
 */
app.post("/yipper/likes", async (req, res) => {
  res.type("text");
  try {
    const db = await getDBConnection();
    let id = req.body.id;
    if (id === undefined) {
      res
        .status(INVALID_PARAM_ERROR)
        .send("Missing one or more of the required params.");
    } else {
      let findId = await db.all(`SELECT id FROM yips WHERE id = '${id}'`);
      if (!findId.length > 0) {
        res.status(INVALID_PARAM_ERROR).send("Yikes. ID does not exist.");
      } else {
        let query = `
          UPDATE yips
          SET likes = likes + 1
          WHERE id = ${id};
        `;
        await db.run(query);
        const likes = await db.get(`SELECT likes FROM yips WHERE id = ${id}`);
        res.send(`${likes.likes}`);
      }
    }
    db.close();
  } catch (err) {
    res.status(SERVER_ERROR).send(SERVER_ERROR_MSG);
  }
});

/**
 * Endpoint: /yipper/new
 * Type: POST
 * Return format: JSON
 * Body parameters: name - name of user to add to database
 *                  full - contains the yip and hashtag information to add in the valid yip format
 * Add new yip information to the database and respond with a JSON of the id, name, yip, hashtag,
 * likes, and date of the new yip. Default likes is at 0, date is set to time of submission.
 */
app.post("/yipper/new", async (req, res) => {
  try {
    const db = await getDBConnection();
    res.type("json");

    // prettier-ignore
    if (req.body.name === undefined || req.body.full === undefined) {
      res.status(INVALID_PARAM_ERROR).send("Missing one or more of the required params.");
    } else {
      let name = req.body.name;
      let full = req.body.full;
      let userFound = await userExists(name, db);
      if (!userFound) {
        res.status(INVALID_PARAM_ERROR).send("Yikes. User does not exist.");
      } else {
        let [yip, hashtag] = checkYipFormat(full);
        if (yip === null || hashtag === null) {
          res.status(INVALID_PARAM_ERROR).send("Yikes. Yip format is invalid.");
        } else {
          let id = await addYip(name, yip, hashtag, db);
          let response = await db.get("SELECT * FROM yips WHERE id = ?", id);
          res.send(JSON.stringify(response));
        }
      }
    }
    db.close();
  } catch (err) {
    res.type("text");
    res.status(SERVER_ERROR).send();
  }
});

/**
 * Adds a new user (row) to the database.
 * @param {string} name name of the user
 * @param {string} yip yip to add
 * @param {string} hashtag hashtag to add
 * @param {sqlite3.Database} db A connection to the database adding to. Guaranteed to be
 * an open and valid connection.
 * @returns {number} The id of the new user.
 */
async function addYip(name, yip, hashtag, db) {
  let query = `
            INSERT INTO yips (name, yip, hashtag, likes)
            VALUES ('${name}', '${yip}', '${hashtag}', 0);
  `;
  let result = await db.run(query);
  return result.lastID;
}

/**
 * Establishes and returns a connection to the yipper database.
 * @returns {sqlite3.Database} A connection to the yipper.db sqlite3 database.
 */
async function getDBConnection() {
  const db = await sqlite.open({
    filename: "yipper.db",
    driver: sqlite3.Database
  });
  return db;
}

// specify root directory for static files
app.use(express.static("public"));
const PORT = process.env.PORT || 8000;
app.listen(PORT);
