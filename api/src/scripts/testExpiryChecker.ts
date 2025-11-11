import { connectDB } from '../config/database';
import { expiryCheckerJob } from '../jobs/expiryChecker';

const testExpiryChecker = async () => {
  console.log('🧪 Testing Expiry Checker Job');
  console.log('==============================\n');

  try {
    // Connect to database
    await connectDB();

    // Run the expiry checker
    console.log('Running expiry check...\n');
    await expiryCheckerJob.checkExpiries();

    console.log('\n✅ Test completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during test:', error);
    process.exit(1);
  }
};

testExpiryChecker();
