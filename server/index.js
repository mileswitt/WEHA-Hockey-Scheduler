import express from 'express';
import playersRouter from './routes/players.js';

const app = express();
app.use('/api', playersRouter);

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
