const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const bodyParser = require("body-parser");
const cors = require("cors");
require("./utils/cloudinary");
require("./db");
const passport = require("passport");
require("./config/passport")(passport);
const app = express();

const PORT = process.env.PORT || 5000;
app.use("/uploads", express.static("uploads"));
app.use(bodyParser.json()).use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());
app.use(cors());
const userRoutes = require("./Routes/userRoutes/userRoutes");
const productRoutes = require("./Routes/productRoutes/productRoutes");

app.get("/", (req, res) => {
  res.send("hello");
});

app.use(userRoutes);
app.use(productRoutes);
app.listen(PORT, () => {
  console.log("server started");
});
