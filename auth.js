const jwt = require("jsonwebtoken");

const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");
const dotenv = require("dotenv");
const res = require("express/lib/response");
const { TokenExpiredError } = require("jsonwebtoken");

// env var access
dotenv.config();

const verifyToken = async (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) {
    return handleRoute(req.originalUrl, res, next, false);
  }

  try {
    const verified = jwt.verify(token, process.env.TOKEN_KEY);

    const requestPID = isPlayerRequest(req);
    if (requestPID) {
        res.locals.pid = await requestPID(token, res);
        return next();
    }

    return handleRoute(req.originalUrl, res, next, verified);
  } catch (err) {
    if (err instanceof TokenExpiredError || err.name == "NoMatchingPIDForTokenError") {
        res.clearCookie("access_token").status(505);
        return res.redirect("/login");
    } else {
        return next("Error: " + err);
    }
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
           noMatchingPIDForTokenError();
        }
        return pid.pid;
    } catch (err) {
        throw err;
        //return res.status(500).send("Error occured in Server: getPID");
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

/** ERRORS */
function noMatchingPIDForTokenError() {
  throw {
    name: "NoMatchingPIDForTokenError",
    message: "PID doesn't exist for user's session, please log-in again."
  };
}

module.exports = verifyToken;
