import mongoose from "mongoose";

const Schema = new mongoose.Schema(
  {
    _itemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Items",
    },
    _userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Users",
    },
    same_data:[],
    similar_data:[]
    
  },
  { timestamps: true }
);

Schema.index({ _itemId: 1, type: -1 });

export default mongoose.model("Similar-item", Schema);
