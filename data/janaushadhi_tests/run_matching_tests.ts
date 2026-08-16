import * as fs from 'fs';
import * as path from 'path';
import { JanAushadhiProductMatcher } from '../../src/services/janaushadhi/productMatcher.js';
import type { JanaushadhiProduct } from '../../src/types';

interface MatchingTestCase {
  query: string;
  description: string;
  expectedStatus: string;
  expectedActiveIngredient?: string | null;
  isSafetyBlocked?: boolean;
}

async function runMatchingTestSuite() {
  console.log("============================================================");
  console.log("JAN AUSHADHI ENGINE MATCHING TEST SUITE RUNNER");
  console.log("============================================================");

  // 1. Load Products Catalog from processed datasets
  const catalogPath = path.join(process.cwd(), 'data/karnataka/processed/firestore/janaushadhiProducts.json');
  if (!fs.existsSync(catalogPath)) {
    console.error(`❌ Error: Catalog file not found at ${catalogPath}`);
    process.exit(1);
  }
  
  const catalogRaw = fs.readFileSync(catalogPath, 'utf8');
  const catalog: JanaushadhiProduct[] = JSON.parse(catalogRaw);
  console.log(`✓ Loaded ${catalog.length} catalog items from processed datasets.`);

  // 2. Load test cases
  const testsPath = path.join(process.cwd(), 'data/janaushadhi_tests/product_matching_tests.json');
  if (!fs.existsSync(testsPath)) {
    console.error(`❌ Error: Tests file not found at ${testsPath}`);
    process.exit(1);
  }

  const testsRaw = fs.readFileSync(testsPath, 'utf8');
  const testCases: MatchingTestCase[] = JSON.parse(testsRaw);
  console.log(`✓ Loaded ${testCases.length} testing cases from product_matching_tests.json.`);

  // 3. Initialize matching engine
  const matcher = new JanAushadhiProductMatcher(catalog);
  let totalPassed = 0;
  let totalFailed = 0;

  console.log("\nStarting Assertions...");
  console.log("------------------------------------------------------------");

  for (const tc of testCases) {
    console.log(`Testing Query: "${tc.query}" (${tc.description})`);
    
    const result = matcher.match(tc.query);
    const topMatch = result.matches[0];

    // Assert safety intercept rules
    if (tc.isSafetyBlocked) {
      const isSafetyWarningTriggered = result.medicalSafetyNotice.includes("Medical Safety Notice:");
      if (isSafetyWarningTriggered && result.matches.length === 0) {
        console.log(`  ✓ Passed: Clinical safety block triggered successfully.`);
        totalPassed++;
      } else {
        console.error(`  ❌ Failed: Clinical safety check did not intercept safety-sensitive query.`);
        totalFailed++;
      }
      console.log("------------------------------------------------------------");
      continue;
    }

    // Match status checks
    const statusResult = topMatch ? topMatch.matchStatus : 'NO_VERIFIED_MATCH';
    const statusMatches = statusResult === tc.expectedStatus;
    
    // Active ingredient checks
    let activeIngMatches = false;
    if (tc.expectedStatus === 'NO_VERIFIED_MATCH') {
      activeIngMatches = !topMatch;
    } else {
      const ingResult = topMatch?.product?.activeIngredient || '';
      activeIngMatches = ingResult.toLowerCase().includes((tc.expectedActiveIngredient || '').toLowerCase());
    }

    if (statusMatches && activeIngMatches) {
      console.log(`  ✓ Passed: Expected Status [${tc.expectedStatus}], Got [${statusResult}].`);
      if (topMatch) {
        console.log(`    Matched Product: "${topMatch.product.productName}" (MRP: ₹${topMatch.product.mrp})`);
        console.log(`    Confidence: ${(topMatch.confidence * 100).toFixed(0)}% | Reasons: ${topMatch.matchReasons.join(', ')}`);
      }
      totalPassed++;
    } else {
      console.error(`  ❌ Failed:`);
      console.error(`    Expected Status [${tc.expectedStatus}], Got [${statusResult}].`);
      console.error(`    Expected Ingredient [${tc.expectedActiveIngredient}], Got [${topMatch?.product?.activeIngredient || 'None'}].`);
      totalFailed++;
    }
    console.log("------------------------------------------------------------");
  }

  // 4. Summarize statistics
  const total = testCases.length;
  const accuracy = (totalPassed / total) * 100;
  
  console.log("============================================================");
  console.log("TESTING SUMMARY:");
  console.log(`  Total Test Cases: ${total}`);
  console.log(`  Passed:           ${totalPassed}`);
  console.log(`  Failed:           ${totalFailed}`);
  console.log(`  Accuracy Rate:    ${accuracy.toFixed(2)}%`);
  console.log("============================================================");

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runMatchingTestSuite();
