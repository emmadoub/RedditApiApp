const LocalStrategy = require("passport-local").Strategy
const bcrypt = require("bcrypt")

function initialize(passport, getUserByEmail, getUserById) {
    //function to authenticate users

    const authenticateUsers = async (email, password, done) => {
        //get users by email 
        console.log("got here")
        const user = await getUserByEmail(email)
        if (user==null){
            console.log(email, "No user found with that email")
            return done(null, false, {message: "No user found with that email"})
          
        }
        
        try {
            if (await bcrypt.compare(password, user?.password)) {
                console.log("ok")
                return done(null, user)
            }
            else {
                console.log("Password Incorrect")
                return done(null, false, {message: "Password Incorrect" })

            }
    
        }
        catch (e) {
            console.log(e);
            return done(e);
        }
    }

    passport.use(new LocalStrategy({usernameField: 'email'}, authenticateUsers))
    passport.serializeUser((user, done) => done(null, user?.id))
    passport.deserializeUser((id, done) => {
        return done(null, getUserById(id))
    })
}

module.exports = initialize