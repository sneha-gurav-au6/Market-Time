const express = require("express");
const User = require("../../Model/User");

module.exports = {
  getUserProfile: async (req, res) => {
    const userId = req.user.id;
    try {
      const user = await User.findById(userId);
      console.log(user);
      res.status(200).send(user);
    } catch {
      res.status(501).send("Internal server error");
    }
  },

  getWishList: async (req, res) => {
    const userId = req.user.id;
    try {
      const userWishList = await User.findById(userId);
      console.log(userWishList.myWishlist);
      const wishList = userWishList.myWishlist;
      const sliced = wishList.slice(0, 11);

      res.status(200).send(wishList);
    } catch {
      res.status(400).send("No products found in Wishlist");
    }
  },

  getMyProduct:async (req,res)=>{
      const userId = req.user.id;
      try{
          const userProducts = await User.findById(userId);
          const myProduct = userProducts.myProducts

        res.status


      }catch{
          res.status(400).send("Product Not Found")
      }
  }
};
