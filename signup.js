const { userCollection } = require('./dbConnection'); // Import userCollection from dbConnection.js

async function signup(req, res) {
    try {
        // Check if the database collection is initialized
        if (!userCollection) {
            return res.status(500).send({ error: 'Database not initialized' });
        }

        // Destructure the request body to get user details
        const { email, password, firstName, lastName, state, phone, address, postcode } = req.body;

        // Check if user with the same email already exists
        const existingUser = await userCollection.findOne({ email });
        if (existingUser) {
            return res.status(400).send({ error: 'Email already exists' });
        }

        // Construct a new user object
        const newUser = {
            email,
            password,  // You should hash the password before storing it in a real-world application
            firstName,
            lastName,
            state,
            phone,
            address,
            postcode
        };

        // Insert the new user into the collection
        const result = await userCollection.insertOne(newUser);

        // Log the ID of the newly created user
        console.log(`New user created with ID: ${result.insertedId}`);

        // Send success response
        res.status(201).send({ message: 'User registered successfully' });

        // Log the inserted user from the database for verification
        const insertedUser = await userCollection.findOne({ _id: result.insertedId });
        console.log("Inserted user: ", insertedUser);
    } catch (error) {
        // Handle any errors during the signup process
        console.error("Error during signup: ", error);
        res.status(500).send({ error: 'An error occurred during signup' });
    }
}

module.exports = { signup };  // Export the signup function for use in other parts of your application
