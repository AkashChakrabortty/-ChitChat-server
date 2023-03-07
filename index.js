const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
      console.log(email)
      const query = { email: email };
      const result = await postCollection
        .find(query)
        .sort({ milliseconds: -1 })
        .toArray();
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
      const userInfo = await usersCollection.findOne({ email: post.email });
      post["postOwnerPhoto"] = userInfo.profilePhoto;
      post["postOwnerName"] = userInfo.name;
      post["likes"] = [];
      const result = await postCollection.insertOne(post);
      res.send(result);
    });

    //insert user's friend req info
    app.post("/addFriend", async (req, res) => {
      const reqInfo = req.body;
      const userInfo = await usersCollection.findOne({
        email: reqInfo.sender_email,
      });
      reqInfo["sender_photo"] = userInfo.profilePhoto;
      reqInfo["sender_name"] = userInfo.name;
      const result = await requestCollection.insertOne(reqInfo);
      res.send(result);
    });

    //get specific user's friend request
    app.get("/request/:email", async (req, res) => {
      const email = req.params.email;
      const query = { receiver_email: email };
      const cursor = requestCollection.find(query).sort({ milliseconds: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

     //get user's friend's post
     app.get("/getAllFriendsPosts/:email", async (req, res) => {
      const email = req.params.email;
      const userInfo = await usersCollection.findOne({email});
      const friends = userInfo?.friends;
      const allPosts = await postCollection.find().toArray();
      let friendsPost=[];
      friends?.forEach((friendInfo)=>{
      allPosts?.forEach(postInfo=>{
        if(friendInfo?.email===postInfo?.email){
          friendsPost.push(postInfo)
        }
      })
      })
     res.send(friendsPost)
    });

    //insert every new user
    app.post("/storeUserInfo", async (req, res) => {
      const user = req.body;
      user["profilePhoto"] = "https://i.ibb.co/RvdV5Kx/default-Avatar.webp";
      user["coverPhoto"] = "https://i.ibb.co/RvdV5Kx/default-Avatar.webp";
      user["friends"] = [];
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

     //insert user like
     app.post("/like", async (req, res) => {
      const likeInfo = req.body;
      const query = { _id: new ObjectId(likeInfo._id) }; 
      const postInfo = await postCollection.findOne(query);
      const found = postInfo.likes.find((liker)=>{
        return liker.email === likeInfo.email
      })
      if (found) {
        res.send({ acknowledged: false });
      } else {
        const updateDoc = {
          $set: {
            likes: [...postInfo.likes,likeInfo]
          }
        }
        const updateLikesArray = await postCollection.updateOne(query, updateDoc);
        res.send(updateLikesArray);
      }

    });

    //delete friend request
    app.delete("/reqDelete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }; 
      const result = requestCollection.deleteOne(query);
      res.send(result);
    });

     //insert every accepted friend request
     app.post("/reqAccepted", async (req, res) => {
      const reqAcceptedInfo = req.body;
      //add friend in user collection
      const filterSender = { email: reqAcceptedInfo.senderEmail };
      const findSenderFriendInfo = await usersCollection.findOne(filterSender);
      const updateDocSender = { 
        $set: {
          friends: [...findSenderFriendInfo.friends, {email: reqAcceptedInfo.receiverEmail, friendRoom: reqAcceptedInfo.friendRoom}]
        },
      };
      const updateFriendsArraySender = await usersCollection.updateOne(filterSender, updateDocSender);


      const filterReceiver = { email: reqAcceptedInfo.receiverEmail };
      const findReceiverFriendInfo = await usersCollection.findOne(filterSender);
      const updateDocReceiver = {
        $set: {
          friends: [...findReceiverFriendInfo.friends, {email: reqAcceptedInfo.senderEmail, friendRoom: reqAcceptedInfo.friendRoom}]
        },
      };
      const updateFriendsArrayReceiver = await usersCollection.updateOne(filterReceiver, updateDocReceiver);

      //delete from req collections
      const deleteFromColl = requestCollection.deleteOne({ _id: new ObjectId(reqAcceptedInfo.friendRoom)});

      res.send(deleteFromColl);
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
