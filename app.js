//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require('mongoose-findorcreate');
let alert = require('alert');
const { request } = require("express");
var flash = require("connect-flash")
var ObjectId = require('mongodb').ObjectID;


const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
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
  email: String,
  password: String,
  rollno: String,
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
              res.render("admin", { user: all_user, err_msg: err_message });
            }
          });
        }
        else {
          res.redirect("/compose");
        }
      });
    }
  });
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
  const submittedSecret = req.body.sentence;
  name_ = req.body.name;
  rollno_ = req.body.rollno;

  //Once the user is authenticated and their session gets saved, their user details are saved to req.user.
  // console.log(req.user);

  User.findById(req.user._id, function (err, foundUser) {
    if (err) {
      console.log(err);
    }

    else {
      if (foundUser) {
        foundUser.sentence = submittedSecret;
        foundUser.name = name_;
        foundUser.rollno = rollno_;
        foundUser.save(function () {
          req.flash('message', "saved")
          res.redirect("/compose");
        });
      }
    }

  });
});



app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});


app.post("/admin", function (req, res) {
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

  req.flash('message', "Saved Successfully")
  res.redirect("/login");

});





app.listen(3000, function () {
  console.log("Server started on port 3000.");
});




