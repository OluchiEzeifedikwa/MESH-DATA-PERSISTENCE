import express from 'express';
import cors from 'cors';
import profilesRouter from './src/routes/profiles.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/profiles', profilesRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
