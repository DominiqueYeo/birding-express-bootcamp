CREATE TABLE IF NOT EXISTS notes (id SERIAL PRIMARY KEY , habitat TEXT,date DATE,appearance TEXT,vocalisation TEXT,flock_size TEXT,species_id INTEGER,user_idnum INTEGER);
CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT,password TEXT);
CREATE TABLE IF NOT EXISTS species (id SERIAL PRIMARY KEY, name TEXT,scientific_name TEXT);
CREATE TABLE IF NOT EXISTS behaviours (id SERIAL PRIMARY KEY, behaviour_type TEXT);
CREATE TABLE IF NOT EXISTS behaviours_note (id SERIAL PRIMARY KEY, behaviour_id INTEGER,note_id INTEGER);