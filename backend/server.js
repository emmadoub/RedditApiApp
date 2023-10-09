if (process.env.NODE_ENV !=="production") {
    require("dotenv").config()
}


// Importing libraries
const express = require("express")
const app = express()
const bcrypt = require("bcrypt")
const passport = require("passport")
const initializePassport = require ("./passport-config")
const flash = require("express-flash")
const session = require("express-session")
const methodOverride = require("method-override")
const supabase = require ("./supabase")
const cors = require("cors");
const multer = require('multer');
const upload = multer();


// initializePassport(
//     passport,
//     // email => users.find(user=> user.email===email),
//     // id => users.find(user => user.id === id)
//     )

    initializePassport(
        passport,
        async (email) => {
          const { data, error } = await supabase
            .from('Users')
            .select('*')
            .eq('email', email);
      
          if (error) {
            throw error;
          }
      
          return data[0]; 
        },
        async (id) => {
          const { data, error } = await supabase
            .from('Users')
            .select('*')
            .eq('id', id);
      
          if (error) {
            throw error;
          }
      
          return data[0]?.id; 
        }
      );

app.use(express.urlencoded({extended: false}))
app.use(flash())
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false, 
    saveUninitialized: false,
}))
app.use(
    cors({
      origin: "http://localhost:3000", // <-- location of the react app were connecting to
      credentials: true,
    })
  );

app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride("_method"))
app.use(express.json());


app.post("/login", upload.none(), checkNotAuthenticated, (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        // Handle error, e.g., log it
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
      }
  
      if (!user) {
        // Authentication failed
        return res.status(401).json({ message: info.message || "Authentication failed" });
      }
  
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          // Handle login error
          return res.status(500).json({ message: "Login error" });
        }
  
        // Authentication successful
        return res.status(200).json({ message: "Authentication successful", user });
      });
    })(req, res, next);
  });
//configuring the register post functionality
app.post("/register", upload.none(), checkNotAuthenticated, async (req,res) => {
    try {
        
        console.log(req.body)
        const email= req.body.email
       
        const existingUser = await supabase
            .from('Users')
            .select()
            .eq('email', email)
            .single();
            console.log(existingUser)

        if (existingUser.error===null) {
            return res.status(500).json({ message: "Email already in use!" });
            
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        const id =  Date.now().toString()
        const name =  req.body.name
        const password = hashedPassword
        const saveuser = await supabase
        .from('Users')
        .insert([{ id, name, email, password }])
        .select();
        return res.status(200).json({ message: "User was successfully registered"});
    } catch (e) {
        console.log(e)
        return res.status(500).json({ message: "Error" });
    }
})

app.post("/insertKeyword", async (req, res) => {
  const user_id = req.body.id;
  const keyword = req.body.keyword;
  const created_at_date = new Date();
  const created_at = new Date(created_at_date.getTime() + (3 * 60 * 60 * 1000)).toISOString();

  try {
    // Generate the keyword_id using the generateKeywordId function
    const keyword_id = await generateKeywordId(keyword);

    // Insert the keyword into Supabase
    const saveuser = await supabase
      .from('Keywords')
      .insert([{ user_id, keyword, keyword_id, created_at }])
      .select();

    if (saveuser.error) {
      // Handle Supabase error
      console.error("Supabase error:", saveuser.error);
      return res.status(500).json({ message: "Supabase error" });
    }

    // Return a success response with the generated keyword_id
    return res.status(200).json({ message: "Keyword has been successfully inserted", keyword_id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error" });
  }
});

app.post("/insertKeywordResults", async (req, res) => {
  const keyword_id = req.body.keyword;
  const results = req.body.response_result;

  try {
      const insertPromises = results.map(async (result) => {
      const authorFullname = result.authorFullname;
      const title = result.title;
      const num_comments = result.num_comments;
      const ups = result.ups;
      const thumbnail = result.thumbnail;
      const url = result.url;


      // Insert the keyword into Supabase
      const saveuser = await supabase
        .from('Keyword_Results')
        .insert([{ keyword_id, authorFullname, title, num_comments, ups, thumbnail, url }])
        .select();

      if (saveuser.error) {
        // Handle Supabase error
        console.error("Supabase error:", saveuser.error);
        return res.status(500).json({ message: "Supabase error" });
      }
    });

    // Wait for all insertPromises to complete
    await Promise.all(insertPromises);

    // Return a success response
    return res.status(200).json({ message: "Keywords have been successfully inserted" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Error" });
  }
});


app.post("/getKeywords", async (req, res) => {
  try {

    
    const user_id = req.body.userID;

    if (user_id){
    const keywords = await supabase
      .from('Keywords')
      .select('keyword, created_at')
      .eq('user_id', user_id);

    // console.log(keywords)
    if (keywords.error === null){
    const keywordsData = keywords.data;
    return res.status(200).json({ keywordsData }); 
  }
    }// Wrap keywords in an object
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Error" });
  }
});

app.post("/getKeywordResults", async (req, res) => {
  try {

    
    const created_at = req.body.created_at;
    const keyword = req.body.keyword;
    const Keyword_Results = await supabase
    .from('Keywords')
    .select('Keyword_Results (authorFullname, title,  num_comments, ups, thumbnail, url)')
    .eq('keyword', keyword)
    .eq('created_at', created_at);
  
    if (!Keyword_Results.error){
      const keywordRSLTS = Keyword_Results.data;
      return res.status(200).json({ keywordRSLTS }); 
  }
  else {
    console.log(error)
  }
    // Wrap keywords in an object
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Error" });
  }
});


app.delete("/logout", (req,res) => {
    req.logOut(req.user, err=>{
        if (err) return next(err)
        res.redirect("/")
    })
    
})

function checkNotAuthenticated(req, res, next) {
    if(req.isAuthenticated()){
        res.redirect("/login")
    }
    next()
    }

    function checkAuthenticated(req, res, next) {
        if(req.isAuthenticated()){
            return next()
            
        }
        res.redirect("/login")
        }


async function generateKeywordId(keyword) {
  const saltRounds = 10; // Adjust the number of salt rounds as needed
  const hashedKeyword = await bcrypt.hash(keyword, saltRounds);
  return hashedKeyword;
}
//End Routes
app.listen(4000)

