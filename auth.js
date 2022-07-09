const jwt = require("jsonwebtoken");

const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");
const dotenv = require("dotenv");

// env var access
dotenv.config({ override: true });

const verifyToken = async (req, res, next) => {
  let providedToken = process.env.JWT_Token;
  let pid = process.env.PID;
  if (!providedToken || !pid) {
    // return res.status(403).send("A token is required for authentication");
    return handleRoute(req.originalUrl, res, next, false);
  }

  try {
    const db = await getDBConnection();
    let query = `
            SELECT user
            FROM players
            WHERE pid=?;
        `;
    let getUser = await db.get(query, pid);
    if (getUser == undefined || !getUser.user) {
      return handleRoute(req.originalUrl, res, next, false);
    }
    let user = getUser.user;

    query = `
            SELECT token
            FROM friends
            WHERE user=?;
        `;
    let auth = await db.get(query, user);
    const verified = jwt.verify(providedToken, auth.token);
    db.close();

    if (verified) {
      return handleRoute(req.originalUrl, res, next, true);
    } else {
      return handleRoute(req.originalUrl, res, next, false);
    }
  } catch (err) {
    console.log("error:", err);
    return res.status(500).send("Server Error in Auth");
  }
};

const handleRoute = (endpoint, res, next, verified) => {
  if (endpoint === "/") {
    if (verified) {
      return next();
    } else {
      return res.redirect("/login");
    }
  } else if (endpoint === "/login" || endpoint === "/login/") {
    if (verified) {
      return res.redirect("/");
    } else {
      return next();
    }
  } else {
    return next();
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
