const jwt = require("jsonwebtoken");

const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");
const dotenv = require("dotenv");
const res = require("express/lib/response");

// env var access
dotenv.config();

const verifyToken = async (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) {
    return handleRoute(req.originalUrl, res, next, false);
  }

  try {
    const verified = jwt.verify(token, process.env.TOKEN_KEY);

    let request = isPlayerRequest(req);
    if (request) {
        req.pid = await request(token, res);
        return next();
    }

    return handleRoute(req.originalUrl, res, next, verified);
  } catch (err) {
    console.log("error:", err);
    res.clearCookie("access_token").status(500);
    return res.redirect("/login");
  }
};

const handleRoute = (endpoint, res, next, verified) => {
  if (endpoint === "/" || endpoint.match(/^\/currentPlayer\/?$/)) {
    return verified ? next() : res.redirect("/login");
  } else if (endpoint.match(/^\/login\/?$/)) {
    return verified ? res.redirect("/") : next();
  } else {
    return next();
  }
};

const isPlayerRequest = (req) => {
    return req.originalUrl.match(/^\/currentHand\/?$/)
        ?  getPID
        :  undefined;
}

const getPID = async (token, res) => {
    try {
        const db = await getDBConnection();
        let query = `
            SELECT PID
            FROM players
            WHERE token=?;
        `;
        let pid = await db.get(query, token);
        if (!pid) {
            console.log(pid);
            return res.status(500).send("Token, user mismatch error");
        }
        return pid;
    } catch (err) {
        console.log(err);
        return res.status(500).send("Error occured in Server: getPID");
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

module.exports = verifyToken;
