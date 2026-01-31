import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { dbState } from './config/dbState';

// Routes
import caseRoutes from './routes/caseRoutes';
import documentRoutes from './routes/documentRoutes';
import ocrRoutes from './routes/ocrRoutes';
import generateRoutes from './routes/generateRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// API Routes
app.use('/api/cases', caseRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/generate', generateRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: dbState.isMongoConnected ? 'connected' : 'disconnected (using mock data)'
  });
});

// MongoDB 연결 (옵션 - 실패해도 서버 계속 실행)
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rehabilitation';
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // 5초 타임아웃
    });
    dbState.isMongoConnected = true;
    console.log('✅ MongoDB 연결 성공');
  } catch (error) {
    dbState.isMongoConnected = false;
    console.warn('⚠️  MongoDB 연결 실패 - Mock 데이터 모드로 실행합니다.');
    console.warn('   MongoDB를 설치하거나 MONGODB_URI 환경변수를 설정하세요.');
  }
};

// 서버 시작
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`\n🚀 서버가 포트 ${PORT}에서 실행 중입니다`);
    console.log(`   API: http://localhost:${PORT}/api`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  });
};

startServer();
