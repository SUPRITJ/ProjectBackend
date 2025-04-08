// Initialization
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const { User } = require('./Model/User');
const morgan = require('morgan');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Product } = require('./Model/Product');
const { Cart } = require('./Model/Cart');

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

mongoose.connect('mongodb+srv://supritjamdar:yb3FlaCF8HbOQWpO@cluster0.k8mgvay.mongodb.net/?retryWrites=true&w=majority&')
  .then(() => {
    console.log("Database is connected");
  })
  .catch((error) => {
    console.log("DB is not connected", error);
  });

// Task-1: Create route for registering a user
app.post('/register', async (req, res) => {
  try {
    let { name, email, password } = req.body;

    // Check if any field is missing
    if (!name || !email || !password) {
     res.status(400).json({ message: "Please fill all the fields" });
    }

    // Check if user already exists
    const user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ message: "User already exists" });
    } else {
      // Hash the password -> secure password
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);

      // User authentication
      const token = jwt.sign({ email }, "supersecret", { expiresIn: "365d" });

      // Create user in database
      await User.create({
        name,
        email,
        password: hashedPassword,
        token,
        role: "user"
      });

      res.status(200).json({ message: "User registered successfully" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Task-2: Create route for logging in a user
app.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;

    // Check if any field is missing
    if (!email || !password) {
      return res.status(400).json({ message: "Please fill all the fields" });
    }

    // Check if user exists
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatchedPassword = bcrypt.compareSync(password, user.password);

    if (!isMatchedPassword) {
      return res.status(400).json({ message: "Password is incorrect" });
    }

    return res.status(200).json({
      message: "User logged in successfully",
      id: user._id,
      name: user.name,
      token: user.token,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Task-3: Create route to see all products
app.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({
      message: "Products found successfully",
      products: products
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  } 
});

// Task-4: Create route to add a product
app.post('/add-product', async (req, res) => {
  try {
    const { name, price, stock, brand, description, image } = req.body;
    const {token} = req.headers;

    // Verify token
    const decodedToken = jwt.verify(token, "supersecret");
    const user = await User.findOne({ email: decodedToken.email });

    // Create product in database
    const product = await Product.create({
      name,
      price,
      stock,
      brand,
      description,
      image,
      user: user._id,
    });

    return res.status(201).json({
      message: "Product added successfully",
      product:product
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Task-5: Create route to see a particular product
app.get('/product/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
        res.status(400).json({
        message: "Product ID is required",
      });
    }

    const {token} = req.headers;
    const decodedToken = jwt.verify(token, "supersecret");

    if (decodedToken.email) {
        const product = await Product.findById(id);

    if (!product) {
     res.status(404).json({
        message: "Product not found",
      });
    }

     res.status(200).json({
      message: "Product found successfully",
      product
    });
    }
    
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Task-6: Create route to update a product
app.patch('/product/edit/:id', async (req, res) => {
  const { id } = req.params;
    const { name, price, stock, brand, description, image } = req.body.productData;
    const {token} = req.headers;

    // Verify token
    const decodedToken = jwt.verify(token, "supersecret");
try {
    
    if (decodedToken.email) {
      const updatedproduct = await Product.findByIdAndUpdate(id, {
          name,
          brand,
          description,
          image,
          price,
          stock,
        }
      );
        res.status(200).json({
        message: "Product updated successfully",
        product: updatedproduct
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Task-7: Create route to delete a product
app.delete('/product/delete/:id', async (req, res) => {
  
  try {
  const { id } = req.params;

  if(!id) {
    return res.status(400).json({
      message: "Product ID is required",
    });
  }

  let deletedProduct = await Product.findByIdAndDelete(id);
  if (!deletedProduct) {
    return res.status(404).json({
      message: "Product not found",
    });
  }
    return  res.status(200).json({
        message: "Product deleted successfully",
        product: deletedProduct,
      });
    }
   catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//task-8: create route to see all product in cart
app.get('/cart', async (req, res) => {
  try {
    let {token} = req.headers;
    const decodedToken = jwt.verify(token, "supersecret");

    const user = await User.findOne({ email: decodedToken.email }).populate({
      path: 'cart',
      populate: { path: 'products',model:'Product' },
      
    });
    
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Cart found successfully",
      cart: user.cart
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Task-9: Create route to add a product in cart
app.post('/cart/add', async (req, res) => {
  try {

    const body = req.body;

    //getting product id from frontend 
    const productArray = body.products;
    let totalPrice = 0;

    //find the product and add product price in total
    for(let item of productArray) {
      const product = await Product.findById(item);
      if (product) {
        totalPrice += product.price;
      } 
    }

    const { token } = req.headers;
    const decodedToken = jwt.verify(token, "supersecret");

    // Check if user exists
    const user = await User.findOne({ email: decodedToken.email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check if user already has a cart
    let cart;
    if (user.cart) {
       cart = await Cart.findById(user.cart).populate('products');
      
      const existingProductIds = cart.products.map((product) => {product._id.toString()});


      //if product is not already in the cart add product in cart
      productArray.forEach(async(productId) => {
        if (!existingProductIds.includes(productId)) {
          cart.products.push(productId);
          const product = await Product.findById(productId);
          totalPrice += product.price;
        }
      });
      
      //updating cart total price
      cart.total = totalPrice;
      await cart.save();
    } else{

      //create new cart
      cart= new Cart({
        products:productArray,
        total: totalPrice
      })
      await cart.save();
      user.cart = cart._id;
      await user.save();
      
    }
    
return res.status(200).json({
  message:"product added to cart successfully",
  cart:cart
})

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//task-10: create route to delete a product from cart
app.delete('/cart/product/delete', async (req, res) => {
  try {
    const { productID } = req.body;
    const { token } = req.headers;
    const decodedToken =jwt.verify(token, "supersecret");

    // Check if user exists
    const user = await User.findOne({ email: decodedToken.email }).populate("cart");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Find the cart and remove the product
    const cart = await Cart.findById(user.cart).populate("products");

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found",
      });
    }

    const productIndex = cart.products.findIndex((product) => product._id.toString() === productID);

    if (productIndex === -1) {
      return res.status(404).json({
        message: "Product not found in cart",
      });
    }

    // Remove the product from the cart
    cart.products.splice(productIndex, 1);

    cart.total = cart.products.reduce((total, product) => total + product.price, 0);

    await cart.save();

    return res.status(200).json({
      message: "Product removed from cart successfully",
      cart: cart,
    });


    
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});



// Start the server
let PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server is connected to port ${PORT}`);
});