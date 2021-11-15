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
  if (request.cookies.loggedIn === undefined) {
    response.redirect("/login");
  }
  pool.query(`SELECT * FROM species`, (error, result) => {
    console.log(
      "%cindex.js line:53 result.rows",
      "color: #007acc;",
      result.rows
    );
    pool.query(`SELECT * FROM behaviours`, (error, res) => {
      // render form page
      response.render("note", {
        speciesList: result.rows,
        req: request,
        behavioursList: res.rows,
      });
    });
  });
});

// POST to save a new sighting
app.post("/note", (request, response) => {
  if (request.cookies.loggedIn === undefined) {
    response.redirect("/login");
  }
  const [
    habitat,
    date,
    appearance,
    vocalisation,
    flockSize,
    species,
    behaviour,
  ] = Object.values(request.body);
  console.log("%cindex.js line:75 note", "color: #007acc;", [
    habitat,
    date,
    appearance,
    vocalisation,
    flockSize,
    species,
    behaviour,
  ]);
  const newNoteQuery = `INSERT INTO notes (habitat,date,appearance,vocalisation,flock_size,species_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`;
  pool.query(
    newNoteQuery,
    [habitat, date, appearance, vocalisation, flockSize, species],
    (error, result) => {
      if (error) {
        console.log("error", error);
      } else {
        console.log(
          "%cindex.js line:100 result.rows",
          "color: #007acc;",
          result.rows
        );
        const newBehaviourNoteQuery = `INSERT INTO behaviours_note (behaviour_id,note_id) VALUES ($1,$2)`;
        if (typeof behaviour === "string") {
          pool.query(
            newBehaviourNoteQuery,
            [parseInt(behaviour, 10), result.rows[0].id],
            whenQueryDone
          );
        } else if (typeof behaviour === "object") {
          behaviour.forEach((element) => {
            pool.query(
              newBehaviourNoteQuery,
              [parseInt(element, 10), result.rows[0].id],
              whenQueryDone
            );
          });
        }
      }
    }
  );
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
      response.render("all", { results: result.rows, req: request });
    }
  });
});

// GET to render a page for specific sighting
app.get("/note/:id", (request, response) => {
  const singleNoteQuery = `SELECT * FROM notes WHERE id =${request.params.id}`;
  const singleJoinNoteQuery = `SELECT notes.id,notes.habitat,notes.date,notes.appearance,notes.vocalisation,notes.flock_size,species.name as species_name FROM notes INNER JOIN species ON notes.species_id = species.id WHERE notes.id = ${request.params.id}`;
  pool.query(singleJoinNoteQuery, (error, result) => {
    // this error is anything that goes wrong with the query
    if (error) {
      console.log("error", error);
    } else {
      const singleNoteBehaviourQuery = `SELECT behaviours_note.id,behaviours_note.behaviour_id,behaviours.behaviour_type,behaviours_note.note_id FROM behaviours_note INNER JOIN behaviours on behaviours_note.behaviour_id = behaviours.id`;
      pool.query(singleNoteBehaviourQuery, (error, res) => {
        if (error) {
          console.log("error", error);
        } else {
          console.log("join", result.rows);
          response.render("single", {
            results: result.rows,
            req: request,
            behave: res.rows,
          });
        }
      });
    }
  });
});

// GET to edit a single page
app.get("/note/:id/edit", (request, response) => {
  if (request.cookies.loggedIn === undefined) {
    response.redirect("/login");
  }
  const singleJoinNoteQuery = `SELECT notes.id,notes.habitat,notes.date,notes.appearance,notes.vocalisation,notes.flock_size,species.name as species_name FROM notes INNER JOIN species ON notes.species_id = species.id WHERE notes.id = ${request.params.id}`;
  //const singleNoteQuery = `SELECT * FROM notes WHERE id =${request.params.id}`;

  pool.query(singleJoinNoteQuery, (error, result) => {
    // this error is anything that goes wrong with the query
    console.log("inside");
    if (error) {
      console.log("error", error);
    } else {
      // rows key has the data
      const singleNoteBehaviourQuery = `SELECT behaviours_note.id,behaviours_note.behaviour_id,behaviours.behaviour_type,behaviours_note.note_id FROM behaviours_note INNER JOIN behaviours ON behaviours_note.behaviour_id = behaviours.id WHERE behaviours_note.note_id = ${request.params.id} `;
      pool.query(singleNoteBehaviourQuery, (err, res) => {
        if (err) {
          console.log("err", err);
        } else {
          console.log("result.rows");
          pool.query(`SELECT * FROM behaviours`, (er, resu) => {
            pool.query(`SELECT * FROM species`, (problem, specs) => {
              response.render("edit", {
                results: result.rows,
                req: request,
                behave: res.rows,
                behavioursList: resu.rows,
                speciesList: specs.rows,
              });
            });
          });
        }
      });

      //response.render("edit", { results: result.rows, req: request });
    }
  });
});

// PUT to edit sighting
app.put("/note/:id/edit", (request, response) => {
  if (request.cookies.loggedIn === undefined) {
    response.redirect("/login");
  }
  const { id } = request.params;
  const noteEdit = Object.values(request.body);
  console.log(noteEdit);
  const editNoteQuery = `UPDATE notes SET habitat = '${noteEdit[0]}',date = '${noteEdit[1]}',appearance = '${noteEdit[2]}',vocalisation = '${noteEdit[3]}',flock_size = '${noteEdit[4]}',species_id =${noteEdit[5]}`;
  pool.query(editNoteQuery, whenQueryDone);
  // pool.query(
  //   `SELECT id FROM species WHERE species.name = ${noteEdit[5]}`,
  //   (error, result) => {
  //     pool.query(
  //       `UPDATE notes SET species_id = ${result.rows[0].id}`,
  //       whenQueryDone
  //     );
  //   }
  // );

  //update behaviours !!!!!!!!!
  pool.query(
    `DELETE FROM behaviours_note WHERE note_id = ${id}`,
    (err, res) => {
      console.log("delete");
      const newBehaviourNoteQuery = `INSERT INTO behaviours_note (behaviour_id,note_id) VALUES ($1,$2)`;
      if (typeof noteEdit[6] === "string") {
        console.log("here");
        pool.query(
          newBehaviourNoteQuery,
          [parseInt(noteEdit[6], 10), id],
          whenQueryDone
        );
      } else if (typeof noteEdit[6] === "object") {
        noteEdit[6].forEach((element) => {
          console.log("there");
          pool.query(
            newBehaviourNoteQuery,
            [parseInt(element, 10), id],
            whenQueryDone
          );
        });
      }
    }
  );
  response.redirect(`http://localhost:3004/note/${id}`);

  //response.redirect(`http://localhost:3004/sighting/${index}`);
});

// DELETE to remove a sighting
app.delete("/note/:id", (request, response) => {
  if (request.cookies.loggedIn === undefined) {
    response.redirect("/login");
  }
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
      response.redirect("/signup");
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
      response.redirect("/");
    } else {
      // password didn't match
      // the error for password and user are the same. don't tell the user which error they got for security reasons, otherwise people can guess if a person is a user of a given service.
      response.redirect("/login");
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
  if (request.cookies.loggedIn === undefined) {
    response.redirect("/login");
  }
  // render form page
  response.render("species", { req: request });
});

// POST to save a new species
app.post("/species", (request, response) => {
  if (request.cookies.loggedIn === undefined) {
    response.redirect("/login");
  }
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
