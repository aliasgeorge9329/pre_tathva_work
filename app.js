//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
var flash = require("connect-flash")
var ObjectId = require('mongodb').ObjectID;


const app = express();
const port = process.env.PORT || 3000

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "User Login Session",
  resave: false,
  saveUninitialized: false
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

users_printed_login_admin = [];
admin_username = process.env.ADMIN_ID;
admin_pass = process.env.ADMIN_PASS;
mongoDB = process.env.MONGO;


mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  name: String,
  email: { type : String , unique : true, required : true, dropDups: true },
  password: String,
  googleId: String,
  college: String,
  sentence: String,
  status: String
});


userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});


passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/compose",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile);

  User.findOrCreate({ googleId: profile.id , email: profile.emails[0].value}, function (err, user) {
    return cb(err, user);
  });
}
));

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile","email"] })
);

app.get("/auth/google/compose",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/compose");
  });



// Home Route
app.get("/", function (req, res) {
  User.find(function (err, all_user) {
    if (err) {
      console.log(err);
    }
    else {
      // console.log(all_user);
      res.render("home", { sentence: all_user });
    }
  });
});



app.get("/login", function (req, res) {
  err_message = req.flash('message')[0];
  if (err_message == null) {
    res.render("login", { err_msg: "noerror" });
  }
  else {
    res.render("login", { err_msg: "error" });
  }
});



app.get("/register", function (req, res) {
  err_message = req.flash('message')[0];
  if (err_message == null) {
    res.render("register", { err_msg: "noerror" });
  }
  else {
    res.render("register", { err_msg: "error" });
  }
});



app.post("/login", function (req, res) {
  err_message = req.flash('message')[0];
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      res.redirect("/login");
    }
    else {
      passport.authenticate("local")(req, res, function () {
        if (user.username == admin_username && user.password == admin_pass) {
          res.redirect("/admin");
        }
        else {
          res.redirect("/compose");
        }
      });
    }
  });
});


app.get("/admin", function (req, res) {
  if (req.isAuthenticated() && req["user"].username == admin_username) {
    message_ = req.flash('message')[0];
    User.find(function (err, all_user) {
      if (err) {
        console.log(err);
      }
      else {
        all_user.forEach(function (each) {
          if (each.status == null && each.username != admin_username) {
            globalThis.users_printed_login_admin.push(String(each._id));
          }
        })
        res.render("admin", { user: all_user, err_msg: message_ });
      }
    });
  } else {
    res.redirect("/");
  }
});


app.post("/admin", function (req, res) {
  if (req.isAuthenticated() && req["user"].username == admin_username) {
    globalThis.users_printed_login_admin;
    accepted_ = Object.keys(req.body);
    accepted_.pop();
    rejected = users_printed_login_admin.filter((el) => !accepted_.includes(el));
    approved = accepted_;

    rejected.forEach(function (id) {
      User.findById(ObjectId(id), function (err, foundUser) {
        if (err) {
          console.log(err);
        } else {
          foundUser.status = "rejected";
          foundUser.save();
        };

      });

    });

    accepted_.forEach(function (id) {
      User.findById(ObjectId(id), function (err, foundUser) {
        if (err) {
          console.log(err);
        } else {
          foundUser.status = "accepted";
          foundUser.save();
        };

      });

    });

    req.flash('message', "saved")
    users_printed_login_admin = [];
    res.redirect("/admin");

  }

});

app.post("/modify_accepted", function (req, res) {
  if (req.isAuthenticated() && req["user"].username == admin_username) {
    to_reject_ = Object.keys(req.body);
    to_reject_.pop();
    to_reject = to_reject_;

    to_reject_.forEach(function (id) {
      User.findById(ObjectId(id), function (err, foundUser) {
        if (err) {
          console.log(err);
        } else {
          foundUser.status = "rejected";
          foundUser.save();
        };

      });

    });

    req.flash('message', "saved")
    users_printed_login_admin = [];
    res.redirect("/admin");

  }

});

app.post("/register", function (req, res) {
  User.register({ username: req.body.username }, req.body.password, function (err, user) {
    if (err) {
      // console.log(err);
      req.flash('message', "error");
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/compose");
      });
    }
  });

});


app.get("/compose", function (req, res) {

  if (req.isAuthenticated()) {
    message_ = req.flash('message')[0];
    sentence_ = req["user"].sentence;

    if (sentence_ == null && message_ == null) {
      res.render("compose", { message: "fresh" });
    }
    else if (sentence_ != null && message_ == null) {
      res.render("compose", { message: "alreadysaved", sentence: sentence_, status: req["user"].status });
    }
    else if (sentence_ != null && message_ != null) {
      res.render("compose", { message: message_, sentence: sentence_ });
    }

  } else {
    res.redirect("/")
  }

});



app.post("/compose", function (req, res) {
  const user_sentence = req.body.sentence;
  name_ = req.body.name;
  college_ = req.body.college;

  //Once the user is authenticated and their session gets saved, their user details are saved to req.user.
  // console.log(req.user);

  User.findById(req.user._id, function (err, foundUser) {
    if (err) {
      console.log(err);
    }

    else {
      if (foundUser) {
        foundUser.sentence = user_sentence;
        foundUser.name = name_;
        foundUser.college = college_;
        foundUser.save(function () {
          req.flash('message', "saved")
          res.redirect("/compose");
        });
      }
    }

  });
});



app.get("/logout", function (req, res) {
  req.session = null;
  req.logout();
  res.redirect("/");
});





app.listen(port, function () {
  console.log("Server started Successfully");
});




