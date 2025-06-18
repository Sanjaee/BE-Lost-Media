// config/passport.js
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let existingUser = await prisma.user.findUnique({
          where: { googleId: profile.id },
          select: {
            userId: true,
            googleId: true,
            username: true,
            email: true,
            profilePic: true,
            bio: true,
            createdAt: true,
            followersCount: true,
            followingCount: true,
            role: true,
            star: true,
            posts: true,
          },
        });

        if (existingUser) {
          return done(null, existingUser);
        }

        // Check if user exists with this email
        existingUser = await prisma.user.findUnique({
          where: { email: profile.emails[0].value },
          select: {
            userId: true,
            googleId: true,
            username: true,
            email: true,
            profilePic: true,
            bio: true,
            createdAt: true,
            followersCount: true,
            followingCount: true,
            role: true,
            star: true,
            posts: true,
          },
        });

        if (existingUser) {
          // Update existing user with Google ID
          const updatedUser = await prisma.user.update({
            where: { userId: existingUser.userId },
            data: {
              googleId: profile.id,
              profilePic: profile.photos[0]?.value || existingUser.profilePic,
            },
            select: {
              userId: true,
              googleId: true,
              username: true,
              email: true,
              profilePic: true,
              bio: true,
              createdAt: true,
              followersCount: true,
              followingCount: true,
              role: true,
              star: true,
              posts: true,
            },
          });
          return done(null, updatedUser);
        }

        // Create new user with UUID and clean username
        const baseUsername = profile.emails[0].value
          .split("@")[0]
          .replace(/[^a-zA-Z0-9]/g, "")
          .slice(0, 20); // Limit to 20 characters
        const newUser = await prisma.user.create({
          data: {
            userId: uuidv4(),
            googleId: profile.id,
            username: baseUsername,
            email: profile.emails[0].value,
            profilePic: profile.photos[0]?.value || null,
            role: "member",
            star: 0,
          },
          select: {
            userId: true,
            googleId: true,
            username: true,
            email: true,
            profilePic: true,
            bio: true,
            createdAt: true,
            followersCount: true,
            followingCount: true,
            role: true,
            star: true,
            posts: true,
          },
        });

        return done(null, newUser);
      } catch (error) {
        console.error("Error in Google Strategy:", error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.userId);
});

passport.deserializeUser(async (userId, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { userId: userId },
      select: {
        userId: true,
        googleId: true,
        username: true,
        email: true,
        profilePic: true,
        bio: true,
        createdAt: true,
        followersCount: true,
        followingCount: true,
        role: true,
        star: true,
        posts: true,
      },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
