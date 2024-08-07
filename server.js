// Existing imports and setup...
const express = require('express');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

app.get('/data', async (req, res) => {
    try {
        await client.connect();
        const database = client.db('RRMMS');
        const collection = database.collection('requests');
        const data = await collection.find({}).toArray();
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching data');
    } finally {
        await client.close();
    }
});

app.patch('/data/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).send('Status field is required');
    }

    try {
        await client.connect();
        const database = client.db('RRMMS');
        const collection = database.collection('requests');

        const result = await collection.findOneAndUpdate(
            { Request_ID: id },
            { $set: { Status: status } },
            { returnOriginal: false }
        );

        if (result.value) {
            res.json(result.value);
        } else {
            res.status(404).send('Request not found');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating status');
    } finally {
        await client.close();
    }
});

// For login
mongoose.connect('mongodb://localhost:27017/users1');

// User Schema with custom collection name
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, { collection: 'custom_users_collection' });

const User = mongoose.model('User', userSchema);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}));
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/screen1.html');
    } else {
        res.sendFile(__dirname + 'login.html');
    }
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const user = new User({ username, password: hashedPassword });
        await user.save();
        req.session.userId = user._id;
        req.session.username = user.username;
        res.status(200).send('Registration successful');
    } catch (e) {
        res.status(400).send('Error registering user.');
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user._id;
        req.session.username = user.username;
        res.status(200).send('Login successful');
    } else {
        res.status(400).send('Invalid username or password.');
    }
});

app.get('/screen1.html', (req, res) => {
    if (req.session.userId) {
        res.sendFile(__dirname + 'screen1.html');
    } else {
        res.redirect('/');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(400).send('Error logging out.');
        }
        res.redirect('/');
    });
});

// Add user data to the usermanagements1 collection
const userManagementSchema = new mongoose.Schema({
    userType: String,
    firstName: String,
    email: String,
    phoneNumber: String,
    address: String,
    colony: String,
    terms: Boolean
}, { collection: 'usermanagements1' });

const UserManagement = mongoose.model('UserManagements1', userManagementSchema);

app.post('/api/users', async (req, res) => {
    const { userType, firstName, email, phoneNumber, address, colony, terms } = req.body;
    const newUser = new UserManagement({ userType, firstName, email, phoneNumber, address, colony, terms });

    try {
        await newUser.save();
        res.status(201).send('User added successfully');
    } catch (error) {
        res.status(400).send('Failed to add user');
    }
});

app.get('/usermanagements1', async (req, res) => {
    try {
        await client.connect();
        const database = client.db('users1');
        const collection = database.collection('usermanagements1');
        const data = await collection.find({}).toArray();
       
        res.json(data);
    } catch (error) {
        console.error('Error fetching data:', error); // Error log
        res.status(500).send('Error fetching data');
    } finally {
        await client.close();
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}/login.html`);
});
