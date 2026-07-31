import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { productRepository } from '../repositories/product.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { createProductSchema, updateProductSchema, createCategorySchema, bulkPriceUpdateSchema } from '../validators/product.validator.js';
import { ShopId, UserRole } from '@raju-billing/shared';

// Helper to validate active shop context access
const validateShopContext = (req: AuthenticatedRequest, res: Response): ShopId | null => {
  const activeShopId = req.headers['x-shop-id'] as ShopId;
  if (!activeShopId) {
    res.status(400).json({
      success: false,
      message: 'Missing X-Shop-Id context header',
      error: { code: 'MISSING_SHOP_CONTEXT' },
    });
    return null;
  }

  // Cross-shop validation check
  if (req.user && req.user.role !== UserRole.SUPER_ADMIN) {
    if (!req.user.assignedShopIds.includes(activeShopId)) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permissions to access this shop context',
        error: { code: 'FORBIDDEN_SHOP_CONTEXT' },
      });
      return null;
    }
  }

  return activeShopId;
};

// Helper to resolve user name dynamically from repository
const getUserDetails = async (req: AuthenticatedRequest) => {
  if (!req.user?.id) return { id: '', fullName: 'System' };
  const userRecord = await userRepository.findById(req.user.id);
  return {
    id: req.user.id,
    fullName: userRecord ? userRecord.fullName : 'System',
  };
};

export const getProducts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { search, categoryId, status, unitType, isFavourite, page, limit } = req.query;

    const filters = {
      search: typeof search === 'string' ? search : undefined,
      categoryId: typeof categoryId === 'string' ? categoryId : undefined,
      status: status as any,
      unitType: typeof unitType === 'string' ? unitType : undefined,
      isFavourite: isFavourite === 'true' ? true : isFavourite === 'false' ? false : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 100,
    };

    const result = await productRepository.findAllProducts(shopId, filters);

    return res.status(200).json({
      success: true,
      message: 'Products catalog list retrieved',
      data: result.products,
      total: result.total,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { id } = req.params;
    const product = await productRepository.findProductById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        error: { code: 'PRODUCT_NOT_FOUND' },
      });
    }

    if (product.shopId !== shopId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Product data isolation breach',
        error: { code: 'CROSS_SHOP_LEAK_PREVENTED' },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Product details retrieved',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const validated = createProductSchema.parse(req.body);
    const user = await getUserDetails(req);
    const product = await productRepository.createProduct(shopId, validated, user.id, user.fullName);

    return res.status(201).json({
      success: true,
      message: 'Product added to catalog successfully',
      data: product,
    });
  } catch (error: any) {
    if (error.message === 'DUPLICATE_PRODUCT_NAME') {
      return res.status(400).json({
        success: false,
        message: 'Duplicate Product Name: A product with this catalog name already exists in this shop.',
        error: { code: 'DUPLICATE_PRODUCT_NAME' },
      });
    }
    next(error);
  }
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { id } = req.params;
    const product = await productRepository.findProductById(id);

    if (!product || product.shopId !== shopId) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        error: { code: 'PRODUCT_NOT_FOUND' },
      });
    }

    const validated = updateProductSchema.parse(req.body);
    const user = await getUserDetails(req);
    const updated = await productRepository.updateProduct(id, validated, user.id, user.fullName);

    return res.status(200).json({
      success: true,
      message: 'Product catalog details updated successfully',
      data: updated,
    });
  } catch (error: any) {
    if (error.message === 'DUPLICATE_PRODUCT_NAME') {
      return res.status(400).json({
        success: false,
        message: 'Duplicate Product Name: Already exists.',
        error: { code: 'DUPLICATE_PRODUCT_NAME' },
      });
    }
    next(error);
  }
};

export const archiveProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { id } = req.params;
    const product = await productRepository.findProductById(id);

    if (!product || product.shopId !== shopId) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        error: { code: 'PRODUCT_NOT_FOUND' },
      });
    }

    const user = await getUserDetails(req);
    await productRepository.archiveProduct(id, user.id);

    return res.status(200).json({
      success: true,
      message: 'Product soft deleted (archived) successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const activateProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { id } = req.params;
    const product = await productRepository.findProductById(id);

    if (!product || product.shopId !== shopId) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        error: { code: 'PRODUCT_NOT_FOUND' },
      });
    }

    const user = await getUserDetails(req);
    await productRepository.activateProduct(id, user.id);

    return res.status(200).json({
      success: true,
      message: 'Product set to active status successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const duplicateProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { id } = req.params;
    const original = await productRepository.findProductById(id);

    if (!original || original.shopId !== shopId) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        error: { code: 'PRODUCT_NOT_FOUND' },
      });
    }

    const user = await getUserDetails(req);
    
    // Construct cloned DTO
    const cloneDto = {
      name: `${original.name} - Duplicate`,
      kannadaName: original.kannadaName || null,
      categoryId: original.categoryId || null,
      unitType: original.unitType,
      defaultRate: original.defaultRate,
      minRate: original.minRate,
      imageUrl: original.imageUrl || null,
      description: original.description || null,
      notes: original.notes || null,
      isFavourite: original.isFavourite,
    };

    const product = await productRepository.createProduct(shopId, cloneDto, user.id, user.fullName);

    return res.status(201).json({
      success: true,
      message: 'Product duplicated successfully in catalog',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// --- Category Handlers ---

export const getCategories = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const list = await productRepository.findAllCategories(shopId);

    return res.status(200).json({
      success: true,
      message: 'Product categories retrieved successfully',
      data: list,
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const validated = createCategorySchema.parse(req.body);
    const user = await getUserDetails(req);
    const category = await productRepository.createCategory(shopId, validated, user.id);

    return res.status(201).json({
      success: true,
      message: 'Category added to shop successfully',
      data: category,
    });
  } catch (error: any) {
    if (error.message === 'DUPLICATE_CATEGORY_NAME') {
      return res.status(400).json({
        success: false,
        message: 'Duplicate Category Name: A classification with this name already exists in this shop.',
        error: { code: 'DUPLICATE_CATEGORY_NAME' },
      });
    }
    next(error);
  }
};

// --- Bulk Prices & History Handlers ---

export const bulkUpdatePrices = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { updates } = bulkPriceUpdateSchema.parse(req.body);
    const user = await getUserDetails(req);

    let updatedCount = 0;
    for (const item of updates) {
      const original = await productRepository.findProductById(item.productId);
      if (original && original.shopId === shopId) {
        // Only update if price is actually different to avoid redundant history logs
        if (original.defaultRate !== item.defaultRate || original.minRate !== item.minRate) {
          await productRepository.updateProduct(
            item.productId,
            {
              defaultRate: item.defaultRate,
              minRate: item.minRate,
              notes: item.remarks || 'Daily price bulk update',
            },
            user.id,
            user.fullName
          );
          updatedCount++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bulk update complete. Updated rates for ${updatedCount} products.`,
      data: { updatedCount },
    });
  } catch (error) {
    next(error);
  }
};

export const getProductPriceHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { id } = req.params;
    const product = await productRepository.findProductById(id);

    if (!product || product.shopId !== shopId) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        error: { code: 'PRODUCT_NOT_FOUND' },
      });
    }

    const history = await productRepository.getPriceHistory(id);

    return res.status(200).json({
      success: true,
      message: 'Product price history logs retrieved',
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const shopId = validateShopContext(req, res);
    if (!shopId) return;

    const { products } = await productRepository.findAllProducts(shopId);

    const totalCount = products.length;
    const activeCount = products.filter((p) => p.status === 'active').length;
    const inactiveCount = products.filter((p) => p.status === 'inactive').length;
    
    // Recently Updated Products list (limit to 5)
    const recentlyUpdated = [...products]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 5);

    // Most Used Products (mocked placeholder for catalog dashboard)
    const mostUsed = products.slice(0, 5);

    return res.status(200).json({
      success: true,
      message: 'Product dashboard statistics computed',
      data: {
        totalProducts: totalCount,
        activeProducts: activeCount,
        inactiveProducts: inactiveCount,
        todayPriceChanges: 0, // Placeholder count
        mostUsed,
        recentlyUpdated,
      },
    });
  } catch (error) {
    next(error);
  }
};
