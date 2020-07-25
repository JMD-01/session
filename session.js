const yggdrasil = require('yggdrasil')({});
const sqlite3 = require('sqlite3');

//So many callbacks inside of each other due to sqlite3. Will be fixed when i update to better-sqlite3

//Initialize DB and create table if empty
let sessionDB = new sqlite3.Database('session.sqlite');
sessionDB.exec(`CREATE TABLE IF NOT EXISTS clientToken (token TEXT);CREATE TABLE IF NOT EXISTS Session (email TEXT, accessToken TEXT, clientToken TEXT, name TEXT, id TEXT)`);

/**
 * Check Session
 * @param {String} email User
 */
module.exports.checkSession = function (email) {
    //Check if session already exists in database
    return new Promise(function (resolve, reject) {
        sessionDB.get(`SELECT * FROM Session WHERE email = "${email}"`, async function (err, session) {
            //If error exists
            if (err) {
                console.log(err);
                return resolve(false);
            }
            //If session not found
            if (!session) {
                console.log(`[1/2] ${email} : Session not found.`);
                return resolve(false);
            }
            //Check session with email
            yggdrasil.validate(session.accessToken, function (err) {
                if (!err) {
                    console.log(`[2/2] ${email} : Session valid.`);
                    return resolve({
                        accessToken: session.accessToken,
                        clientToken: session.clientToken,
                        selectedProfile: { name: session.name, id: session.id }
                    });
                } else {
                    console.log(`[1/2] ${email} : Session Invalid`);
                    //Better not to refresh because it can come back invalid from a refresh and would take an extra step.
                    return resolve(false);
                }

            });
        });

    })
}
/**
 * Reauth Account
 * @param {String} email User
 * @param {String} password Password
 */
module.exports.ReAuth = function (email, password) {
    return new Promise(function (resolve, reject) {
        let token = null;
        //Need to use same token for every auth or it will invalidate the other sessions/ Check if we arleady have one
        sessionDB.get(`SELECT * FROM clientToken`, async function (err, row) {
            //If error exists
            if (err) {
                console.log(err);
                return resolve(false)
            }
            //If clientToken not found
            if (!row) {
                token = null;
                runAuth();
            } else {
                token = row.token;
                runAuth();
            }
        })
        function runAuth() {
            yggdrasil.auth({ user: email, pass: password, token: token }, function (_err, _data) {
                if (_err) {
                    console.log(`[!] ${email} : ${_err} Possible Mojang Block.`)
                    return resolve(false);
                }
                if (_data) {
                    sessionDB.get(`SELECT * FROM Session WHERE email = "${email}"`, async function (err, row) {
                        //If error exists
                        if (err) {
                            console.log(err);
                            return resolve(false)
                        }
                        //If record for this email doesnt exist => import
                        if (!row) {
                            sessionDB.run(`INSERT INTO Session (email ,accessToken ,clientToken ,name ,id) VALUES (?,?,?,?,?)`, [`${email}`, `${_data.accessToken}`, `${_data.clientToken}`, `${_data.selectedProfile.name}`, `${_data.selectedProfile.id}`])
                            //Save clientToken & check if it exists to insert or replace data
                            sessionDB.get(`SELECT * FROM clientToken`, async function (err, row) {
                                //If error exists
                                if (err) {
                                    console.log(err);
                                    return resolve(false)
                                }
                                //If clientToken not found
                                if (!row) {
                                    sessionDB.run(`INSERT INTO clientToken (token) VALUES (?)`, [`${_data.clientToken}`]);
                                } else {
                                    sessionDB.run(`UPDATE clientToken SET token = "${_data.clientToken}"`);
                                }
                            })
                            console.log(`[2/2] ${email} : Reauthenticated. Saving session`);
                            return resolve({
                                accessToken: _data.accessToken,
                                clientToken: _data.clientToken,
                                selectedProfile: { name: _data.selectedProfile.name, id: _data.selectedProfile.id }
                            })
                        } else {
                            //If record already exists for this email => replace
                            sessionDB.run(`UPDATE Session SET accessToken = "${_data.accessToken}", clientToken = "${_data.clientToken}", name = "${_data.selectedProfile.name}", id = "${_data.selectedProfile.id}" WHERE email = "${email}";`);
                            //Save clientToken & check if it exists to insert or replace data
                            sessionDB.get(`SELECT * FROM clientToken`, async function (err, row) {
                                //If error exists
                                if (err) {
                                    console.log(err);
                                    return resolve(false)
                                }
                                //If clientToken not found
                                if (!row) {
                                    sessionDB.run(`INSERT INTO clientToken (token) VALUES (?)`, [`${_data.clientToken}`]);
                                } else {
                                    sessionDB.run(`UPDATE clientToken SET token = "${_data.clientToken}"`);
                                }
                            })
                            console.log(`[2/2] ${email} : Reauthenticated. Saving session`);
                            return resolve({
                                accessToken: _data.accessToken,
                                clientToken: _data.clientToken,
                                selectedProfile: { name: _data.selectedProfile.name, id: _data.selectedProfile.id }
                            })
                        }
                    });
                }
            });
        }
    })
}
