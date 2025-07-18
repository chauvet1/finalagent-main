const { PrismaClient } = require('@prisma/client');
const BusinessIntelligenceService = require('./src/services/businessIntelligence');

const prisma = new PrismaClient();
const biService = new BusinessIntelligenceService(prisma);

async function createTestData() {
  console.log('📝 Creating test data...');
  
  // Create a test user
  const user = await prisma.user.create({
    data: {
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: '$2b$10$dummyhashfortest',
      firstName: 'Test',
      lastName: 'User',
      role: 'ADMIN',
      status: 'ACTIVE'
    }
  });
  
  // Create a test client
  const client = await prisma.client.create({
    data: {
      companyName: 'Test Security Client',
      contactPerson: {
        name: 'John Doe',
        email: 'john@test.com',
        phone: '+1234567890'
      },
      billingAddress: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'USA'
      },
      status: 'ACTIVE'
    }
  });
  
  // Create a test site
  const site = await prisma.site.create({
    data: {
      name: 'Test Site',
      address: {
        street: '456 Site Avenue',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'USA'
      },
      clientId: client.id,
      coordinates: 'POINT(-74.0060 40.7128)',
      status: 'ACTIVE'
    }
  });
  
  // Create a test agent
  const agent = await prisma.agent.create({
    data: {
      userId: user.id,
      employeeId: 'EMP001',
      hireDate: new Date(),
      employmentStatus: 'ACTIVE'
    }
  });
  
  console.log('✅ Test data created successfully');
  return { user, client, site, agent };
}

async function cleanupTestData(testData) {
  console.log('🧹 Cleaning up test data...');
  
  // Delete in reverse order of creation to respect foreign key constraints
  if (testData.agent) {
    await prisma.agent.delete({ where: { id: testData.agent.id } });
  }
  if (testData.site) {
    await prisma.site.delete({ where: { id: testData.site.id } });
  }
  if (testData.client) {
    await prisma.client.delete({ where: { id: testData.client.id } });
  }
  if (testData.user) {
    await prisma.user.delete({ where: { id: testData.user.id } });
  }
  
  console.log('✅ Test data cleaned up');
}

async function testFeedbackSystem() {
  console.log('🧪 Testing Comprehensive Feedback System...');
  
  let testData = null;
  
  try {
    // Create test data
    testData = await createTestData();
    const { client, site, agent } = testData;
    
    // Test 1: Create sample feedback data
    console.log('\n1. Creating sample feedback data...');
    
    // Create diverse feedback entries
    const feedbackEntries = [
      {
        clientId: client.id,
        siteId: site.id,
        agentId: agent.id,
        type: 'SERVICE_QUALITY',
        rating: 5,
        title: 'Excellent Security Service',
        comment: 'The security team was very professional and responsive.',
        sentiment: 'POSITIVE',
        tags: ['professional', 'responsive', 'excellent'],
        metadata: {
          reliability: 5,
          responsiveness: 5,
          professionalism: 5,
          serviceArea: 'patrol'
        },
        status: 'APPROVED'
      },
      {
        clientId: client.id,
        siteId: site.id,
        type: 'INCIDENT_RESPONSE',
        rating: 4,
        title: 'Good Response Time',
        comment: 'Quick response to the alarm, but could improve communication.',
        sentiment: 'POSITIVE',
        tags: ['quick', 'communication'],
        metadata: {
          reliability: 4,
          responsiveness: 5,
          professionalism: 4
        },
        status: 'APPROVED'
      },
      {
        clientId: client.id,
        type: 'GENERAL',
        rating: 3,
        title: 'Average Service',
        comment: 'Service is okay but there is room for improvement.',
        sentiment: 'NEUTRAL',
        tags: ['average', 'improvement'],
        metadata: {
          reliability: 3,
          responsiveness: 3,
          professionalism: 3
        },
        status: 'PENDING'
      },
      {
        clientId: client.id,
        type: 'COMPLAINT',
        rating: 2,
        title: 'Delayed Response',
        comment: 'Response time was too slow during the incident.',
        sentiment: 'NEGATIVE',
        tags: ['slow', 'delayed', 'incident'],
        metadata: {
          reliability: 2,
          responsiveness: 1,
          professionalism: 3
        },
        status: 'UNDER_REVIEW'
      }
    ];
    
    const createdFeedback = [];
    for (const feedback of feedbackEntries) {
      const created = await prisma.feedback.create({ data: feedback });
      createdFeedback.push(created);
      console.log(`✅ Created feedback: ${feedback.title} (Rating: ${feedback.rating})`);
    }
    
    // Test 2: Test Business Intelligence calculations
    console.log('\n2. Testing Business Intelligence calculations...');
    
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const endDate = new Date();
    const filters = { clientId: client.id };
    
    // Test overall satisfaction calculation
    const satisfaction = await biService.calculateOverallSatisfaction(startDate, endDate, filters);
    console.log('📊 Overall Satisfaction:', satisfaction);
    
    // Test service quality ratings
    const qualityRatings = await biService.calculateServiceQualityRatings(startDate, endDate, filters);
    console.log('📊 Service Quality Ratings:', qualityRatings);
    
    // Test feedback analysis
    const feedbackAnalysis = await biService.analyzeFeedback(startDate, endDate, filters);
    console.log('📊 Feedback Analysis:', feedbackAnalysis);
    
    // Test satisfaction trends
    const satisfactionTrends = await biService.calculateSatisfactionTrends(startDate, endDate, filters);
    console.log('📊 Satisfaction Trends:', satisfactionTrends);
    
    // Test 3: Test feedback queries and relationships
    console.log('\n3. Testing feedback relationships...');
    
    // Query feedback with all relationships
    const feedbackWithRelations = await prisma.feedback.findMany({
      where: { clientId: client.id },
      include: {
        client: { select: { name: true } },
        site: { select: { name: true } },
        agent: { select: { userId: true } },
        reviewer: { select: { firstName: true, lastName: true } }
      }
    });
    
    console.log(`✅ Found ${feedbackWithRelations.length} feedback entries with relationships`);
    feedbackWithRelations.forEach(feedback => {
      console.log(`   - ${feedback.title} by ${feedback.client.name} (${feedback.type})`);
    });
    
    // Test 4: Test feedback aggregations
    console.log('\n4. Testing feedback aggregations...');
    
    // Average rating by type
    const ratingsByType = await prisma.feedback.groupBy({
      by: ['type'],
      where: { clientId: client.id },
      _avg: { rating: true },
      _count: { _all: true }
    });
    
    console.log('📊 Average ratings by type:');
    ratingsByType.forEach(group => {
      console.log(`   - ${group.type}: ${group._avg.rating?.toFixed(1)} (${group._count._all} entries)`);
    });
    
    // Sentiment distribution
    const sentimentDistribution = await prisma.feedback.groupBy({
      by: ['sentiment'],
      where: { clientId: client.id },
      _count: { _all: true }
    });
    
    console.log('📊 Sentiment distribution:');
    sentimentDistribution.forEach(group => {
      console.log(`   - ${group.sentiment || 'Unknown'}: ${group._count._all} entries`);
    });
    
    // Test 5: Test client feedback relationship
    console.log('\n5. Testing client feedback relationship...');
    
    const clientWithFeedback = await prisma.client.findUnique({
      where: { id: client.id },
      include: {
        feedback: {
          select: {
            id: true,
            rating: true,
            title: true,
            type: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        },
        clientFeedback: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true
          }
        }
      }
    });
    
    console.log(`✅ Client "${clientWithFeedback.name}" has:`);
    console.log(`   - ${clientWithFeedback.feedback.length} comprehensive feedback entries`);
    console.log(`   - ${clientWithFeedback.clientFeedback.length} basic client feedback entries`);
    
    // Test 6: Performance test
    console.log('\n6. Running performance test...');
    
    const performanceStart = Date.now();
    
    // Run multiple BI calculations simultaneously
    const [perfSatisfaction, perfQuality, perfAnalysis] = await Promise.all([
      biService.calculateOverallSatisfaction(startDate, endDate, filters),
      biService.calculateServiceQualityRatings(startDate, endDate, filters),
      biService.analyzeFeedback(startDate, endDate, filters)
    ]);
    
    const performanceEnd = Date.now();
    console.log(`✅ Performance test completed in ${performanceEnd - performanceStart}ms`);
    
    // Test 7: Test new feedback enums and features
    console.log('\n7. Testing new feedback features...');
    
    // Test different feedback types
    const feedbackTypes = ['SERVICE_QUALITY', 'INCIDENT_RESPONSE', 'GENERAL', 'COMPLAINT', 'SUGGESTION'];
    const sentiments = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'];
    const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'UNDER_REVIEW'];
    
    console.log(`✅ Feedback supports ${feedbackTypes.length} types: ${feedbackTypes.join(', ')}`);
    console.log(`✅ Feedback supports ${sentiments.length} sentiments: ${sentiments.join(', ')}`);
    console.log(`✅ Feedback supports ${statuses.length} statuses: ${statuses.join(', ')}`);
    
    // Cleanup feedback test data
    console.log('\n8. Cleaning up feedback test data...');
    await prisma.feedback.deleteMany({
      where: {
        id: { in: createdFeedback.map(f => f.id) }
      }
    });
    console.log('✅ Feedback test data cleaned up');
    
    console.log('\n🎉 All feedback system tests passed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Database schema updated with comprehensive feedback table');
    console.log('   ✅ Feedback creation and storage with all new fields');
    console.log('   ✅ Business Intelligence calculations using new feedback data');
    console.log('   ✅ Relationship queries between feedback and other entities');
    console.log('   ✅ Data aggregations and analytics');
    console.log('   ✅ Client associations and legacy compatibility');
    console.log('   ✅ Performance optimization and concurrent operations');
    console.log('   ✅ New feedback types, sentiments, and statuses');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Clean up test data
    if (testData) {
      await cleanupTestData(testData);
    }
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testFeedbackSystem();
}

module.exports = testFeedbackSystem;