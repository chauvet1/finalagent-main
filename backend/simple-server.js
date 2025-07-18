const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = 8000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// GET /api/trainings - Fetch all trainings
app.get('/api/trainings', async (req, res) => {
  console.log('GET /api/trainings - Fetching trainings from database');
  try {
    const trainings = await prisma.training.findMany({
      where: {
        isActive: true
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        enrollments: {
          include: {
            agent: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const transformedTrainings = trainings.map(training => ({
      id: training.id,
      title: training.title,
      description: training.description,
      type: training.type,
      category: training.category,
      duration: training.duration,
      isRequired: training.isRequired,
      validityPeriod: training.validityPeriod,
      prerequisites: training.prerequisites,
      createdBy: training.createdBy,
      isActive: training.isActive,
      createdAt: training.createdAt.toISOString(),
      updatedAt: training.updatedAt.toISOString(),
      creator: training.creator,
      enrollments: training.enrollments,
      currentEnrollments: training._count.enrollments
    }));

    console.log(`✅ Found ${transformedTrainings.length} trainings`);
    res.json({
      success: true,
      data: transformedTrainings,
      totalCount: transformedTrainings.length
    });
  } catch (error) {
    console.error('❌ Error fetching trainings:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch trainings' }
    });
  }
});

// POST /api/trainings - Create new training
app.post('/api/trainings', async (req, res) => {
  console.log('POST /api/trainings - Creating new training');
  console.log('Request body:', req.body);
  
  try {
    const { title, description, type, category, duration, isRequired, validityPeriod, prerequisites, createdBy } = req.body;

    // Validate required fields
    if (!title || !type || !category || !duration || !createdBy) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' }
      });
    }

    const newTraining = await prisma.training.create({
      data: {
        title,
        description: description || '',
        type,
        category,
        duration: parseInt(duration),
        isRequired: isRequired || false,
        validityPeriod: validityPeriod ? parseInt(validityPeriod) : null,
        prerequisites: prerequisites || [],
        createdBy
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    });

    console.log('✅ Created new training:', newTraining.title);

    res.json({
      success: true,
      data: {
        id: newTraining.id,
        title: newTraining.title,
        description: newTraining.description,
        type: newTraining.type,
        category: newTraining.category,
        duration: newTraining.duration,
        isRequired: newTraining.isRequired,
        validityPeriod: newTraining.validityPeriod,
        prerequisites: newTraining.prerequisites,
        createdBy: newTraining.createdBy,
        isActive: newTraining.isActive,
        createdAt: newTraining.createdAt.toISOString(),
        updatedAt: newTraining.updatedAt.toISOString(),
        creator: newTraining.creator,
        currentEnrollments: newTraining._count.enrollments
      },
      message: 'Training created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating training:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create training' }
    });
  }
});

// PUT /api/trainings/:id - Update training
app.put('/api/trainings/:id', async (req, res) => {
  console.log('PUT /api/trainings/:id - Updating training');
  try {
    const { id } = req.params;
    const { title, description, type, category, duration, isRequired, validityPeriod, prerequisites } = req.body;

    const existingTraining = await prisma.training.findUnique({
      where: { id }
    });

    if (!existingTraining) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Training not found' }
      });
    }

    const updatedTraining = await prisma.training.update({
      where: { id },
      data: {
        title,
        description,
        type,
        category,
        duration: parseInt(duration),
        isRequired: isRequired || false,
        validityPeriod: validityPeriod ? parseInt(validityPeriod) : null,
        prerequisites: prerequisites || []
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    });

    console.log('✅ Updated training:', updatedTraining.title);

    res.json({
      success: true,
      data: {
        id: updatedTraining.id,
        title: updatedTraining.title,
        description: updatedTraining.description,
        type: updatedTraining.type,
        category: updatedTraining.category,
        duration: updatedTraining.duration,
        isRequired: updatedTraining.isRequired,
        validityPeriod: updatedTraining.validityPeriod,
        prerequisites: updatedTraining.prerequisites,
        createdBy: updatedTraining.createdBy,
        isActive: updatedTraining.isActive,
        createdAt: updatedTraining.createdAt.toISOString(),
        updatedAt: updatedTraining.updatedAt.toISOString(),
        creator: updatedTraining.creator,
        currentEnrollments: updatedTraining._count.enrollments
      },
      message: 'Training updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating training:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update training' }
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Training API Server running on http://localhost:${PORT}`);
  console.log(`📊 Database connected via Prisma`);
  console.log(`🔗 CORS enabled for frontend`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});
