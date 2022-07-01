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
const crypto = require("crypto");

async function register() {
    try {
      const db = await getDBConnection();
      let query = `
          INSERT INTO friends
          VALUES (?, ?, ?, ?);
      `
      let salt = crypto.randomBytes(16).toString('base64');
      let hash = crypto.createHash('sha256').update("cocknball" + salt).digest('base64');
      // m1234:cummy => sussy
      // marduk5:cocknball => jin terada
      await db.run(query, "marduk5", "jin terada", salt, hash);
      db.close();
    } catch (err) {
      console.log(err)
      res.status(SERVER_ERROR).send(SERVER_ERROR_MSG);
    }
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

register()
