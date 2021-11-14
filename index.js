import express, { request, response } from "express";
import methodOverride from "method-override";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { add, read, write } from "./jsonFileStorage.js";

import pg from "pg";
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

// create the query done callback
const allNotesQueryDone = (error, result) => {
  // this error is anything that goes wrong with the query
  if (error) {
    console.log("error", error);
  } else {
    // rows key has the data
    results = result.rows;
  }

  // close the connection
  //client.end();
};

// GET to render a form for new sighting
app.get("/note", (request, response) => {
  // render form page
  response.render("note");
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

      response.render("all", { results: result.rows });
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
      response.render("single", { results: result.rows });
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

      response.render("edit", { results: result.rows });
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
