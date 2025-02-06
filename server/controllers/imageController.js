
import FormData from "form-data";
import userModel from "../models/userModel.js";
import axios from "axios";

export const generateImage = async (req, res) => {
  try {
    const { userId, prompt } = req.body;
    
    // Check for missing user or prompt
    const user = await userModel.findById(userId);
    if (!user || !prompt) {
      return res.json({ success: false, message: 'Missing Details' });
    }

    // Check if the user has enough credit
    if (user.creditBalance === 0 || user.creditBalance < 0) {
      return res.json({ success: false, message: 'No Credit Balance', creditBalance: user.creditBalance });
    }

    // Prepare the form data for the external API call
    const formData = new FormData();
    formData.append('prompt', prompt);

    // Make the external API call to generate the image
    const { data } = await axios.post('https://clipdrop-api.co/text-to-image/v1', formData, {
      headers: {
        'x-api-key': process.env.CLIPDROP_API,
      },
      responseType: 'arraybuffer',
    });

    // Convert the binary image data to base64
    const base64Image = Buffer.from(data, 'binary').toString('base64');
    const resultImage = `data:image/png;base64,${base64Image}`;

    // Update the user's credit balance
    await userModel.findByIdAndUpdate(user._id, { creditBalance: user.creditBalance - 1 });

    // Return the response with the image and updated credit balance
    res.json({
      success: true,
      message: "Image Generated",
      creditBalance: user.creditBalance - 1,
      resultImage,
    });
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: error.message });
  }
};
