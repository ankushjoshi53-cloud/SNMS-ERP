import { createApp } from './src/server/app';

// `npm start` runs the bundled dist/server.cjs file. Ensure that bundle uses
// the production static-server branch even when NODE_ENV was not supplied.
if (!process.env.NODE_ENV && process.argv[1]?.endsWith('server.cjs')) {
  process.env.NODE_ENV = 'production';
}

const PORT = Number(process.env.PORT) || 3000;

createApp().then(app => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ERP Server started successfully on port ${PORT}`);
  });
});
