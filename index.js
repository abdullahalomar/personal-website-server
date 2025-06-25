const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("portfolio");
    const collection = db.collection("users");
    const blogCollection = db.collection("blogs");
    const aboutCollection = db.collection("about");
    const projectCollection = db.collection("projects");

    // User Registration
    app.post("/api/v1/register", async (req, res) => {
      const { name, email, password } = req.body;

      // Check if email already exists
      const existingUser = await collection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await collection.insertOne({ name, email, password: hashedPassword });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login
    app.post("/api/v1/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await collection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.EXPIRES_IN,
      });

      res.json({
        success: true,
        message: "Login successful",
        token,
        user,
      });
    });

    // Get all users
    app.get("/api/v1/users", async (req, res) => {
      try {
        const users = await collection.find({}).toArray();
        res.json({
          success: true,
          data: users,
        });
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({
          success: false,
          message: "Error fetching users",
        });
      }
    });

    // Get a single user by ID
    app.get("/api/v1/users/:id", async (req, res) => {
      const userId = req.params.id;

      try {
        const user = await collection.findOne({
          _id: new ObjectId(userId),
        });

        if (user) {
          res.json({
            success: true,
            data: user,
          });
        } else {
          res.status(404).json({
            success: false,
            message: "User not found",
          });
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({
          success: false,
          message: "Error fetching user",
        });
      }
    });

    // Blog Apis
    // ==============================================================
    // Blog Post Operation
    app.post("/api/v1/blogs", async (req, res) => {
      const { image, title, description } = req.body;
      console.log(req.body);

      try {
        // Create current timestamp
        const currentTime = new Date();

        // Insert blog into the blog collection with timestamps
        const result = await blogCollection.insertOne({
          image,
          title,
          description,
          createdAt: currentTime,
          updatedAt: currentTime,
          publishedAt: currentTime, // When the blog was published
        });

        console.log(result);

        res.status(201).json({
          success: true,
          message: "Blog added successfully",
          data: {
            _id: result.insertedId,
            image,
            title,
            description,
            createdAt: currentTime,
            updatedAt: currentTime,
            publishedAt: currentTime,
          },
        });
      } catch (error) {
        console.error("Error adding blog:", error);
        res.status(500).json({
          success: false,
          message: "Error adding blog",
          error: error.message,
        });
      }
    });

    // Get all blogs

    app.get("/api/v1/blogs", async (req, res) => {
      try {
        const blogs = await blogCollection.find({}).toArray();
        res.json({
          success: true,
          data: blogs,
        });
      } catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).json({
          success: false,
          message: "Error fetching blogs",
        });
      }
    });

    // blog Delete Operation
    app.delete("/api/v1/blogs/:id", async (req, res) => {
      try {
        const id = req.params.id;

        // Validate ID format
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid blog ID format",
          });
        }

        const query = { _id: new ObjectId(id) };
        const result = await blogCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Blog not found",
          });
        }

        res.status(200).json({
          success: true,
          message: "Blog deleted successfully",
          data: result,
        });
      } catch (error) {
        console.error("Error deleting blog:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
      }
    });

    // Get a single blog item by ID
    app.get("/api/v1/blogs/:id", async (req, res) => {
      const blogId = req.params.id;

      try {
        const blog = await blogCollection.findOne({
          _id: new ObjectId(blogId),
        });

        if (blog) {
          res.json({
            success: true,
            data: blog,
          });
        } else {
          res.status(404).json({
            success: false,
            message: "blog not found",
          });
        }
      } catch (error) {
        console.error("Error fetching blog:", error);
        res.status(500).json({
          success: false,
          message: "Error fetching blog",
        });
      }
    });

    // update blog
    app.put("/api/v1/blogs/:id", async (req, res) => {
      const blogId = req.params.id;
      const { title, image, description } = req.body;

      try {
        // Validate ID
        if (!ObjectId.isValid(blogId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid blog ID",
          });
        }

        // Update blog
        const result = await blogCollection.findOneAndUpdate(
          { _id: new ObjectId(blogId) },
          {
            $set: {
              title,
              description,
              image,
              updatedAt: new Date(),
            },
          },
          {
            returnDocument: "after",
            upsert: false, // Make sure we don't create new document if not found
          }
        );

        // Check if blog was found and updated
        if (!result) {
          return res.status(404).json({
            success: false,
            message: "Blog not found",
          });
        }

        // Return updated blog with success response
        res.status(200).json({
          success: true,
          message: "Blog updated successfully",
          data: result, // result itself contains the updated document
        });
      } catch (error) {
        console.error("Error updating blog:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
      }
    });

    // ==============================================================

    // About Apis
    // ==============================================================
    // About Post Operation
    app.post("/api/v1/about", async (req, res) => {
      const { image, occupation, description, email, phone } = req.body;
      console.log(req.body);

      try {
        const result = await aboutCollection.insertOne({
          image,
          occupation,
          description,
          email,
          phone,
        });

        console.log(result);

        res.status(201).json({
          success: true,
          message: "About added successfully",
          data: {
            _id: result.insertedId,
            image,
            occupation,
            description,
            email,
            phone,
          },
        });
      } catch (error) {
        console.error("Error adding about:", error);
        res.status(500).json({
          success: false,
          message: "Error adding about",
          error: error.message,
        });
      }
    });

    // Get all About

    app.get("/api/v1/about", async (req, res) => {
      try {
        const about = await aboutCollection.find({}).toArray();
        res.json({
          success: true,
          data: about,
        });
      } catch (error) {
        console.error("Error fetching about:", error);
        res.status(500).json({
          success: false,
          message: "Error fetching about",
        });
      }
    });

    // About Delete Operation
    app.delete("/api/v1/about/:id", async (req, res) => {
      try {
        const id = req.params.id;

        // Validate ID format
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid about ID format",
          });
        }

        const query = { _id: new ObjectId(id) };
        const result = await aboutCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "About not found",
          });
        }

        res.status(200).json({
          success: true,
          message: "About deleted successfully",
          data: result,
        });
      } catch (error) {
        console.error("Error deleting about:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
      }
    });

    // Get a single About item by ID
    app.get("/api/v1/about/:id", async (req, res) => {
      const aboutId = req.params.id;

      try {
        const about = await aboutCollection.findOne({
          _id: new ObjectId(aboutId),
        });

        if (about) {
          res.json({
            success: true,
            data: about,
          });
        } else {
          res.status(404).json({
            success: false,
            message: "about not found",
          });
        }
      } catch (error) {
        console.error("Error fetching about:", error);
        res.status(500).json({
          success: false,
          message: "Error fetching about",
        });
      }
    });

    // update about
    app.put("/api/v1/about/:id", async (req, res) => {
      const aboutId = req.params.id;
      const { occupation, image, description, email, phone } = req.body;

      try {
        // Validate ID
        if (!ObjectId.isValid(aboutId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid about ID",
          });
        }

        // Update about
        const result = await aboutCollection.findOneAndUpdate(
          { _id: new ObjectId(aboutId) },
          {
            $set: {
              image,
              occupation,
              description,
              email,
              phone,
            },
          },
          {
            returnDocument: "after",
            upsert: false, // Make sure we don't create new document if not found
          }
        );

        // Check if about was found and updated
        if (!result) {
          return res.status(404).json({
            success: false,
            message: "about not found",
          });
        }

        // Return updated about with success response
        res.status(200).json({
          success: true,
          message: "about updated successfully",
          data: result, // result itself contains the updated document
        });
      } catch (error) {
        console.error("Error updating about:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
      }
    });
    // ==============================================================

    // Projects API
    // ==============================================================
    // Project Post Operation
    app.post("/api/v1/projects", async (req, res) => {
      const { image, title, subTitle, description, gitLink, demoLink } =
        req.body;
      console.log(req.body);

      try {
        // Create current timestamp
        const currentTime = new Date();

        // Insert project into the project collection with timestamps
        const result = await projectCollection.insertOne({
          image,
          title,
          subTitle,
          description,
          gitLink,
          demoLink,
          createdAt: currentTime,
          updatedAt: currentTime,
          publishedAt: currentTime, // When the project was published
        });

        console.log(result);

        res.status(201).json({
          success: true,
          message: "Project added successfully",
          data: {
            _id: result.insertedId,
            image,
            title,
            subTitle,
            description,
            gitLink,
            demoLink,
            createdAt: currentTime,
            updatedAt: currentTime,
            publishedAt: currentTime,
          },
        });
      } catch (error) {
        console.error("Error adding project:", error);
        res.status(500).json({
          success: false,
          message: "Error adding project",
          error: error.message,
        });
      }
    });

    // Get all Projects
    app.get("/api/v1/projects", async (req, res) => {
      try {
        const projects = await projectCollection.find({}).toArray();
        res.json({
          success: true,
          data: projects,
        });
      } catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).json({
          success: false,
          message: "Error fetching projects",
        });
      }
    });

    // projects Delete Operation
    app.delete("/api/v1/projects/:id", async (req, res) => {
      try {
        const id = req.params.id;

        // Validate ID format
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid projects ID format",
          });
        }

        const query = { _id: new ObjectId(id) };
        const result = await projectCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Project not found",
          });
        }

        res.status(200).json({
          success: true,
          message: "Project deleted successfully",
          data: result,
        });
      } catch (error) {
        console.error("Error deleting project:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
      }
    });

    // Get a single project item by ID
    app.get("/api/v1/projects/:id", async (req, res) => {
      const projectId = req.params.id;

      try {
        const project = await projectCollection.findOne({
          _id: new ObjectId(projectId),
        });

        if (project) {
          res.json({
            success: true,
            data: project,
          });
        } else {
          res.status(404).json({
            success: false,
            message: "project not found",
          });
        }
      } catch (error) {
        console.error("Error fetching project:", error);
        res.status(500).json({
          success: false,
          message: "Error fetching project",
        });
      }
    });

    // update project
    app.put("/api/v1/projects/:id", async (req, res) => {
      const projectId = req.params.id;
      const { title, image, description, subTitle, gitLink, demoLink } =
        req.body;

      try {
        // Validate ID
        if (!ObjectId.isValid(projectId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid project ID",
          });
        }

        // Update project
        const result = await projectCollection.findOneAndUpdate(
          { _id: new ObjectId(projectId) },
          {
            $set: {
              image,
              title,
              subTitle,
              description,
              gitLink,
              demoLink,
              updatedAt: new Date(),
            },
          },
          {
            returnDocument: "after",
            upsert: false, // Make sure we don't create new document if not found
          }
        );

        // Check if project was found and updated
        if (!result) {
          return res.status(404).json({
            success: false,
            message: "project not found",
          });
        }

        // Return updated project with success response
        res.status(200).json({
          success: true,
          message: "project updated successfully",
          data: result, // result itself contains the updated document
        });
      } catch (error) {
        console.error("Error updating project:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
      }
    });
    // ==============================================================

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
