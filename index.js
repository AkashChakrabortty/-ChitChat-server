const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middle wares
app.use(cors());
app.use(express.json());

// mongo
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.kusbv.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const usersCollection = client.db("chitchat-v1").collection("users");
    const postCollection = client.db("chitchat-v1").collection("posts");
    const requestCollection = client.db("chitchat-v1").collection("requests");
    //insert every new user
    app.post("/storeUserInfo", async (req, res) => {
      const user = req.body;
      user["profilePhoto"] = "https://i.ibb.co/RvdV5Kx/default-Avatar.webp";
      user["coverPhoto"] = "https://i.ibb.co/RvdV5Kx/default-Avatar.webp";
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    //get getSingleUserInfo
    app.get("/getSingleUserInfo/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });
     //get All Individual User Posts
     app.get("/getAllIndividualUserPosts/:email", async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const result = await postCollection.find(query).sort({ milliseconds: -1 }).toArray();
        res.send(result);
      });
     //get all chitchat users
     app.get("/getAllChitChatUsers", async (req, res) => {
        const query = {};
        const cursor = usersCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
      });
      //insert user post
      app.post("/insertPost", async (req, res) => {
        const post = req.body;
        const userInfo = await usersCollection.findOne({email:post.email});
        post['postOwnerPhoto'] = userInfo.profilePhoto
        post['postOwnerName'] = userInfo.name
        const result = await postCollection.insertOne(post);
        res.send(result); 
      });

       //insert user's friend req info
      app.post("/addFriend", async (req, res) => {
        const reqInfo = req.body;
        const userInfo = await usersCollection.findOne({email:reqInfo.sender_email});
        reqInfo['sender_photo'] = userInfo.profilePhoto
        reqInfo['sender_name'] = userInfo.name
        const result = await requestCollection.insertOne(reqInfo);
        res.send(result)
      });
  } catch {}
}
run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("ChitChat api found");
});
app.listen(port, () => {
  console.log("server running");
});
