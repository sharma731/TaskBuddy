const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb'); // Import ObjectId from mongodb

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// MongoDB setup
const uri = "mongodb+srv://sharmamonty1207:HkAAdAPfT9To9Z2H@taskbuddy.od08l.mongodb.net/?retryWrites=true&w=majority&appName=taskbuddy";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
let userCollection;
let taskCollection;

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db("taskbuddy");
    userCollection = db.collection("users");
    taskCollection = db.collection("tasks");  // Connect to the orders collection

    // Dummy user data with ObjectId
    const dummyUser = {
      email: "admin@domain.com",
      firstName: "Test",
      lastName: "User",
      gender: "male",
      password: "admin"
    };

    // Dummy order data
    const dummyTask = {
      taskName: "xyz",
      deadline: "2024-09-22",
      notification: "true",
      importance: "High",
      customerEmail: "admin@domain.com",
      createdAt: "2024-09-30"
    };

    // Check if the dummy user exists, if not, insert it
    const existingUser = await userCollection.findOne({ email: dummyUser.email });
    if (!existingUser) {
      await userCollection.insertOne(dummyUser);
      console.log('Test user data inserted successfully into users collection');
    } else {
      console.log('Test user already exists in the database, skipping insertion');
    }

    // Check if the dummy order exists, if not, insert it
    const existingOrder = await taskCollection.findOne({ orderNo: dummyTask.taskNo });
    if (!existingOrder) {
      await taskCollection.insertOne(dummyTask);
      console.log('Test task data inserted successfully into orders collection');
    } else {
      console.log('Test task already exists in the database, skipping insertion');
    }

  } catch (err) {
    console.error('Error connecting to MongoDB or inserting data:', err);
    process.exit(1);
  }
}

connectToMongoDB(); // Call the function to connect and insert data

// Routes
app.get('/', (req, res) => {
  res.send('<h3>Welcome to TaskBuddy Hybrid server app!</h3>');
});

app.get('/getUserDataTest', async (req, res) => {
  try {
    console.log("GET request received\n");
    const docs = await userCollection.find({}, { projection: { _id: 0 } }).toArray();
    console.log(JSON.stringify(docs) + " have been retrieved.\n");
    res.status(200).send("<h1>" + JSON.stringify(docs) + "</h1>");
  } catch (err) {
    console.log("Some error.. " + err + "\n");
    res.status(500).send(err);
  }
});

app.get('/getTaskDataTest', async (req, res) => {
  try {
    console.log("GET request received\n");
    const docs = await taskCollection.find({}, { projection: { _id: 0 } }).toArray();
    console.log(JSON.stringify(docs) + " have been retrieved.\n");
    res.status(200).send("<h1>" + JSON.stringify(docs) + "</h1>");
  } catch (err) {
    console.log("Some error.. " + err + "\n");
    res.status(500).send(err);
  }
});

app.post('/verifyUser', async (req, res) => {
  try {
    console.log("POST request received : " + JSON.stringify(req.body) + "\n");
    const loginData = req.body;
    const docs = await userCollection.find({ email: loginData.email, password: loginData.password }, { projection: { _id: 0 } }).toArray();
    console.log(JSON.stringify(docs) + " have been retrieved.\n");
    res.status(200).send(docs);
  } catch (err) {
    console.log("Some error.. " + err + "\n");
    res.status(500).send(err);
  }
});

app.get('/getAllUsers', async (req, res) => {
	try {
	  const users = await userCollection.find({}, { projection: { email: 1, password: 1, _id: 0 } }).toArray();
	  console.log("All Users: ", users);
	  res.status(200).json(users);
	} catch (err) {
	  console.error('Error retrieving users:', err);
	  res.status(500).send("Failed to retrieve users.");
	}
});

app.post('/addTask', async (req, res) => {
  try {
    console.log("POST request received: " + JSON.stringify(req.body) + "\n");

    // Check if the request body is valid
    if (!req.body || !req.body.taskName || !req.body.deadline || !req.body.importance || req.body.email === undefined) {
      console.error("Invalid data received.");
      return res.status(400).send("Invalid data.");
    }

    // Create a new task object
    const newTask = {
      taskName: req.body.taskName,
      deadline: req.body.deadline,
      notification: req.body.notification || false, // Default to false if not provided
      importance: req.body.importance,
      customerEmail: req.body.email, // Use customerEmail to match your database structure
      createdAt: new Date() // Optional: Track when the task was created
    };

    // Insert the new task into the database
    const result = await taskCollection.insertOne(newTask);
    console.log("Task record with ID " + result.insertedId + " has been inserted\n");
    
    // Send a success response
    res.status(200).send({ message: "Task added successfully", taskId: result.insertedId });
  } catch (err) {
    console.log("Error occurred: " + err + "\n");
    res.status(500).send(err);
  }
});


app.post('/signup', async (req, res) => {
    try {
        const { email, password, firstName, lastName, gender } = req.body;
        
        const existingUser = await userCollection.findOne({ email });
        if (existingUser) {
            return res.status(400).send({ error: 'Email already exists' });
        }

        const newUser = {
            email,
            password,
            firstName,
            lastName,
            gender
        };
        const result = await userCollection.insertOne(newUser);

        console.log(`New user created with ID: ${result.insertedId}`);
        res.status(201).send({ message: 'User registered successfully' });
		const insertedUser = await userCollection.findOne({ _id: result.insertedId });
        console.log("Inserted user: ", insertedUser);
    } catch (error) {
        console.error("Error during signup: ", error);
        res.status(500).send({ error: 'An error occurred during signup' });
    }
});
// Retrieve tasks for the currently logged-in user based on priority
app.post('/getUserTasks', async (req, res) => {
  try {
    const { email, priority } = req.body; // Get the user's email and priority from the request body
    console.log(`POST request received for user tasks: ${email} with priority: ${priority}\n`);

    // Define the query for fetching tasks
    let query = { customerEmail: email };
    if (priority && priority.toLowerCase() !== 'all') {
      query.importance = priority; // Filter by importance if priority is not 'all'
    }

    // Fetch tasks from the task collection for the current user
    const tasks = await taskCollection.find(query).toArray();

    if (tasks.length > 0) {
      console.log(`Tasks retrieved for ${email}:`, tasks);
      res.status(200).json(tasks); // Send tasks back to the client
    } else {
      console.log(`No tasks found for ${email}`);
      res.status(404).send({ message: "No tasks found" });
    }
  } catch (err) {
    console.log(`Error retrieving tasks for user ${email}:`, err);
    res.status(500).send(err);
  }
});
app.get('/getTask/:id', async (req, res) => {
  try {
      const { id } = req.params;
      console.log('Received ID:', id); // Debug line
      const task = await taskCollection.findOne({ _id: new ObjectId(id) });

      if (task) {
          res.status(200).json(task);
      } else {
          res.status(404).send({ message: "Task not found" });
      }
  } catch (err) {
      console.log(`Error retrieving task with ID ${req.params.id}:`, err);
      res.status(500).send(err);
  }
});
// update task 
app.put('/updateTask/:id', async (req, res) => {
  try {
      const { id } = req.params; // Get the task ID from the request parameters
      const { taskName, deadline } = req.body; // Get updated task details from the request body

      // Find the task by ID and update it
      const updatedTask = await taskCollection.updateOne(
          { _id: new ObjectId(id) }, // Find task by ID
          { $set: { taskName, deadline } } // Set new values for task name and deadline
      );

      if (updatedTask.modifiedCount > 0) {
          res.status(200).send({ message: "Task updated successfully" });
      } else {
          res.status(404).send({ message: "Task not found" });
      }
  } catch (err) {
      console.log(`Error updating task with ID ${req.params.id}:`, err);
      res.status(500).send(err);
  }
});

// Delete a task by ID
app.post('/deleteTask', async (req, res) => {
  try {
    const { id } = req.body; // Get the task ID from the request body
    console.log(`POST request received to delete task: ${id}\n`);

    // Delete the task from the database
    const result = await taskCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 1) {
      console.log(`Task ${id} deleted successfully`);
      res.status(200).send({ message: "Task deleted successfully" });
    } else {
      console.log(`Task ${id} not found`);
      res.status(404).send({ message: "Task not found" });
    }
  } catch (err) {
    console.log(`Error deleting task ${id}:`, err);
    res.status(500).send(err);
  }
});

app.get('/analytics/:email', async (req, res) => {
  try {
      const { email } = req.params;
      const tasks = await taskCollection.find({ customerEmail: email }).toArray(); // Fetch tasks for the user

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.completed).length; // Filter for completed tasks
      const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      res.status(200).json({
          totalTasks,
          completedTasks,
          completionPercentage
      });
  } catch (err) {
      console.log(`Error retrieving analytics for email ${req.params.email}:`, err);
      res.status(500).send(err);
  }
});

// Start server
app.listen(port, () => {
  console.log(`TaskBuddy server app listening at http://localhost:${port}`);
});