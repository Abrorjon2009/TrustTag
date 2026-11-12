import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Clear existing data
  await prisma.disputeEvidence.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.review.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.tradeSession.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.productDeliveryReach.deleteMany();
  await prisma.product.deleteMany();
  await prisma.geoCity.deleteMany();
  await prisma.geoDistrict.deleteMany();
  await prisma.geoRegion.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed System Vault User for Escrow (Central Bank Account)
  const vaultUser = await prisma.user.create({
    data: {
      id: '00000000-0000-0000-0000-000000000000',
      phoneNumber: '+00000000000',
      fullName: 'SafeTrade Central Vault',
      isAdmin: true,
      wallet: {
        create: {
          availableBalance: 0,
          safeHoldBalance: 0,
          frozenBalance: 0,
        },
      },
    },
  });

  // 3. Seed Demo Users
  const userSarah = await prisma.user.create({
    data: {
      id: '11111111-1111-1111-1111-111111111111',
      phoneNumber: '+998901234567',
      email: 'sarah@safetrade.com',
      fullName: 'Sarah Jenkins',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      isPhoneVerified: true,
      successfulSalesCount: 18,
      successfulBuysCount: 5,
      wallet: {
        create: {
          availableBalance: 450.0,
          safeHoldBalance: 0.0,
          frozenBalance: 0.0,
        },
      },
    },
  });

  const userAlex = await prisma.user.create({
    data: {
      id: '22222222-2222-2222-2222-222222222222',
      phoneNumber: '+998939876543',
      email: 'alex@safetrade.com',
      fullName: 'Alex Vance',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      isPhoneVerified: true,
      successfulSalesCount: 2,
      successfulBuysCount: 14,
      wallet: {
        create: {
          availableBalance: 1200.0,
          safeHoldBalance: 0.0,
          frozenBalance: 0.0,
        },
      },
    },
  });

  const userAdmin = await prisma.user.create({
    data: {
      id: '99999999-9999-9999-9999-999999999999',
      phoneNumber: '+998990000001',
      email: 'admin@safetrade.com',
      fullName: 'Platform Admin',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      isPhoneVerified: true,
      isAdmin: true,
      wallet: {
        create: {
          availableBalance: 0.0,
          safeHoldBalance: 0.0,
          frozenBalance: 0.0,
        },
      },
    },
  });

  // 4. Seed Geo Regions -> Districts -> Cities
  // Region 1: Tashkent
  const regTashkent = await prisma.geoRegion.create({
    data: { name: 'Tashkent' },
  });
  const distYunusabad = await prisma.geoDistrict.create({
    data: { regionId: regTashkent.id, name: 'Yunusabad District' },
  });
  const cityYunusabad = await prisma.geoCity.create({
    data: { districtId: distYunusabad.id, name: 'Yunusabad City Area' },
  });
  const distMirzoUlugbek = await prisma.geoDistrict.create({
    data: { regionId: regTashkent.id, name: 'Mirzo Ulugbek District' },
  });
  const cityMirzoUlugbek = await prisma.geoCity.create({
    data: { districtId: distMirzoUlugbek.id, name: 'Buyuk Ipak Yoli' },
  });
  const distChilanzar = await prisma.geoDistrict.create({
    data: { regionId: regTashkent.id, name: 'Chilanzar District' },
  });
  const cityChilanzar = await prisma.geoCity.create({
    data: { districtId: distChilanzar.id, name: 'Chilanzar Center' },
  });

  // Region 2: Samarkand
  const regSamarkand = await prisma.geoRegion.create({
    data: { name: 'Samarkand' },
  });
  const distSamarkandCity = await prisma.geoDistrict.create({
    data: { regionId: regSamarkand.id, name: 'Samarkand Central District' },
  });
  const cityRegistan = await prisma.geoCity.create({
    data: { districtId: distSamarkandCity.id, name: 'Registan Square Area' },
  });

  // Region 3: Bukhara
  const regBukhara = await prisma.geoRegion.create({
    data: { name: 'Bukhara' },
  });
  const distBukharaCity = await prisma.geoDistrict.create({
    data: { regionId: regBukhara.id, name: 'Old City District' },
  });
  const cityBukharaCenter = await prisma.geoCity.create({
    data: { districtId: distBukharaCity.id, name: 'Lyabi-Khauz Area' },
  });

  // 5. Seed Products
  // Product 1: Physical iPhone with Custom Reach
  const prodPhone = await prisma.product.create({
    data: {
      sellerId: userSarah.id,
      title: 'iPhone 14 Pro Max 256GB Deep Purple (Battery 94%)',
      description: 'Used with great care, protected with tempered glass and case since day 1. All original box and accessories included. No scratches or dents. Safe Trade meeting in person or courier.',
      category: 'Electronics',
      subcategory: 'Phones & Tablets',
      productType: 'PHYSICAL',
      condition: 'LIKE_NEW',
      price: 850.0,
      pricingType: 'NEGOTIABLE',
      showPhone: true,
      showEmail: false,
      itemRegionId: regTashkent.id,
      itemDistrictId: distYunusabad.id,
      itemCityId: cityYunusabad.id,
      deliveryScope: 'CUSTOM',
      deliveryPayer: 'BUYER_PAYS',
      deliveryMethods: JSON.stringify(['IN_PERSON_MEETUP', 'COURIER']),
      status: 'AVAILABLE',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600',
        'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600',
      ]),
      deliveryReach: {
        create: [
          // Entire Tashkent region
          { regionId: regTashkent.id, isEntireRegion: true },
          // Specific city in Samarkand
          { regionId: regSamarkand.id, districtId: distSamarkandCity.id, cityId: cityRegistan.id },
        ],
      },
    },
  });

  // Product 2: Online Digital Product (Available everywhere)
  const prodGame = await prisma.product.create({
    data: {
      sellerId: userAlex.id,
      title: 'Steam Account - 120+ Games (CS2 Prime, Cyberpunk 2077, Elden Ring)',
      description: 'Original owner account with first email receipt. Clean VAC record. Full account credentials transferred inside chat upon safe hold deposit.',
      category: 'Gaming & Digital Accounts',
      subcategory: 'PC Games & Accounts',
      productType: 'ONLINE',
      condition: null,
      price: 135.0,
      pricingType: 'FIXED',
      showPhone: false,
      showEmail: true,
      deliveryScope: 'ONLINE_ONLY',
      deliveryPayer: 'FREE_DELIVERY',
      deliveryMethods: JSON.stringify(['ONLINE_DELIVERY']),
      status: 'AVAILABLE',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1612287232230-0504758d6051?w=600',
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600',
      ]),
    },
  });

  // Product 3: Physical Laptop with Whole Country Delivery
  const prodLaptop = await prisma.product.create({
    data: {
      sellerId: userSarah.id,
      title: 'MacBook Air M2 16GB RAM / 512GB SSD Space Gray',
      description: 'Practically brand new, only 14 battery cycles. Bought 2 months ago for a project that ended early. Ships securely with bubble wrap anywhere in the country.',
      category: 'Computers',
      subcategory: 'Laptops',
      productType: 'PHYSICAL',
      condition: 'BRAND_NEW',
      price: 1150.0,
      pricingType: 'NEGOTIABLE',
      showPhone: true,
      showEmail: true,
      itemRegionId: regTashkent.id,
      itemDistrictId: distMirzoUlugbek.id,
      itemCityId: cityMirzoUlugbek.id,
      deliveryScope: 'WHOLE_COUNTRY',
      deliveryPayer: 'FREE_DELIVERY',
      deliveryMethods: JSON.stringify(['COURIER', 'POST_MAIL']),
      status: 'AVAILABLE',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600',
        'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=600',
      ]),
    },
  });

  // Product 4: Physical Gaming Console
  const prodPS5 = await prisma.product.create({
    data: {
      sellerId: userAlex.id,
      title: 'Sony PlayStation 5 Disc Edition + 2 DualSense Controllers',
      description: 'Includes 2 controllers (White and Midnight Black) + charging station + Spider-Man 2. In excellent condition, quiet fan.',
      category: 'Electronics',
      subcategory: 'Gaming Consoles',
      productType: 'PHYSICAL',
      condition: 'USED_GOOD',
      price: 490.0,
      pricingType: 'TRADE_SWAP',
      showPhone: true,
      showEmail: false,
      itemRegionId: regSamarkand.id,
      itemDistrictId: distSamarkandCity.id,
      itemCityId: cityRegistan.id,
      deliveryScope: 'CUSTOM',
      deliveryPayer: 'BUYER_PAYS',
      deliveryMethods: JSON.stringify(['IN_PERSON_MEETUP', 'COURIER']),
      status: 'AVAILABLE',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600',
      ]),
      deliveryReach: {
        create: [
          { regionId: regSamarkand.id, isEntireRegion: true },
          { regionId: regBukhara.id, isEntireRegion: true },
        ],
      },
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log(`- Created ${await prisma.user.count()} Users`);
  console.log(`- Created ${await prisma.geoRegion.count()} Regions & Sub-districts`);
  console.log(`- Created ${await prisma.product.count()} Sample Products`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

