const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// File upload setup
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), (req, res) => {
  console.log(req.file);
  res.json({ message: 'File uploaded successfully' });
});

app.get('/data', (req, res) => {
  res.json([]);
});

app.listen(5000, () => console.log('Server running on port 5000'));
