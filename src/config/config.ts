export default () => ({
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
  },

  database: {
    mongoDbUrl: process.env.MONGODB_URL,
  },
});
