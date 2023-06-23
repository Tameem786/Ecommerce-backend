// require("env").config()

const mongoose = require('mongoose')
const express = require('express')
const path =  require('path')
const cors = require('cors')
const { default: Stripe } = require('stripe')
const exp = require('constants')

const stripe = require('stripe')('sk_test_51NGhGYBAH6jnxsjloixUQgNVr71hJgpapHkrnSPO33PvygiN7muva3nD2XoixCXWWjekKMjDsnNuB2KmLT0S13NR00YFw2xBS2')
const app = express()

dbConnection()
.then(() => console.log('Database Connected!'))
.catch(err => console.log(err))

async function dbConnection() {
        await mongoose.connect('mongodb://localhost:27017/ecommerce')
}


const user = mongoose.model('users', new mongoose.Schema({
        username: String,
        email: String,
        password: String,
        phone: String,
        payment: String,
        address: String,
        cart: [],
}))

const product = mongoose.model('products', new mongoose.Schema({
        product_name: String,
        product_color: String,
        product_size: String,
        product_price: Number,
        img_url: String,
        tag: String
}))

const order = mongoose.model('orders', new mongoose.Schema({
        order_by: String,
        order_amount: Number,
        order_item: [],
}))


app.use(express.json())
app.use(express.static('public'))
app.use(cors(), function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "http://localhost:4200") // update to match the domain you will make the request from
        res.header(
          "Access-Control-Allow-Headers",
          "Origin, X-Requested-With, Content-Type, Accept"
        )
        next()
})
app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '/view/index.html'))
})
app.get('/api/users', (req, res) => {
        user.find({}).then((data) => {
                res.send(data)
        })
})
app.get('/api/products', (req, res) => {
        product.find({}).then((data) => {
                res.send(data);
        })
})
app.get('/api/product/:id', (req, res) => {
        product.findById(req.params.id).then((data) => {
                res.send(data);
        })
})
app.post('/api/product', async (req, res) => {
        await new product(req.body)
                .save()
                .then((product) => {
                        res.send(product)
                })
                .catch((error) => console.log(error))
})
app.delete('/api/product/:id', (req, res) => {
        product.findByIdAndDelete(req.params.id)
        .then(product => {
                res.send({status: 'Removed Successfully.'})
        }).catch((error)  => res.send(error))
})
app.get('/api/users/:id', (req, res) => {
        user.findById(req.params.id).then((data) => {
                res.send(data)
        })
}) 
app.delete('/api/user/:id', (req, res) => {
        user.findByIdAndDelete(req.params.id)
        .then((data) => {
                res.send({status: 'Removed Successfully'})
        }).catch((error) => {
                res.send({status: 'Error Occured!'})
        })
}) 
app.post('/api/user', async (req, res) => {
        await new user(req.body)
                .save()
                .then(() => {
                        console.log('Data Added!')
                        res.send('Data Added Suceessfully')
                })
                .catch((error) => console.log(error))
})
app.post('/api/login', (req, res) => {
        user.findOne({email: req.body.email})
        .then(user => {
                if(!user) res.status(404).json({error: 'Login Failed'})
                else {
                        if(req.body.password === user.password) {
                                res.status(200).json(user)
                        } else {
                                res.status(404).json({status: 'Login Failed'})
                        }
                }
        })
})
app.post('/api/signup', async (req, res) => {
        const newUser = user({
                username: req.body.username,
                email: req.body.email,
                password: req.body.password,
                phone: "",
                payment: "",
                address: "",
                cart: []
        })
        await newUser.save()
                .then(user => {res.status(200).json(user)})
                .catch(error => {res.status(500).json(error)})
})
app.put('/api/users/:id', (req, res) => {
        user.findByIdAndUpdate(req.params.id, 
        {
                phone: req.body.phone || "",
                payment: req.body.payment || "",
                address: req.body.address || "",
        }, {new: true})
        .then(user => {
                if(user) res.status(200).send({status: 'Data Updated!'})
        })
})
app.put('/api/user/cart/:id', (req, res) => {
        user.findByIdAndUpdate(req.params.id, {$push: {cart: req.body.cart}}, {new: true}).then(user => {
                res.status(200).send({status: 'Cart Added!'})
        })
})
app.delete('/api/user/:id/cart/:prod', (req, res) => {
        user.findByIdAndUpdate(req.params.id, {$pull: {cart: {product_id: req.params.prod}}}, {new: true})
        .then(user => {
                res.send(user)
        }).catch((error)  => res.send(error))
})
app.get('/api/user/cart/:id', (req, res) => {
        user.findById(req.params.id).then((data) => {
                res.send(data.cart)
        })
})
app.delete('/api/user/:id/cart', (req, res) => {
        user.findByIdAndUpdate(req.params.id, {cart: []}).then(user => {
                res.send(user)
        }).catch(error => {
                res.send(error)
        })
})
app.get('/api/orders', (req, res) => {
        order.find({}).then((data) => {
                res.send(data)
        })
})
app.post('/api/order', async (req, res) => {
        await new order(req.body)
                .save()
                .then(() => {
                        // console.log('Data Added!')
                        res.send('Order Added Suceessfully')
                })
                .catch((error) => console.log(error))
})
app.delete('/api/order/:id', (req, res) => {
        order.findByIdAndDelete(req.params.id).then(() => {
                res.send({status: 'Removed Successfully'})
        })
})

app.post('/api/payment/create-checkout-session/:name/:price', async (req, res) => {
       try {
                const product = await stripe.products.create({
                        name: req.params.name
                })
                const price = await stripe.prices.create({
                        unit_amount: req.params.price,
                        currency: 'myr',
                        product: product.id
                })
                const session = await stripe.checkout.sessions.create({
                        line_items: [
                                { 
                                        price: price.id,
                                        quantity: 5
                                }
                        ],
                        mode: 'payment',
                        success_url: 'http://localhost:3000/success',
                        cancel_url: 'http://localhost:3000/cancel',
                })
                res.json(session)
       } catch (e) {
                res.status(500).json({error: e.message})
       }
})

app.listen(3000, () => {
        console.log('App is running on http://localhost:3000')
})

