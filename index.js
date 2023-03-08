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
    const likesCollection = client.db("chitchat-v1").collection("likes");
    const commentsCollection = client.db("chitchat-v1").collection("comments");
    const chatsCollection = client.db("chitchat-v1").collection("chats");
    
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
      const result = await postCollection
        .find(query)
        .sort({ milliseconds: -1 })
        .toArray();
      res.send(result);
    });

     //get All Individual User chat
     app.get("/getAllChats/:room", async (req, res) => {
      const room = req.params.room;
      const query = { friendRoom: room };
      const result = await chatsCollection
        .find(query)
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
      post["comments"] = [];
      const result = await postCollection.insertOne(post);
      res.send(result);
    });

     //insert user chat
     app.post("/insertChats", async (req, res) => {
      const chats = req.body;
      const userInfo = await usersCollection.findOne({ email: chats.senderEmail });
      chats["senderName"] = userInfo.name;
      chats["senderPhoto"] = userInfo.profilePhoto;
      const result = await chatsCollection.insertOne(chats);
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

      //get user's all friend
      app.get("/getAllFriends/:email", async (req, res) => {
        const email = req.params.email;
        const userInfo = await usersCollection.findOne({email});
        const friends = userInfo?.friends;
        const allUsers = await usersCollection.find().toArray();

        let allFriends=[];
        friends?.forEach((friendInfo)=>{
          allUsers?.forEach(allUser=>{
          if(friendInfo?.email===allUser?.email){
            friendInfo['friendPhoto'] = allUser.profilePhoto
            friendInfo['friendName'] = allUser.name
            allFriends.push(friendInfo)
          }
        })
        })
       res.send(allFriends)
      });

     //get user's all likes
     app.get("/getAllLikes/:email", async (req, res) => {
      const email = req.params.email;
      const allLike = await likesCollection.find({email}).sort({ milliseconds: -1 }).toArray()
      res.send(allLike)
    });

     //get user's all comments
     app.get("/getAllComments/:email", async (req, res) => {
      const email = req.params.email;
      const allComments = await commentsCollection.find({email}).sort({ milliseconds: -1 }).toArray()
      res.send(allComments)
    });

      //get search result
      app.get("/getSearchUsers/:name", async (req, res) => {
        const name = req.params.name;
        const allUsers = await usersCollection.find({name}).toArray()
        res.send(allUsers)
      });

        //get all comments in a post
        app.get("/getPostAllComments/:id", async (req, res) => {
          const id = req.params.id;
          const allComments = await commentsCollection.find({postId: id}).sort({ milliseconds: -1 }).toArray()
          res.send(allComments)
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

     //insert user profile edit info
     app.post("/profileInfoEdit", async (req, res) => {
      const editInfo = req.body;
      const filter = {email: editInfo.email};
      console.log(editInfo)
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          profilePhoto: editInfo.profilePhotoLink,
          coverPhoto: editInfo.coverPhotoLink,
          bio: editInfo.bio,
          study: editInfo.study,
          works: editInfo.works,
          from: editInfo.from,
          relationship: editInfo.relationship,
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

     //insert user like
     app.post("/like", async (req, res) => {
      const likeInfo = req.body;
      const query = { _id: new ObjectId(likeInfo._id) }; 
      const postInfo = await postCollection.findOne(query);
      const found = postInfo.likes.find((liker)=>{
        return liker?.email === likeInfo?.email
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
        const milliseconds = new Date().getTime();
        const info = {
          postId : likeInfo._id,
          email: likeInfo.email,
          milliseconds,
          post: postInfo.post,
          postImg: postInfo?.post_photo,
          postOwnerPhoto: postInfo?.postOwnerPhoto,
          postOwnerName: postInfo?.postOwnerName
        }
        const insertLike = await likesCollection.insertOne(info)
        res.send(updateLikesArray);
      }

    });

    
     //insert user comments
     app.post("/comments", async (req, res) => {
      const commentsInfo = req.body;
      const query = { _id: new ObjectId(commentsInfo._id) }; 
      const postInfo = await postCollection.findOne(query);
      const userInfo = await usersCollection.findOne({email:commentsInfo.email})
        const updateDoc = {
          $set: {
            comments: [...postInfo.comments,commentsInfo]
          }
        }
        const updateCommentsArray = await postCollection.updateOne(query, updateDoc);
        const milliseconds = new Date().getTime();
        const info = {
          postId : commentsInfo._id,
          email: commentsInfo.email,
          milliseconds,
          post: postInfo.post,
          postImg: postInfo?.post_photo,
          postOwnerPhoto: postInfo?.postOwnerPhoto,
          postOwnerName: postInfo?.postOwnerName,
          comment: commentsInfo.comment,
          commentOwnerName: userInfo.name,
          commentOwnerPhoto: userInfo.profilePhoto,
        }
        const insertComments = await commentsCollection.insertOne(info)
        res.send(updateCommentsArray);
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
