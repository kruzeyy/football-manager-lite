import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Choisir entre MongoDB ou Supabase
// Décommentez la ligne correspondant à votre choix :
// import { connectToMongoDB, disconnectFromMongoDB } from './db/mongodb';
// import authRoutes from './routes/auth';
// import subscriptionRoutes from './routes/subscription';

// OU pour Supabase (recommandé, gratuit) :
import authRoutes from './routes/auth-supabase';
import subscriptionRoutes from './routes/subscription-supabase';
import { supabase } from './db/supabase';

import adminRoutes from './routes/admin-supabase';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const corsOrigins: (string | RegExp)[] = [
  'http://localhost:5173', // Développement local
  /\.vercel\.app$/, // Tous les domaines Vercel
];

if (process.env.FRONTEND_URL) {
  corsOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running', db: 'Supabase' });
});

// Gestion de la connexion (Supabase n'a pas besoin de connexion, elle est déjà prête)
async function startServer() {
  try {
    // Test de connexion Supabase
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      console.log('✅ Configuration Supabase détectée');
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (error && error.code !== 'PGRST116') { // PGRST116 = table n'existe pas encore, c'est OK
        console.warn('⚠️ Supabase: Table users pas encore créée. Suivez les instructions dans README_SUPABASE.md');
      } else {
        console.log('✅ Connexion à Supabase OK');
      }
    } else {
      console.warn('⚠️ SUPABASE_URL ou SUPABASE_ANON_KEY non configuré dans .env');
    }

    // Si vous utilisez MongoDB, décommentez ces lignes :
    // await connectToMongoDB();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  // Si vous utilisez MongoDB, décommentez cette ligne :
  // await disconnectFromMongoDB();
  process.exit(0);
});

startServer();

