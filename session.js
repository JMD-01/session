/**Generate empty settings DB variable*/
/**Session DB */
const yggdrasil = require('yggdrasil')({});
const Database = require('better-sqlite3');
let sessionDB = new Database('session.sqlite3');
const sqlInitSession = `
CREATE TABLE IF NOT EXISTS clientToken (token TEXT); 
CREATE TABLE IF NOT EXISTS Session (email TEXT, accessToken TEXT, clientToken TEXT, name TEXT, id TEXT);
`;
sessionDB.exec(sqlInitSession);
/**
* Prepare statements for session handler
*
*/
let getEmail = sessionDB.prepare(`SELECT * FROM Session WHERE email = ?`);
let insertSession = sessionDB.prepare(`INSERT INTO Session (email ,accessToken ,clientToken ,name ,id) VALUES (@email ,@accessToken ,@clientToken ,@name ,@id)`);
let updateSession = sessionDB.prepare(`UPDATE Session SET accessToken = ?, clientToken = ?, name = ?, id = ? WHERE email = ?`);

let getClientToken = sessionDB.prepare(`SELECT * FROM ClientToken`);
let insertClientToken = sessionDB.prepare(`INSERT INTO clientToken (token) VALUES (@token)`);
let updateClientToken = sessionDB.prepare(`UPDATE clientToken SET token = ?`)


/**
* Check Session
* @param {String} email User
*/
module.exports.checkSession = function (email) {
  //Check if session already exists in database
  return new Promise(function (resolve, reject) {
    let session = getEmail.get(email);
    if (!session) {
      console.log(`[1/2] ${email} : Session not found.`);
      return resolve(true);
    }
    //Check session with token
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
    let clientToken = getClientToken.get();
    //If clientToken not found
    if(!clientToken){
      token = null;
      runAuth();
    } else {
      token = clientToken.token;
      runAuth();
    }
    function runAuth() {
      yggdrasil.auth({ user: email, pass: password, token: token }, function (_err, _data) {
        if (_err) {
          console.log(`[!] ${email} : ${_err} Possible Mojang Block.`)
          return resolve(false);
        }
        if (_data) {
          let session = getEmail.get(email);
            //If record for this email doesnt exist => import
            if (!session) {
              insertSession.run({email: email, accessToken: _data.accessToken, clientToken: _data.clientToken, name: _data.selectedProfile.name, id: _data.selectedProfile.id});
              //Save clientToken & check if it exists to insert or replace data
              let clientToken = getClientToken.get();
              //If clientToken not found
              if(!clientToken){
                insertClientToken.run({token : _data.clientToken});
              } else {
                updateClientToken.run(_data.clientToken);
              }
              console.log(`[2/2] ${email} : Reauthenticated. Saving session`);
              return resolve({
                accessToken: _data.accessToken,
                clientToken: _data.clientToken,
                selectedProfile: { name: _data.selectedProfile.name, id: _data.selectedProfile.id }
              })
            } else {
              //If record already exists for this email => replace
              updateSession.run(_data.accessToken, _data.clientToken, _data.selectedProfile.name, _data.selectedProfile.id, email);
              //Save clientToken & check if it exists to insert or replace data
              let clientToken = getClientToken.get();
              if(!clientToken){
                //If clientToken not found
                insertClientToken.run({token : _data.clientToken});
              } else {
                //If clientToken found
                updateClientToken.run(_data.clientToken);
              }
              console.log(`[2/2] ${email} : Reauthenticated. Saving session`);
              return resolve({
                accessToken: _data.accessToken,
                clientToken: _data.clientToken,
                selectedProfile: { name: _data.selectedProfile.name, id: _data.selectedProfile.id }
              })
            }
        }
      });
    }
  })
}
