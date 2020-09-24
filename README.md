# session
Sessions for minecraft using yygdrasil made easier


Work in progress

#Usage

```javascript
const session = require('session.js`);

//Email and passwrd
let email = "xdemail@gmail.com";
let password = "testus123";
let botsession;

//Check session if valid
let response = await session.checkSession(email);
//If returns false need to reauth
if (!response) {
  let response = await session.ReAuth(email, password);
  //Fail reauth
  if (!response) {
   //Nothing tbh, get rid of this account already
  } else {
  //Reauth succesful, update variable sessionbot
  botsession = response;
  }
} else {
 if (response === true) {
  let response = await session.ReAuth(email, password);
  //Fail reauth
  if (!response) {
   //Nothing tbh, get rid of this account already
  } else {
  //Reauth succesful, update variable sessionbot
  botsession = response;
  }
 } else {
  //If returns session. Update variable sessionbot
  botsession = response;
 }
}
```
