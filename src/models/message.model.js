import mongoose from "mongoose";



const fileSchema = new mongoose.Schema(
  {
    url: { type: String },
    type: { type: String }, // Now this "type" is part of a nested schema
    name: { type: String },
  },
  { _id: false } // Optional: if you don't need an _id for this subdocument
);



const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    file: fileSchema, // use the nested schema here
  },
  { timestamps: true }
);


const Message = mongoose.model("Message", messageSchema);

export default Message;
