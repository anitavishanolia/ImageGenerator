import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import razorpay from 'razorpay';
import transactionModel from '../models/transactionModel.js';

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Missing Details' });
        }

        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new userModel({
            name,
            email,
            password: hashedPassword,
            creditBalance: 0, // Ensure new users have a credit balance field
        });

        const user = await newUser.save();
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ success: true, token, user: { name: user.name } });
    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User does not exist' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid Credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({ success: true, token, user: { name: user.name } });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const userCredits = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, credits: user.creditBalance, user: user.name });
    } catch (error) {
        console.error('User Credits Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const paymentRazorpay = async (req, res) => {
    try {
        const { userId, planId } = req.body;

        if (!userId || !planId) {
            return res.status(400).json({ success: false, message: 'Missing Details' });
        }

        let plan, credits, amount;
        switch (planId) {
            case 'Basic':
                plan = 'Basic';
                credits = 100;
                amount = 10;
                break;
            case 'Advanced':
                plan = 'Advanced';
                credits = 500;
                amount = 50;
                break;
            case 'Business':
                plan = 'Business';
                credits = 5000;
                amount = 250;
                break;
            default:
                return res.status(400).json({ success: false, message: 'Plan not found' });
        }

        const date = new Date();

        const transactionData = {
            userId,
            plan,
            amount,
            credits,
            date,
            payment: false, // Ensuring initial payment status is false
        };

        const newTransaction = await transactionModel.create(transactionData);

        const options = {
            amount: amount * 100, // Razorpay requires amount in paise
            currency: 'INR',
            receipt: newTransaction._id.toString(),
        };

        razorpayInstance.orders.create(options, (error, order) => {
            if (error) {
                console.error('Razorpay Order Error:', error);
                return res.status(500).json({ success: false, message: 'Payment initiation failed' });
            }
            res.status(200).json({ success: true, order });
        });
    } catch (error) {
        console.error('Payment Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const verifyRazorpay = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Missing payment details' });
        }

        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);

        if (orderInfo.status === 'paid') {
            const transactionData = await transactionModel.findById(orderInfo.receipt);

            if (!transactionData) {
                return res.status(404).json({ success: false, message: 'Transaction not found' });
            }

            if (transactionData.payment) {
                return res.status(400).json({ success: false, message: 'Payment already verified' });
            }

            const userData = await userModel.findById(transactionData.userId);
            if (!userData) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            userData.creditBalance += transactionData.credits;
            await userModel.findByIdAndUpdate(userData._id, { creditBalance: userData.creditBalance });

            transactionData.payment = true;
            await transactionModel.findByIdAndUpdate(transactionData._id, { payment: true });

            res.status(200).json({ success: true, message: 'Credits added successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Payment verification failed' });
        }
    } catch (error) {
        console.error('Razorpay Verification Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export { registerUser, loginUser, userCredits, paymentRazorpay, verifyRazorpay };
