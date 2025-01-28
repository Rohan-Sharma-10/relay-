const express=require("express");
const Channel=require("../models/channels.js");
const User=require("../models/user.js");
const router=express.Router();
const zod=require("zod");
const authenticateToken=require("../middleware/tokenMid");

function generateChannelCode(length = 6) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < length; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

const createChannelSchema = zod.object({
    name: zod.string().min(1,'Channel name is required'),
    userId: zod.string().min(1,"User ID is required"),
})

router.post('/create',authenticateToken, async(req,res)=>{
    try{
        const { success } = createChannelSchema.safeParse(req.body);
        if(!success) {
            return res.status(403).json({
                message:"Problem with parsing data"
            });
        }

        const { name, userId }= req.body;

        let channelCode;
        let isUnique = false;
        while(!isUnique) {
            channelCode = generateChannelCode();
            const existingChannel = await Channel.findOne({ code: channelCode });
            if(!existingChannel) {
                isUnique = true;
            }
        }

        const channel = new Channel({
            name, 
            code: channelCode,
            participants:[userId]
        });
        await channel.save();

        res.status(201).json({
            message:"Channel created successfully",
            channelId:channel._id,
            code: channelCode
        });
    }catch(err){
        res.status(403).json({
            msg: "Failed to create channel. Please try again.",
            err: err.message
        })
    }
});

const joinChannelSchema=zod.object({
    userId:zod.string().min(1, 'User ID is required'),
    code: zod.string().min(6, "Code is required") 
})

router.post('/join', authenticateToken, async(req,res)=>{
    try{
        const validatedData=joinChannelSchema.parse(req.body);
        const { userId, code }=req.body;
        
        if(!validatedData) {
            return res.status(403).json({
                msg: "Cannot join the channel"
            })
        }

        const channel=await Channel.findOne({code});
        if(!channel){
            return res.status(403).json({
                message:"Channel not found",
            });
        }

        if(!channel.participants.includes(userId)){
            channel.participants.push(userId);
            await channel.save();
        }

        res.status(200).json({
            message:"Joined Channel Successfully",
            channel
        });
    }catch(err){
        if( err instanceof zod.ZodError){
            res.status(400).json({
                errors:err.errors
            });
        }else{
            res.status(500).json({
                error:err.message
            })
        }
    }
});

module.exports=router;