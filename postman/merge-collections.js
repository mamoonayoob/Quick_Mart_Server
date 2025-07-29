const fs = require('fs');
const path = require('path');

// Function to merge vendor collections
function mergeVendorCollections() {
  try {
    // Read all vendor collection parts
    const part1 = JSON.parse(fs.readFileSync(path.join(__dirname, 'QuickMart-API-Vendor-Part1.json'), 'utf8'));
    const part2 = JSON.parse(fs.readFileSync(path.join(__dirname, 'QuickMart-API-Vendor-Part2.json'), 'utf8'));
    const part3 = JSON.parse(fs.readFileSync(path.join(__dirname, 'QuickMart-API-Vendor-Part3.json'), 'utf8'));
    const part4 = JSON.parse(fs.readFileSync(path.join(__dirname, 'QuickMart-API-Vendor-Part4.json'), 'utf8'));

    // Create a merged collection with the structure from part1
    const mergedCollection = {
      info: part1.info,
      item: [
        ...part1.item,
        ...part2.item,
        ...part3.item,
        ...part4.item
      ],
      variable: part1.variable || []
    };

    // Write the merged collection to a new file
    fs.writeFileSync(
      path.join(__dirname, 'QuickMart-API-Vendor.json'),
      JSON.stringify(mergedCollection, null, 2),
      'utf8'
    );

    console.log('Vendor collections merged successfully!');
  } catch (error) {
    console.error('Error merging vendor collections:', error);
  }
}

// Function to merge delivery collections
function mergeDeliveryCollections() {
  try {
    // Read all delivery collection parts
    const part1 = JSON.parse(fs.readFileSync(path.join(__dirname, 'QuickMart-API-Delivery-Part1.json'), 'utf8'));
    const part2 = JSON.parse(fs.readFileSync(path.join(__dirname, 'QuickMart-API-Delivery-Part2.json'), 'utf8'));

    // Create a merged collection with the structure from part1
    const mergedCollection = {
      info: part1.info,
      item: [
        ...part1.item,
        ...part2.item
      ],
      variable: part1.variable || []
    };

    // Write the merged collection to a new file
    fs.writeFileSync(
      path.join(__dirname, 'QuickMart-API-Delivery.json'),
      JSON.stringify(mergedCollection, null, 2),
      'utf8'
    );

    console.log('Delivery collections merged successfully!');
  } catch (error) {
    console.error('Error merging delivery collections:', error);
  }
}

// Execute both merge functions
mergeVendorCollections();
mergeDeliveryCollections();

console.log('All collections merged!');
