const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Graceful nodemailer: skip if unconfigured
let transporter = null;
try {
  const nodemailer = require('nodemailer');
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
  }
} catch (e) {
  console.warn('nodemailer not available, email features disabled');
}

async function sendEmail(to, subject, html) {
  if (!transporter) {
    console.warn(`[Email skipped - unconfigured] To: ${to}, Subject: ${subject}`);
    return false;
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html
    });
    return true;
  } catch (e) {
    console.error('Email send error:', e.message);
    return false;
  }
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ error: 'User not found' });
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid password' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, isVerified: user.isVerified } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'email, password, and name are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role: role || 'analyst',
      verificationToken,
      verificationTokenExpiry
    });

    // Send verification email (graceful skip)
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;
    await sendEmail(
      email,
      'Verify your AI Commercial Lease Analyzer account',
      `<h2>Welcome, ${name}!</h2><p>Click below to verify your email:</p><a href="${verifyUrl}">${verifyUrl}</a><p>Link expires in 24 hours.</p>`
    );

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, isVerified: false } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/send-verification — resend verification email
router.post('/send-verification', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isVerified) return res.json({ message: 'Email already verified' });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.update({ verificationToken, verificationTokenExpiry });

    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;
    const sent = await sendEmail(
      user.email,
      'Verify your AI Commercial Lease Analyzer account',
      `<h2>Email Verification</h2><p>Click the link below to verify your email:</p><a href="${verifyUrl}">${verifyUrl}</a><p>Link expires in 24 hours.</p>`
    );

    res.json({
      message: sent ? 'Verification email sent' : 'Verification email queued (email service unconfigured)',
      emailSent: sent
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/verify/:token — mark user as verified
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ where: { verificationToken: token } });
    if (!user) return res.status(400).json({ error: 'Invalid or expired verification token' });

    if (user.verificationTokenExpiry && new Date() > new Date(user.verificationTokenExpiry)) {
      return res.status(400).json({ error: 'Verification token has expired. Please request a new one.' });
    }

    await user.update({ isVerified: true, verificationToken: null, verificationTokenExpiry: null });
    res.json({ message: 'Email verified successfully', userId: user.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
