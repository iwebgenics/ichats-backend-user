import Group from "../models/group.model.js";

export const addGroup = async (req, res) => {
  try {
    const { groupName, members } = req.body;
    
    // Validate that groupName is provided and members is a non-empty array.
    if (!groupName || !members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: "Group name and at least one member are required" });
    }

    // Check if any member is already part of any group.
    const duplicateMembers = [];
    // Loop through each member to see if they're already in a group.
    await Promise.all(
      members.map(async (memberId) => {
        const existingGroup = await Group.findOne({ members: memberId });
        if (existingGroup) {
          duplicateMembers.push(memberId);
        }
      })
    );

    // If any duplicate members are found, return an error.
    if (duplicateMembers.length > 0) {
      return res.status(400).json({ 
        message: "Some members already belong to a group. Please remove them from the selection.", 
        duplicateMembers 
      });
    }

    // Create and save the new group if no duplicates found.
    const newGroup = new Group({ groupName, members });
    await newGroup.save();

    res.status(201).json(newGroup);
  } catch (error) {
    console.error("Error adding group:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateGroupMembers = async (req, res) => {
    try {
      const { groupId, newMembers } = req.body;
      if (!groupId || !newMembers || !Array.isArray(newMembers) || newMembers.length === 0) {
        return res.status(400).json({ message: "groupId and at least one new member are required" });
      }
      // Update the group and populate members
      const updatedGroup = await Group.findByIdAndUpdate(
        groupId,
        { $addToSet: { members: { $each: newMembers } } },
        { new: true }
      ).populate("members", "fullName email");
      
      if (!updatedGroup) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      res.status(200).json(updatedGroup);
    } catch (error) {
      console.error("Error updating group members:", error.message);
      res.status(500).json({ message: "Internal server error" });
    }
  };
  

export const getAllGroups = async (req, res) => {
    try {
      // Optionally populate members to show their fullName and email; remove .populate() if not needed.
      const groups = await Group.find({}).populate("members", "fullName email");
      res.status(200).json(groups);
    } catch (error) {
      console.error("Error fetching groups:", error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };




  export const deleteGroup = async (req, res) => {
    try {
      // Get groupId from URL parameters
      const { groupId } = req.params;
      // Attempt to find and delete the group by its ID
      const deletedGroup = await Group.findByIdAndDelete(groupId);
      if (!deletedGroup) {
        return res.status(404).json({ message: "Group not found" });
      }
      res.status(200).json({ message: "Group deleted successfully" });
    } catch (error) {
      console.error("Error deleting group:", error.message);
      res.status(500).json({ message: "Internal server error" });
    }
  };