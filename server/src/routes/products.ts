import { Router } from 'express';
import { prisma } from '../db';
import { optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/products - Search & filter with Smart Location matching
router.get('/', async (req, res) => {
  try {
    const {
      search,
      category,
      productType,
      condition,
      minPrice,
      maxPrice,
      negotiableOnly,
      customerRegionId,
      customerDistrictId,
      customerCityId,
      sort,
    } = req.query;

    const where: any = {
      status: 'AVAILABLE',
    };

    if (search && typeof search === 'string') {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category && typeof category === 'string' && category !== 'All') {
      where.category = category;
    }

    if (productType && typeof productType === 'string' && productType !== 'ALL') {
      where.productType = productType;
    }

    if (condition && typeof condition === 'string') {
      where.condition = condition;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }

    if (negotiableOnly === 'true') {
      where.pricingType = { in: ['NEGOTIABLE', 'TRADE_SWAP'] };
    }

    // Sorting
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    else if (sort === 'price_desc') orderBy = { price: 'desc' };

    // Fetch candidate products
    const products = await prisma.product.findMany({
      where,
      orderBy,
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            isPhoneVerified: true,
            successfulSalesCount: true,
          },
        },
        itemRegion: true,
        itemDistrict: true,
        itemCity: true,
        deliveryReach: true,
      },
    });

    // Apply Smart Location Filter if customer location parameters are provided
    const regId = customerRegionId ? parseInt(customerRegionId as string, 10) : null;
    const distId = customerDistrictId ? parseInt(customerDistrictId as string, 10) : null;
    const cityId = customerCityId ? parseInt(customerCityId as string, 10) : null;

    let filtered = products;

    if (regId || distId || cityId) {
      filtered = products.filter((prod) => {
        // 1. Online products are available everywhere
        if (prod.productType === 'ONLINE') return true;

        // 2. Whole country delivery can reach anywhere
        if (prod.deliveryScope === 'WHOLE_COUNTRY') return true;

        // 3. Local item location match (in-person)
        if (cityId && prod.itemCityId === cityId) return true;
        if (!cityId && distId && prod.itemDistrictId === distId) return true;
        if (!cityId && !distId && regId && prod.itemRegionId === regId) return true;

        // 4. Custom delivery reach rule matching
        if (prod.deliveryScope === 'CUSTOM' && prod.deliveryReach && prod.deliveryReach.length > 0) {
          return prod.deliveryReach.some((reach) => {
            // Reaches entire region
            if (regId && reach.regionId === regId && reach.isEntireRegion) {
              return true;
            }
            // Reaches entire district
            if (distId && reach.districtId === distId && reach.isEntireDistrict) {
              return true;
            }
            // Reaches specific city
            if (cityId && reach.cityId === cityId) {
              return true;
            }
            return false;
          });
        }

        return false;
      });
    }

    // Format products for client consumption (parse image arrays and delivery methods)
    const formatted = filtered.map((p) => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
      deliveryMethods: JSON.parse(p.deliveryMethods || '[]'),
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id - Single product detail
router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
            avatarUrl: true,
            isPhoneVerified: true,
            successfulSalesCount: true,
            successfulBuysCount: true,
            unresolvedReportsCount: true,
            createdAt: true,
          },
        },
        itemRegion: true,
        itemDistrict: true,
        itemCity: true,
        deliveryReach: {
          include: {
            region: true,
            district: true,
            city: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Parse JSON fields
    const formatted = {
      ...product,
      images: JSON.parse(product.images || '[]'),
      deliveryMethods: JSON.parse(product.deliveryMethods || '[]'),
      // Mask contact info if toggled off by seller
      seller: {
        ...product.seller,
        phoneNumber: product.showPhone ? product.seller.phoneNumber : null,
        email: product.showEmail ? product.seller.email : null,
      },
    };

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

// POST /api/products - Create new product listing
router.post('/', async (req, res) => {
  try {
    const {
      sellerId,
      title,
      description,
      category,
      subcategory,
      productType,
      condition,
      price,
      pricingType,
      showPhone,
      showEmail,
      itemRegionId,
      itemDistrictId,
      itemCityId,
      deliveryScope,
      deliveryPayer,
      deliveryMethods,
      images,
      customReach, // array of { regionId, districtId, cityId, isEntireRegion, isEntireDistrict }
    } = req.body;

    if (!sellerId || !title || !description || !category || price === undefined) {
      return res.status(400).json({ error: 'Missing required listing fields' });
    }

    const created = await prisma.product.create({
      data: {
        sellerId,
        title,
        description,
        category,
        subcategory: subcategory || 'General',
        productType: productType || 'PHYSICAL',
        condition: productType === 'ONLINE' ? null : (condition || 'USED_GOOD'),
        price: parseFloat(price),
        pricingType: pricingType || 'FIXED',
        showPhone: Boolean(showPhone),
        showEmail: Boolean(showEmail),
        itemRegionId: productType === 'ONLINE' ? null : (itemRegionId ? parseInt(itemRegionId, 10) : null),
        itemDistrictId: productType === 'ONLINE' ? null : (itemDistrictId ? parseInt(itemDistrictId, 10) : null),
        itemCityId: productType === 'ONLINE' ? null : (itemCityId ? parseInt(itemCityId, 10) : null),
        deliveryScope: productType === 'ONLINE' ? 'ONLINE_ONLY' : (deliveryScope || 'WHOLE_COUNTRY'),
        deliveryPayer: deliveryPayer || 'NEGOTIABLE',
        deliveryMethods: JSON.stringify(deliveryMethods || []),
        images: JSON.stringify(images || []),
        status: 'AVAILABLE',
        deliveryReach: {
          create: (productType === 'PHYSICAL' && deliveryScope === 'CUSTOM' && Array.isArray(customReach))
            ? customReach.map((r: any) => ({
                regionId: r.regionId ? parseInt(r.regionId, 10) : null,
                districtId: r.districtId ? parseInt(r.districtId, 10) : null,
                cityId: r.cityId ? parseInt(r.cityId, 10) : null,
                isEntireRegion: Boolean(r.isEntireRegion),
                isEntireDistrict: Boolean(r.isEntireDistrict),
              }))
            : [],
        },
      },
      include: {
        seller: true,
        deliveryReach: true,
      },
    });

    res.status(201).json({
      ...created,
      images: JSON.parse(created.images),
      deliveryMethods: JSON.parse(created.deliveryMethods),
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product listing' });
  }
});

// GET /api/products/seller/:sellerId - Get all listings by a specific seller
router.get('/seller/:sellerId', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { sellerId: req.params.sellerId },
      orderBy: { createdAt: 'desc' },
      include: {
        itemRegion: true,
        itemCity: true,
      },
    });

    res.json(
      products.map((p) => ({
        ...p,
        images: JSON.parse(p.images || '[]'),
        deliveryMethods: JSON.parse(p.deliveryMethods || '[]'),
      }))
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch seller products' });
  }
});

// PUT /api/products/:id - Update product listing details
router.put('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    if (req.userId && existing.sellerId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized to edit this listing' });
    }

    const {
      title,
      description,
      price,
      condition,
      pricingType,
      showPhone,
      showEmail,
      images,
      status,
    } = req.body;

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(description && { description: description.trim() }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(condition && { condition }),
        ...(pricingType && { pricingType }),
        ...(showPhone !== undefined && { showPhone: Boolean(showPhone) }),
        ...(showEmail !== undefined && { showEmail: Boolean(showEmail) }),
        ...(images && { images: JSON.stringify(images) }),
        ...(status && { status }),
      },
    });

    res.json({
      ...updated,
      images: JSON.parse(updated.images || '[]'),
      deliveryMethods: JSON.parse(updated.deliveryMethods || '[]'),
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product listing' });
  }
});

// DELETE /api/products/:id - Delete or archive product listing
router.delete('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    if (req.userId && existing.sellerId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this listing' });
    }

    // Check if product is in an active safe hold
    const activeTrade = await prisma.tradeSession.findFirst({
      where: { productId: id, status: 'MONEY_IN_SAFE_HOLD' },
    });

    if (activeTrade) {
      return res.status(400).json({
        error: 'Cannot delete product with active Safe Trade in progress',
      });
    }

    await prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    res.json({ success: true, message: 'Listing archived successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

export default router;

