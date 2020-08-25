const User = require("../../Model/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary");
const nodemailer = require("nodemailer");
const Product = require("../../Model/Product");
const smtpTransport = require("nodemailer-smtp-transport");
const validateRegisterData = require("../../config/validation/registerValidator");
const validateLoginData = require("../../config/validation/loginValidator");

module.exports = {
  //Register user
  registerUser: async (req, res) => {
    const { errors, isValid } = validateRegisterData(req.body);

    //checking for validation
    if (!isValid) {
      return res.status(400).json(errors);
    }

    console.log(req.body);
    const user = await User.findOne({ "local.email": req.body.email });
    if (user) {
      return res
        .status(400)
        .json({ message: "Email Already Exists, Please Login" });
    } else {
      const newUser = new User({
        method: "local",
        name: req.body.name,
        contactNo: req.body.contactNo,
        city: req.body.city,
        facebook: "",
        instagram: "",
        image: "https://www.gravatar.com/avatar/anything?s=200&d=mm",
        local: {
          email: req.body.email,
          password: req.body.password,
        },
      });
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.local.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.local.password = hash;
          newUser
            .save()
            .then((user) =>
              res.json({
                message: "Registered successfully. You can log in now",
                user: user,
                status: 201,
              })
            )
            .catch((err) => console.log(err));
        });
      });
    }
  },
  loginUser: async (req, res) => {
    const { errors, isValid } = validateLoginData(req.body);

    if (!isValid) {
      return res.status(400).json(errors);
    }
    const email = req.body.email;
    const password = req.body.password;
    User.userFind(email, password)
      .then((user) => {
        if (!user) {
          return res
            .status(404)
            .json({ message: "User not existed, Please register!!" });
        }
        const payload = {
          id: user.id,
          method: user.method,
          name: user.name,
          email: user.local.email,
          image: user.image,
          city: user.city,
          contactNo: user.contactNo,
          facebook: user.facebook,
          youtube: user.youtube,
          instagram: user.instagram,
        };
        jwt.sign(
          payload,
          "secret key",
          { expiresIn: 60 * 60 * 1 },
          (err, token) => {
            res.json({
              message: "Logged in Successfully",
              token: token,
            });
          }
        );
      })
      .catch((err) => {
        res.status(401).json({ message: "Incorrect Credentials" });
      });
  },

  googleLogin: async (req, res) => {
    let payId;

    const existingUser = await User.findOne({ "google.id": req.body.id });
    if (!existingUser) {
      const newGoogleUser = new User({
        method: "google",
        name: req.body.name,
        image: req.body.image,
        google: {
          id: req.body.id,
          email: req.body.email,
        },
      });
      await newGoogleUser
        .save()
        .then((user) => (payId = user))
        .catch((err) => console.log(err));
    } else {
      console.log("User already exists in database");
      payId = existingUser;
    }

    const jwtPayload = {
      id: payId.id,
      method: payId.method,
      name: payId.name,
      email: payId.google.email,
      image: payId.image,
      city: payId.city,
      contactNo: payId.contactNo,
      facebook: payId.facebook,
      youtube: payId.youtube,
      instagram: payId.instagram,
    };
    jwt.sign(
      jwtPayload,
      "secret key",
      { expiresIn: 60 * 60 * 1 },
      (err, token) => {
        res.json({
          message: "Logged in Google Successfully",
          token: token,
        });
      }
    );
  },
  editprofile: async (req, res) => {
    // Get fields
    const userField = {};
    if (req.body.name) userField.name = req.body.name;
    if (req.body.city) userField.city = req.body.city;
    if (req.body.contactNo) userField.contactNo = req.body.contactNo;
    if (req.body.facebook) userField.facebook = req.body.facebook;
    // if (req.body.youtube) userField.youtube = req.body.youtube;
    if (req.body.instagram) userField.instagram = req.body.instagram;
    if (req.file) {
      console.log(req.file.path);
      let wait = await cloudinary.uploader.upload(req.file.path, function (
        response,
        error
      ) {
        if (response) {
          console.log(response);
        }
        if (error) {
          console.log(error);
        }
      });
      userField.image = wait.url;
    }

    User.findByIdAndUpdate(
      { _id: req.user.id },
      { $set: userField },
      { new: true }
    ).then((user) => {
      res.status(200).json({ message: "Updated successfully", data: user });
    });
  },
  addTowishlist: async (req, res) => {
    const userId = req.user.id;
    const proID = req.params.productId;
    const productId = proID.slice(10);
    console.log(productId);
    try {
      const data = await User.findById(userId);
      if (data.myWishlist.includes(productId)) {
        res.send("alredy added");
      } else {
        await User.findByIdAndUpdate(
          { _id: userId },
          { $push: { myWishlist: productId } },

          { new: true }
        ).then(function (data) {
          res.status(201).json({ message: "added to wishlist", data: data });
        });
      }
    } catch {
      res.status(404).send("user not found");
    }
  },
  deleteFromWishList: async (req, res) => {
    const userid = req.user.id;
    const productId = req.params.productId;
    console.log(productId);
    await User.updateOne(
      { _id: userid },
      {
        $pullAll: { myWishlist: [productId] },
      }
    )
      .then((data) => {
        res.status(201).json({ message: "Deleted Succesfully", data: data });
      })
      .catch((error) => {
        res.status(404).send("user not found");
      });
  },

  userEmailDetails: async (req, res) => {
    const userid = req.user.id;
    const user1id = await User.findById(userid);
    const userName = user1id.name;
    const userEMAIL = user1id.local.email || user1id.google.email;

    console.log(userEMAIL);
    const id = req.params.product_id;
    console.log(id);
    const product = await Product.findById(id);
    console.log(product);
    const name = product.title;
    const city = product.city;
    const ownerid = product.user;
    const owner = await User.findById(ownerid);
    const owner_name = owner.name;
    const owner_email = owner.local.email || owner.google.email;
    const owner_phone = owner.contactNo;

    var transport = nodemailer.createTransport(
      smtpTransport({
        service: "Gmail",
        // debug : process.env.NODE_ENV === "development" ,
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: "snehagurav37@gmail.com",
          pass: "yspqpyelalsfcjmi",
        },
      })
    );
    const mailoptions = {
      from: "snehagurav37@gmail.com",
      to: userEMAIL,
      subject: "Product Owner details by Market-Time",
      text: `" Hi ${userName},
     You have requested for the product ${name} and city ${city} ,the owner details are given below name:
    owner name: ${owner_name}, owner-email address: ${owner_email}, owner contact-number:${owner_phone}"`,
    };
    transport.sendMail(mailoptions, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        console.log("sent mail");
        res.json(
          "Owner details for this Product has been sent to your email-address, Please check your Inbox."
        );
      }
    });
  },

  forgetpassword: async (req, res) => {
   
    User.findOne({ "local.email": req.body.email }, function (error, userData) {
      var transporter = nodemailer.createTransport({
        // service: 'gmail',//smtp.gmail.com  //in place of service use host...

        // auth: {
        //     user: 'ashutosh.choubey@codeclouds.in',
        //     pass: 'ashu@q@w3e4r%'
        // }
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: "snehagurav37@gmail.com",
          pass: "yspqpyelalsfcjmi"
        }

      });
      var currentDateTime = new Date();
      var mailOptions = {
        from: "snehagurav37@gmail.com",
        to: req.body.email,
        subject: 'Password Reset',
        // text: 'That was easy!',
        html: "<h1>Welcome To Daily Task Report ! </h1><p>\
            <h3>Hello "+ userData.name + "</h3>\
            If You are requested to reset your password then click on below link<br/>\
            <a href='http://localhost:3000/change-password/"+ currentDateTime + "+++" + userData.local.email + "'>Click On This Link</a>\
            </p>"
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
          User.updateOne({ "local.email": userData.local.email }, {
            token: currentDateTime,

          }, { multi: true }, function (err, affected, resp) {
            return res.status(200).json({
              success: false,
              msg: info.response,
              userlist: resp
            });
          })
        }
      });
    })
  },
};
