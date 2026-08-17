import { createApp } from './app';

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(\`Reporting API Server is running on http://localhost:\${PORT}\`);
});
