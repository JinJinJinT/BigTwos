const jwt = require("jsonwebtoken");

const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");
const dotenv = require("dotenv");

// env var access
dotenv.config();

const verifyToken = async (req, res, next) => {
  const token = req.cookies.access_token;
  if (!token) {
    return handleRoute(req.originalUrl, res, next, false);
  }

  try {
    // check if token is in db before verifying
    const verify1 = await tokenExists(token);
    const verify2 = jwt.verify(token, process.env.TOKEN_KEY);
    const verified = verify1 && verify2;

    // if we need to pass the pid to app.js or not.
    const requestPID = isPlayerRequest(req);
    if (requestPID) {
      res.locals.pid = await requestPID(token);
      return next();
    }
    return handleRoute(req.originalUrl, res, next, verified);
  } catch (err) {
    console.log("clearing cookie");
    res.clearCookie("access_token");
    res.status(401).send("Auth expired: Logged-out");
    // if (Array.isArray(err)) {
    //     err.push("Token could not be verified");
    //     if (err.some(e=>e instanceof TokenExpiredError || (e.name && e.name === "NoMatchingPIDForTokenError"))) {
    //         res.clearCookie("access_token").status(504);
    //     }
    // } else {
    //     let eList = [];
    //     eList.push(err);
    //     eList.push("Token could not be verified");
    // }
    // return next(JSON.stringify(err));
  }
};

const tokenExists = async token => {
  try {
    const db = await getDBConnection();
    let query = `
    SELECT user
    FROM players
      WHERE token=?;
    `;
    let doesUserExist = await db.get(query, token);
    return doesUserExist != undefined;
  } catch (err) {
    throw err;
  }
};

// prettier-ignore
const handleRoute = (endpoint, res, next, verified) => {
  if (!verified) return endpoint.match(/^\/login\/?$/) ? next() : res.redirect("/login");

  if (
    endpoint.match(/^\/waitroom\/?$/)     ||
    endpoint.match(/^\/currentHand\/?$/)  ||
    endpoint.match(/^\/currentPlayer\/?$/)
  ) return next();

  if (endpoint == '/' || endpoint.match(/^\/login\/?$/)) return res.redirect("/waitroom");

  return next();
};

const isPlayerRequest = req => {
  if (
    req.originalUrl.match(/^\/currentHand\/?$/) ||
    req.originalUrl.match(/^\/playerReady\/?$/)
  )
    return getPID;
  return undefined;
};

const getPID = async token => {
  try {
    const db = await getDBConnection();
    let query = `
            SELECT PID
            FROM players
            WHERE token=?;
        `;
    let pid = await db.get(query, token);
    if (!pid) {
      throw "PID doesn't exist for user's session, please log-in again.";
    }
    return pid.pid;
  } catch (err) {
    throw err;
    //return res.status(500).send("Error occured in Server: getPID");
  }
};
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
