// import express from 'express'
// import cors from 'cors'
// import 'dotenv/config'
// import connectDB from './config/mongodb.js'
// import userRouter from './routes/userRoutes.js'
// import imageRouter from './routes/imageRoutes.js'

// const PORT=process.env.PORT || 4000
// const app=express()

// app.use(express.json())
// app.use(cors())
// await connectDB()

// app.use('/api/user',userRouter)

// app.use('/api/image',imageRouter)
// app.get('/',(req,res)=>res.send("API Working"))
// app.listen(PORT,()=>console.log('Server running on port ' +  PORT));
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/mongodb.js';
import userRouter from './routes/userRoutes.js';
import imageRouter from './routes/imageRoutes.js';

const PORT = process.env.PORT || 4000;
const app = express();

app.use(express.json());

// ✅ Updated CORS configuration
app.use(cors({
  origin: "https://client-eight-topaz.vercel.app", // Allow only the deployed frontend
  methods: "GET,POST,PUT,DELETE",
  credentials: true, // Allow cookies & authentication headers
}));

await connectDB();

// Routes
app.use('/api/user', userRouter);
app.use('/api/image', imageRouter);
app.get('/', (req, res) => res.send("API Working"));

// Start server
app.listen(PORT, () => console.log('Server running on port ' + PORT));
