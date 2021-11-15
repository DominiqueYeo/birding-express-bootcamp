import express, { request, response } from "express";
import methodOverride from "method-override";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import pg from "pg";
import jsSHA from "jssha";

const { Pool } = pg;
// set the way we will connect to the server
const pgConnectionConfigs = {
  user: "dom",
  host: "localhost",
  database: "birding",
  port: 5432, // Postgres server always runs on this port
};

// create the var we'll use
const pool = new Pool(pgConnectionConfigs);
// eslint-disable-next-line no-underscore-dangle
const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// to use cookie parser
app.use(cookieParser());
app.set("view engine", "ejs");
// Override POST requests with query param ?_method=PUT to be PUT requests
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));
// Configure Express to parse request body data into request.body
app.use(express.urlencoded({ extended: false }));

// create the query done callback
const whenQueryDone = (error, result) => {
  // this error is anything that goes wrong with the query
  if (error) {
    console.log("error", error);
  } else {
    // rows key has the data
    console.log(result.rows);
  }

  // close the connection
  //client.end();
};

// GET to render a form for new sighting
app.get("/note", (request, response) => {
  // render form page
  response.render("note", { req: request });
});

// POST to save a new sighting
app.post("/note", (request, response) => {
  const note = Object.values(request.body);
  const newNoteQuery = `INSERT INTO notes (habitat,date,appearance,behaviour,vocalisation,flock_size) VALUES ($1,$2,$3,$4,$5,$6) `;
  pool.query(newNoteQuery, note, whenQueryDone);
  response.redirect("/");
});
// GET to render page for all sightings
app.get("/", (request, response) => {
  const allNotesQuery = `SELECT * FROM notes`;
  pool.query(allNotesQuery, (error, result) => {
    // this error is anything that goes wrong with the query
    if (error) {
      console.log("error", error);
    } else {
      // rows key has the data
      console.log(
        "%cindex.js line:91 result.rows",
        "color: #007acc;",
        result.rows
      );

      response.render("all", { results: result.rows, req: request });
    }
  });
});

// GET to render a page for specific sighting
app.get("/note/:id", (request, response) => {
  const singleNoteQuery = `SELECT * FROM notes WHERE id =${request.params.id}`;
  pool.query(singleNoteQuery, (error, result) => {
    // this error is anything that goes wrong with the query
    if (error) {
      console.log("error", error);
    } else {
      response.render("single", { results: result.rows, req: request });
    }
  });
});

// GET to edit a single page
app.get("/note/:id/edit", (request, response) => {
  const singleNoteQuery = `SELECT * FROM notes WHERE id =${request.params.id}`;
  pool.query(singleNoteQuery, (error, result) => {
    // this error is anything that goes wrong with the query
    if (error) {
      console.log("error", error);
    } else {
      // rows key has the data
      console.log(
        "%cindex.js line:91 result.rows",
        "color: #007acc;",
        result.rows
      );

      response.render("edit", { results: result.rows, req: request });
    }
  });
});

// PUT to edit sighting
app.put("/note/:id/edit", (request, response) => {
  const { id } = request.params;
  const noteEdit = Object.values(request.body);
  const editNoteQuery = `UPDATE notes SET habitat = '${noteEdit[0]}',date = '${noteEdit[1]}',appearance = '${noteEdit[2]}',behaviour = '${noteEdit[3]}',vocalisation = '${noteEdit[4]}',flock_size = '${noteEdit[5]}'`;
  console.log(
    "%cindex.js line:146 editNoteQuery",
    "color: #007acc;",
    editNoteQuery
  );
  pool.query(editNoteQuery, whenQueryDone);
  response.redirect(`http://localhost:3004/note/${id}`);

  //response.redirect(`http://localhost:3004/sighting/${index}`);
});

// DELETE to remove a sighting
app.delete("/note/:id", (request, response) => {
  const { id } = request.params;
  console.log("%cindex.js line:146 id", "color: #007acc;", typeof id);
  const deleteNoteQuery = `DELETE FROM notes WHERE id = ${parseInt(id, 10)}`;
  pool.query(deleteNoteQuery, whenQueryDone);
  response.redirect(`/`);
});

// GET to render a form for new user
app.get("/signup", (request, response) => {
  // render form page
  response.render("signup", { req: request });
});

// POST to save a new user
app.post("/signup", (request, response) => {
  // initialise the SHA object
  const shaObj = new jsSHA("SHA-512", "TEXT", { encoding: "UTF8" });
  // input the password from the request to the SHA object
  shaObj.update(request.body.password);
  // get the hashed password as output from the SHA object
  const hashedPassword = shaObj.getHash("HEX");
  const user = [request.body.email, hashedPassword];
  const newUserQuery = `INSERT INTO users (email,password) VALUES ($1,$2) `;
  pool.query(newUserQuery, user, whenQueryDone);
  response.redirect("/");
});

// GET to render a form for user login
app.get("/login", (request, response) => {
  // render form page
  response.render("login", { req: request });
});

// POST to login a user
app.post("/login", (request, response) => {
  console.log("request came in");
  const values = [request.body.email];
  pool.query("SELECT * from users WHERE email=$1", values, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      response.status(503).send(result.rows);
      return;
    }
    if (result.rows.length === 0) {
      // we didnt find a user with that email.
      // the error for password and user are the same. don't tell the user which error they got for security reasons, otherwise people can guess if a person is a user of a given service.
      response.status(403).send("sorry!");
      return;
    }
    const user = result.rows[0];
    // initialise SHA object
    const shaObj = new jsSHA("SHA-512", "TEXT", { encoding: "UTF8" });
    // input the password from the request to the SHA object
    shaObj.update(request.body.password);
    // get the hashed value as output from the SHA object
    const hashedPassword = shaObj.getHash("HEX");
    if (user.password === hashedPassword) {
      response.cookie("loggedIn", true);
      response.send("logged in!");
    } else {
      // password didn't match
      // the error for password and user are the same. don't tell the user which error they got for security reasons, otherwise people can guess if a person is a user of a given service.
      response.status(403).send("sorry!");
    }
  });
});

//Delete to logout
app.delete("/logout", (request, response) => {
  response.clearCookie("loggedIn");
  response.redirect(`/`);
});

// GET to render a form for new species
app.get("/species", (request, response) => {
  // render form page
  response.render("species", { req: request });
});

// POST to save a new species
app.post("/species", (request, response) => {
  const species = Object.values(request.body);
  const newSpeciesQuery = `INSERT INTO species (name,scientific_name) VALUES ($1,$2) `;
  pool.query(newSpeciesQuery, species, whenQueryDone);
  response.redirect("/");
});

// GET to send favourite cookie
app.get("/sighting/:index/favourites", (request, response) => {
  let cookieArr = [];
  if (request.cookies.favourite) {
    cookieArr = request.cookies.favourite;
  }
  cookieArr.push(request.params.index);
  response.cookie("favourite", cookieArr);
  response.send("okay");
});
// route to get favourite
app.get("/favourite", (request, response) => {
  const favIndex = request.cookies.favourite[0];
  response.send(favIndex);
});

app.listen(3004);
